# app/routes_basic.py

import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app
from db import get_connection
import oracledb

bp = Blueprint("basic", __name__)

# --- CONFIG FOR UPLOADS ---
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ------------------- Simple health checks ------------------- #

@bp.get("/ping")
def ping():
    return jsonify({"message": "pong"})

@bp.get("/api/db-test")
def db_test():
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
        if cur: cur.close()
        if conn: conn.close()


# ------------------- Lookup routes ------------------- #

@bp.get("/api/categories")
def get_categories():
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT category_id, name, description FROM CATEGORY WHERE is_active = 'Y' ORDER BY name")
        rows = cur.fetchall()
        result = [{"category_id": row[0], "name": row[1], "description": row[2]} for row in rows]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/categories:", e)
        return jsonify({"error": "Failed to load categories"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@bp.get("/api/locations")
def get_locations():
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT location_id, name, description FROM LOCATION WHERE is_active = 'Y' ORDER BY name")
        rows = cur.fetchall()
        result = [{"location_id": row[0], "name": row[1], "description": row[2]} for row in rows]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/locations:", e)
        return jsonify({"error": "Failed to load locations"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ------------------- Reports list (GET) ------------------- #

@bp.get("/api/reports")
def list_reports():
    """
    Return a list of reports + joined item info.
    UPDATED: Now selects i.item_id so we can use it for claims.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # UPDATED SQL: Added i.item_id at index 1
        cur.execute("""
            SELECT 
              r.report_id,
              i.item_id,      
              r.report_type,
              i.title          AS item_title,
              c.name           AS category_name,
              l.name           AS location_name,
              i.status         AS item_status,
              r.created_at,
              i.image_url      AS item_image_url
            FROM REPORT r
              JOIN ITEM     i ON r.item_id     = i.item_id
              JOIN CATEGORY c ON i.category_id = c.category_id
              JOIN LOCATION l ON r.location_id = l.location_id
            ORDER BY r.created_at DESC
        """)

        rows = cur.fetchall()
        result = [
            {
                "report_id":      row[0],
                "item_id":        row[1], # Critical for Claims
                "report_type":    row[2],
                "item_title":     row[3],
                "category_name":  row[4],
                "location_name":  row[5],
                "item_status":    row[6],
                "created_at":     row[7].isoformat() if row[7] is not None else None,
                "item_image_url": row[8],
            }
            for row in rows
        ]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/reports:", e)
        return jsonify({"error": "Failed to load reports"}), 500
    finally:
        if cur is not None: cur.close()
        if conn is not None: conn.close()


# ------------------- Create report (POST) ------------------- #

@bp.post("/api/reports")
def create_report():
    """
    Create a new LOST or FOUND report with an IMAGE.
    Expects multipart/form-data.
    """
    # 1. Handle Text Data
    title = request.form.get("title", "").strip()
    report_type = request.form.get("report_type", "LOST").strip().upper()
    category_id = request.form.get("category_id")
    location_id = request.form.get("location_id")
    reporter_id = request.form.get("reporter_id") 

    if not title or not category_id or not location_id or not reporter_id:
        return jsonify({"error": "Missing required fields"}), 400

    description = request.form.get("description") or None
    primary_color = request.form.get("primary_color") or None
    brand = request.form.get("brand") or None
    unique_marks = request.form.get("unique_marks") or None
    additional_details = request.form.get("additional_details") or None

    # 2. Handle Image Upload
    image_url = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(f"report_{reporter_id}_{file.filename}")
            # Ensure static/uploads exists inside app/
            upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            
            file.save(os.path.join(upload_folder, filename))
            image_url = f"/static/uploads/{filename}"

    # 3. Database Insertion
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Insert ITEM
        item_id_var = cur.var(oracledb.NUMBER)
        cur.execute("""
            INSERT INTO ITEM (
              title, description, category_id, primary_color, brand, 
              unique_marks, image_url, status, created_by
            ) VALUES (
              :title, :description, :category_id, :primary_color, :brand, 
              :unique_marks, :image_url, 'OPEN', :created_by
            ) RETURNING item_id INTO :item_id
        """, {
            "title": title, "description": description, "category_id": int(category_id),
            "primary_color": primary_color, "brand": brand, "unique_marks": unique_marks,
            "image_url": image_url, "created_by": int(reporter_id), "item_id": item_id_var,
        })
        new_item_id = int(item_id_var.getvalue()[0])

        # Insert REPORT
        report_id_var = cur.var(oracledb.NUMBER)
        cur.execute("""
            INSERT INTO REPORT (
              item_id, reporter_id, report_type, location_id, 
              event_datetime, additional_details
            ) VALUES (
              :item_id, :reporter_id, :report_type, :location_id, 
              SYSTIMESTAMP, :additional_details
            ) RETURNING report_id INTO :report_id
        """, {
            "item_id": new_item_id, "reporter_id": int(reporter_id),
            "report_type": report_type, "location_id": int(location_id),
            "additional_details": additional_details, "report_id": report_id_var,
        })
        new_report_id = int(report_id_var.getvalue()[0])

        conn.commit()
        return jsonify({
            "message": "Report created successfully",
            "report_id": new_report_id,
            "item_id": new_item_id,
            "image_url": image_url
        }), 201

    except Exception as e:
        print("Error in POST /api/reports:", e)
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ------------------- Claims Logic (NEW) ------------------- #

# app/routes_basic.py (Replace the create_claim function at the bottom)

@bp.post("/api/claims")
def create_claim():
    """
    Submit a claim for an item with optional PHOTO evidence.
    Matches the user's specific schema (CLAIM + CLAIM_EVIDENCE tables).
    """
    # 1. Get Text Data
    item_id = request.form.get("item_id")
    claimant_id = request.form.get("claimant_id")
    evidence_text = request.form.get("evidence_text")

    if not item_id or not claimant_id or not evidence_text:
        return jsonify({"error": "Missing item_id, claimant_id, or evidence text"}), 400

    # 2. Handle Proof Photo Upload
    proof_url = None
    if 'proof_image' in request.files:
        file = request.files['proof_image']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(f"claim_proof_{item_id}_{claimant_id}_{file.filename}")
            upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            file.save(os.path.join(upload_folder, filename))
            proof_url = f"/static/uploads/{filename}"

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 3. Verify Item Status
        cur.execute("SELECT status FROM ITEM WHERE item_id = :1", [item_id])
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Item not found"}), 404
        
        if row[0] not in ('OPEN', 'MATCHED'):
             return jsonify({"error": f"Item is not available (Status: {row[0]})"}), 400

        # 4. Insert CLAIM (Using YOUR column names: claim_message, created_at)
        claim_id_var = cur.var(oracledb.NUMBER)
        cur.execute("""
            INSERT INTO CLAIM (
                item_id, claimant_id, status, claim_message, created_at
            ) VALUES (
                :item_id, :claimant_id, 'PENDING', :claim_message, SYSTIMESTAMP
            ) RETURNING claim_id INTO :claim_id
        """, {
            "item_id": int(item_id),
            "claimant_id": int(claimant_id),
            "claim_message": evidence_text, # Mapping evidence_text -> claim_message
            "claim_id": claim_id_var
        })
        new_claim_id = int(claim_id_var.getvalue()[0])

        # 5. Insert Evidence (If photo exists, put it in CLAIM_EVIDENCE table)
        if proof_url:
            cur.execute("""
                INSERT INTO CLAIM_EVIDENCE (
                    claim_id, evidence_type, evidence_value, created_at
                ) VALUES (
                    :claim_id, 'PHOTO', :evidence_value, SYSTIMESTAMP
                )
            """, {
                "claim_id": new_claim_id,
                "evidence_value": proof_url
            })

        conn.commit()
        return jsonify({"message": "Claim submitted successfully", "claim_id": new_claim_id}), 201

    except Exception as e:
        print("Error in POST /api/claims:", e)
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# app/routes_basic.py (Add to bottom)

@bp.get("/api/my-claims")
def get_my_claims():
    """
    Get all claims made by the current user (hardcoded ID 22 for now).
    """
    # Hardcoded to match the frontend TEST_CLAIMANT_ID
    current_user_id = 22 
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                c.claim_id,
                i.title,
                c.status,
                c.claim_message,
                c.created_at
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            WHERE c.claimant_id = :1
            ORDER BY c.created_at DESC
        """, [current_user_id])

        rows = cur.fetchall()
        results = [
            {
                "claim_id": row[0],
                "item_title": row[1],
                "status": row[2],
                "message": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            }
            for row in rows
        ]
        return jsonify(results)

    except Exception as e:
        print("Error in GET /api/my-claims:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()