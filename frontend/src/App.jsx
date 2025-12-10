// src/App.js
import React, { useEffect, useState } from "react";
import { API_BASE } from "./config";
import "./App.css";

// 1. Import Components
import Auth from "./components/Auth";
import Navbar from "./components/NavBar";

// 2. Import Screens
import Overview from "./screens/Overview";
import BrowseReports from "./screens/BrowseReports";
import MyReports from "./screens/MyReports";
import MyActivity from "./screens/MyActivity"; // <--- Make sure this file exists in src/screens/
import AdminDashboard from "./screens/AdminDashboard";
import ReportItem from "./screens/ReportItem";

// 3. Import Modals
import ChatModal from "./modals/ChatModal";
import ClaimModal from "./modals/ClaimModal";
import MatchModal from "./modals/MatchModal";

function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // <--- NEW: Prevents login flash
  const [activeTab, setActiveTab] = useState("overview");

  // Data
  const [reports, setReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [myClaims, setMyClaims] = useState([]); 
  const [adminClaims, setAdminClaims] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]); // <--- Add this state

  // Modals
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatReadOnly, setChatReadOnly] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchReportId, setMatchReportId] = useState(null);
  const [chatPartnerName, setChatPartnerName] = useState(null);

  // --- 1. SESSION CHECK ---
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        if (userData) setUser(userData);
      }
    } catch (err) {
      console.error("Session check failed", err);
    } finally {
      setAuthLoading(false); // <--- Stop loading whether we found a user or not
    }
  }

  // --- 2. DATA LOADING ---
  useEffect(() => {
    if (user) loadAllData();
  }, [user]); // Removed activeTab to prevent spamming server on tab switch

  async function loadAllData() {
    try {
        const [repRes, myRepRes, claimsRes, catRes, locRes] = await Promise.all([
            fetch(`${API_BASE}/api/reports`, { credentials: "include" }), 
            fetch(`${API_BASE}/api/my-reports`, { credentials: "include" }),
            fetch(`${API_BASE}/api/my-claims`, { credentials: "include" }),
            fetch(`${API_BASE}/api/categories`),
            fetch(`${API_BASE}/api/locations`) // <--- New Fetch
        ]);

        if (repRes.ok) setReports(await repRes.json());
        if (myRepRes.ok) setMyReports(await myRepRes.json());
        if (claimsRes.ok) setMyClaims(await claimsRes.json());
        if (catRes.ok) setCategories(await catRes.json());
        if (locRes.ok) setLocations(await locRes.json()); // <--- Set State

        if (user?.role === 'ADMIN') {
            const adminRes = await fetch(`${API_BASE}/api/admin/claims_queue`, { credentials: "include" });
            if (adminRes.ok) setAdminClaims(await adminRes.json());
        }
    } catch (e) { console.error(e); }
  }

  // --- 3. HANDLERS ---
  const handleOpenChat = (claimId, name = null, readOnly = false) => {
      setActiveChatId(claimId);
      setChatPartnerName(name); // Save the name
      setChatReadOnly(readOnly);
  };

  const handleOpenClaim = (item) => {
      setSelectedItem(item);
      setShowClaimModal(true);
  };

  const handleDecision = async (action, claimId) => {
  if (!window.confirm(`${action} this claim?`)) return;

  const endpoint = action === "approve" ? "approve" : "reject";

  try {
    const res = await fetch(`${API_BASE}/api/claims/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_id: claimId }),
      credentials: "include",
    });

    // Try to parse JSON, but don't crash if body is empty
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(`Error: ${data.error || "Unable to update claim."}`);
      return;
    }

    alert(action === "approve" ? "Claim approved." : "Claim rejected.");
    loadAllData(); // refresh UI after a successful decision
  } catch (err) {
    console.error(err);
    alert("Network error. Please try again.");
  }
};



  const handleEscalate = async (claimId) => {
      if(!window.confirm("Are you sure you want to escalate this claim to the Admin?")) return;
      
      try {
          const res = await fetch(`${API_BASE}/api/claims/escalate`, {
              method: "POST", 
              headers: {"Content-Type":"application/json"},
              body: JSON.stringify({ claim_id: claimId }), 
              credentials: "include"
          });

          if(res.ok) {
              alert("Claim escalated! An Admin will review the chat history.");
              loadAllData(); // <--- Refresh UI immediately
          } else {
              const err = await res.json();
              alert("Error: " + err.error);
          }
      } catch(err) { 
          console.error(err);
          alert("Network error. Please try again."); 
      }
  }

 // REPLACE YOUR EXISTING handleMarkReturned WITH THIS:
  const handleMarkReturned = async (targetId) => {
    if (!window.confirm("Confirm that this item has been returned?")) return;

    try {
      // 1. Send Request
      const res = await fetch(`${API_BASE}/api/items/returned`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the ID. If backend needs "item_id", we send it as that.
        body: JSON.stringify({ item_id: targetId }),
        credentials: "include"
      });

      if (res.ok) {
        // 2. THE FIX: Check BOTH 'report_id' and 'item_id'
        
        // Update My Claims (Discoveries)
        setMyClaims(prev => prev.map(c => {
            // Check if this row matches the ID (either as item_id or report_id)
            const idMatch = (c.item_id === targetId) || (c.report_id === targetId);
            return idMatch ? { ...c, item_status: 'RETURNED' } : c;
        }));

        // Update My Reports
        setMyReports(prev => prev.map(r => {
            const idMatch = (r.item_id === targetId) || (r.report_id === targetId);
            return idMatch ? { ...r, item_status: 'RETURNED' } : r;
        }));

      } else {
        console.warn("Server response not OK, reloading data...");
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadAllData();
    }
  };

  const handleFindMatches = (reportId) => {
      setMatchReportId(reportId);
      setShowMatchModal(true);
  };

  const handleLogout = async () => {
    try {
      // 1. Tell the backend to destroy the session
      await fetch(`${API_BASE}/api/logout`, { 
        method: "POST", 
        credentials: "include" 
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
    
    // 2. Clear frontend state
    setUser(null);
    setReports([]);
    setMyReports([]);
    setMyClaims([]);
    setAdminClaims([]);
  };

  // --- RENDER ---
  
  // 1. Loading Screen (Prevents White Flash)
  if (authLoading) {
    return <div style={{display:'flex',justifyContent:'center',marginTop:'50px', color:'#666'}}>Loading...</div>;
  }

  // 2. Auth Screen (If no user)
  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  // 3. Main Dashboard (If user exists)
  return (
    <div className="app">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="app-main">
        <div className="tabs-container">
            <button className={`tab-button ${activeTab==='overview'?'active':''}`} onClick={()=>setActiveTab('overview')}>Overview</button>
            <button className={`tab-button ${activeTab==='report_item'?'active':''}`} onClick={()=>setActiveTab('report_item')}>+ Report Item</button>
            <button className={`tab-button ${activeTab==='reports'?'active':''}`} onClick={()=>setActiveTab('reports')}>Browse</button>
            
            {/* Split "My Dashboard" into specific tabs or keep it general */}
            <button className={`tab-button ${activeTab==='my_reports'?'active':''}`} onClick={()=>setActiveTab('my_reports')}>My Reports</button>
            <button className={`tab-button ${activeTab==='claims'?'active':''}`} onClick={()=>setActiveTab('claims')}>My Claims</button>
            <button className={`tab-button ${activeTab==='discoveries'?'active':''}`} onClick={()=>setActiveTab('discoveries')}>My Discoveries</button>
            
            {user.role === 'ADMIN' && (
                <button className={`tab-button ${activeTab==='admin'?'active':''}`} onClick={()=>setActiveTab('admin')}>Admin</button>
            )}
        </div>

        {activeTab === 'overview' && <Overview reports={reports} />}
        
        {activeTab === 'reports' && (
            <BrowseReports 
                user={user} 
                reports={reports} 
                categories={categories}
                onChat={handleOpenChat}
                onClaim={handleOpenClaim} 
                onDecision={handleDecision}
            />
        )}

        {activeTab === 'my_reports' && (
            <MyReports 
                user={user} 
                myReports={myReports} 
                onChat={handleOpenChat}
                onFindMatches={handleFindMatches}
                onDecision={handleDecision}
                onMarkReturned={handleMarkReturned}
            />
        )}

        {/* --- SAFEGUARDS: Ensure myClaims exists before rendering these --- */}
        {activeTab === 'claims' && (
            <MyActivity 
                type="claims" 
                myClaims={myClaims || []} // Safety check
                onChat={handleOpenChat} 
                onEscalate={handleEscalate} 
                user={user}
            />
        )}

        {activeTab === 'discoveries' && (
            <MyActivity 
                type="discoveries" 
                myClaims={myClaims || []} // Safety check
                onEscalate={handleEscalate}
                onMarkReturned={handleMarkReturned}
                onDecision={handleDecision}
                onChat={handleOpenChat} 
                user={user}
            />
        )}

        {activeTab === 'report_item' && (
            <ReportItem 
                user={user} 
               categories={categories} 
               locations={locations} 
               onReportSuccess={() => {
                   setActiveTab('my_reports'); // Redirect to 'My Reports' after success
                    loadAllData(); // Reload data to show the new item
               }} 
            />
        )}

        {activeTab === 'admin' && (
            <AdminDashboard 
                claims={adminClaims} 
                onChat={handleOpenChat} 
                onDecision={handleDecision} 
                user={user}
            />
        )}
      </main>

      {/* MODALS */}
      {activeChatId && (
          <ChatModal 
            claimId={activeChatId} 
            partnerName={chatPartnerName}  // <--- PASS THE NAME HERE
            currentUser={user} 
            readOnly={chatReadOnly} 
            onClose={()=>setActiveChatId(null)} 
          />
      )}
      
      {showClaimModal && selectedItem && (
          <ClaimModal item={selectedItem} user={user} onClose={()=>setShowClaimModal(false)} onRefresh={loadAllData} />
      )}
      
      {showMatchModal && matchReportId && (
          <MatchModal reportId={matchReportId} onClose={()=>setShowMatchModal(false)} onClaim={handleOpenClaim} />
      )}
    </div>
  );
}

export default App;