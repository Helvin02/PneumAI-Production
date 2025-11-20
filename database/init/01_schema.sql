-- ========================================
-- PneumAI Database Schema
-- PostgreSQL 15+
-- Phase 5: Complete Database Implementation
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- USERS TABLE
-- Unified authentication for all user types
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ========================================
-- PATIENTS TABLE
-- Extended profile information for patients
-- ========================================
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

    -- Contact Information
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(20),

    -- Medical Information (encrypted in production)
    medical_history TEXT,
    current_medications TEXT,
    allergies TEXT,
    smoking_status VARCHAR(50) CHECK (smoking_status IN ('never', 'former', 'current', 'unknown')),
    smoking_years INTEGER,
    family_history_lung_cancer BOOLEAN DEFAULT FALSE,

    -- Clinical Notes
    clinical_notes TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Follow-up Required', 'Urgent')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- ========================================
-- DOCTORS TABLE
-- Medical professional profiles
-- ========================================
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Professional Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    license_number VARCHAR(50),

    -- Contact Information
    phone VARCHAR(20),
    office_address TEXT,
    hospital_affiliation VARCHAR(200),

    -- Professional Details
    years_of_experience INTEGER,
    education TEXT,
    certifications TEXT[],
    bio TEXT,

    -- Availability
    availability TEXT,
    consultation_hours JSONB,

    -- Image
    profile_image_url TEXT,

    -- Status
    is_accepting_patients BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_accepting ON doctors(is_accepting_patients) WHERE is_accepting_patients = TRUE;

-- ========================================
-- CT SCANS TABLE
-- Medical imaging and AI analysis results
-- ========================================
CREATE TABLE IF NOT EXISTS ct_scans (
    id SERIAL PRIMARY KEY,
    scan_id VARCHAR(50) UNIQUE NOT NULL,

    -- Relationships
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Scan Information
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- File Information
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_type VARCHAR(50),

    -- Image Details
    image_width INTEGER,
    image_height INTEGER,

    -- AI Analysis Results (YOLO Detection)
    ai_analysis_result JSONB,
    ai_model_version VARCHAR(50) DEFAULT 'YOLOv12',
    ai_confidence_score DECIMAL(5, 2),

    -- Detection Details
    detections_count INTEGER DEFAULT 0,
    nodules_detected BOOLEAN DEFAULT FALSE,

    -- Risk Assessment
    risk_level VARCHAR(20) CHECK (risk_level IN ('none', 'low', 'medium', 'high')),
    risk_percentage DECIMAL(5, 2),

    -- Annotated Images
    annotated_image_url TEXT,
    annotated_image_base64 TEXT,

    -- Medical Review
    doctor_reviewed BOOLEAN DEFAULT FALSE,
    doctor_notes TEXT,
    doctor_diagnosis TEXT,
    reviewed_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'reviewed', 'requires_attention', 'archived')),

    -- Flags
    is_archived BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_scan_id ON ct_scans(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_patient_id ON ct_scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_scans_doctor_id ON ct_scans(doctor_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON ct_scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_risk_level ON ct_scans(risk_level);
CREATE INDEX IF NOT EXISTS idx_scans_upload_time ON ct_scans(upload_time DESC);
CREATE INDEX IF NOT EXISTS idx_scans_reviewed ON ct_scans(doctor_reviewed);

-- ========================================
-- APPOINTMENTS TABLE
-- Scheduling and appointment management
-- ========================================
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_id VARCHAR(50) UNIQUE NOT NULL,

    -- Relationships
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    scan_id INTEGER REFERENCES ct_scans(id) ON DELETE SET NULL,

    -- Appointment Details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,

    -- Type and Reason
    appointment_type VARCHAR(50) CHECK (appointment_type IN ('consultation', 'follow_up', 'scan_review', 'initial', 'emergency')),
    reason TEXT,

    -- Location
    location VARCHAR(200),
    room_number VARCHAR(20),
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_meeting_url TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),

    -- Notes
    patient_notes TEXT,
    doctor_notes TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_id ON appointments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ========================================
-- MESSAGES TABLE
-- Communication between patients and doctors
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(50) UNIQUE NOT NULL,

    -- Relationships
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Threading
    parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    thread_id VARCHAR(50),

    -- Message Content
    subject VARCHAR(255),
    message_text TEXT NOT NULL,

    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- ========================================
-- SCAN COMMENTS TABLE
-- Professional feedback on CT scans
-- ========================================
CREATE TABLE IF NOT EXISTS scan_comments (
    id SERIAL PRIMARY KEY,
    comment_id BIGINT UNIQUE NOT NULL,

    -- Relationships
    scan_id INTEGER REFERENCES ct_scans(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES scan_comments(id) ON DELETE CASCADE,

    -- Comment Details
    comment_text TEXT NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    user_name VARCHAR(100) NOT NULL,

    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_comments_scan_id ON scan_comments(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_comments_user_id ON scan_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_comments_created_at ON scan_comments(created_at DESC);

-- ========================================
-- NOTIFICATIONS TABLE
-- Real-time notifications for users
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(50) UNIQUE NOT NULL,

    -- Relationships
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Details
    type VARCHAR(50) NOT NULL CHECK (type IN ('scan_completed', 'new_message', 'appointment_scheduled', 'appointment_reminder', 'scan_reviewed', 'comment_added', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT,

    -- Links
    action_url TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ========================================
-- SESSIONS TABLE
-- Track user sessions and JWT tokens
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,

    -- Relationships
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Session Details
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),

    -- Device Information
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),

    -- Location (optional)
    country VARCHAR(100),
    city VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;

-- ========================================
-- AUDIT LOG TABLE
-- Track all important database operations
-- ========================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,

    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,

    -- User Information
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(20),

    -- Changes
    old_data JSONB,
    new_data JSONB,

    -- Request Details
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ========================================
-- SYSTEM SETTINGS TABLE
-- Application-wide configuration
-- ========================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- ========================================
-- TRIGGERS
-- Auto-update timestamps
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_ct_scans_updated_at BEFORE UPDATE ON ct_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_scan_comments_updated_at BEFORE UPDATE ON scan_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS
-- Convenient access to common queries
-- ========================================

-- Active patients with recent scans
CREATE OR REPLACE VIEW active_patients_with_scans AS
SELECT
    p.id,
    p.user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.status,
    COUNT(DISTINCT cs.id) as total_scans,
    MAX(cs.upload_time) as last_scan_date,
    COUNT(DISTINCT CASE WHEN cs.risk_level = 'high' THEN cs.id END) as high_risk_scans
FROM patients p
JOIN users u ON p.user_id = u.id
LEFT JOIN ct_scans cs ON p.id = cs.patient_id
WHERE p.status = 'Active' AND u.is_active = TRUE
GROUP BY p.id, p.user_id, u.email, p.first_name, p.last_name, p.status;

-- Upcoming appointments
CREATE OR REPLACE VIEW upcoming_appointments AS
SELECT
    a.id,
    a.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    p.first_name as patient_first_name,
    p.last_name as patient_last_name,
    d.first_name as doctor_first_name,
    d.last_name as doctor_last_name,
    d.specialty as doctor_specialty
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
WHERE a.status IN ('scheduled', 'confirmed')
  AND a.appointment_date >= CURRENT_DATE
ORDER BY a.appointment_date, a.appointment_time;

-- ========================================
-- GRANTS
-- Set permissions (adjust for production)
-- ========================================

-- Grant privileges to pneumai_admin (change username as needed)
-- Note: In production, create separate read-only and write users

-- ========================================
-- COMPLETION MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PneumAI Database Schema Created Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: 12';
    RAISE NOTICE 'Views created: 2';
    RAISE NOTICE 'Indexes created: ~50';
    RAISE NOTICE 'Triggers created: 7';
    RAISE NOTICE '========================================';
END $$;
