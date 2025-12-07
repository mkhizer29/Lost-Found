# reset_users.py
from db import get_connection

def reset_all_users():
    print("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # 1. Delete dependent data (Child Tables)
        print("Cleaning up notifications...")
        cur.execute("DELETE FROM NOTIFICATION")
        
        print("Cleaning up messages...")
        cur.execute("DELETE FROM MESSAGE")
        
        print("Cleaning up claim evidence...")
        cur.execute("DELETE FROM CLAIM_EVIDENCE")
        
        print("Cleaning up claims...")
        cur.execute("DELETE FROM CLAIM")
        
        print("Cleaning up reports...")
        cur.execute("DELETE FROM REPORT")
        
        print("Cleaning up items...")
        cur.execute("DELETE FROM ITEM")
        
        # 2. Delete Users (Parent Table)
        print("Deleting all users...")
        cur.execute("DELETE FROM APP_USER")
        
        # 3. Reset Identity Columns (Optional, helps start IDs from 1 again)
        # Note: Oracle identity columns don't reset easily with TRUNCATE in standard SQL,
        # but DELETE cleans the rows. IDs will continue incrementing unless we recreate tables.
        # For this project, just deleting rows is enough.

        conn.commit()
        print("✅ SUCCESS: All users and related data have been wiped.")
        
    except Exception as e:
        print(f"⚠️ Error: {e}")
        conn.rollback()
        
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    reset_all_users()