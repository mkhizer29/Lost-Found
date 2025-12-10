import React, { useState } from "react";
import { API_BASE } from "../config";
import ChatModal from "../modals/ChatModal"; 

export default function MyReports({ user, myReports, onFindMatches, onDecision, onMarkReturned }) {
  
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  function openLocalChat(report) {
    setSelectedReport(report);
    setActiveClaimId(report.claim_id);
  }

  const myLost = myReports.filter(r => r.report_type === 'LOST');
  const myFound = myReports.filter(r => r.report_type === 'FOUND');

  return (
    <section>
      {/* ================================================================================= */}
      {/* 1. MY LOST ITEMS (Items I reported as LOST)                                       */}
      {/* ================================================================================= */}
      <h2 style={{color:'#c8102e'}}>My Lost Items</h2>
      <p className="subtitle" style={{marginBottom:'10px'}}>Items you reported as LOST.</p>
      
      {myLost.length === 0 ? <p className="info">No lost reports.</p> : (
        <table className="reports-table" style={{marginBottom:'40px'}}>
           <thead><tr><th>Item</th><th>Status</th><th>Found By</th><th>Claim Status</th><th>Action</th></tr></thead>
           <tbody>
             {myLost.map(r => {
                // Robust Status Check
                const claimStatus = (r.claim_status || "").toUpperCase();
                const isPending = claimStatus === 'PENDING';

                return (
                   <tr key={r.report_id}>
                     <td style={{fontWeight:'bold'}}>{r.item_title}</td>
                     <td><span className={`status-badge ${r.item_status.toLowerCase()}`}>{r.item_status}</span></td>
                     <td>{r.claimant_name || <span style={{fontStyle:'italic', color:'#aaa'}}>No match yet</span>}</td>
                     <td>{r.claim_status ? <span className={`status-badge ${r.claim_status.toLowerCase()}`}>{r.claim_status}</span> : '-'}</td>
                     <td>
                        <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                            {/* 1. CHAT (If someone claimed it) */}
                            {r.claim_id && (
                                <button 
                                 className="claim-btn" 
                                 onClick={() => openLocalChat(r)}
                                >
                                 Chat
                                </button>
                            )}

                            {/* 2. ACCEPT / REJECT BUTTONS (MISSING LOGIC FIXED HERE) */}
                            {isPending && (
                                <>
                                    <button 
                                        className="submit-btn" 
                                        style={{padding:'6px 10px', fontSize:'0.75rem'}} 
                                        onClick={() => onDecision('approve', r.claim_id)}
                                    >
                                        Accept
                                    </button>
                                    <button 
                                        className="cancel-btn" 
                                        style={{padding:'6px 10px', fontSize:'0.75rem'}} 
                                        onClick={() => onDecision('reject', r.claim_id)}
                                    >
                                        Reject
                                    </button>
                                </>
                            )}

                            {/* 3. FIND MATCHES (If still open and no claim) */}
                            {!r.claim_id && (r.item_status === 'OPEN' || r.item_status === 'LOST') && (
                                <button className="submit-btn" style={{background:'#7c3aed', fontSize:'0.75rem'}} onClick={() => onFindMatches(r.report_id)}>
                                   🔍 Matches
                                </button>
                            )}
                        </div>
                     </td>
                   </tr>
                );
             })}
           </tbody>
        </table>
      )}

      {/* ================================================================================= */}
      {/* 2. MY FOUND ITEMS (Items I reported as FOUND)                                     */}
      {/* ================================================================================= */}
      <h2 style={{color:'#059669'}}>My Found Items</h2>
      <p className="subtitle" style={{marginBottom:'10px'}}>Items you found. Review claims here.</p>

      {myFound.length === 0 ? <p className="info">No found reports.</p> : (
        <table className="reports-table">
           <thead><tr><th>Item</th><th>Claimant</th><th>Message</th><th>Proof</th><th>Status</th><th>Action</th></tr></thead>
           <tbody>
             {myFound.map(r => {
                const claimStatus = (r.claim_status || "").toUpperCase();
                const isPending = claimStatus === 'PENDING';
                const isClaimed = r.item_status === 'CLAIMED';

                return (
                   <tr key={r.report_id}>
                     <td style={{fontWeight:'bold'}}>{r.item_title}</td>
                     <td>{r.claimant_name || '-'}</td>
                     <td style={{maxWidth:150, fontSize:'0.9rem'}}>{r.claim_message || '-'}</td>
                     <td>
                        {r.proof_url ? 
                            <a href={`${API_BASE}${r.proof_url}`} target="_blank" rel="noreferrer" style={{color:'blue', textDecoration:'underline'}}>View</a> 
                            : 'No Photo'}
                     </td>
                     <td>{r.claim_status ? <span className={`status-badge ${r.claim_status.toLowerCase()}`}>{r.claim_status}</span> : '-'}</td>
                     
                     {/* ACTIONS */}
                     <td>
                       <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
                         {r.claim_id && (
                            <button className="claim-btn" onClick={() => openLocalChat(r)}>Chat</button>
                         )}

                         {/* Decision Buttons */}
                         {isPending && (
                            r.is_high_value === 1 && user.role !== 'ADMIN' ? (
                                <span className="lock-badge">🔒 Admin Only</span>
                            ) : (
                                <>
                                    <button className="submit-btn" style={{padding:'6px 10px', fontSize:'0.75rem'}} onClick={()=>onDecision('approve', r.claim_id)}>Accept</button>
                                    <button className="cancel-btn" style={{padding:'6px 10px', fontSize:'0.75rem'}} onClick={()=>onDecision('reject', r.claim_id)}>Reject</button>
                                </>
                            )
                         )}

                         {/* Mark Returned (If I am the finder and the claim is accepted) */}
                         {isClaimed && (
                            <button className="submit-btn" style={{background:'#0f172a', fontSize:'0.75rem'}} onClick={()=>onMarkReturned(r.item_id)}>Returned</button>
                         )}
                       </div>
                     </td>
                   </tr>
                );
             })}
           </tbody>
        </table>
      )}

      {/* CHAT MODAL */}
      {activeClaimId && selectedReport && (
        <ChatModal
          claimId={activeClaimId}
          item={selectedReport}
          user={user}
          onClose={() => setActiveClaimId(null)}
        />
      )}

    </section>
  );
}