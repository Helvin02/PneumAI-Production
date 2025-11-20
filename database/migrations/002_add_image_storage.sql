-- Migration: Add image storage columns to ct_scans table
-- This allows storing images directly in PostgreSQL instead of filesystem

-- Add columns for binary image storage
ALTER TABLE ct_scans 
ADD COLUMN IF NOT EXISTS original_image_data BYTEA,
ADD COLUMN IF NOT EXISTS annotated_image_data BYTEA,
ADD COLUMN IF NOT EXISTS thumbnail_image_data BYTEA;

-- Add column for file hash (for duplicate detection)
ALTER TABLE ct_scans 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

-- Create index on file_hash for duplicate checking
CREATE INDEX IF NOT EXISTS idx_scans_file_hash ON ct_scans(file_hash);

-- Add comments
COMMENT ON COLUMN ct_scans.original_image_data IS 'Original CT scan image stored as binary data';
COMMENT ON COLUMN ct_scans.annotated_image_data IS 'AI-annotated image with detection boxes stored as binary data';
COMMENT ON COLUMN ct_scans.thumbnail_image_data IS 'Thumbnail version of the scan';
COMMENT ON COLUMN ct_scans.file_hash IS 'SHA-256 hash of the original file for duplicate detection';
