# app/routes_auth.py
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_connection
import oracledb
import re
import smtplib
import random
from email.mime.text import MIMEText

bp = Blueprint("auth", __name__)

EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+(@iba\.edu\.pk|@khi\.iba\.edu\.pk)$'
ADMIN_REGISTRATION_KEY = "IBA_ADMIN_2025"

# === EMAIL CONFIGURATION (CHANGE THESE!) ===
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "your_email@gmail.com"  # <--- PUT YOUR EMAIL HERE
SENDER_PASSWORD = "your_app_password"  # <--- PUT YOUR APP PASSWORD HERE

def send_verification_email(to_email, code):
    try:
        msg = MIMEText(f"Your Lost & Found verification code is: {code}")
        msg['Subject'] = "Verify your account"
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email

        # Connect to Server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Email Error:", e)
        return False

@bp.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name")
    email = data.get("email", "").strip().lower()
    password = data.get("password")
    role = data.get("role", "STUDENT") 
    admin_secret = data.get("admin_secret", "")

    if not full_name or not email or not password:
        return jsonify({"error": "Missing fields"}), 400
    
    if not re.match(EMAIL_REGEX, email):
        return jsonify({"error": "Email must be a valid IBA address"}), 400

    if role == 'ADMIN' and admin_secret != ADMIN_REGISTRATION_KEY:
        return jsonify({"error": "Incorrect Admin Secret Code."}), 403

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check existing email
        cur.execute("SELECT user_id FROM APP_USER WHERE email = :1", [email])
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 400

        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        hashed_pw = generate_password_hash(password)

        # Insert as UNVERIFIED
        cur.execute("""
            INSERT INTO APP_USER (full_name, email, password_hash, role, status, otp_code)
            VALUES (:1, :2, :3, :4, 'UNVERIFIED', :5)
        """, [full_name, email, hashed_pw, role, otp_code])
        
        # Send Email
        email_sent = send_verification_email(email, otp_code)
        
        # If email fails (e.g. bad config), print to console so you can still test
        if not email_sent:
            print(f"⚠️ EMAIL FAILED. MANUAL CODE for {email}: {otp_code}")

        conn.commit()
        return jsonify({"message": "Verification code sent to email."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@bp.post("/api/verify-otp")
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    code = data.get("code")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check code
        cur.execute("""
            SELECT user_id FROM APP_USER 
            WHERE email = :1 AND otp_code = :2 AND status = 'UNVERIFIED'
        """, [email, code])
        
        if not cur.fetchone():
            return jsonify({"error": "Invalid code or email"}), 400

        # Activate User
        cur.execute("UPDATE APP_USER SET status = 'ACTIVE', otp_code = NULL WHERE email = :1", [email])
        conn.commit()

        return jsonify({"message": "Account verified! Please login."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ... (Keep login, logout, me routes SAME as before) ...
# COPY PASTE THE REST OF THE OLD FILE HERE (login, logout, me)
@bp.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check user status too!
        cur.execute("""
            SELECT user_id, full_name, password_hash, role, status 
            FROM APP_USER WHERE email = :1
        """, [email])
        row = cur.fetchone()

        if not row: return jsonify({"error": "Invalid credentials"}), 401

        user_id, name, db_hash, role, status = row

        if status == 'UNVERIFIED':
            return jsonify({"error": "Account not verified. Please verify first."}), 403
        if status == 'BLOCKED':
            return jsonify({"error": "Account is blocked."}), 403

        if not check_password_hash(db_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        session["user_id"] = user_id
        session["role"] = role
        session["full_name"] = name

        return jsonify({"message": "Login successful", "user": {"user_id": user_id, "full_name": name, "role": role}})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@bp.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@bp.get("/api/me")
def get_current_user():
    user_id = session.get("user_id")
    if not user_id: return jsonify(None), 200
    return jsonify({"user_id": user_id, "full_name": session.get("full_name"), "role": session.get("role")})