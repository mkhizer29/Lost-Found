# db.py
import oracledb
import config

def get_connection():
    """
    Opens a new connection to Oracle using values from config.py
    """
    print("Connecting with DSN:", repr(config.DB_DSN))  # debug print
    conn = oracledb.connect(
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        dsn=config.DB_DSN,
    )
    return conn