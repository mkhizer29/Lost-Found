# fix_email_constraint.py
from db import get_connection

def update_email_constraint():
    print("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        # 1. Drop the old strict constraint
        print("Dropping old constraint 'CK_APP_USER_EMAIL_DOMAIN'...")
        try:
            cur.execute("ALTER TABLE APP_USER DROP CONSTRAINT CK_APP_USER_EMAIL_DOMAIN")
            print("✅ Old constraint dropped.")
        except Exception as e:
            print(f"ℹ️ Note: Could not drop constraint (maybe it's already gone): {e}")

        # 2. Add the new flexible constraint
        print("Adding new constraint to allow @iba.edu.pk AND @khi.iba.edu.pk...")
        cur.execute("""
            ALTER TABLE APP_USER
            ADD CONSTRAINT CK_APP_USER_EMAIL_DOMAIN
            CHECK (
                LOWER(email) LIKE '%@iba.edu.pk' 
                OR LOWER(email) LIKE '%@khi.iba.edu.pk'
            )
        """)
        print("✅ Success! New constraint added.")
        
    except Exception as e:
        print(f"⚠️ Error: {e}")
        
    finally:
        conn.commit()
        cur.close()
        conn.close()
        print("Done.")

if __name__ == "__main__":
    update_email_constraint()