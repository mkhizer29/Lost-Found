//myactivity.jsx
import React, { useState } from "react";
import { API_BASE } from "../config";
import ChatModal from "../modals/ChatModal"; 

export default function MyActivity({ type, myClaims, onEscalate, onMarkReturned, onDecision, user }) {
  
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Filter Logic
  const relevantClaims = type === 'claims' 
    ? myClaims.filter(c => c.report_type === 'FOUND') 
    : myClaims.filter(c => c.report_type === 'LOST'); 

  const title = type === 'claims' ? "My Claims (Items I Lost)" : "My Discoveries (Items I Found)";

  const openLocalChat = (claim) => {
    setSelectedClaim({ ...claim, reporter_id: claim.reporter_id });
    setActiveClaimId(claim.claim_id);
  };

  const getChatButtonStyle = () => {
    return type === 'claims' 
      ? { background: "var(--primary)", color: "white" } 
      : { background: "var(--accent-gold)", color: "black" };
  };

  if (relevantClaims.length === 0) {
    return (
      <section className="overview-section">
        <h2>{title}</h2>
        <p className="info">No activity yet.</p>
      </section>
    );
  }

  return (
    <section className="overview-section">
      <h2 style={{color: 'var(--primary)'}}>{title}</h2>
      
      <table className="reports-table">
        <thead>
          <tr>
            <th>ID</th><th>Item</th><th>Status</th><th>Last Message</th><th>Date</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {relevantClaims.map((c) => {
            // --- ROBUST LOGIC START ---
            
            // 1. Identify Context
            const isDiscovery = type !== 'claims';

            // 2. Normalize Data (Handle "Approved", "approved", "APPROVED" safely)
            const claimStatus = (c.status || "").toUpperCase(); 
            const itemStatus  = (c.item_status || "").toUpperCase();

            // 3. Define Conditions
            const isApproved = claimStatus === 'APPROVED' || claimStatus === 'ACCEPTED';
            const isPending  = claimStatus === 'PENDING';
            const isRejected = claimStatus === 'REJECTED';
            const isEscalated= claimStatus === 'ESCALATED';
            const isItemReturned = itemStatus === 'RETURNED';

            // --- ROBUST LOGIC END ---

            return (
              <tr key={c.claim_id}>
                <td>{c.claim_id}</td>
                <td style={{ fontWeight: "bold" }}>
                    {c.item_title}
                    {/* DEBUG HELPER: Remove this line after testing */}
                    <div style={{fontSize:'0.6rem', color:'red'}}>DEBUG: {claimStatus} / {itemStatus}</div>
                </td>
                <td><span className={`status-badge ${claimStatus.toLowerCase()}`}>{claimStatus}</span></td>
                <td style={{ color: "var(--text-muted)", maxWidth: "200px", fontSize:'0.9rem' }}>{c.message}</td>
                <td style={{ fontSize: "0.85rem" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: 'center' }}>
                    
                    {/* 1. CHAT (Always visible) */}
                    <button className="claim-btn" style={getChatButtonStyle()} onClick={() => openLocalChat(c)}>
                      Chat
                    </button>

                    {/* === DISCOVERIES TAB (I Found It) === */}
                    {isDiscovery && (
                        <>
                            {/* LOCKED: Pending + High Value */}
                            {isPending && c.is_high_value === 1 && (
                                <span style={{fontSize:'0.7rem', color:'#c8102e', border:'1px solid #c8102e', padding:'4px', borderRadius:'4px'}}>
                                    🔒 Admin Review
                                </span>
                            )}

                            {/* WAITING: Pending + Normal Value */}
                            {isPending && c.is_high_value === 0 && (
                                <span style={{fontSize:'0.7rem', color:'#64748b', fontStyle:'italic'}}>
                                    ⏳ Waiting for Owner
                                </span>
                            )}

                            {/* APPROVED: Show Return Button (Unless already returned) */}
                            {isApproved && !isItemReturned && (
                                <button 
                                    className="submit-btn" 
                                    style={{background:'#0f172a', fontSize:'0.75rem', padding:'6px 10px'}} 
                                    onClick={() => onMarkReturned(c.item_id || c.report_id)}
                                >
                                    Mark Returned
                                </button>
                            )}
                            
                            {/* ALREADY RETURNED */}
                            {isItemReturned && (
                                <span style={{fontSize:'0.7rem', color:'#059669', fontWeight:'bold'}}>
                                    ✓ Returned
                                </span>
                            )}
                        </>
                    )}

                    {/* === CLAIMS TAB (I Lost It) === */}
                    {!isDiscovery && (
                        <>
                             {isRejected && (
                                <button className="submit-btn" style={{ background: "#eab308", color: "black", fontSize:'0.75rem' }} 
                                    onClick={() => onEscalate(c.claim_id)} 
                                >
                                    Escalate
                                </button>
                            )}
                            
                            {isEscalated && (
                                <span style={{ fontSize: "0.75rem", color: "#ca8a04", fontWeight: "bold", fontStyle: "italic" }}>
                                    Under Review
                                </span>
                            )}
                        </>
                    )}
                    
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeClaimId && selectedClaim && (
        <ChatModal claimId={activeClaimId} item={selectedClaim} user={user} onClose={() => setActiveClaimId(null)} />
      )}
    </section>
  );
}