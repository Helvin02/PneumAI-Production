#!/usr/bin/env python3
"""
Apply database migration to add image storage columns
"""

import os
import sys
import psycopg2
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

def apply_migration():
    """Apply the image storage migration"""
    
    migration_file = Path(__file__).parent.parent / "database" / "migrations" / "002_add_image_storage.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    print(f"📄 Reading migration from: {migration_file}")
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    print(f"🔗 Connecting to database...")
    print(f"   URL: {settings.DATABASE_URL[:50]}...")
    
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        
        print(f"🚀 Applying migration...")
        cursor.execute(migration_sql)
        conn.commit()
        
        print(f"✅ Migration applied successfully!")
        
        # Verify columns were added
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ct_scans' 
            AND column_name IN ('original_image_data', 'annotated_image_data', 'thumbnail_image_data', 'file_hash')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        print(f"\n📊 Verified new columns:")
        for col_name, col_type in columns:
            print(f"   ✓ {col_name}: {col_type}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  PneumAI - Database Migration: Add Image Storage")
    print("=" * 60)
    print()
    
    success = apply_migration()
    
    print()
    print("=" * 60)
    if success:
        print("  ✅ Migration completed successfully!")
    else:
        print("  ❌ Migration failed!")
    print("=" * 60)
    
    sys.exit(0 if success else 1)
