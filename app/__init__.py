# app/__init__.py
from flask import Flask, jsonify, request
from db import get_connection
import config
import oracledb


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = config.JWT_SECRET

    @app.get("/")
    def home():
        # http://127.0.0.1:5000/
        return {"message": "Lost & Found API is running"}

    @app.get("/ping")
    def ping():
        # http://127.0.0.1:5000/ping
        return {"message": "pong"}

    @app.get("/api/db-test")
    def db_test():
        """
        Test Oracle FROM Flask.
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

    @app.get("/api/categories")
    def list_categories():
        """
        Get all ACTIVE categories.
        http://127.0.0.1:5000/api/categories
        """
        conn = None
        cur = None
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute("""
                SELECT
                    category_id,
                    name,
                    description,
                    is_active
                FROM CATEGORY
                WHERE is_active = 'Y'
                ORDER BY name
            """)

            rows = cur.fetchall()

            categories = []
            for row in rows:
                category = {
                    "category_id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "is_active": row[3]
                }
                categories.append(category)

            return jsonify(categories)

        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if cur is not None:
                cur.close()
            if conn is not None:
                conn.close()

    @app.get("/api/locations")
    def list_locations():
        """
        Get all ACTIVE locations.
        http://127.0.0.1:5000/api/locations
        """
        conn = None
        cur = None
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute("""
                SELECT
                    location_id,
                    name,
                    description,
                    is_active
                FROM LOCATION
                WHERE is_active = 'Y'
                ORDER BY name
            """)

            rows = cur.fetchall()

            locations = []
            for row in rows:
                location = {
                    "location_id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "is_active": row[3]
                }
                locations.append(location)

            return jsonify(locations)

        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if cur is not None:
                cur.close()
            if conn is not None:
                conn.close()

    @app.get("/api/reports")
    def list_reports():
        """
        Get all ACTIVE reports with item, category, and location info.
        URL: http://127.0.0.1:5000/api/reports
        """
        conn = None
        cur = None
        try:
            # 1) Connect to DB
            conn = get_connection()
            cur = conn.cursor()

            # 2) Run JOIN query
            cur.execute("""
                SELECT
                    r.report_id,
                    r.report_type,
                    r.event_datetime,
                    r.created_at,
                    r.is_active,

                    i.item_id,
                    i.title AS item_title,
                    i.status AS item_status,

                    c.category_id,
                    c.name   AS category_name,

                    l.location_id,
                    l.name   AS location_name

                FROM REPORT r
                JOIN ITEM      i ON r.item_id     = i.item_id
                JOIN CATEGORY  c ON i.category_id = c.category_id
                JOIN LOCATION  l ON r.location_id = l.location_id

                WHERE r.is_active = 'Y'
                ORDER BY r.created_at DESC
            """)

            # 3) Fetch all rows
            rows = cur.fetchall()

            # 4) Convert each row into a dictionary
            reports = []
            for row in rows:
                report = {
                    "report_id":       row[0],
                    "report_type":     row[1],
                    "event_datetime":  row[2].isoformat() if row[2] else None,
                    "created_at":      row[3].isoformat() if row[3] else None,
                    "is_active":       row[4],

                    "item_id":         row[5],
                    "item_title":      row[6],
                    "item_status":     row[7],

                    "category_id":     row[8],
                    "category_name":   row[9],

                    "location_id":     row[10],
                    "location_name":   row[11],
                }
                reports.append(report)

            # 5) Return as JSON list
            return jsonify(reports)

        except Exception as e:
            # If anything breaks, send error as JSON
            return jsonify({"error": str(e)}), 500

    @app.post("/api/reports")
    def create_report():
        """
        Create a new LOST/FOUND report + item.

        Expects JSON like:
        {
          "user_id": 1,
          "report_type": "LOST",
          "title": "Black Lenovo laptop",
          "description": "13 inch, small scratch on lid",
          "category_id": 1,
          "primary_color": "Black",
          "brand": "Lenovo",
          "unique_marks": "Cat sticker on top",
          "image_url": null,
          "location_id": 5,
          "event_datetime": "2025-11-28T09:30:00",
          "additional_details": "Forgot it in the library"
        }
        """
        data = request.get_json(force=True)  # 1) Read JSON body

        # 2) Basic validation for required fields
        required_fields = ["user_id", "report_type", "title", "category_id", "location_id"]
        missing = [field for field in required_fields if not data.get(field)]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        # 3) Check report_type is valid
        if data["report_type"] not in ("LOST", "FOUND"):
            return jsonify({"error": "report_type must be 'LOST' or 'FOUND'"}), 400

        user_id = int(data["user_id"])

        conn = None
        cur = None
        try:
            conn = get_connection()
            cur = conn.cursor()

            # ------------------------------
            # 4) Insert into ITEM first
            # ------------------------------
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
                    created_by
                ) VALUES (
                    :title,
                    :description,
                    :category_id,
                    :primary_color,
                    :brand,
                    :unique_marks,
                    :image_url,
                    :created_by
                )
                RETURNING item_id INTO :item_id
            """, {
                "title":         data.get("title"),
                "description":   data.get("description"),
                "category_id":   data.get("category_id"),
                "primary_color": data.get("primary_color"),
                "brand":         data.get("brand"),
                "unique_marks":  data.get("unique_marks"),
                "image_url":     data.get("image_url"),
                "created_by":    user_id,
                "item_id":       item_id_var,
            })

            item_id = int(item_id_var.getvalue()[0])

            # ------------------------------
            # 5) Insert into REPORT
            # ------------------------------
            report_id_var = cur.var(oracledb.NUMBER)

            event_dt_str = data.get("event_datetime")

            if event_dt_str:
                # With event datetime
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
                        TO_TIMESTAMP(:event_datetime, 'YYYY-MM-DD\"T\"HH24:MI:SS'),
                        :additional_details
                    )
                    RETURNING report_id INTO :report_id
                """, {
                    "item_id":          item_id,
                    "reporter_id":      user_id,
                    "report_type":      data.get("report_type"),
                    "location_id":      data.get("location_id"),
                    "event_datetime":   event_dt_str,
                    "additional_details": data.get("additional_details"),
                    "report_id":        report_id_var,
                })
            else:
                # Without event datetime (NULL)
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
                        NULL,
                        :additional_details
                    )
                    RETURNING report_id INTO :report_id
                """, {
                    "item_id":          item_id,
                    "reporter_id":      user_id,
                    "report_type":      data.get("report_type"),
                    "location_id":      data.get("location_id"),
                    "additional_details": data.get("additional_details"),
                    "report_id":        report_id_var,
                })

            report_id = int(report_id_var.getvalue()[0])

            # ------------------------------
            # 6) Commit the transaction
            # ------------------------------
            conn.commit()

            return jsonify({
                "message": "Report created",
                "report_id": report_id,
                "item_id": item_id
            }), 201

        except Exception as e:
            # If anything fails, roll back changes
            if conn is not None:
                conn.rollback()
            return jsonify({"error": str(e)}), 500

        finally:
            if cur is not None:
                cur.close()
            if conn is not None:
                conn.close()


    return app
