import os
import sys
sys.path.append(os.getcwd())

from app.database import Database

def update_doctors():
    print("Updating existing doctors with default values...")
    Database.initialize()
    
    try:
        with Database.get_connection() as conn:
            with conn.cursor() as cur:
                # Update availability
                cur.execute("""
                    UPDATE doctors 
                    SET availability = 'Available by appointment' 
                    WHERE availability IS NULL
                """)
                
                # Update years_of_experience
                cur.execute("""
                    UPDATE doctors 
                    SET years_of_experience = 5 
                    WHERE years_of_experience IS NULL
                """)
                
                # Update bio
                cur.execute("""
                    UPDATE doctors 
                    SET bio = 'Experienced specialist dedicated to patient care.' 
                    WHERE bio IS NULL
                """)
                
                # Update is_accepting_patients
                cur.execute("""
                    UPDATE doctors 
                    SET is_accepting_patients = TRUE 
                    WHERE is_accepting_patients IS NULL
                """)
                
                # Update is_verified
                cur.execute("""
                    UPDATE doctors 
                    SET is_verified = TRUE 
                    WHERE is_verified IS NULL
                """)
                
                print(f"Updated {cur.rowcount} doctor records.")
                
    except Exception as e:
        print(f"Error updating doctors: {e}")

if __name__ == "__main__":
    update_doctors()
