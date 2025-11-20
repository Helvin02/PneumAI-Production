# PostgreSQL Image Storage Implementation

## Problem
CT scan images were being stored in `/tmp/uploads/` which is **ephemeral storage** on Railway. Files would be deleted on container restart, causing scans to disappear.

## Solution
Store images directly in PostgreSQL as `BYTEA` (binary data) for persistent storage.

## Changes Made

### 1. Database Migration
**File:** `database/migrations/002_add_image_storage.sql`
- Added `original_image_data BYTEA` column
- Added `annotated_image_data BYTEA` column  
- Added `thumbnail_image_data BYTEA` column
- Added `file_hash VARCHAR(64)` column for duplicate detection
- Created index on `file_hash`

**Migration Script:** `scripts/migrate_image_storage.py`
- Applies migration to Railway database
- Verifies columns were created successfully

### 2. Database Functions
**File:** `app/database.py`

**Updated `create_scan()`:**
- Now accepts `originalImageData`, `annotatedImageData`, and `fileHash` parameters
- Stores binary image data in PostgreSQL

**Added `get_scan_image()`:**
- Retrieves image bytes from database by scan_id and type
- Supports 'original', 'annotated', and 'thumbnail' image types
- Returns raw bytes for serving

### 3. API Endpoints
**File:** `app/routers/scans.py`

**Updated `analyze_scan` endpoint:**
- Generates SHA-256 hash of uploaded file
- Stores both original and annotated images in database
- Still saves to filesystem for backward compatibility

**Added `GET /api/v1/scans/image/{scan_id}/{image_type}` endpoint:**
- Serves images directly from PostgreSQL
- Supports authentication via session token
- Returns JPEG with proper headers and caching
- Image types: 'original', 'annotated', 'thumbnail'

**Updated image URLs in response:**
- Changed from filesystem paths to database API endpoints
- Example: `/api/v1/scans/image/scan_20251120_121833/annotated`

## Benefits

✅ **Persistent Storage:** Images survive container restarts
✅ **No External Dependencies:** Works immediately without S3 setup
✅ **Duplicate Detection:** SHA-256 hash prevents duplicate uploads
✅ **Simple Deployment:** No volume configuration needed
✅ **Backward Compatible:** Still saves to filesystem temporarily

## Migration Applied

```
✅ Migration completed successfully!

📊 Verified new columns:
   ✓ annotated_image_data: bytea
   ✓ file_hash: character varying
   ✓ original_image_data: bytea
   ✓ thumbnail_image_data: bytea
```

## API Usage

### Upload Scan (stores in database automatically)
```bash
POST /api/v1/scans/analyze
Content-Type: multipart/form-data

Response includes:
{
  "results": {
    "imageUrl": "https://api.example.com/api/v1/scans/image/scan_123/original",
    "annotatedImageUrl": "https://api.example.com/api/v1/scans/image/scan_123/annotated"
  }
}
```

### Retrieve Image
```bash
GET /api/v1/scans/image/{scan_id}/annotated
Authorization: Bearer <token>

Returns: JPEG image bytes
```

## Future Enhancements

1. **Compression:** Implement image compression before storage
2. **Thumbnail Generation:** Auto-generate thumbnails for faster loading
3. **CDN Integration:** Add CloudFlare or similar for caching
4. **S3 Migration:** Move to S3 when scaling beyond PostgreSQL limits
5. **Cleanup Job:** Periodically remove old filesystem files

## Testing

- [x] Migration applied to Railway database
- [ ] Upload new scan and verify it persists
- [ ] Restart Railway container and verify images still accessible
- [ ] Test image retrieval endpoint
- [ ] Verify duplicate detection via file_hash
