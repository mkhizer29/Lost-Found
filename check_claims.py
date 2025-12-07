# check_claims.py
from db import get_connection

def show_all_claims():
    conn = get_connection()
    cur = conn.cursor()
    
    print("\n--- CHECKING ALL CLAIMS ---")
    cur.execute("""
        SELECT c.claim_id, u.full_name, i.title, c.status
        FROM CLAIM c
        JOIN APP_USER u ON c.claimant_id = u.user_id
        JOIN ITEM i ON c.item_id = i.item_id
    """)
    
    rows = cur.fetchall()
    if not rows:
        print("❌ NO CLAIMS FOUND IN DATABASE.")
    else:
        for r in rows:
            print(f"✅ Claim #{r[0]}: User '{r[1]}' claimed '{r[2]}' (Status: {r[3]})")
    
    conn.close()

if __name__ == "__main__":
    show_all_claims()