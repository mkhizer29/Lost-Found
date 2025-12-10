//BrowseReports.jsx
import React, { useState } from "react";
import { API_BASE } from "../config";
import ChatModal from "../modals/ChatModal"; // Ensure you have this imported

export default function BrowseReports({ user, reports, categories, onChat, onClaim, onDecision }) {
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  // Chat Modal State
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [justClaimedIds, setJustClaimedIds] = useState([]); // To track newly claimed reports

  // Helper to open chat locally
  function openLocalChat(report) {
    setSelectedReport(report);
    setActiveClaimId(report.claim_id);
  }

  const filtered = reports.filter(r => {
    if (filterType !== "ALL" && r.report_type !== filterType) return false;
    if (filterCategory !== "ALL" && r.category_name !== filterCategory) return false;
    if (search && !r.item_title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <section>
      
      {/* 1. STYLIZED FILTER BAR (White Card) */}
      <div className="filters-row">
        <div className="filter-group">
            <label>Filter by Type</label>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
                <option value="ALL">Show All</option>
                <option value="LOST">Lost Items</option>
                <option value="FOUND">Found Items</option>
            </select>
        </div>
        <div className="filter-group">
            <label>Category</label>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                <option value="ALL">All Categories</option>
                {categories.map(c => <option key={c.category_id} value={c.name}>{c.name}</option>)}
            </select>
        </div>
        <div className="filter-group" style={{flex: 2}}> {/* Wider Search Bar */}
            <label>Search</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by item name..." />
        </div>
      </div>

      {/* 2. THE TABLE (White Card) */}
      <table className="reports-table">
        <thead>
           <tr>
             <th style={{width:'60px'}}>Img</th>
             <th style={{width:'80px'}}>Type</th>
             <th>Item Title</th>
             <th>Location</th>
             <th>Status</th>
             <th style={{textAlign:'right'}}>Actions</th>
           </tr>
        </thead>
        <tbody>
           {filtered.map(r => {
             const isMyReport = r.reporter_id === user.user_id;
             const isLost = r.report_type === 'LOST';

             const hasClaimedLocally = justClaimedIds.includes(r.report_id);
             const isDone = r.already_claimed || hasClaimedLocally;
             
             return (
               <tr key={r.report_id}>
                 {/* Image */}
                 <td>
                    {r.item_image_url ? 
                        <img src={`${API_BASE}${r.item_image_url}`} alt="img" style={{width:40, height:40, borderRadius:8, objectFit:'cover', border:'1px solid #e2e8f0'}}/> 
                        : <div style={{width:40, height:40, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color:'#94a3b8'}}>N/A</div>}
                 </td>

                 {/* Type Badge (Yellow/Green via CSS classes) */}
                 <td>
                    <span className={`status-badge ${isLost ? 'lost' : 'found'}`}>
                        {r.report_type}
                    </span>
                 </td>

                 <td style={{fontWeight:'600', color:'var(--text-main)'}}>{r.item_title}</td>
                 <td style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>{r.location_name}</td>
                 
                 {/* Status Badge */}
                 <td>
                    <span className={`status-badge ${r.item_status.toLowerCase()}`}>
                        {r.item_status}
                    </span>
                 </td>
                 
                 {/* ACTIONS */}
                 <td style={{textAlign:'right'}}>
                    <div style={{display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center'}}>
					
						{/* 1. CHECK: Is it claimed (Backend) OR Just Clicked (Local)? */}
						{(r.already_claimed || justClaimedIds.includes(r.report_id)) ? (
							
							/* SHOW BADGE IF CLAIMED */
							<span style={{
								fontSize:'0.8rem', fontWeight:'700', 
								color: isLost ? '#d97706' : '#059669',
								padding: '6px 12px',
								background: isLost ? '#fffbeb' : '#ecfdf5',
								borderRadius: '8px',
								border: isLost ? '1px solid #fcd34d' : '1px solid #6ee7b7'
							}}>
								{isLost ? "✓ Contacted" : "✓ Claim Sent"}
							</span>

						) : (
							/* SHOW BUTTONS IF NOT CLAIMED */
							<>
								{/* Chat if needed */}
								{r.claim_id && isMyReport && (
									<button className="claim-btn" onClick={() => openLocalChat(r)}>Chat</button>
								)}
								
								{/* GREEN BUTTON */}
								{!isLost && r.item_status === 'OPEN' && !isMyReport && (
									<button 
										className="submit-btn" 
										style={{background:'#10b981', padding:'6px 16px', fontSize:'0.8rem'}} 
										onClick={() => {
											onClaim(r);
											setJustClaimedIds(prev => [...prev, r.report_id]); // <--- MAGIC LINE
										}}
									>
										It's Mine!
									</button>
								)}

								{/* YELLOW BUTTON */}
								{isLost && r.item_status === 'OPEN' && !isMyReport && (
									<button 
										className="submit-btn" 
										style={{background:'#f59e0b', color:'#1e293b', padding:'6px 16px', fontSize:'0.8rem', fontWeight:'700'}} 
										onClick={() => {
											onClaim(r);
											setJustClaimedIds(prev => [...prev, r.report_id]); // <--- MAGIC LINE
										}}
									>
										I Found This
									</button>
								)}
							</>
						)}

						{/* ADMIN / DECISION BUTTONS (Always visible if applicable) */}
						{r.claim_status === 'PENDING' && (user.role === 'ADMIN' || (isMyReport && r.is_high_value === 0)) && (
							<>
								<button className="submit-btn" style={{padding:'6px 12px', fontSize:'0.8rem'}} onClick={() => onDecision('approve', r.claim_id)}>Accept</button>
								<button className="cancel-btn" style={{padding:'6px 12px', fontSize:'0.8rem'}} onClick={() => onDecision('reject', r.claim_id)}>Reject</button>
							</>
						)}
					</div>
                 </td>
               </tr>
             );
           })}
        </tbody>
      </table>

      {/* CHAT MODAL INTEGRATION */}
      {activeClaimId && selectedReport && (
        <ChatModal 
          claimId={activeClaimId}
          item={selectedReport}  
          user={user}            
          onClose={() => setActiveClaimId(null)}
          readOnly={user.role === 'ADMIN' && user.user_id !== selectedReport.reporter_id && user.user_id !== selectedReport.claimant_id} 
        />
      )}

    </section>
  );
}