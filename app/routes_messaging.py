# app/routes_messaging.py
from flask import Blueprint, request, jsonify, session
from db import get_connection
import oracledb

bp = Blueprint("messaging", __name__)

@bp.get("/api/claims/<int:claim_id>/messages")
def get_messages(claim_id):
    """
    Fetch the chat history for a specific claim.
    FIXED: Keys now match Frontend (content, sent_at).
    """
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Security Check
        cur.execute("""
            SELECT c.claimant_id, r.reporter_id 
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            LEFT JOIN REPORT r ON i.item_id = r.item_id
            WHERE c.claim_id = :1
        """, [claim_id])
        row = cur.fetchone()
        
        if not row:
            return jsonify({"error": "Claim not found"}), 404
            
        claimant_id, reporter_id = row
        if user_id != claimant_id and user_id != reporter_id and session.get("role") != 'ADMIN':
            return jsonify({"error": "Access denied"}), 403

        # 2. Fetch Messages
        cur.execute("""
            SELECT m.message_id, m.sender_id, u.full_name, m.body, m.sent_at
            FROM MESSAGE m
            JOIN APP_USER u ON m.sender_id = u.user_id
            WHERE m.claim_id = :1
            ORDER BY m.sent_at ASC
        """, [claim_id])

        messages = [
            {
                "id": r[0],
                "sender_id": r[1],
                "sender_name": "Me" if r[1] == user_id else r[2],
                "content": r[3],           # <--- CHANGED from 'text' to 'content'
                "sent_at": r[4].isoformat() if r[4] else "" # <--- CHANGED from 'time' to 'sent_at'
            }
            for r in cur.fetchall()
        ]

        return jsonify(messages)

    except Exception as e:
        print("Get Messages Error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@bp.post("/api/claims/<int:claim_id>/messages")
def send_message(claim_id):
    """
    Send a new message in the thread.
    Automatically determines the receiver based on who is sending.
    """
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    if not text: return jsonify({"error": "Empty message"}), 400

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Identify Participants (Who is Sender? Who is Receiver?)
        cur.execute("""
            SELECT c.claimant_id, r.reporter_id 
            FROM CLAIM c
            JOIN ITEM i ON c.item_id = i.item_id
            LEFT JOIN REPORT r ON i.item_id = r.item_id
            WHERE c.claim_id = :1
        """, [claim_id])
        row = cur.fetchone()
        
        if not row: return jsonify({"error": "Claim not found"}), 404
        
        claimant_id, reporter_id = row
        
        # Logic: If I am Claimant, send to Reporter. If I am Reporter, send to Claimant.
        if user_id == claimant_id:
            receiver_id = reporter_id
        elif user_id == reporter_id:
            receiver_id = claimant_id
        else:
            return jsonify({"error": "You are not part of this claim"}), 403

        # 2. Insert Message
        cur.execute("""
            INSERT INTO MESSAGE (claim_id, sender_id, receiver_id, body, sent_at, is_read)
            VALUES (:1, :2, :3, :4, SYSTIMESTAMP, 'N')
        """, [claim_id, user_id, receiver_id, text])

        notif_msg = f"New message regarding claim #{claim_id}"
        cur.execute("""
            INSERT INTO NOTIFICATION (user_id, type, message, is_read, created_at)
            VALUES (:1, 'MESSAGE', :2, 'N', SYSTIMESTAMP)
        """, [receiver_id, notif_msg])

        conn.commit()
        return jsonify({"message": "Sent"}), 201

    except Exception as e:
        print("Send Message Error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()