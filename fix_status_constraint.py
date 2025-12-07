# fix_status_constraint.py
from db import get_connection

def fix_status():
    print("Connecting...")
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Drop old rule
        try:
            cur.execute("ALTER TABLE CLAIM DROP CONSTRAINT ck_claim_status")
        except:
            pass

        # Add new rule including 'ESCALATED'
        print("Updating constraint...")
        cur.execute("""
            ALTER TABLE CLAIM
            ADD CONSTRAINT ck_claim_status
            CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','ESCALATED'))
        """)
        conn.commit()
        print("✅ Success: 'ESCALATED' status is now allowed.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_status()