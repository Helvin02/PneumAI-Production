"""
Pydantic Schemas for PneumAI API
Request and response models for type-safe API operations
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date, time
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, Enum):
    """User role enumeration"""
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class AppointmentStatus(str, Enum):
    """Appointment status enumeration"""
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RiskLevel(str, Enum):
    """Risk level enumeration"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ============================================================
# AUTHENTICATION SCHEMAS
# ============================================================

class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole


class LoginResponse(BaseModel):
    """Login response schema"""
    user_id: str
    name: str
    email: str
    role: UserRole
    session_token: str


class SessionInfo(BaseModel):
    """Current session information"""
    user_id: str
    name: str
    email: str
    role: UserRole


# ============================================================
# PATIENT SCHEMAS
# ============================================================

class PatientBase(BaseModel):
    """Base patient schema"""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    dateOfBirth: Optional[date] = None
    gender: Optional[str] = None
    medicalHistory: Optional[str] = None


class PatientCreate(PatientBase):
    """Schema for creating a patient"""
    password: str = Field(..., min_length=8)


class PatientUpdate(BaseModel):
    """Schema for updating a patient"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    dateOfBirth: Optional[date] = None
    gender: Optional[str] = None
    medicalHistory: Optional[str] = None


class PatientResponse(PatientBase):
    """Patient response schema"""
    id: str
    created_at: datetime
    updated_at: datetime
    total_scans: int = 0
    last_visit: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# DOCTOR SCHEMAS
# ============================================================

class DoctorBase(BaseModel):
    """Base doctor schema"""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None


class DoctorCreate(DoctorBase):
    """Schema for creating/registering a doctor"""
    password: str = Field(..., min_length=8)


class DoctorResponse(DoctorBase):
    """Doctor response schema (no password)"""
    id: str
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


# ============================================================
# SCAN SCHEMAS
# ============================================================

class BoundingBox(BaseModel):
    """Bounding box schema"""
    x: int
    y: int
    width: int
    height: int


class DetectionCharacteristics(BaseModel):
    """Detection characteristics schema"""
    size_mm: float
    shape: str
    density: str


class Detection(BaseModel):
    """Individual detection schema"""
    class_field: str = Field(..., alias="class")
    confidence: float
    boundingBox: BoundingBox
    characteristics: DetectionCharacteristics

    class Config:
        populate_by_name = True


class ImageSize(BaseModel):
    """Image size schema"""
    width: int
    height: int


class ScanMetadata(BaseModel):
    """Scan metadata schema"""
    fileSize: int
    format: str
    imageSize: ImageSize


class ScanResults(BaseModel):
    """Scan analysis results schema"""
    detected: bool
    confidence: float
    topClass: str
    riskLevel: RiskLevel
    detections: List[Detection]
    imageSize: ImageSize
    imageUrl: Optional[str] = None
    annotatedImageUrl: Optional[str] = None


class ScanResponse(BaseModel):
    """Complete scan response schema"""
    scanId: str
    patientId: Optional[str] = None
    status: str
    uploadTime: datetime
    processingTime: float
    results: ScanResults
    metadata: ScanMetadata


class ScanListItem(BaseModel):
    """Scan list item for patient scan history"""
    id: str
    upload_time: datetime
    status: str
    risk_level: str
    confidence: float
    detected: bool


# ============================================================
# COMMENT SCHEMAS
# ============================================================

class CommentCreate(BaseModel):
    """Schema for creating a scan comment"""
    user_id: str
    user_role: UserRole
    user_name: str
    comment_text: str = Field(..., min_length=1, max_length=5000)
    parent_comment_id: Optional[int] = None


class CommentUpdate(BaseModel):
    """Schema for updating a comment"""
    comment_text: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    """Comment response schema"""
    id: int
    scan_id: str
    user_id: str
    user_role: str
    user_name: str
    comment_text: str
    parent_comment_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# APPOINTMENT SCHEMAS
# ============================================================

class AppointmentBase(BaseModel):
    """Base appointment schema"""
    patientId: str
    doctorId: str
    doctorName: str
    date: date
    time: time
    type: str
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Schema for creating an appointment"""
    pass


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment"""
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    date: Optional[date] = None
    time: Optional[time] = None


class AppointmentResponse(AppointmentBase):
    """Appointment response schema"""
    id: str
    status: AppointmentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# MESSAGE SCHEMAS
# ============================================================

class MessageCreate(BaseModel):
    """Schema for creating a message"""
    senderId: str
    senderName: str
    senderRole: UserRole
    receiverId: str
    receiverName: str
    content: str = Field(..., min_length=1, max_length=10000)


class MessageResponse(BaseModel):
    """Message response schema"""
    id: str
    sender_id: str
    sender_name: str
    sender_role: str
    receiver_id: str
    receiver_name: str
    content: str
    read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# HEALTH CHECK SCHEMAS
# ============================================================

class HealthResponse(BaseModel):
    """Health check response schema"""
    status: str
    database: bool = False
    model_loaded: bool = False
    upload_dir_writable: bool = False
    timestamp: datetime


# ============================================================
# ERROR SCHEMAS
# ============================================================

class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# GENERIC RESPONSE SCHEMAS
# ============================================================

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[dict] = None


class MessageOnlyResponse(BaseModel):
    """Simple message response"""
    message: str
