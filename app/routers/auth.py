"""
Authentication Router for PneumAI
Login, logout, and session management
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

from app.models.schemas import LoginRequest, LoginResponse, SessionInfo
from app.database import get_doctor_by_email
from app.utils.security import verify_password
from app.utils.helpers import generate_session_token

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory session storage (for MVP - replace with Redis in production)
active_sessions = {}


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Authenticate user and create session

    Supports:
    - Doctor login (checks doctors table)
    - Patient login (future implementation)
    - Admin login (future implementation)
    """
    try:
        # Validate role
        if credentials.role.value not in ["doctor", "patient", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")

        # Doctor login
        if credentials.role.value == "doctor":
            doctor = get_doctor_by_email(credentials.email)

            if not doctor:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password for this account type"
                )

            # Verify password
            if not doctor.get('password_hash'):
                raise HTTPException(
                    status_code=401,
                    detail="Account not configured. Please contact administrator."
                )

            if not verify_password(credentials.password, doctor['password_hash']):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password for this account type"
                )

            # Check if account is active
            if not doctor.get('is_active', True):
                raise HTTPException(
                    status_code=403,
                    detail="Account is inactive. Please contact administrator."
                )

            # Generate session token
            session_token = generate_session_token()

            # Store session
            active_sessions[session_token] = {
                "user_id": doctor['id'],
                "name": doctor['name'],
                "email": doctor['email'],
                "role": "doctor"
            }

            logger.info(f"✅ Doctor login successful: {doctor['email']}")

            return LoginResponse(
                user_id=doctor['id'],
                name=doctor['name'],
                email=doctor['email'],
                role="doctor",
                session_token=session_token
            )

        # Patient login
        elif credentials.role.value == "patient":
            from app.database import get_patient_by_email
            patient = get_patient_by_email(credentials.email)

            if not patient:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password for this account type"
                )

            # Verify password
            if not patient.get('password_hash'):
                # If no password hash, it might be a legacy account or error
                # For now, allow if we are in a transition phase? No, secure by default.
                raise HTTPException(
                    status_code=401,
                    detail="Account not configured. Please contact administrator."
                )

            if not verify_password(credentials.password, patient['password_hash']):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password for this account type"
                )

            # Generate session token
            session_token = generate_session_token()

            # Store session with patient_id for easy access
            active_sessions[session_token] = {
                "user_id": patient['id'],
                "patient_id": patient['id'],  # Add explicit patient_id
                "name": patient['name'],
                "email": patient['email'],
                "role": "patient"
            }

            logger.info(f"✅ Patient login successful: {patient['email']}")

            return LoginResponse(
                user_id=str(patient['id']), # Ensure ID is string for response
                name=patient['name'],
                email=patient['email'],
                role="patient",
                session_token=session_token
            )

        # Admin login (placeholder)
        elif credentials.role.value == "admin":
            # TODO: Implement admin authentication
            raise HTTPException(
                status_code=501,
                detail="Admin login not yet implemented"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed due to server error")


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Logout user and invalidate session

    Requires Authorization header with session token
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="No authorization token provided")

        # Extract token (support both "Bearer token" and just "token")
        token = authorization.replace("Bearer ", "").strip()

        if token in active_sessions:
            user_info = active_sessions[token]
            del active_sessions[token]
            logger.info(f"✅ User logged out: {user_info['email']}")
            return {"message": "Logged out successfully"}
        else:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")


@router.get("/me", response_model=SessionInfo)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current user information from session

    Requires Authorization header with session token
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Extract token
        token = authorization.replace("Bearer ", "").strip()

        if token not in active_sessions:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        user_info = active_sessions[token]

        return SessionInfo(
            user_id=user_info['user_id'],
            name=user_info['name'],
            email=user_info['email'],
            role=user_info['role']
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user info")


@router.get("/sessions")
async def get_active_sessions():
    """
    Get count of active sessions (admin/debug endpoint)
    """
    return {
        "active_sessions": len(active_sessions),
        "sessions": [
            {
                "user_id": session['user_id'],
                "name": session['name'],
                "role": session['role']
            }
            for session in active_sessions.values()
        ]
    }
