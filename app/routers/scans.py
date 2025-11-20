"""
Scans Router for PneumAI
CT Scan upload, analysis, and comment management
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Request, Depends, Header
from fastapi.responses import Response
from typing import Optional, List
from datetime import datetime
import logging

from app.models.schemas import (
    ScanResponse,
    ScanResults,
    ScanMetadata,
    ImageSize,
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    MessageOnlyResponse
)
from app.services.yolo_service import yolo_service
from app.services.image_service import image_service
from app.services.file_manager import file_manager
from app.database import (
    create_scan,
    get_scan,
    get_patient_scans,
    get_all_scans,
    delete_scan,
    create_scan_comment,
    get_scan_comments,
    update_scan_comment,
    delete_scan_comment,
    get_scan_image
)
from app.utils.helpers import generate_scan_id, format_file_size
from app.utils.security import sanitize_filename
from app.config import settings
from app.routers.websocket import broadcast_scan_analysis_complete, broadcast_scan_upload
from app.routers.auth import active_sessions

logger = logging.getLogger(__name__)

router = APIRouter()

def get_base_url(request: Request) -> str:
    """
    Get base URL for image URLs, forcing HTTPS in production

    Railway and other reverse proxies may forward HTTP internally even when
    the external connection is HTTPS. This function ensures we return HTTPS URLs.
    """
    if not request:
        return f"http://localhost:{settings.PORT}"

    base_url = str(request.base_url).rstrip('/')

    # Force HTTPS in production (when not localhost)
    if settings.ENVIRONMENT == "production" and base_url.startswith("http://"):
        base_url = base_url.replace("http://", "https://", 1)

    return base_url

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    if token not in active_sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return active_sessions[token]


@router.post("/analyze", response_model=ScanResponse)
async def analyze_scan(
    scan: UploadFile = File(...),
    patientId: Optional[str] = Form(None),
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and analyze CT scan image with YOLOv12

    Supports: DICOM (.dcm), JPEG, PNG
    Returns: Detection results, annotated image URLs
    
    Authentication required. Patient ID is automatically determined from session.
    """
    try:
        # Record start time
        start_time = datetime.utcnow()
        
        # Determine patient ID from authenticated user
        # If user is a patient, use their patient_id
        # If user is a doctor/admin uploading on behalf of a patient, use the provided patientId
        actual_patient_id = None
        
        if current_user['role'] == 'patient':
            # Patient uploading their own scan
            actual_patient_id = str(current_user.get('patient_id') or current_user.get('user_id'))
        elif current_user['role'] in ['doctor', 'admin']:
            # Doctor/admin uploading for a patient
            if patientId and patientId != 'unknown':
                actual_patient_id = patientId
        
        logger.info(f"📤 Processing scan for patient: {actual_patient_id} (uploaded by {current_user['role']})")

        # Validate file size
        contents = await scan.read()
        file_size = len(contents)

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB"
            )

        # Sanitize filename
        safe_filename = sanitize_filename(scan.filename or "scan.jpg")
        file_format = safe_filename.split('.')[-1].lower()

        logger.info(f"📤 Processing scan: {safe_filename} ({format_file_size(file_size)})")

        # Read and process image
        image = image_service.read_image(contents, safe_filename)

        # Run YOLO inference
        results = yolo_service.analyze(image)

        # Create annotated image
        annotated_image_bytes = image_service.create_annotated_image(image, results['detections'])

        # Encode original image
        original_image_bytes = image_service.encode_image_to_jpeg(image)

        # Generate file hash for duplicate detection
        import hashlib
        file_hash = hashlib.sha256(original_image_bytes).hexdigest()

        # Generate scan ID
        scan_id = generate_scan_id()

        # Save both images to filesystem (for backward compatibility)
        original_path, annotated_path = file_manager.save_scan_images(
            scan_id,
            original_image_bytes,
            annotated_image_bytes
        )

        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()

        # Prepare scan data for database (including binary image data)
        scan_data = {
            'scanId': scan_id,
            'patientId': actual_patient_id,  # Use authenticated patient ID
            'status': 'completed',
            'uploadTime': start_time.isoformat(),
            'processingTime': processing_time,
            'results': {
                'detected': results['detected'],
                'confidence': results['confidence'],
                'riskLevel': results['riskLevel'],
                'topClass': results['topClass']
            },
            'metadata': {
                'fileSize': file_size,
                'format': file_format,
                'imageSize': results['imageSize']
            },
            'originalPath': original_path,
            'annotatedPath': annotated_path,
            # Store binary image data in database
            'originalImageData': original_image_bytes,
            'annotatedImageData': annotated_image_bytes,
            'fileHash': file_hash
        }

        # Save to database
        create_scan(scan_data, results['detections'])

        logger.info(f"✅ Scan completed: {scan_id} - Risk: {results['riskLevel']} ({processing_time:.2f}s)")

        # Broadcast scan completion to WebSocket clients
        await broadcast_scan_analysis_complete({
            "scanId": scan_id,
            "patientId": actual_patient_id,
            "riskLevel": results['riskLevel'],
            "detected": results['detected'],
            "confidence": results['confidence']
        })

        # Construct response with image URLs (now served from database)
        base_url = get_base_url(request)

        # Use new database-backed image endpoints
        image_url = f"{base_url}/api/v1/scans/image/{scan_id}/original"
        annotated_image_url = f"{base_url}/api/v1/scans/image/{scan_id}/annotated"

        return ScanResponse(
            scanId=scan_id,
            patientId=actual_patient_id,  # Use authenticated patient ID
            status='completed',
            uploadTime=start_time,
            processingTime=processing_time,
            results=ScanResults(
                detected=results['detected'],
                confidence=results['confidence'],
                topClass=results['topClass'],
                riskLevel=results['riskLevel'],
                detections=results['detections'],
                imageSize=ImageSize(**results['imageSize']),
                imageUrl=image_url,
                annotatedImageUrl=annotated_image_url
            ),
            metadata=ScanMetadata(
                fileSize=file_size,
                format=file_format,
                imageSize=ImageSize(**results['imageSize'])
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error processing scan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Scan processing failed: {str(e)}")


@router.get("/{scan_id}")
async def get_scan_by_id(scan_id: str, request: Request):
    """
    Get scan information by ID

    Returns scan metadata and detection results
    """
    try:
        scan = get_scan(scan_id)

        if not scan:
            raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

        # Add image URLs
        base_url = get_base_url(request)
        image_urls = file_manager.get_scan_image_urls(scan_id, base_url)

        scan['results']['imageUrl'] = image_urls['imageUrl']
        scan['results']['annotatedImageUrl'] = image_urls['annotatedImageUrl']

        return scan

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scan")


@router.get("/patient/{patient_id}/scans")
async def get_scans_for_patient(
    patient_id: str, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all scans for a patient
    
    Returns list of scan summaries with image URLs
    """
    # Check authorization
    if current_user['role'] == 'patient':
        # Ensure patient is viewing their own scans
        if str(current_user['user_id']) != str(patient_id):
             raise HTTPException(status_code=403, detail="Not authorized to view these scans")
    elif current_user['role'] not in ['doctor', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        base_url = get_base_url(request)
        scans = get_patient_scans(patient_id, base_url)
        return {"scans": scans, "count": len(scans)}
    except Exception as e:
        logger.error(f"Error fetching scans for patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient scans")


@router.get("")
async def get_all_scans_endpoint(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all scans (for doctors/admins)
    
    Returns list of scan summaries with image URLs
    """
    if current_user['role'] not in ['doctor', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized to view all scans")

    try:
        base_url = get_base_url(request)
        scans = get_all_scans(base_url)
        return {"scans": scans, "count": len(scans)}
    except Exception as e:
        logger.error(f"Error fetching all scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scans")


@router.get("/image/{scan_id}/{image_type}")
async def get_scan_image_endpoint(
    scan_id: str,
    image_type: str = "annotated"
):
    """
    Get scan image from database (public endpoint)
    
    Args:
        scan_id: Scan ID
        image_type: 'original', 'annotated', or 'thumbnail'
    
    Returns:
        Image bytes with appropriate content type
    
    Note: This endpoint is public to allow <img> tags to load images.
    Access control is handled at the scan level, not image level.
    """
    if image_type not in ['original', 'annotated', 'thumbnail']:
        raise HTTPException(status_code=400, detail="Invalid image type")

    try:
        logger.info(f"📷 Retrieving {image_type} image for scan {scan_id}")
        image_data = get_scan_image(scan_id, image_type)

        if not image_data:
            logger.warning(f"⚠️ Image not found in database: {scan_id} ({image_type})")
            raise HTTPException(status_code=404, detail=f"Image not found for scan {scan_id}")

        logger.info(f"✅ Retrieved {len(image_data)} bytes for {scan_id} ({image_type})")
        return Response(
            content=image_data,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f"inline; filename={scan_id}_{image_type}.jpg"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving image for scan {scan_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to retrieve image")


@router.delete("/{scan_id}", response_model=MessageOnlyResponse)
async def delete_scan_by_id(scan_id: str):
    """
    Delete a scan

    Removes scan record from database and deletes associated image files
    """
    try:
        # Check if scan exists
        scan = get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

        # Delete from database (cascade deletes detections)
        delete_scan(scan_id)

        # Delete image files
        file_manager.delete_scan_files(scan_id)

        logger.info(f"✅ Scan deleted: {scan_id}")

        return MessageOnlyResponse(message=f"Scan {scan_id} deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete scan")


# ============================================================
# SCAN COMMENTS ENDPOINTS
# ============================================================

@router.post("/{scan_id}/comments", response_model=CommentResponse, status_code=201)
async def add_comment_to_scan(scan_id: str, comment: CommentCreate):
    """
    Add a comment to a scan

    Supports threaded comments via parent_comment_id
    """
    try:
        # Verify scan exists
        scan = get_scan(scan_id)
        if not scan:
            raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

        # Create comment
        comment_data = {
            'scan_id': scan_id,
            'user_id': comment.user_id,
            'user_role': comment.user_role.value,
            'user_name': comment.user_name,
            'comment_text': comment.comment_text,
            'parent_comment_id': comment.parent_comment_id
        }

        created_comment = create_scan_comment(comment_data)

        # Broadcast comment addition to WebSocket clients
        await broadcast_scan_comment(scan_id, created_comment)

        logger.info(f"✅ Comment added to scan {scan_id} by {comment.user_name}")

        return created_comment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment to scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add comment")


@router.get("/{scan_id}/comments", response_model=List[CommentResponse])
async def get_scan_comments_list(scan_id: str):
    """
    Get all comments for a scan

    Returns comments in chronological order
    """
    try:
        comments = get_scan_comments(scan_id)
        return comments
    except Exception as e:
        logger.error(f"Error fetching comments for scan {scan_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch comments")


@router.put("/comment/{comment_id}", response_model=CommentResponse)
async def update_comment_text(comment_id: int, update: CommentUpdate):
    """
    Update a comment

    Only the comment text can be updated
    """
    try:
        updated_comment = update_scan_comment(comment_id, update.comment_text)

        if not updated_comment:
            raise HTTPException(status_code=404, detail=f"Comment not found: {comment_id}")

        logger.info(f"✅ Comment {comment_id} updated")

        return updated_comment

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating comment {comment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update comment")


@router.delete("/comment/{comment_id}", response_model=MessageOnlyResponse)
async def delete_comment_by_id(comment_id: int):
    """
    Delete a comment

    Cascade deletes child comments if this is a parent comment
    """
    try:
        success = delete_scan_comment(comment_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Comment not found: {comment_id}")

        logger.info(f"✅ Comment {comment_id} deleted")

        return MessageOnlyResponse(message=f"Comment {comment_id} deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting comment {comment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete comment")
