from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import os
from app.config import settings
from app.database import Database

router = APIRouter()

@router.get("/check-duplicate/{file_hash}")
async def check_duplicate_image(file_hash: str):
    """
    Check if an image with the given hash already exists.
    Returns 404 if not found, or the existing scan data if found.
    """
    query = """
        SELECT id, scan_id, patient_id, upload_time, status, risk_level 
        FROM ct_scans 
        WHERE file_hash = %s
        LIMIT 1
    """
    try:
        result = Database.execute(query, (file_hash,), fetch="one")
        if result:
            return result
        raise HTTPException(status_code=404, detail="No duplicate found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/presigned-url")
async def get_presigned_url(data: dict):
    """
    Mock S3 presigned URL for local storage.
    In a real S3 setup, this would generate a boto3 presigned URL.
    For local, we just return a direct upload URL to our backend.
    """
    # For local storage, we don't need a real presigned URL.
    # The frontend will use this to "upload" to S3, but we can redirect it 
    # or handle it via the /analyze endpoint which takes the file directly.
    # However, s3Service.js expects a specific response format.
    
    # Since s3Service.js uploads directly to the URL provided here,
    # we would need a separate endpoint to handle PUT requests if we wanted to fully emulate S3.
    # But the current /analyze endpoint takes a POST with FormData.
    
    # To minimize frontend changes, we can return a dummy URL and 
    # rely on the fact that ScanUpload.jsx might be using a different path 
    # OR we implement a PUT endpoint.
    
    # Let's check how ScanUpload.jsx works first.
    return {
        "uploadUrl": f"{settings.API_URL}/api/v1/storage/upload-mock/{data['fileName']}",
        "accessUrl": f"{settings.API_URL}/uploads/{data['fileName']}"
    }

@router.put("/upload-mock/{filename}")
async def mock_s3_upload(filename: str):
    # This is a placeholder. Real file upload is handled by /api/v1/scans/analyze
    return {"status": "ok"}
