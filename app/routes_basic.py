# app/routes_basic.py

import os
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app, session
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
        cur.execute("SELECT category_id, name, description, is_high_value FROM CATEGORY WHERE is_active = 'Y' ORDER BY name")
        rows = cur.fetchall()
        result = [{"category_id": row[0], "name": row[1], "description": row[2], "is_high_value": row[3]} for row in rows]
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
    Fetch ALL reports for the Browse Feed.
    UPDATED: Checks if the CURRENT user has already claimed the item.
    """
    user_id = session.get("user_id")
    # If not logged in, pass 0 (so no matches found)
    safe_uid = user_id if user_id else 0

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
              r.report_id,
              i.item_id,      
              r.report_type,
              i.title,
              c.name AS category_name,
              l.name AS location_name,
              i.status,
              r.created_at,
              i.image_url,
              r.reporter_id,
              c.IS_HIGH_VALUE,
              -- CHECK IF I HAVE CLAIMED THIS (Returns 1 if yes, 0 if no)
              (SELECT COUNT(*) FROM CLAIM cl WHERE cl.item_id = i.item_id AND cl.claimant_id = :1) as my_claim_count,
              -- CHECK IF ANYONE ELSE HAS AN APPROVED CLAIM (To lock it)
              (SELECT status FROM CLAIM gc WHERE gc.item_id = i.item_id AND gc.status = 'APPROVED' FETCH FIRST 1 ROWS ONLY) as approved_status
            FROM REPORT r
              JOIN ITEM     i ON r.item_id     = i.item_id
              JOIN CATEGORY c ON i.category_id = c.category_id
              JOIN LOCATION l ON r.location_id = l.location_id
            ORDER BY r.created_at DESC
        """, [safe_uid])

        rows = cur.fetchall()
        result = [
            {
                "report_id":      row[0],
                "item_id":        row[1],
                "report_type":    row[2],
                "item_title":     row[3],
                "category_name":  row[4],
                "location_name":  row[5],
                "item_status":    row[6],
                "created_at":     row[7].isoformat() if row[7] is not None else None,
                "item_image_url": row[8],
                "reporter_id":    row[9],
                "is_high_value":  row[10],
                "already_claimed": row[11] > 0, # True if I claimed it
                "approved_status": row[12]
            }
            for row in rows
        ]
        return jsonify(result)

    except Exception as e:
        print("Error in GET /api/reports:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


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

# ------------------- My Reports ------------------- #

@bp.get("/api/my-reports")
def get_my_reports():
    """
    Get items REPORTED by the current user.
    Fixed: Includes 'item_id' in SQL so row[7] exists.
    """
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                r.report_id,
                i.title,
                i.status AS item_status,
                c.claim_id,
                u.full_name AS claimant_name,
                c.status AS claim_status,
                r.report_type, -- Index 6
                i.item_id,      
                cat.is_high_value,
                c.claim_message,    
                ce.evidence_value   
            FROM REPORT r
            JOIN ITEM i ON r.item_id = i.item_id
            JOIN CATEGORY cat ON i.category_id = cat.category_id
            LEFT JOIN CLAIM c ON i.item_id = c.item_id
            LEFT JOIN APP_USER u ON c.claimant_id = u.user_id
            LEFT JOIN CLAIM_EVIDENCE ce ON c.claim_id = ce.claim_id AND ce.evidence_type = 'PHOTO'
            WHERE r.reporter_id = :1
            ORDER BY r.created_at DESC
        """, [user_id])

        rows = cur.fetchall()
        results = [
            {
                "report_id": row[0],
                "item_title": row[1],
                "item_status": row[2],
                "claim_id": row[3],
                "claimant_name": row[4],
                "claim_status": row[5],
                "report_type": row[6],
                "item_id": row[7],
                "is_high_value": row[8],
                "claim_message": row[9],
                "proof_url": row[10]
            }
            for row in rows
        ]
        return jsonify(results)

    except Exception as e:
        print("Error in GET /api/my-reports:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ------------------- Claims Logic (NEW) ------------------- #

@bp.get("/api/my-claims")
def get_my_claims():
    """
    Get interactions initiated by the current user.
    Returns:
      - claim status (PENDING / APPROVED / REJECTED / ESCALATED)
      - report_type (LOST / FOUND)
      - item_status (OPEN / CLAIMED / RETURNED)  <-- IMPORTANT
    """
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                c.claim_id,        -- 0
                i.title,           -- 1
                c.status,          -- 2 (claim status)
                c.claim_message,   -- 3
                c.created_at,      -- 4
                i.item_id,         -- 5
                r.report_type,     -- 6 ('LOST' or 'FOUND')
                i.status           -- 7 (item status: OPEN / CLAIMED / RETURNED)
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            JOIN REPORT r ON i.item_id = r.item_id
            WHERE c.claimant_id = :1
            ORDER BY c.created_at DESC
        """, [user_id])

        rows = cur.fetchall()
        results = [
            {
                "claim_id": row[0],
                "item_title": row[1],
                "status": row[2],
                "message": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "item_id": row[5],
                "report_type": row[6],       # 'LOST' or 'FOUND'
                "item_status": row[7]        # 'OPEN' / 'CLAIMED' / 'RETURNED'
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


@bp.post("/api/claims")
def create_claim():
    """
    Submit a claim for an item.
    UPDATED: Checks if user already claimed this item.
    """
    item_id = request.form.get("item_id")
    claimant_id = request.form.get("claimant_id")
    evidence_text = request.form.get("evidence_text")

    if not item_id or not claimant_id or not evidence_text:
        return jsonify({"error": "Missing item_id, claimant_id, or evidence"}), 400

    # Handle Photo
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

        # 1. CHECK FOR DUPLICATE CLAIM (New Logic)
        cur.execute("""
            SELECT claim_id FROM CLAIM 
            WHERE item_id = :1 AND claimant_id = :2
        """, [item_id, claimant_id])
        if cur.fetchone():
            return jsonify({"error": "You have already claimed this item."}), 400

        # 2. Verify Item Status (Open or Matched)
        cur.execute("SELECT status FROM ITEM WHERE item_id = :1", [item_id])
        row = cur.fetchone()
        if not row: return jsonify({"error": "Item not found"}), 404
        if row[0] not in ('OPEN', 'MATCHED'):
             return jsonify({"error": f"Item not available (Status: {row[0]})"}), 400

        # 3. Insert CLAIM
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
            "claim_message": evidence_text,
            "claim_id": claim_id_var
        })
        new_claim_id = int(claim_id_var.getvalue()[0])

        # 4. Insert Evidence
        if proof_url:
            cur.execute("""
                INSERT INTO CLAIM_EVIDENCE (
                    claim_id, evidence_type, evidence_value, created_at
                ) VALUES (
                    :claim_id, 'PHOTO', :evidence_value, SYSTIMESTAMP
                )
            """, {"claim_id": new_claim_id, "evidence_value": proof_url})

        conn.commit()
        return jsonify({"message": "Claim submitted successfully", "claim_id": new_claim_id}), 201

    except Exception as e:
        print("Error in POST /api/claims:", e)
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ------------------- ADMIN DASHBOARD ------------------- #

@bp.get("/api/admin/claims_queue")
def get_pending_claims():
    """
    Fetch all claims with status 'PENDING' for the Admin Dashboard.
    Joins with ITEM to show what is being claimed.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT 
                c.claim_id,
                c.claimant_id,
                i.title AS item_title,
                c.claim_message,
                c.created_at,
                ce.evidence_value AS proof_url,
                c.status -- <--- ADD THIS COLUMN HERE
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            LEFT JOIN CLAIM_EVIDENCE ce ON c.claim_id = ce.claim_id AND ce.evidence_type = 'PHOTO'
            WHERE c.status IN ('PENDING', 'ESCALATED')
            ORDER BY 
                CASE WHEN c.status = 'ESCALATED' THEN 1 ELSE 2 END, -- Show Disputes First
                c.created_at ASC
        """)

        rows = cur.fetchall()
        results = [
            {
                "claim_id": row[0],
                "claimant_id": row[1],
                "item_title": row[2],
                "message": row[3],
                "created_at": row[4].isoformat() if row[4] else None,
                "proof_url": row[5],
                "status": row[6]  # <--- ADD THIS MAPPING
            }
            for row in rows
        ]
        return jsonify(results)

    except Exception as e:
        print("Error in GET /api/admin/claims:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


# ------------------- APPROVE / REJECT (ADMIN & REPORTER) ------------------- #

@bp.post("/api/claims/approve") 
def approve_claim():
    """
    Approve a claim.
    Allowed for: ADMIN or the REPORTER (Finder) of the item.
    """
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    claim_id = data.get("claim_id")
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Fetch associated item and users for this claim (item_id, reporter_id, claimant_id)
        cur.execute("""
            SELECT i.item_id, r.reporter_id, c.claimant_id
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            JOIN REPORT r ON i.item_id = r.item_id
            WHERE c.claim_id = :1
        """, [claim_id])
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Claim not found"}), 404
        item_id, reporter_id, claimant_id = row

        # 2. Check if the item's category is high value
        cur.execute("""
            SELECT cat.IS_HIGH_VALUE
            FROM ITEM i
            JOIN CATEGORY cat ON i.category_id = cat.category_id
            WHERE i.item_id = :1
        """, [item_id])
        cat_row = cur.fetchone()
        is_high_value = cat_row[0] if cat_row else 0

        # 3. Permission Logic
        user_role = session.get("role")
        
        # If Admin -> Allow everything
        if user_role == 'ADMIN':
            pass
        # If Reporter -> Allow ONLY if NOT high value
        elif user_id == reporter_id:
            if is_high_value == 1:
                return jsonify({"error": "Security Restriction: High-value items (Electronics, etc.) must be approved by an Admin."}), 403
        else:
            return jsonify({"error": "Unauthorized"}), 403

        # 3. Update Database (Approve Claim, Close Item, Reject Others)
        cur.execute("UPDATE CLAIM SET status = 'APPROVED' WHERE claim_id = :1", [claim_id])
        cur.execute("UPDATE ITEM SET status = 'CLAIMED' WHERE item_id = :1", [item_id])
        cur.execute("UPDATE CLAIM SET status = 'REJECTED' WHERE item_id = :1 AND claim_id != :2 AND status = 'PENDING'", [item_id, claim_id])

        # 4. Create Notification
        msg = "Good news! Your claim has been APPROVED. Please coordinate pickup."
        cur.execute("INSERT INTO NOTIFICATION (user_id, type, message, is_read, created_at) VALUES (:1, 'CLAIM_STATUS', :2, 'N', SYSTIMESTAMP)", [claimant_id, msg])

        conn.commit()
        return jsonify({"message": "Approved"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@bp.post("/api/claims/reject")
def reject_claim():
    """
    Reject a claim.
    Allowed for: ADMIN or the REPORTER.
    """
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    claim_id = data.get("claim_id")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Get Info
        cur.execute("""
            SELECT r.reporter_id, c.claimant_id 
            FROM CLAIM c 
            JOIN ITEM i ON c.item_id = i.item_id 
            JOIN REPORT r ON i.item_id = r.item_id 
            WHERE c.claim_id = :1
        """, [claim_id])
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404

        reporter_id, claimant_id = row

        # 2. Permission Check (Admin OR reporter)
        if session.get("role") != 'ADMIN' and user_id != reporter_id:
            return jsonify({"error": "Unauthorized"}), 403

        # 3. Update Status
        cur.execute(
            "UPDATE CLAIM SET status = 'REJECTED' WHERE claim_id = :1",
            [claim_id]
        )
        
        # 4. Create Notification
        msg = "Your claim was not accepted."
        cur.execute("""
            INSERT INTO NOTIFICATION (user_id, type, message, is_read, created_at)
            VALUES (:1, 'CLAIM_STATUS', :2, 'N', SYSTIMESTAMP)
        """, [claimant_id, msg])

        conn.commit()
        return jsonify({"message": "Rejected"})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


#--------------Returning Item to Claimant (REPORTER / CLAIMANT / ADMIN) ----------------#
@bp.post("/api/items/returned")
def mark_returned():
    """
    Final Resolution: The item has been handed over.
    Allowed for:
      - The original REPORTER (who created the report),
      - The APPROVED CLAIMANT, or
      - Any ADMIN.
    Status becomes 'RETURNED'.
    """
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    item_id = data.get("item_id")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Verify Item exists and get reporter + approved claimant (if any)
        cur.execute("""
            SELECT 
                r.reporter_id,
                c.claimant_id,
                i.status
            FROM REPORT r
            JOIN ITEM i ON r.item_id = i.item_id
            LEFT JOIN CLAIM c 
                   ON i.item_id = c.item_id 
                  AND c.status = 'APPROVED'
            WHERE r.item_id = :1
        """, [item_id])
        row = cur.fetchone()
        
        if not row:
            return jsonify({"error": "Item not found in database"}), 404

        reporter_id, claimant_id, item_status = row

        user_role = session.get("role")

        # 2. Permission logic:
        #    - ADMIN: always allowed
        #    - Otherwise: reporter OR approved claimant
        if user_role != 'ADMIN':
            allowed_users = {reporter_id}
            if claimant_id:
                allowed_users.add(claimant_id)

            if user_id not in allowed_users:
                return jsonify({
                    "error": "Only the reporter, approved claimant, or an admin can mark this as returned."
                }), 403

        # Optional: you can enforce that only CLAIMED items can move to RETURNED
        # if item_status != 'CLAIMED':
        #     return jsonify({"error": f"Item must be CLAIMED before it can be marked RETURNED (current: {item_status})."}), 400

        # 3. Update Item Status
        cur.execute("UPDATE ITEM SET status = 'RETURNED' WHERE item_id = :1", [item_id])

        # 4. Notify the Claimant, if present
        if claimant_id:
            msg = "The item has been marked as RETURNED. Thank you!"
            cur.execute("""
                INSERT INTO NOTIFICATION (user_id, type, message, is_read, created_at)
                VALUES (:1, 'SYSTEM', :2, 'N', SYSTIMESTAMP)
            """, [claimant_id, msg])

        conn.commit()
        return jsonify({"message": "Item marked as returned."})

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ------------------- Escalate to Admin ------------------- #
@bp.post("/api/claims/escalate")
def escalate_claim():
    """
    Allow a Claimant to appeal a rejection.
    Status becomes 'ESCALATED'.
    """
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    claim_id = data.get("claim_id")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Verify User is the Claimant and Status is REJECTED
        cur.execute("SELECT claimant_id, status FROM CLAIM WHERE claim_id = :1", [claim_id])
        row = cur.fetchone()
        if not row: return jsonify({"error": "Claim not found"}), 404
        
        claimant_id, status = row
        if user_id != claimant_id:
            return jsonify({"error": "Only the claimant can escalate this."}), 403
        
        if status != 'REJECTED':
            return jsonify({"error": "Only rejected claims can be escalated."}), 400

        # 2. Update Status
        cur.execute("UPDATE CLAIM SET status = 'ESCALATED' WHERE claim_id = :1", [claim_id])
        conn.commit()
        
        return jsonify({"message": "Claim escalated to Admin."})

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

#-- ------------------- Similarity Check------------------- 

# app/routes_basic.py

@bp.get("/api/reports/<int:report_id>/matches")
def get_matches(report_id):
    """
    Smart Matching Algorithm:
    Finds FOUND items similar to a specific LOST report.
    Ranking Logic:
    - Must match CATEGORY (Strict)
    - +10 points for Same Location
    - +5 points for Same Color
    - +5 points for matching words in Title
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Fetch details of the LOST item first
        cur.execute("""
            SELECT i.category_id, i.primary_color, r.location_id, i.title, r.event_datetime
            FROM REPORT r
            JOIN ITEM i ON r.item_id = i.item_id
            WHERE r.report_id = :1 AND r.report_type = 'LOST'
        """, [report_id])
        
        lost_item = cur.fetchone()
        if not lost_item:
            return jsonify({"error": "Lost report not found"}), 404
            
        cat_id, color, loc_id, title, lost_date = lost_item
        
        # Safe handling for None values
        color = color if color else ""
        title_keyword = title.split()[0] if title else "" # Simple keyword: First word of title

        # 2. Search for Matches (The Smart Query)
        # We look for FOUND items in the same category that are OPEN.
        query = """
            SELECT 
                r.report_id,
                i.item_id,
                i.title,
                i.primary_color,
                l.name as location_name,
                i.image_url,
                r.event_datetime,
                -- CALCULATE MATCH SCORE
                (
                    CASE WHEN r.location_id = :loc_id THEN 10 ELSE 0 END +
                    CASE WHEN LOWER(i.primary_color) = LOWER(:color) THEN 5 ELSE 0 END +
                    CASE WHEN LOWER(i.title) LIKE LOWER(:title_pattern) THEN 5 ELSE 0 END
                ) as match_score
            FROM REPORT r
            JOIN ITEM i ON r.item_id = i.item_id
            JOIN LOCATION l ON r.location_id = l.location_id
            WHERE r.report_type = 'FOUND'
              AND i.status = 'OPEN'
              AND i.category_id = :cat_id
              -- Filter: Must have at least one matching attribute (Score > 0)
              AND (
                  r.location_id = :loc_id OR 
                  LOWER(i.primary_color) = LOWER(:color) OR
                  LOWER(i.title) LIKE LOWER(:title_pattern)
              )
            ORDER BY match_score DESC, r.created_at DESC
        """

        cur.execute(query, {
            "loc_id": loc_id,
            "color": color,
            "title_pattern": f"%{title_keyword}%",
            "cat_id": cat_id
        })
        
        rows = cur.fetchall()
        matches = [
            {
                "report_id": r[0],
                "item_id": r[1],
                "title": r[2],
                "color": r[3],
                "location": r[4],
                "image_url": r[5],
                "date": r[6].isoformat() if r[6] else "N/A",
                "score": r[7]
            }
            for r in rows
        ]

        return jsonify(matches)

    except Exception as e:
        print("Matching Error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# ------------------- NOTIFICATIONS ------------------- #

@bp.get("/api/notifications")
def get_notifications():
    """Fetch recent notifications for the logged-in user."""
    user_id = session.get("user_id")
    if not user_id: return jsonify([]), 200

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT notification_id, type, message, created_at, is_read
            FROM NOTIFICATION
            WHERE user_id = :1
            ORDER BY created_at DESC
            FETCH FIRST 20 ROWS ONLY
        """, [user_id])
        
        rows = cur.fetchall()
        result = [{
            "id": r[0], 
            "type": r[1], 
            "message": r[2], 
            "date": r[3].isoformat() if r[3] else None, 
            "is_read": r[4]
        } for r in rows]
        
        return jsonify(result)
    except Exception as e:
        print("Notif Error:", e)
        return jsonify([]), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@bp.post("/api/notifications/mark-read")
def mark_notifications_read():
    """Mark all notifications as read when the user opens the dropdown."""
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE NOTIFICATION SET is_read = 'Y' WHERE user_id = :1", [user_id])
        conn.commit()
        return jsonify({"message": "Marked read"})
    finally:
        if cur: cur.close()
        if conn: conn.close()