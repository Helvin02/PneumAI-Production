import os
import sys
# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database import Database
from app.config import settings

def init_db():
    print(f"Initializing database...")
    # Initialize the connection pool
    Database.initialize()
    
    schema_path = "database/init/01_schema.sql"
    seed_path = "database/init/02_seed_data.sql"
    
    try:
        with Database.get_connection() as conn:
            with conn.cursor() as cur:
                # Run schema
                if os.path.exists(schema_path):
                    print(f"Running schema from {schema_path}...")
                    with open(schema_path, "r") as f:
                        cur.execute(f.read())
                    print("Schema executed.")
                else:
                    print(f"Schema file not found at {schema_path}")
                
                # Run seed
                if os.path.exists(seed_path):
                    print(f"Running seed data from {seed_path}...")
                    with open(seed_path, "r") as f:
                        cur.execute(f.read())
                    print("Seed data executed.")
                else:
                    print(f"Seed file not found at {seed_path}")
                    
        print("Database initialization complete.")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_db()
