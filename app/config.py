"""
Configuration Management for PneumAI
Loads and validates environment variables
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env.local (development) or .env (production)
# Priority: .env.local > .env
load_dotenv(dotenv_path=".env.local", override=False)
load_dotenv(dotenv_path=".env", override=False)


class Settings:
    """Application settings loaded from environment variables"""

    # ============================================================
    # DATABASE CONFIGURATION
    # ============================================================
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://pneumai_admin:pneumai_dev_password_2025@localhost:5432/pneumai_db"
    )
    DB_POOL_MIN: int = int(os.getenv("DB_POOL_MIN", "5"))
    DB_POOL_MAX: int = int(os.getenv("DB_POOL_MAX", "20"))

    # ============================================================
    # APPLICATION CONFIGURATION
    # ============================================================
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-in-production-min-32-chars"
    )
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # ============================================================
    # YOLO MODEL CONFIGURATION (ONNX optimized)
    # ============================================================
    MODEL_PATH: Path = Path(os.getenv("MODEL_PATH", "best.onnx"))
    YOLO_CONFIDENCE_THRESHOLD: float = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.25"))

    # ============================================================
    # SERVER CONFIGURATION
    # ============================================================
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    WORKERS: int = int(os.getenv("WORKERS", "4"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    # ============================================================
    # CORS CONFIGURATION
    # ============================================================
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        FRONTEND_URL,
    ]

    # ============================================================
    # SESSION MANAGEMENT
    # ============================================================
    SESSION_EXPIRE_HOURS: int = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))

    # ============================================================
    # ENVIRONMENT
    # ============================================================
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    # ============================================================
    # FILE PATHS
    # ============================================================
    @property
    def originals_dir(self) -> Path:
        """Directory for original uploaded images"""
        return self.UPLOAD_DIR / "originals"

    @property
    def annotated_dir(self) -> Path:
        """Directory for annotated images"""
        return self.UPLOAD_DIR / "annotated"

    @property
    def thumbnails_dir(self) -> Path:
        """Directory for image thumbnails"""
        return self.UPLOAD_DIR / "thumbnails"

    def __init__(self):
        """Initialize and create upload directories if they don't exist"""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.annotated_dir.mkdir(parents=True, exist_ok=True)
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)

    def validate(self) -> bool:
        """Validate critical configuration"""
        errors = []

        # Check SECRET_KEY
        if len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY must be at least 32 characters")

        # Check MODEL_PATH exists
        if not self.MODEL_PATH.exists():
            errors.append(f"YOLO model not found at {self.MODEL_PATH}")

        # Check UPLOAD_DIR is writable
        if not os.access(self.UPLOAD_DIR, os.W_OK):
            errors.append(f"UPLOAD_DIR {self.UPLOAD_DIR} is not writable")

        if errors:
            for error in errors:
                print(f"❌ Configuration Error: {error}")
            return False

        print("✅ Configuration validated successfully")
        return True


# Global settings instance
settings = Settings()
