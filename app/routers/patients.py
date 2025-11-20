"""
Patients Router for PneumAI
CRUD operations for patient management
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.models.schemas import PatientCreate, PatientUpdate, PatientResponse, MessageOnlyResponse
from app.database import (
    get_all_patients,
    get_patient,
    create_patient,
    update_patient,
    delete_patient
)
from app.utils.helpers import generate_patient_id
from app.utils.security import validate_email, sanitize_input

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse])
async def list_patients():
    """
    Get all patients

    Returns list of all patients with their information
    """
    try:
        patients = get_all_patients()
        return patients
    except Exception as e:
        logger.error(f"Error fetching patients: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patients")


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient_by_id(patient_id: str):
    """
    Get patient by ID

    Returns detailed patient information including scan history
    """
    try:
        patient = get_patient(patient_id)

        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient not found: {patient_id}")

        return patient
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient")


@router.post("", response_model=PatientResponse, status_code=201)
@router.post("/", response_model=PatientResponse, status_code=201)
async def create_new_patient(patient: PatientCreate):
    """
    Create a new patient

    Validates email format and creates unique patient ID
    """
    try:
        # Validate email
        if not validate_email(patient.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Sanitize inputs
        name = sanitize_input(patient.name, max_length=255)
        medical_history = sanitize_input(patient.medicalHistory, max_length=5000) if patient.medicalHistory else None

        # Generate patient ID
        patient_id = generate_patient_id(name)

        # Hash password
        from app.utils.security import hash_password
        password_hash = hash_password(patient.password)

        # Prepare patient data
        patient_data = {
            'id': patient_id,
            'name': name,
            'email': patient.email.lower(),
            'phone': patient.phone,
            'dateOfBirth': patient.dateOfBirth.isoformat() if patient.dateOfBirth else None,
            'gender': patient.gender,
            'medicalHistory': medical_history,
            'passwordHash': password_hash
        }

        # Create patient
        created_patient = create_patient(patient_data)

        logger.info(f"✅ Patient created: {patient_id} - {name}")

        return created_patient

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating patient: {e}")
        # Check for duplicate email
        if "unique constraint" in str(e).lower() or "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Email already exists")
        raise HTTPException(status_code=500, detail="Failed to create patient")


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient_info(patient_id: str, updates: PatientUpdate):
    """
    Update patient information

    Only provided fields will be updated
    """
    try:
        # Check if patient exists
        existing_patient = get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(status_code=404, detail=f"Patient not found: {patient_id}")

        # Validate email if provided
        if updates.email and not validate_email(updates.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Sanitize inputs
        update_data = {}
        if updates.name:
            update_data['name'] = sanitize_input(updates.name, max_length=255)
        if updates.email:
            update_data['email'] = updates.email.lower()
        if updates.phone:
            update_data['phone'] = updates.phone
        if updates.dateOfBirth:
            update_data['dateOfBirth'] = updates.dateOfBirth.isoformat()
        if updates.gender:
            update_data['gender'] = updates.gender
        if updates.medicalHistory is not None:
            update_data['medicalHistory'] = sanitize_input(updates.medicalHistory, max_length=5000)

        # Update patient
        updated_patient = update_patient(patient_id, update_data)

        logger.info(f"✅ Patient updated: {patient_id}")

        return updated_patient

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating patient {patient_id}: {e}")
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="Email already exists")
        raise HTTPException(status_code=500, detail="Failed to update patient")


@router.delete("/{patient_id}", response_model=MessageOnlyResponse)
async def delete_patient_record(patient_id: str):
    """
    Delete a patient

    Cascade deletes all related records (scans, appointments, etc.)
    """
    try:
        # Check if patient exists
        existing_patient = get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(status_code=404, detail=f"Patient not found: {patient_id}")

        # Delete patient (cascade deletes related records)
        delete_patient(patient_id)

        logger.info(f"✅ Patient deleted: {patient_id}")

        return MessageOnlyResponse(message=f"Patient {patient_id} deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete patient")
