# fix_claim_photo.py
from db import get_connection

def add_proof_column():
    print("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()
    try:
        print("Adding 'proof_url' to CLAIM table...")
        cur.execute("ALTER TABLE CLAIM ADD proof_url VARCHAR2(500)")
        print("✅ Success! 'proof_url' added.")
    except Exception as e:
        print(f"⚠️ Result: {e}")
    finally:
        conn.commit()
        conn.close()

if __name__ == "__main__":
    add_proof_column()