# app/routes_basic.py

from flask import Blueprint, jsonify, request
from db import get_connection   # uses db.py
import oracledb                 # needed for RETURNING ... INTO

bp = Blueprint("basic", __name__)


# ------------------- Simple health checks ------------------- #

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


# ------------------- Lookup routes (categories, locations) ------------------- #

@bp.get("/api/categories")
def get_categories():
    """
    Return all active categories.
    Used by the frontend for the 'Category' dropdown.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT category_id, name, description
            FROM CATEGORY
            WHERE is_active = 'Y'
            ORDER BY name
        """)

        rows = cur.fetchall()
        result = [
            {
                "category_id": row[0],
                "name": row[1],
                "description": row[2],
            }
            for row in rows
        ]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/categories:", e)
        return jsonify({"error": "Failed to load categories"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


@bp.get("/api/locations")
def get_locations():
    """
    Return all active locations.
    Used by the frontend for the 'Location' dropdown.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT location_id, name, description
            FROM LOCATION
            WHERE is_active = 'Y'
            ORDER BY name
        """)

        rows = cur.fetchall()
        result = [
            {
                "location_id": row[0],
                "name": row[1],
                "description": row[2],
            }
            for row in rows
        ]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/locations:", e)
        return jsonify({"error": "Failed to load locations"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


# ------------------- Reports list (for the table) ------------------- #

@bp.get("/api/reports")
def list_reports():
    """
    Return a list of reports + joined item/category/location info.
    Used by the React table on the main page.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
              r.report_id,
              r.report_type,
              i.title          AS item_title,
              c.name           AS category_name,
              l.name           AS location_name,
              i.status         AS item_status,
              r.created_at
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
                "report_type":    row[1],
                "item_title":     row[2],
                "category_name":  row[3],
                "location_name":  row[4],
                "item_status":    row[5],
                "created_at":     row[6].isoformat() if row[6] is not None else None,
            }
            for row in rows
        ]
        return jsonify(result)
    except Exception as e:
        print("Error in GET /api/reports:", e)
        return jsonify({"error": "Failed to load reports"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


# ------------------- Create report (used by the form) ------------------- #

@bp.post("/api/reports")
def create_report():
    """
    Create a new LOST or FOUND report.
    This is called by the React form with JSON like:

    {
      "report_type": "LOST",
      "title": "Grey hoodie",
      "description": "...",
      "category_id": 3,
      "primary_color": "Grey",
      "brand": "Adidas",
      "unique_marks": "IBA logo",
      "image_url": null,
      "location_id": 5,
      "additional_details": "Forgot it in the library",
      "reporter_id": 1
    }
    """
    data = request.get_json(silent=True) or {}

    # Required fields
    title = (data.get("title") or "").strip()
    report_type = (data.get("report_type") or "LOST").strip().upper()
    category_id = data.get("category_id")
    location_id = data.get("location_id")
    reporter_id = data.get("reporter_id")

    # Basic validation
    if not title or not category_id or not location_id or not reporter_id:
        return jsonify({"error": "Missing required fields"}), 400

    if report_type not in ("LOST", "FOUND"):
        return jsonify({"error": "report_type must be LOST or FOUND"}), 400

    # Optional fields
    description = (data.get("description") or None)
    primary_color = (data.get("primary_color") or None)
    brand = (data.get("brand") or None)
    unique_marks = (data.get("unique_marks") or None)
    image_url = (data.get("image_url") or None)
    additional_details = (data.get("additional_details") or None)

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1) Insert into ITEM, get generated item_id back
        item_id_var = cur.var(oracledb.NUMBER)

        cur.execute("""
            INSERT INTO ITEM (
              title,
              description,
              category_id,
              primary_color,
              brand,
              unique_marks,
              image_url,
              status,
              created_by
            ) VALUES (
              :title,
              :description,
              :category_id,
              :primary_color,
              :brand,
              :unique_marks,
              :image_url,
              'OPEN',
              :created_by
            )
            RETURNING item_id INTO :item_id
        """, {
            "title":          title,
            "description":    description,
            "category_id":    int(category_id),
            "primary_color":  primary_color,
            "brand":          brand,
            "unique_marks":   unique_marks,
            "image_url":      image_url,
            "created_by":     int(reporter_id),
            "item_id":        item_id_var,
        })

        new_item_id = int(item_id_var.getvalue()[0])

        # 2) Insert into REPORT, get report_id back
        report_id_var = cur.var(oracledb.NUMBER)

        cur.execute("""
            INSERT INTO REPORT (
              item_id,
              reporter_id,
              report_type,
              location_id,
              event_datetime,
              additional_details
            ) VALUES (
              :item_id,
              :reporter_id,
              :report_type,
              :location_id,
              SYSTIMESTAMP,
              :additional_details
            )
            RETURNING report_id INTO :report_id
        """, {
            "item_id":          new_item_id,
            "reporter_id":      int(reporter_id),
            "report_type":      report_type,
            "location_id":      int(location_id),
            "additional_details": additional_details,
            "report_id":        report_id_var,
        })

        new_report_id = int(report_id_var.getvalue()[0])

        # Commit the transaction
        conn.commit()

        return jsonify({
            "message": "Report created",
            "report_id": new_report_id,
            "item_id": new_item_id,
        }), 201

    except Exception as e:
        # Print full error in the server log
        print("Error in POST /api/reports:", e)

        # Attempt rollback if something went wrong mid-transaction
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass

        # IMPORTANT: in development, return the actual error text
        return jsonify({"error": str(e)}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()
