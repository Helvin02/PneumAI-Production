#!/usr/bin/env python3
"""
Test image retrieval from database
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import get_scan_image, Database

def test_image_retrieval():
    """Test retrieving images from database"""
    
    # Initialize database
    Database.initialize()
    
    # Get the most recent scan ID
    with Database.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT scan_id 
            FROM ct_scans 
            WHERE original_image_data IS NOT NULL 
            ORDER BY upload_time DESC 
            LIMIT 1
        """)
        result = cursor.fetchone()
        
        if not result:
            print("❌ No scans with image data found")
            return
        
        scan_id = result[0]
        print(f"📸 Testing image retrieval for scan: {scan_id}\n")
    
    # Test original image
    print("Testing ORIGINAL image...")
    original_data = get_scan_image(scan_id, 'original')
    if original_data:
        print(f"✅ Original image retrieved: {len(original_data)} bytes")
        print(f"   First 20 bytes: {original_data[:20].hex()}")
    else:
        print("❌ Failed to retrieve original image")
    
    print()
    
    # Test annotated image
    print("Testing ANNOTATED image...")
    annotated_data = get_scan_image(scan_id, 'annotated')
    if annotated_data:
        print(f"✅ Annotated image retrieved: {len(annotated_data)} bytes")
        print(f"   First 20 bytes: {annotated_data[:20].hex()}")
        
        # Check if it's a valid JPEG (starts with FFD8)
        if annotated_data[:2] == b'\xff\xd8':
            print(f"   ✅ Valid JPEG signature detected")
        else:
            print(f"   ⚠️  Invalid JPEG signature: {annotated_data[:2].hex()}")
    else:
        print("❌ Failed to retrieve annotated image")
    
    Database.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  PneumAI - Test Image Retrieval")
    print("=" * 60)
    print()
    
    test_image_retrieval()
    
    print()
    print("=" * 60)
