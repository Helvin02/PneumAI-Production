import os
import sys
sys.path.append(os.getcwd())

from app.database import Database
from app.config import settings
from urllib.parse import urlparse

def verify_db():
    print(f"Verifying database connection...")
    
    # Print masked DB URL to verify host
    db_url = settings.DATABASE_URL
    try:
        parsed = urlparse(db_url)
        masked_url = f"{parsed.scheme}://{parsed.username}:****@{parsed.hostname}:{parsed.port}{parsed.path}"
        print(f"Connecting to: {masked_url}")
    except Exception as e:
        print(f"Could not parse DATABASE_URL: {e}")

    Database.initialize()
    
    try:
        with Database.get_connection() as conn:
            with conn.cursor() as cur:
                # Check users count
                cur.execute("SELECT COUNT(*) FROM users")
                user_count = cur.fetchone()[0]
                print(f"Users count: {user_count}")
                
                # Check doctors count
                cur.execute("SELECT COUNT(*) FROM doctors")
                doctor_count = cur.fetchone()[0]
                print(f"Doctors count: {doctor_count}")
                
                # Check patients count
                cur.execute("SELECT COUNT(*) FROM patients")
                patient_count = cur.fetchone()[0]
                print(f"Patients count: {patient_count}")
                
    except Exception as e:
        print(f"Error verifying database: {e}")

if __name__ == "__main__":
    verify_db()
