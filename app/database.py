"""
Database Connection and Utilities for PneumAI
PostgreSQL integration using psycopg2 with connection pooling
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from psycopg2 import IntegrityError, OperationalError
from contextlib import contextmanager
from typing import Optional, Dict, List, Any
from datetime import date, datetime, time
import logging
import time as time_module
import random

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Database:
    """PostgreSQL database connection manager with pooling"""

    _pool: Optional[SimpleConnectionPool] = None

    @classmethod
    def initialize(cls):
        """
        Initialize the database connection pool from settings
        """
        try:
            # Parse DATABASE_URL
            db_url = settings.DATABASE_URL

            cls._pool = SimpleConnectionPool(
                settings.DB_POOL_MIN,
                settings.DB_POOL_MAX,
                dsn=db_url
            )
            logger.info(f"✅ Database pool initialized: {settings.DB_POOL_MIN}-{settings.DB_POOL_MAX} connections")
            return True
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            return False

    @classmethod
    @contextmanager
    def get_connection(cls):
        """
        Get a connection from the pool (context manager)
        Includes retry logic for transient failures.

        Usage:
            with Database.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM patients")
        """
        if cls._pool is None:
            raise Exception("Database pool not initialized. Call Database.initialize() first.")

        conn = None
        max_retries = 3
        retry_delay = 0.5

        for attempt in range(max_retries):
            try:
                conn = cls._pool.getconn()
                yield conn
                conn.commit()  # Auto-commit on success
                break # Success, exit loop
            except OperationalError as e:
                if conn:
                    try:
                        conn.rollback()
                        cls._pool.putconn(conn) 
                        conn = None 
                    except:
                        pass
                
                logger.warning(f"⚠️ Database connection error (attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
                else:
                    logger.error(f"❌ Database operation failed after {max_retries} retries")
                    raise
            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"Database error: {e}")
                raise
            finally:
                if conn:
                    cls._pool.putconn(conn)

    @classmethod
    def execute(cls, query: str, params: tuple = None, fetch: str = "all") -> Optional[List[Dict]]:
        """
        Execute a query and return results

        Args:
            query: SQL query
            params: Query parameters (tuple)
            fetch: "all", "one", or "none"

        Returns:
            List of dictionaries (fetch="all"), single dictionary (fetch="one"), or None
        """
        with cls.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)

            if fetch == "all":
                result = cursor.fetchall()
                return [cls._serialize_row(dict(row)) for row in result] if result else []
            elif fetch == "one":
                result = cursor.fetchone()
                return cls._serialize_row(dict(result)) if result else None
            else:
                # fetch="none" for INSERT/UPDATE/DELETE
                return None

    @staticmethod
    def _serialize_row(row: Dict) -> Dict:
        """Convert date/datetime/time objects to ISO format strings"""
        for key, value in row.items():
            if isinstance(value, (date, datetime, time)):
                row[key] = value.isoformat()
        return row

    @classmethod
    def close(cls):
        """Close all database connections"""
        if cls._pool:
            cls._pool.closeall()
            logger.info("✅ Database connections closed")


# ============================================================
# PATIENT DATABASE FUNCTIONS
# ============================================================

def get_patient(patient_id: str) -> Optional[Dict]:
    """Get patient by ID (supports both integer ID and string ID if needed)"""
    # Try to cast to int if it looks like one, otherwise it might be a legacy string ID or we need to handle it
    try:
        pid = int(patient_id)
        query = """
            SELECT p.*, u.email, CONCAT(p.first_name, ' ', p.last_name) as name
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = %s
        """
        return Database.execute(query, (pid,), fetch="one")
    except ValueError:
        # If it's a string like "PAT-123", we might need to search differently or it's invalid for this schema
        # For now, assume we only use the integer IDs generated by the DB
        return None


def get_patient_by_email(email: str) -> Optional[Dict]:
    """Get patient by email (for authentication)"""
    query = """
        SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name, u.email, u.password_hash, u.role,
               p.phone, p.date_of_birth, p.gender, p.medical_history
        FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE u.email = %s
    """
    return Database.execute(query, (email,), fetch="one")


def create_patient(patient_data: Dict) -> Dict:
    """Create a new patient with User and Patient records"""
    # Split name
    full_name = patient_data.get('name', '')
    parts = full_name.split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''
    username = patient_data['email'].split('@')[0]

    with Database.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Insert User
        user_query = """
            INSERT INTO users (username, email, password_hash, role, is_active)
            VALUES (%(username)s, %(email)s, %(passwordHash)s, 'patient', TRUE)
            RETURNING id
        """
        cursor.execute(user_query, {
            'username': username,
            'email': patient_data['email'],
            'passwordHash': patient_data.get('passwordHash', ''), # Should be hashed
        })
        user_id = cursor.fetchone()['id']

        # 2. Insert Patient
        patient_query = """
            INSERT INTO patients (user_id, first_name, last_name, phone, date_of_birth, gender, medical_history)
            VALUES (%(user_id)s, %(first_name)s, %(last_name)s, %(phone)s, %(dateOfBirth)s, %(gender)s, %(medicalHistory)s)
            RETURNING *
        """
        cursor.execute(patient_query, {
            'user_id': user_id,
            'first_name': first_name,
            'last_name': last_name,
            'phone': patient_data.get('phone'),
            'dateOfBirth': patient_data.get('dateOfBirth'),
            'gender': patient_data.get('gender'),
            'medicalHistory': patient_data.get('medicalHistory')
        })
        patient = cursor.fetchone()
        
        # Add user fields to result
        patient['email'] = patient_data['email']
        patient['name'] = full_name
        
        # Serialize dates
        return Database._serialize_row(dict(patient))


def update_patient(patient_id: str, updates: Dict) -> Optional[Dict]:
    """Update patient information"""
    set_clauses = []
    params = {}

    field_mapping = {
        'name': 'name',
        'email': 'email',
        'phone': 'phone',
        'dateOfBirth': 'date_of_birth',
        'gender': 'gender',
        'medicalHistory': 'medical_history'
    }

    for key, db_field in field_mapping.items():
        if key in updates and updates[key] is not None:
            set_clauses.append(f"{db_field} = %({db_field})s")
            params[db_field] = updates[key]

    if not set_clauses:
        return get_patient(patient_id)

    params['id'] = patient_id
    query = f"""
        UPDATE patients
        SET {', '.join(set_clauses)}
        WHERE id = %(id)s
        RETURNING *
    """

    Database.execute(query, params, fetch="none")
    return get_patient(patient_id)


def get_all_patients() -> List[Dict]:
    """Get all patients"""
    query = "SELECT * FROM patients ORDER BY created_at DESC"
    return Database.execute(query, fetch="all")


def delete_patient(patient_id: str) -> bool:
    """Delete a patient"""
    query = "DELETE FROM patients WHERE id = %s"
    Database.execute(query, (patient_id,), fetch="none")
    return True


# ============================================================
# DOCTOR DATABASE FUNCTIONS
# ============================================================

def get_all_doctors() -> List[Dict]:
    """Get all doctors"""
    query = """
        SELECT 
            d.id, d.user_id, d.first_name, d.last_name, d.specialty, d.license_number, d.phone,
            d.availability, d.years_of_experience, d.bio, d.profile_image_url, 
            d.is_accepting_patients, d.is_verified,
            u.email, u.is_active
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.last_name, d.first_name
    """
    doctors = Database.execute(query, fetch="all")
    
    # Format names and map fields for frontend
    for doc in doctors:
        doc['name'] = f"{doc['first_name']} {doc['last_name']}"
        doc['image'] = doc['profile_image_url'] # Map for frontend
        doc['specialization'] = doc['specialty'] # Map for frontend
        
    return doctors


def get_doctor(doctor_id: str) -> Optional[Dict]:
    """Get doctor by ID"""
    try:
        did = int(doctor_id)
        query = """
            SELECT d.id, CONCAT(d.first_name, ' ', d.last_name) as name, u.email, 
                   d.phone, d.specialty as specialization, d.license_number, d.created_at
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = %s
        """
        return Database.execute(query, (did,), fetch="one")
    except ValueError:
        return None


def get_doctor_by_email(email: str) -> Optional[Dict]:
    """Get doctor by email (for authentication)"""
    query = """
        SELECT d.id, CONCAT(d.first_name, ' ', d.last_name) as name, u.email, u.password_hash, u.role,
               d.phone, d.specialty as specialization, d.license_number, d.created_at
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE u.email = %s
    """
    # Note: We select password_hash from users for auth verification
    return Database.execute(query, (email,), fetch="one")


def create_doctor(doctor_data: Dict) -> Dict:
    """Create a new doctor with User and Doctor records"""
    # Split name
    full_name = doctor_data.get('name', '')
    parts = full_name.split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''
    username = doctor_data['email'].split('@')[0]

    with Database.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Insert User
        user_query = """
            INSERT INTO users (username, email, password_hash, role, is_active)
            VALUES (%(username)s, %(email)s, %(passwordHash)s, 'doctor', TRUE)
            RETURNING id
        """
        cursor.execute(user_query, {
            'username': username,
            'email': doctor_data['email'],
            'passwordHash': doctor_data.get('passwordHash', ''),
        })
        user_id = cursor.fetchone()['id']

        # 2. Insert Doctor
        doctor_query = """
            INSERT INTO doctors (
                user_id, first_name, last_name, phone, specialty, license_number,
                availability, years_of_experience, bio, profile_image_url, 
                is_accepting_patients, is_verified
            )
            VALUES (
                %(user_id)s, %(first_name)s, %(last_name)s, %(phone)s, %(specialty)s, %(licenseNumber)s,
                %(availability)s, %(years_of_experience)s, %(bio)s, %(profile_image_url)s,
                %(is_accepting_patients)s, %(is_verified)s
            )
            RETURNING *
        """
        cursor.execute(doctor_query, {
            'user_id': user_id,
            'first_name': first_name,
            'last_name': last_name,
            'phone': doctor_data.get('phone'),
            'specialty': doctor_data.get('specialty'),
            'licenseNumber': doctor_data.get('licenseNumber'),
            'availability': doctor_data.get('availability'),
            'years_of_experience': doctor_data.get('years_of_experience'),
            'bio': doctor_data.get('bio'),
            'profile_image_url': doctor_data.get('profile_image_url'),
            'is_accepting_patients': doctor_data.get('is_accepting_patients', True),
            'is_verified': doctor_data.get('is_verified', False)
        })
        doctor = cursor.fetchone()
        
        # Add user fields to result
        doctor['email'] = doctor_data['email']
        doctor['name'] = full_name
        
        # Serialize dates
        return Database._serialize_row(dict(doctor))

def delete_doctor(doctor_id: str) -> bool:
    """Delete a doctor and their associated user account"""
    try:
        did = int(doctor_id)
        with Database.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get user_id first
            cursor.execute("SELECT user_id FROM doctors WHERE id = %s", (did,))
            result = cursor.fetchone()
            
            if not result:
                return False
                
            user_id = result[0]
            
            # Delete doctor record (cascade should handle user, but let's be safe)
            cursor.execute("DELETE FROM doctors WHERE id = %s", (did,))
            
            # Delete user record
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            
            return True
    except ValueError:
        return False
    except Exception as e:
        logger.error(f"Error deleting doctor: {e}")
        raise


# ============================================================
# SCAN DATABASE FUNCTIONS
# ============================================================

def create_scan(scan_data: Dict, detections: List[Dict]) -> str:
    """Create a new scan with detections"""
    scan_id = scan_data['scanId']

    # Prepare metadata and analysis results
    ai_analysis_result = {
        'detected': scan_data['results']['detected'],
        'confidence': scan_data['results']['confidence'],
        'riskLevel': scan_data['results']['riskLevel'],
        'topClass': scan_data['results']['topClass'],
        'processingTime': scan_data['processingTime']
    }

    metadata = scan_data.get('metadata', {})
    metadata['processing_time'] = scan_data['processingTime']

    # Insert scan
    # Mapping to ct_scans table
    scan_query = """
        INSERT INTO ct_scans (
            scan_id, patient_id, status, upload_time,
            file_url, file_name, file_size_bytes, file_type,
            image_width, image_height,
            ai_analysis_result, ai_confidence_score,
            nodules_detected, risk_level,
            annotated_image_url, metadata,
            original_image_data, annotated_image_data, file_hash
        ) VALUES (
            %(scanId)s, %(patientId)s, %(status)s, %(uploadTime)s,
            %(originalPath)s, %(fileName)s, %(fileSize)s, %(format)s,
            %(width)s, %(height)s,
            %(aiAnalysisResult)s, %(confidence)s,
            %(detected)s, %(riskLevel)s,
            %(annotatedPath)s, %(metadata)s,
            %(originalImageData)s, %(annotatedImageData)s, %(fileHash)s
        )
    """

    import json

    params = {
        'scanId': scan_id,
        'patientId': None, # scan_data.get('patientId') if scan_data.get('patientId') != 'unknown' else None, # Handle unknown patient
        'status': scan_data['status'],
        'uploadTime': scan_data['uploadTime'],
        'originalPath': scan_data.get('originalPath', ''),
        'fileName': f"scan_{scan_id}.{scan_data['metadata']['format']}", # Construct filename
        'fileSize': scan_data['metadata']['fileSize'],
        'format': scan_data['metadata']['format'],
        'width': scan_data['metadata']['imageSize']['width'],
        'height': scan_data['metadata']['imageSize']['height'],
        'aiAnalysisResult': json.dumps(ai_analysis_result),
        'confidence': scan_data['results']['confidence'],
        'detected': scan_data['results']['detected'],
        'riskLevel': scan_data['results']['riskLevel'],
        'annotatedPath': scan_data.get('annotatedPath', ''),
        'metadata': json.dumps(metadata),
        'originalImageData': scan_data.get('originalImageData'),  # Binary data
        'annotatedImageData': scan_data.get('annotatedImageData'),  # Binary data
        'fileHash': scan_data.get('fileHash')  # SHA-256 hash
    }

    # Log image data sizes for debugging
    original_size = len(params['originalImageData']) if params['originalImageData'] else 0
    annotated_size = len(params['annotatedImageData']) if params['annotatedImageData'] else 0
    logger.info(f"💾 Saving scan images to DB - Original: {original_size} bytes, Annotated: {annotated_size} bytes")

    # Handle patient_id - if 'unknown' or None, insert NULL
    if scan_data.get('patientId') and scan_data.get('patientId') != 'unknown':
        # Verify patient exists first? Or let FK fail?
        # For now, if it's a valid integer string, use it, else None
        try:
            params['patientId'] = int(scan_data['patientId'])
        except:
            params['patientId'] = None
    else:
        params['patientId'] = None

    Database.execute(scan_query, params, fetch="none")
    logger.info(f"✅ Scan {scan_data['scanId']} saved to database with images")

    # Insert detections (if we had a detections table, but schema doesn't seem to have a separate detections table linked to ct_scans in the same way, 
    # wait, schema has NO detections table! It puts results in ai_analysis_result JSONB)
    # The schema provided in 01_schema.sql does NOT have a 'detections' table. 
    # It has 'ai_analysis_result JSONB'.
    # So we don't need to insert into a detections table.
    # We already put detections in ai_analysis_result if we include them.
    
    # Let's update ai_analysis_result to include the full detections list
    if detections:
        ai_analysis_result['detections'] = detections
        # Update the row with the full JSON
        update_query = "UPDATE ct_scans SET ai_analysis_result = %s WHERE scan_id = %s"
        Database.execute(update_query, (json.dumps(ai_analysis_result), scan_id), fetch="none")

    return scan_id


def get_scan(scan_id: str) -> Optional[Dict]:
    """Get scan by ID with detections"""
    scan_query = "SELECT * FROM ct_scans WHERE scan_id = %s"
    scan = Database.execute(scan_query, (scan_id,), fetch="one")

    if not scan:
        return None

    # Parse JSONB fields if they are strings (psycopg2 usually handles this, but just in case)
    ai_result = scan.get('ai_analysis_result', {})
    if isinstance(ai_result, str):
        import json
        try:
            ai_result = json.loads(ai_result)
        except:
            ai_result = {}
            
    # Extract detections from JSONB
    detections = ai_result.get('detections', [])

    # Format response
    upload_time = scan['upload_time']
    if isinstance(upload_time, str):
        upload_time_str = upload_time
    else:
        upload_time_str = upload_time.isoformat() if upload_time else None

    return {
        'scanId': scan['scan_id'],
        'patientId': scan.get('patient_id'),
        'status': scan['status'],
        'uploadTime': upload_time_str,
        'processingTime': ai_result.get('processingTime', 0),
        'results': {
            'detected': scan['nodules_detected'],
            'confidence': float(scan['ai_confidence_score']) if scan['ai_confidence_score'] else 0.0,
            'riskLevel': scan['risk_level'],
            'topClass': ai_result.get('topClass', 'unknown'),
            'detections': detections
        },
        'metadata': {
            'imageSize': {
                'width': scan['image_width'],
                'height': scan['image_height']
            },
            'fileSize': scan['file_size_bytes'],
            'format': scan['file_type']
        },
        'originalImagePath': scan.get('file_url'),
        'annotatedImagePath': scan.get('annotated_image_url')
    }


def get_scan_image(scan_id: str, image_type: str = 'annotated') -> Optional[bytes]:
    """
    Get scan image data from database
    
    Args:
        scan_id: Scan ID
        image_type: 'original', 'annotated', or 'thumbnail'
    
    Returns:
        Image bytes or None if not found
    """
    column_map = {
        'original': 'original_image_data',
        'annotated': 'annotated_image_data',
        'thumbnail': 'thumbnail_image_data'
    }
    
    column = column_map.get(image_type, 'annotated_image_data')
    
    # Use direct connection to avoid serialization issues with BYTEA
    with Database.get_connection() as conn:
        cursor = conn.cursor()
        query = f"""
            SELECT {column}
            FROM ct_scans
            WHERE scan_id = %s
        """
        cursor.execute(query, (scan_id,))
        result = cursor.fetchone()
        
        if result and result[0]:
            # BYTEA is returned as memoryview or bytes
            image_data = result[0]
            if isinstance(image_data, memoryview):
                return bytes(image_data)
            elif isinstance(image_data, bytes):
                return image_data
        
        return None


def get_patient_scans(patient_id: str, base_url: str = "") -> List[Dict]:
    """Get all scans for a patient with image URLs"""
    query = """
        SELECT 
            scan_id as id, 
            upload_time, 
            status, 
            risk_level, 
            ai_confidence_score as confidence, 
            nodules_detected as detected,
            scan_id
        FROM ct_scans
        WHERE patient_id = %s
        ORDER BY upload_time DESC
    """
    # Note: patient_id in database is integer, but we might be passing a string. 
    # If it's a string that parses to int, fine. If not, this might fail or return empty.
    try:
        pid = int(patient_id)
        scans = Database.execute(query, (pid,), fetch="all")
        
        # Add image URLs to each scan
        for scan in scans:
            scan_id = scan.get('scan_id') or scan.get('id')
            if base_url:
                scan['imageUrl'] = f"{base_url}/api/v1/scans/image/{scan_id}/original"
                scan['annotatedImageUrl'] = f"{base_url}/api/v1/scans/image/{scan_id}/annotated"
            else:
                scan['imageUrl'] = f"/api/v1/scans/image/{scan_id}/original"
                scan['annotatedImageUrl'] = f"/api/v1/scans/image/{scan_id}/annotated"
        
        return scans
    except ValueError:
        return []



def get_all_scans(base_url: str = "") -> List[Dict]:
    """Get all scans (for doctor/admin) with image URLs"""
    query = """
        SELECT 
            scan_id as id, 
            patient_id, 
            upload_time, 
            status, 
            risk_level, 
            ai_confidence_score as confidence, 
            nodules_detected as detected,
            scan_id
        FROM ct_scans
        ORDER BY upload_time DESC
    """
    scans = Database.execute(query, fetch="all")
    
    # Add image URLs to each scan
    for scan in scans:
        scan_id = scan.get('scan_id') or scan.get('id')
        if base_url:
            scan['imageUrl'] = f"{base_url}/api/v1/scans/image/{scan_id}/original"
            scan['annotatedImageUrl'] = f"{base_url}/api/v1/scans/image/{scan_id}/annotated"
        else:
            scan['imageUrl'] = f"/api/v1/scans/image/{scan_id}/original"
            scan['annotatedImageUrl'] = f"/api/v1/scans/image/{scan_id}/annotated"
    
    return scans


def delete_scan(scan_id: str) -> bool:
    """Delete a scan (cascade deletes comments)"""
    # Manually delete comments first to ensure cascade if DB constraint is missing
    comment_query = "DELETE FROM scan_comments WHERE scan_id = %s"
    Database.execute(comment_query, (scan_id,), fetch="none")
    
    query = "DELETE FROM ct_scans WHERE scan_id = %s"
    Database.execute(query, (scan_id,), fetch="none")
    return True


# ============================================================
# SCAN COMMENTS DATABASE FUNCTIONS
# ============================================================

def create_scan_comment(comment_data: Dict) -> Dict:
    """Create a new scan comment"""
    # Generate a random comment_id if needed by the schema
    comment_id = int(time_module.time() * 1000) + random.randint(0, 1000)
    
    if 'comment_id' not in comment_data:
        comment_data['comment_id'] = comment_id

    query = """
        INSERT INTO scan_comments (comment_id, scan_id, user_id, user_role, user_name, comment_text, parent_comment_id)
        VALUES (%(comment_id)s, %(scan_id)s, %(user_id)s, %(user_role)s, %(user_name)s, %(comment_text)s, %(parent_comment_id)s)
        RETURNING *
    """
    Database.execute(query, comment_data, fetch="none")

    # Return the created comment
    get_query = """
        SELECT * FROM scan_comments
        WHERE comment_id = %(comment_id)s
    """
    return Database.execute(get_query, comment_data, fetch="one")


def get_scan_comments(scan_id: str) -> List[Dict]:
    """Get all comments for a scan"""
    query = "SELECT * FROM scan_comments WHERE scan_id = %s ORDER BY created_at ASC"
    return Database.execute(query, (scan_id,), fetch="all")


def update_scan_comment(comment_id: int, comment_text: str) -> Optional[Dict]:
    """Update a comment"""
    query = """
        UPDATE scan_comments
        SET comment_text = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *
    """
    return Database.execute(query, (comment_text, comment_id), fetch="one")


def delete_scan_comment(comment_id: int) -> bool:
    """Delete a comment"""
    query = "DELETE FROM scan_comments WHERE id = %s"
    Database.execute(query, (comment_id,), fetch="none")
    return True


# ============================================================
# APPOINTMENT DATABASE FUNCTIONS
# ============================================================

def _map_appointment_fields(row: Dict) -> Dict:
    """Map database appointment fields to API response format"""
    return {
        'id': row['id'],
        'patientId': row['patient_id'],
        'doctorId': row['doctor_id'],
        'doctorName': row['doctor_name'],
        'date': row['appointment_date'],
        'time': row['appointment_time'],
        'type': row['type'],
        'status': row['status'],
        'notes': row['notes'],
        'created_at': row['created_at'],
        'updated_at': row['updated_at']
    }


def create_appointment(appointment_data: Dict) -> Dict:
    """Create a new appointment"""
    query = """
        INSERT INTO appointments (
            patient_id, doctor_id, doctor_name,
            appointment_date, appointment_time, type, status, notes
        ) VALUES (
            %(patientId)s, %(doctorId)s, %(doctorName)s,
            %(date)s, %(time)s, %(type)s, %(status)s, %(notes)s
        ) RETURNING *
    """
    
    with Database.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, appointment_data)
        row = cursor.fetchone()
        return _map_appointment_fields(dict(row))


def get_patient_appointments(patient_id: str) -> List[Dict]:
    """Get all appointments for a patient"""
    query = """
        SELECT * FROM appointments
        WHERE patient_id = %s
        ORDER BY appointment_date DESC, appointment_time DESC
    """
    rows = Database.execute(query, (patient_id,), fetch="all")
    return [_map_appointment_fields(row) for row in rows]


def get_doctor_appointments(doctor_id: str) -> List[Dict]:
    """Get all appointments for a doctor"""
    query = """
        SELECT * FROM appointments
        WHERE doctor_id = %s
        ORDER BY appointment_date DESC, appointment_time DESC
    """
    rows = Database.execute(query, (doctor_id,), fetch="all")
    return [_map_appointment_fields(row) for row in rows]


def update_appointment(appointment_id: str, updates: Dict) -> Optional[Dict]:
    """Update an appointment"""
    set_clauses = []
    params = {}

    allowed_fields = ['status', 'notes', 'appointment_date', 'appointment_time']
    for field in allowed_fields:
        if field in updates:
            set_clauses.append(f"{field} = %({field})s")
            params[field] = updates[field]

    if not set_clauses:
        return get_appointment(appointment_id)

    params['id'] = appointment_id
    query = f"""
        UPDATE appointments
        SET {', '.join(set_clauses)}
        WHERE id = %(id)s
        RETURNING *
    """
    row = Database.execute(query, params, fetch="one")
    return _map_appointment_fields(row) if row else None


def get_appointment(appointment_id: str) -> Optional[Dict]:
    """Get appointment by ID"""
    query = "SELECT * FROM appointments WHERE id = %s"
    row = Database.execute(query, (appointment_id,), fetch="one")
    return _map_appointment_fields(row) if row else None


def delete_appointment(appointment_id: str) -> bool:
    """Delete an appointment"""
    query = "DELETE FROM appointments WHERE id = %s"
    Database.execute(query, (appointment_id,), fetch="none")
    return True


# ============================================================
# MESSAGE DATABASE FUNCTIONS
# ============================================================

def create_message(message_data: Dict) -> Dict:
    """Create a new message"""
    query = """
        INSERT INTO messages (
            sender_id, sender_name, sender_role,
            receiver_id, receiver_name, content
        ) VALUES (
            %(senderId)s, %(senderName)s, %(senderRole)s,
            %(receiverId)s, %(receiverName)s, %(content)s
        ) RETURNING *
    """
    
    with Database.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, message_data)
        row = cursor.fetchone()
        return dict(row)


def get_user_messages(user_id: str) -> List[Dict]:
    """Get all messages for a user"""
    query = """
        SELECT * FROM messages
        WHERE sender_id = %s OR receiver_id = %s
        ORDER BY created_at DESC
    """
    return Database.execute(query, (user_id, user_id), fetch="all")


def mark_message_read(message_id: str) -> Optional[Dict]:
    """Mark a message as read"""
    query = """
        UPDATE messages
        SET read = TRUE
        WHERE id = %s
        RETURNING *
    """
    return Database.execute(query, (message_id,), fetch="one")


def delete_message(message_id: str) -> bool:
    """Delete a message"""
    query = "DELETE FROM messages WHERE id = %s"
    Database.execute(query, (message_id,), fetch="none")
    return True
