# test_db.py
from db import get_connection
import config

def main():
    print("Using DB_DSN from config.py:", repr(config.DB_DSN))

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 'Connected to Oracle!' FROM dual")
        msg, = cur.fetchone()
        print(msg)
    except Exception as e:
        print("Error:", e)
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    main()