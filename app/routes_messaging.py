from flask import Blueprint, request, jsonify, session
from db import get_connection
import oracledb
from datetime import datetime

bp = Blueprint("messaging", __name__)

@bp.get("/api/claims/<int:claim_id>/messages")
def get_messages(claim_id):
    """
    Fetch chat history.
    Joins with APP_USER to get the real name of the sender.
    """
    user_id = session.get("user_id")
    if not user_id: return jsonify({"error": "Unauthorized"}), 401

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # 1. Fetch Messages with Sender Names
        cur.execute("""
            SELECT 
                m.message_id, 
                m.sender_id, 
                u.full_name, 
                m.body, 
                m.sent_at
            FROM MESSAGE m
            JOIN APP_USER u ON m.sender_id = u.user_id
            WHERE m.claim_id = :1
            ORDER BY m.sent_at ASC
        """, [claim_id])

        rows = cur.fetchall()
        messages = []
        
        for r in rows:
            # Logic: If I sent it, name is "Me". If they sent it, use their Full Name.
            sender_name = "Me" if r[1] == user_id else r[2]
            
            messages.append({
                "id": r[0],
                "sender_id": r[1],
                "sender_name": sender_name,
                "content": r[3],
                "sent_at": r[4].isoformat() if r[4] else ""
            })

        return jsonify(messages)

    except Exception as e:
        print("Get Messages Error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()


@bp.post("/api/claims/<int:claim_id>/messages")
def send_message(claim_id):
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

        # 1. Find Receiver
        cur.execute("""
            SELECT claimant_id, reporter_id 
            FROM CLAIM c
            JOIN REPORT r ON c.item_id = r.item_id
            WHERE c.claim_id = :1
        """, [claim_id])
        row = cur.fetchone()
        if not row: return jsonify({"error": "Claim not found"}), 404
        
        claimant_id, reporter_id = row
        receiver_id = reporter_id if user_id == claimant_id else claimant_id
        
        if session.get('role') == 'ADMIN': receiver_id = claimant_id

        # 2. Insert & Return ID
        new_msg_id = cur.var(oracledb.NUMBER)
        cur.execute("""
            INSERT INTO MESSAGE (claim_id, sender_id, receiver_id, body, sent_at, is_read)
            VALUES (:1, :2, :3, :4, SYSTIMESTAMP, 'N')
            RETURNING message_id INTO :5
        """, [claim_id, user_id, receiver_id, text, new_msg_id])
        
        msg_id = int(new_msg_id.getvalue()[0])

        # 3. Notify
        cur.execute("""
            INSERT INTO NOTIFICATION (user_id, type, message, is_read, created_at)
            VALUES (:1, 'SYSTEM', 'New chat message', 'N', SYSTIMESTAMP)
        """, [receiver_id])

        conn.commit()

        # 4. RETURN THE MESSAGE OBJECT (Critical Fix)
        # We construct the response so Frontend doesn't need to re-fetch
        return jsonify({
            "id": msg_id,
            "sender_id": user_id,
            "sender_name": "Me",
            "content": text,
            "sent_at": datetime.now().isoformat()
        }), 201

    except Exception as e:
        print("Send Message Error:", e)
        if conn: conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()