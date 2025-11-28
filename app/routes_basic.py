# app/routes_basic.py
from flask import Blueprint, jsonify
from db import get_connection   # this is your db.py

bp = Blueprint("basic", __name__)

@bp.get("/ping")
def ping():
    """Simple health check: http://127.0.0.1:5000/ping"""
    return jsonify({"message": "pong"})

@bp.get("/api/db-test")
def db_test():
    """
    Test DB from inside Flask:
    http://127.0.0.1:5000/api/db-test
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 'Connected to Oracle from Flask!' FROM dual")
        msg, = cur.fetchone()
        return jsonify({"message": msg})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()
