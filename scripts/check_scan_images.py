#!/usr/bin/env python3
"""
Check if scan images are stored in database
"""

import os
import sys
import psycopg2
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

def check_scan_images():
    """Check if scans have image data"""
    
    print(f"🔗 Connecting to database...")
    
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        
        # Get recent scans with image data info
        cursor.execute("""
            SELECT 
                scan_id,
                file_name,
                upload_time,
                CASE WHEN original_image_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_original,
                CASE WHEN annotated_image_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_annotated,
                CASE WHEN original_image_data IS NOT NULL THEN LENGTH(original_image_data) ELSE 0 END as original_size,
                CASE WHEN annotated_image_data IS NOT NULL THEN LENGTH(annotated_image_data) ELSE 0 END as annotated_size,
                file_hash
            FROM ct_scans
            ORDER BY upload_time DESC
            LIMIT 10;
        """)
        
        scans = cursor.fetchall()
        
        if not scans:
            print("❌ No scans found in database")
            return
        
        print(f"\n📊 Recent Scans ({len(scans)} found):\n")
        print(f"{'Scan ID':<25} {'Original':<10} {'Annotated':<10} {'Orig Size':<12} {'Anno Size':<12} {'Hash':<20}")
        print("=" * 110)
        
        for scan in scans:
            scan_id, file_name, upload_time, has_orig, has_anno, orig_size, anno_size, file_hash = scan
            orig_size_mb = f"{orig_size / 1024 / 1024:.2f} MB" if orig_size > 0 else "0 MB"
            anno_size_mb = f"{anno_size / 1024 / 1024:.2f} MB" if anno_size > 0 else "0 MB"
            hash_short = file_hash[:16] if file_hash else "None"
            
            print(f"{scan_id:<25} {has_orig:<10} {has_anno:<10} {orig_size_mb:<12} {anno_size_mb:<12} {hash_short:<20}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 110)
    print("  PneumAI - Check Scan Images in Database")
    print("=" * 110)
    print()
    
    check_scan_images()
    
    print()
    print("=" * 110)
