# fix_schema.py
from db import get_connection

def fix_claim_table():
    print("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # This SQL command adds the missing 'notes' column to the CLAIM table
        print("Adding 'notes' column to CLAIM table...")
        cur.execute("ALTER TABLE CLAIM ADD notes VARCHAR2(4000)")
        print("✅ Success! The 'notes' column has been added.")
        
    except Exception as e:
        # If it fails, print why (e.g., maybe it already exists now)
        print(f"⚠️ Result: {e}")
        
    finally:
        conn.commit()
        cur.close()
        conn.close()
        print("Done.")

if __name__ == "__main__":
    fix_claim_table()