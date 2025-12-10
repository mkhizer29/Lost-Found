import React, { useEffect, useState, useRef } from "react";
import { API_BASE } from "../config";

// 1. UPDATED PROPS: Added 'user' and 'item'
export default function ChatModal({ claimId, item, user, onClose, readOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const sendingRef = useRef(false);

  // --- 1. Initial Load & Polling ---
  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [claimId]);

  // --- 2. Auto-scroll ---
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function loadMessages() {
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
           if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
           return prev;
        });
      }
    } catch (err) { console.error("Poll error", err); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sendingRef.current) return;

    const textToSend = input;
    setInput(""); 
    sendingRef.current = true; 

    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSend, sender_id: user.user_id }), 
        credentials: "include"
      });

      if (!res.ok) throw new Error("Server busy");
      const savedMsg = await res.json();
      setMessages(prev => [...prev, savedMsg]);
    } catch (err) { 
        alert("Failed: " + err.message); 
        setInput(textToSend); 
    } finally {
        sendingRef.current = false; 
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content chat-modal">
        <div className="chat-header">
            <div className="header-info">
                <h3>{item.item_title}</h3>
                <span className="status-dot">● {readOnly ? "Archived" : "Active"}</span>
            </div>
            <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="chat-window">
             {messages.length === 0 ? (
                <p className="empty-chat">Start the conversation...</p>
             ) : (
                messages.map((msg, idx) => {
                    // --- MODIFIED LOGIC START ---
                    
                    // 1. Safe ID Conversion (Prevents Type Errors: "5" vs 5)
                    const senderId = String(msg.sender_id);
                    const myId = String(user.user_id);
                    
                    // Get IDs safely from the item prop
                    const reporterId = item.reporter_id ? String(item.reporter_id) : null;
                    const claimantId = item.claimant_id ? String(item.claimant_id) : null;

                    // 2. Identify "Me"
                    const isMe = senderId === myId;

                    // 3. Determine Display Name & Color
                    let displayName = msg.sender_name || "User";
                    let nameColor = "var(--text-muted)"; // Default Grey

                    if (isMe) {
                        displayName = "You";
                        nameColor = "inherit";
                    } 
                    else if (reporterId && senderId === reporterId) {
                        displayName = `Reporter (${msg.sender_name})`;
                        nameColor = "#c8102e"; // Red
                    } 
                    else if (claimantId && senderId === claimantId) {
                        displayName = `Claimant (${msg.sender_name})`;
                        nameColor = "#3b82f6"; // Blue
                    } 
                    else {
                        // FALLBACK FOR ADMIN VIEW (If IDs are missing)
                        // If we know the Claimant, and this ISN'T them, assume Reporter.
                        if (claimantId && senderId !== claimantId) {
                             displayName = `Reporter (${msg.sender_name})`;
                             nameColor = "#c8102e";
                        } else {
                             displayName = `Claimant (${msg.sender_name})`; // Default
                             nameColor = "#3b82f6";
                        }
                    }
                    // --- MODIFIED LOGIC END ---

                    return (
                        <div key={idx} className={`chat-row ${isMe ? "row-me" : "row-other"}`}>
                            <span className="msg-name" style={{ color: nameColor }}>
                                {displayName}
                            </span>
                            
                            <div className="message-bubble">
                                <p>{msg.content}</p>
                                <span className="msg-time">
                                    {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })
             )}
             <div ref={endRef} />
        </div>

        {!readOnly ? (
            <form onSubmit={handleSend} className="chat-input-area">
                <input 
                    value={input} 
                    onChange={e=>setInput(e.target.value)} 
                    className="chat-input" 
                    placeholder="Type a message..." 
                    autoFocus
                />
                <button className="chat-send-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </form>
        ) : (
            <div className="audit-bar" style={{textAlign:'center', padding:'10px', background:'#f8fafc', color:'#64748b', fontSize:'0.9rem'}}>
                🔒 <strong>Admin Mode:</strong> You are viewing this chat as a third party.
            </div>
        )}
      </div>
    </div>
  );
}