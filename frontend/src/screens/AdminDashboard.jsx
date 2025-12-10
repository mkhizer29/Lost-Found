import React, { useState } from "react";
import { API_BASE } from "../config";
import ChatModal from "../modals/ChatModal"; // Import the updated Modal

export default function AdminDashboard({ claims, onDecision, user }) { // Ensure 'user' is passed from props
  
  // 1. Local State for Modal
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // Helper to open chat
  function openAdminChat(claim) {
    setSelectedClaim(claim);
    setActiveClaimId(claim.claim_id);
  }

  // Empty State
  if (!claims || claims.length === 0) {
      return (
        <section className="overview-section">
            <p className="info">No pending claims in the queue.</p>
        </section>
      );
  }

  return (
    <section className="overview-section">
      <h2 style={{color: 'var(--primary)'}}>Admin Claims Queue</h2>
      
      <table className="reports-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Item</th>
            <th>User ID</th>
            <th>Message</th>
            <th>Proof</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {claims.map(c => (
            <tr key={c.claim_id}>
              <td>{c.claim_id}</td>
              <td style={{fontWeight:'bold'}}>{c.item_title}</td>
              <td>{c.claimant_id}</td>
              <td style={{fontSize:'0.9rem', color:'var(--text-muted)', maxWidth:'200px'}}>
                  {c.message}
              </td>
              <td>
                 {c.proof_url ? 
                    <a 
                        href={`${API_BASE}${c.proof_url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{color:'var(--accent-blue)', textDecoration:'underline', fontWeight:'600'}}
                    >
                        View
                    </a>
                    : <span style={{color:'#ccc'}}>None</span>}
              </td>
              <td>
                 <div style={{display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'}}>
                    
                    {/* Dispute Badge */}
                    {c.status === 'ESCALATED' && (
                        <span style={{
                            color:'#dc2626', 
                            background:'#fef2f2', 
                            padding:'2px 6px', 
                            borderRadius:'4px', 
                            fontWeight:'bold', 
                            fontSize:'0.7rem', 
                            border:'1px solid #fecaca'
                        }}>
                            ⚠ DISPUTED
                        </span>
                    )}
                    
                    {/* AUDIT MODE CHAT BUTTON */}
                    {/* Now calls local openAdminChat function */}
                    <button 
                        className="claim-btn" 
                        style={{background:'#475569'}} // Slate Grey for Admin Tools
                        onClick={() => openAdminChat(c)} 
                    >
                        View Chat
                    </button>
                    
                    {/* Decision Buttons */}
                    <button className="submit-btn" onClick={() => onDecision('approve', c.claim_id)}>
                        Approve
                    </button>
                    <button className="cancel-btn" onClick={() => onDecision('reject', c.claim_id)}>
                        Reject
                    </button>
                 </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RENDER CHAT MODAL FOR ADMIN */}
      {activeClaimId && selectedClaim && (
        <ChatModal 
            claimId={activeClaimId}
            item={selectedClaim} // Passes the claim object which has item info
            user={user}          // Admin User Object
            onClose={() => setActiveClaimId(null)}
            readOnly={true}      // Admin is always Read Only here
        />
      )}

    </section>
  );
}