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

from app.config import settings

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DB Pool Settings
DB_POOL_MIN = int(os.environ.get("DB_POOL_MIN", 1))
DB_POOL_MAX = int(os.environ.get("DB_POOL_MAX", 10))
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("❌ DATABASE_URL not set in .env")


class Database:
    """PostgreSQL database connection manager with pooling"""

    _pool: Optional[SimpleConnectionPool] = None

    @classmethod
    def initialize(cls):

        try:
            cls._pool = SimpleConnectionPool(
                DB_POOL_MIN,
                DB_POOL_MAX,
                dsn=DATABASE_URL
            )
            logger.info(f"✅ Database pool initialized ({DB_POOL_MIN}-{DB_POOL_MAX} connections)")
            return True
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            raise

    @classmethod
    @contextmanager
    def get_connection(cls):
        if cls._pool is None:
            raise Exception("Database pool not initialized. Call Database.initialize() first.")
        conn = None
        try:
            conn = cls._pool.getconn()
            yield conn
            conn.commit()
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
        with cls.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            if fetch == "all":
                result = cursor.fetchall()
                return [dict(row) for row in result] if result else []
            elif fetch == "one":
                result = cursor.fetchone()
                return dict(result) if result else None
            else:
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
        if cls._pool:
            cls._pool.closeall()
            logger.info("✅ Database connections closed")


# ============================================================
# PATIENT DATABASE FUNCTIONS
# ============================================================

def get_patient(patient_id: str) -> Optional[Dict]:
    """Get patient by ID"""
    query = "SELECT * FROM patients WHERE id = %s"
    return Database.execute(query, (patient_id,), fetch="one")


def create_patient(patient_data: Dict) -> Dict:
    """Create a new patient"""
    query = """
        INSERT INTO patients (id, name, email, phone, date_of_birth, gender, medical_history)
        VALUES (%(id)s, %(name)s, %(email)s, %(phone)s, %(dateOfBirth)s, %(gender)s, %(medicalHistory)s)
        RETURNING *
    """
    Database.execute(query, patient_data, fetch="none")
    return get_patient(patient_data['id'])


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
    query = "SELECT id, name, email, phone, specialization, license_number, created_at FROM doctors ORDER BY name"
    return Database.execute(query, fetch="all")


def get_doctor(doctor_id: str) -> Optional[Dict]:
    """Get doctor by ID"""
    query = "SELECT id, name, email, phone, specialization, license_number, created_at FROM doctors WHERE id = %s"
    return Database.execute(query, (doctor_id,), fetch="one")


def get_doctor_by_email(email: str) -> Optional[Dict]:
    """Get doctor by email (for authentication)"""
    query = "SELECT * FROM doctors WHERE email = %s"
    return Database.execute(query, (email,), fetch="one")


def create_doctor(doctor_data: Dict) -> Dict:
    """Create a new doctor"""
    query = """
        INSERT INTO doctors (id, name, email, phone, specialization, license_number, password_hash)
        VALUES (%(id)s, %(name)s, %(email)s, %(phone)s, %(specialization)s, %(licenseNumber)s, %(passwordHash)s)
        RETURNING id, name, email, phone, specialization, license_number, created_at
    """
    Database.execute(query, doctor_data, fetch="none")
    return get_doctor(doctor_data['id'])


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
            annotated_image_url, metadata
        ) VALUES (
            %(scanId)s, %(patientId)s, %(status)s, %(uploadTime)s,
            %(originalPath)s, %(fileName)s, %(fileSize)s, %(format)s,
            %(width)s, %(height)s,
            %(aiAnalysisResult)s, %(confidence)s,
            %(detected)s, %(riskLevel)s,
            %(annotatedPath)s, %(metadata)s
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
        'metadata': json.dumps(metadata)
    }
    
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


def get_patient_scans(patient_id: str) -> List[Dict]:
    """Get all scans for a patient"""
    query = """
        SELECT scan_id as id, upload_time, status, risk_level, ai_confidence_score as confidence, nodules_detected as detected
        FROM ct_scans
        WHERE patient_id = %s
        ORDER BY upload_time DESC
    """
    # Note: patient_id in database is integer, but we might be passing a string. 
    # If it's a string that parses to int, fine. If not, this might fail or return empty.
    try:
        pid = int(patient_id)
        return Database.execute(query, (pid,), fetch="all")
    except ValueError:
        return []


def delete_scan(scan_id: str) -> bool:
    """Delete a scan (cascade deletes comments)"""
    query = "DELETE FROM ct_scans WHERE scan_id = %s"
    Database.execute(query, (scan_id,), fetch="none")
    return True


# ============================================================
# SCAN COMMENTS DATABASE FUNCTIONS
# ============================================================

def create_scan_comment(comment_data: Dict) -> Dict:
    """Create a new scan comment"""
    query = """
        INSERT INTO scan_comments (scan_id, user_id, user_role, user_name, comment_text, parent_comment_id)
        VALUES (%(scan_id)s, %(user_id)s, %(user_role)s, %(user_name)s, %(comment_text)s, %(parent_comment_id)s)
        RETURNING *
    """
    Database.execute(query, comment_data, fetch="none")

    # Return the created comment
    get_query = """
        SELECT * FROM scan_comments
        WHERE scan_id = %(scan_id)s AND user_id = %(user_id)s
        ORDER BY created_at DESC LIMIT 1
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
            id, patient_id, doctor_id, doctor_name,
            appointment_date, appointment_time, type, status, notes
        ) VALUES (
            %(id)s, %(patientId)s, %(doctorId)s, %(doctorName)s,
            %(date)s, %(time)s, %(type)s, %(status)s, %(notes)s
        ) RETURNING *
    """
    Database.execute(query, appointment_data, fetch="none")

    get_query = "SELECT * FROM appointments WHERE id = %s"
    row = Database.execute(get_query, (appointment_data['id'],), fetch="one")
    return _map_appointment_fields(row)


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
            id, sender_id, sender_name, sender_role,
            receiver_id, receiver_name, content
        ) VALUES (
            %(id)s, %(senderId)s, %(senderName)s, %(senderRole)s,
            %(receiverId)s, %(receiverName)s, %(content)s
        ) RETURNING *
    """
    Database.execute(query, message_data, fetch="none")

    get_query = "SELECT * FROM messages WHERE id = %s"
    return Database.execute(get_query, (message_data['id'],), fetch="one")


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
