// src/App.js
import React, { useEffect, useState, useRef } from "react";
import "./App.css";

// Flask backend base URL
const API_BASE = "http://localhost:5000";

function App() {
  // ==============================
  // 1. STATE MANAGEMENT
  // ==============================
  
  // --- Auth State ---
  const [user, setUser] = useState(null); // null = not logged in
  const [authMode, setAuthMode] = useState("LOGIN"); // "LOGIN", "REGISTER", "VERIFY"
  const [authLoading, setAuthLoading] = useState(true);
  const [otp, setOtp] = useState("");

  // --- Tab State ---
  const [activeTab, setActiveTab] = useState("overview"); 

  // --- Modals State ---
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // --- Data & Selection State ---
  const [selectedItem, setSelectedItem] = useState(null); // For claiming
  const [claimEvidence, setClaimEvidence] = useState("");
  const [claimFile, setClaimFile] = useState(null); 
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // --- Fetched Data ---
  const [reports, setReports] = useState([]);
  const [myClaims, setMyClaims] = useState([]); 
  const [myReports, setMyReports] = useState([]); 
  const [adminClaims, setAdminClaims] = useState([]); // Admin Dashboard Data
  
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");

  // --- File Upload State (For Reporting Items) ---
  const [selectedFile, setSelectedFile] = useState(null); 

  // --- Lookup Data ---
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // --- Chat State ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [activeClaimId, setActiveClaimId] = useState(null);
  const messagesEndRef = useRef(null); // For auto-scrolling
  const [chatReadOnly, setChatReadOnly] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const activeChatRef = useRef(null); // Keeps track of the REAL active chat

  // --- Report Form State ---
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", primary_color: "",
    brand: "", unique_marks: "", location_id: "", additional_details: "",
    report_type: "LOST",
  });
  
  // --- Auth Form State ---
  const [authForm, setAuthForm] = useState({ 
    full_name: "", email: "", password: "", role: "STUDENT", admin_secret: "" 
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // --- Filters State ---
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategoryName, setFilterCategoryName] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // --- Match Modal State ---
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);

  // --- Notification State ---
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter(n => n.is_read === 'N').length;

  // ==============================
  // 2. AUTHENTICATION & SESSION
  // ==============================

  // Check Session on Load
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        if (userData) {
          setUser(userData);
        }
      }
    } catch (err) {
      console.error("Session check failed", err);
    } finally {
      setAuthLoading(false);
    }
  }

  // Load Data when User Logs In
  useEffect(() => {
    if (user) {
      loadAppData();
    }
  }, [user]);

  // Handle Login / Register / Verify
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setSaveError("");
    
    // 1. LOGIN
    if (authMode === "LOGIN") {
      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({email: authForm.email, password: authForm.password}),
          credentials: "include"
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        setUser(data.user);
        loadAppData();
      } catch(err) { setSaveError(err.message); }
    } 
    // 2. REGISTER
    else if (authMode === "REGISTER") {
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify(authForm)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        
        alert("Code sent to email! Check your inbox.");
        setAuthMode("VERIFY");
      } catch(err) { setSaveError(err.message); }
    }
    // 3. VERIFY OTP
    else if (authMode === "VERIFY") {
      try {
        const res = await fetch(`${API_BASE}/api/verify-otp`, {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({email: authForm.email, code: otp})
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        alert("Verified! You can now login.");
        setAuthMode("LOGIN");
      } catch(err) { setSaveError(err.message); }
    }
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    setReports([]);
    setMyClaims([]);
    setMyReports([]);
    setAdminClaims([]);
  }

  // ==============================
  // 3. DATA LOADING
  // ==============================

  function loadAppData() {
    loadLookups();
    loadReports();
    loadMyClaims();
    loadMyReports();
  }

  async function loadReports() {
    try {
      setLoadingReports(true);
      const res = await fetch(`${API_BASE}/api/reports`);
      if (!res.ok) throw new Error("Failed");
      setReports(await res.json());
    } catch (err) { setReportsError(err.message); } 
    finally { setLoadingReports(false); }
  }

  async function loadMyReports() {
    try {
      const res = await fetch(`${API_BASE}/api/my-reports`, { credentials: "include" });
      if (res.ok) setMyReports(await res.json());
    } catch (err) { console.error(err); }
  }

  async function loadMyClaims() {
    try {
      const res = await fetch(`${API_BASE}/api/my-claims`, { credentials: "include" });
      if (res.ok) setMyClaims(await res.json());
    } catch (err) { console.error(err); }
  }

  async function loadAdminClaims() {
    try {
      // Updated endpoint to fetch queue
      const res = await fetch(`${API_BASE}/api/admin/claims_queue`, { credentials: "include" });
      if (res.ok) setAdminClaims(await res.json());
    } catch (err) { console.error(err); }
  }

  async function loadLookups() {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/locations`),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch (err) { console.error(err); }
  }

  // Trigger admin load when tab changes
  useEffect(() => {
    if (activeTab === "admin" && user?.role === "ADMIN") {
      loadAdminClaims();
    }
  }, [activeTab, user]);

  // Load notifications every 10 seconds (polling) so users see alerts live
  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadNotifications() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: "include" });
      if (res.ok) setNotifications(await res.json());
    } catch (err) { console.error(err); }
  }

  // Handle opening the dropdown
  async function toggleNotifications() {
    if (!showNotifDropdown) {
      // If opening, mark as read on backend
      if (unreadCount > 0) {
         await fetch(`${API_BASE}/api/notifications/mark-read`, { method: "POST", credentials: "include" });
         // Locally mark read to clear badge immediately
         setNotifications(prev => prev.map(n => ({...n, is_read: 'Y'})));
      }
    }
    setShowNotifDropdown(!showNotifDropdown);
  }

  // ==============================
  // 4. CHAT FUNCTIONALITY
  // ==============================

  useEffect(() => {
    let interval = null;
    if (showChatModal && activeClaimId) {
      // 1. Load immediately
      loadMessages(activeClaimId);
      // 2. Refresh every 2 seconds
      interval = setInterval(() => {
        loadMessages(activeClaimId);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval); 
    };
  }, [showChatModal, activeClaimId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function openChat(claimId, readOnly = false) { // Default to false
    activeChatRef.current = claimId; // Update active chat ref
    setChatMessages([]);  // Clear previous messages
    setActiveClaimId(claimId);  // Set active claim
    setChatReadOnly(readOnly); // Set the mode
    setShowChatModal(true);  // Open modal
    setChatLoading(true);    // Start loading
    await loadMessages(claimId);
    setChatLoading(false);   // End loading
  }
  async function loadMessages(claimId) {
    // Safety check: If no ID is passed, ignore
    if (!claimId) return;

    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();

        // If the user switched to a different chat while this was loading, STOP.
        if (activeChatRef.current !== claimId) {
            console.log("Ignored stale message data for:", claimId);
            return; 
        }
        setChatMessages(data);
      }
    } catch (err) { console.error(err); }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/claims/${activeClaimId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatInput }),
        credentials: "include"
      });
      if (res.ok) {
        setChatInput("");
        loadMessages(activeClaimId); // Refresh chat to see my new message
      }
    } catch (err) { alert(err.message); }
  }

  // ==============================
  // 5. FORM SUBMISSION (REPORT)
  // ==============================

  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(""); setSaveSuccess("");

    if (!form.title || !form.category_id || !form.location_id) {
      setSaveError("Please fill required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("reporter_id", user.user_id); 
    
    // Append all form fields
    Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
    });
    
    if (selectedFile) formData.append("image", selectedFile);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to create report");
      
      await loadReports();
      setForm({
        title: "", description: "", category_id: "", primary_color: "",
        brand: "", unique_marks: "", location_id: "", additional_details: "", report_type: "LOST",
      });
      setSelectedFile(null);
      setSaveSuccess("Report created successfully!");
    } catch (err) { setSaveError(err.message); } 
    finally { setSaving(false); }
  }

  async function handleFindMatches(reportId) {
    setMatchLoading(true);
    setShowMatchModal(true);
    setPotentialMatches([]);
    
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/matches`);
      if (res.ok) {
        setPotentialMatches(await res.json());
      } else {
        // If 404 or error, keeps array empty
      }
    } catch (err) { console.error(err); } 
    finally { setMatchLoading(false); }
  }

  // ==============================
  // 6. ACTION HANDLERS
  // ==============================

  // --- Start a Claim (Open Modal) ---
  function openClaimModal(item) {
    setSelectedItem(item);
    setClaimEvidence("");
    setClaimFile(null);
    setShowClaimModal(true);
  }

  // --- Submit the Claim ---
  async function handleClaimSubmit(e) {
    e.preventDefault();
    if (!claimEvidence.trim()) {
        alert("Please provide some evidence/description.");
        return;
    }

    try {
      setSubmittingClaim(true);
      const formData = new FormData();
      formData.append("item_id", selectedItem.item_id);
      formData.append("claimant_id", user.user_id);
      formData.append("evidence_text", claimEvidence);
      if (claimFile) formData.append("proof_image", claimFile);

      const res = await fetch(`${API_BASE}/api/claims`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to submit claim");

      alert("Claim submitted successfully!");
      setShowClaimModal(false);
      loadMyClaims();
      loadReports(); // Refresh browsing list
    } catch (err) { alert(err.message); } 
    finally { setSubmittingClaim(false); }
  }

  // --- Accept / Reject (Used by Reporter & Admin) ---
  async function handleDecision(action, claimId) {
    if(!window.confirm(`${action} this claim?`)) return;
    
    const endpoint = action === "Approve" ? "approve" : "reject"; 
    
    try {
      const res = await fetch(`${API_BASE}/api/claims/${endpoint}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ claim_id: claimId }),
        credentials: "include"
      });
      
      if(res.ok) {
        alert(`Claim ${action}d!`);
        loadMyReports(); 
        if (user.role === "ADMIN") loadAdminClaims();
        loadReports();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch(err) { alert(err.message); }
  }

  // --- Escalate (For Rejected Claims) ---
  async function handleEscalate(claimId) {
    if(!window.confirm("Escalate this to the Admin for review?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/claims/escalate`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ claim_id: claimId }),
        credentials: "include"
      });
      if(res.ok) {
        alert("Escalated! Admin will review shortly.");
        loadMyClaims();
        // Also refresh report list if visible
        loadReports();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(err) { alert(err.message); }
  }

  // --- Mark Returned (Final Close) ---
  async function handleMarkReturned(itemId) {
    if(!window.confirm("Confirm that you have physically returned this item to the owner?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/items/returned`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ item_id: itemId }),
        credentials: "include"
      });
      
      if(res.ok) {
        alert("Success! Item closed.");
        loadMyReports();
        loadReports();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch(err) { alert(err.message); }
  }

  // ==============================
  // 7. RENDER
  // ==============================

  // Logic for filtering reports
  const filteredReports = reports.filter((r) => {
    if (filterType !== "ALL" && r.report_type !== filterType) return false;
    if (filterCategoryName !== "ALL" && r.category_name !== filterCategoryName) return false;
    if (searchTerm.trim() !== "") {
      if (!r.item_title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Calculate stats
  const lostCount = reports.filter((r) => r.report_type === "LOST").length;
  const foundCount = reports.filter((r) => r.report_type === "FOUND").length;
  const resolvedCount = reports.filter((r) => r.item_status === "CLAIMED").length;
  const totalReports = reports.length;
  const categoryBreakdown = {};
  reports.forEach((r) => { categoryBreakdown[r.category_name] = (categoryBreakdown[r.category_name] || 0) + 1; });

  // --- A. LOADING SCREEN ---
  if (authLoading) return <div className="app"><p className="info">Loading session...</p></div>;

  // --- B. AUTH SCREEN ---
  if (!user) {
    return (
      <div className="app">
        <header className="app-header"><h1>Lost &amp; Found - Welcome</h1></header>
        <main className="app-main" style={{maxWidth: '400px', marginTop:'40px'}}>
          <section className="form-section" style={{background:'white', padding:'30px', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
            <h2 style={{textAlign:'center'}}>{authMode === "LOGIN" ? "Login" : authMode === "REGISTER" ? "Sign Up" : "Verify Code"}</h2>
            
            {saveError && <p className="error" style={{textAlign:'center'}}>{saveError}</p>}

            <form onSubmit={handleAuthSubmit}>
              {/* LOGIN / REGISTER FIELDS */}
              {authMode !== "VERIFY" && (
                <>
                  {authMode === "REGISTER" && (
                    <div className="form-row"><label>Full Name <input type="text" value={authForm.full_name} onChange={(e)=>setAuthForm({...authForm, full_name:e.target.value})} required /></label></div>
                  )}
                  <div className="form-row"><label>Email <input type="email" value={authForm.email} onChange={(e)=>setAuthForm({...authForm, email:e.target.value})} required /></label></div>
                  <div className="form-row"><label>Password <input type="password" value={authForm.password} onChange={(e)=>setAuthForm({...authForm, password:e.target.value})} required /></label></div>
                  
                  {authMode === "REGISTER" && (
                      <>
                        <div className="form-row"><label>Role <select value={authForm.role} onChange={(e)=>setAuthForm({...authForm, role:e.target.value})}><option value="STUDENT">Student</option><option value="STAFF">Staff</option><option value="ADMIN">Admin</option></select></label></div>
                        {authForm.role === "ADMIN" && <div className="form-row"><label style={{color:'#c8102e'}}>Admin Secret <input type="password" value={authForm.admin_secret} onChange={(e)=>setAuthForm({...authForm, admin_secret:e.target.value})} required /></label></div>}
                      </>
                  )}
                </>
              )}

              {/* VERIFY OTP FIELD */}
              {authMode === "VERIFY" && (
                <div className="form-row">
                  <p style={{marginBottom:'10px', fontSize:'0.9rem'}}>Enter the 6-digit code sent to <b>{authForm.email}</b></p>
                  <label>Verification Code
                    <input type="text" value={otp} onChange={(e)=>setOtp(e.target.value)} placeholder="123456" maxLength="6" required style={{textAlign:'center', letterSpacing:'4px', fontSize:'1.2rem'}} />
                  </label>
                </div>
              )}

              <div className="form-row" style={{marginTop:'20px'}}>
                <button type="submit" style={{width:'100%'}}>
                  {authMode === "LOGIN" ? "Login" : authMode === "REGISTER" ? "Send Code" : "Verify Code"}
                </button>
              </div>
            </form>

            <p style={{textAlign:'center', marginTop:'16px', fontSize:'0.9rem'}}>
              {authMode === "LOGIN" ? "Don't have an account? " : "Already have an account? "}
              <span 
                style={{color:'var(--iba-red)', fontWeight:'bold', cursor:'pointer'}}
                onClick={() => {
                  setAuthMode(authMode === "LOGIN" ? "REGISTER" : "LOGIN");
                  setSaveError("");
                }}
              >
                {authMode === "LOGIN" ? "Sign Up" : "Login"}
              </span>
            </p>
          </section>
        </main>
      </div>
    );
  }

  // --- C. MAIN APP SCREEN ---
  return (
    <div className="app">
      <header className="app-header">
        {/* LEFT SIDE: Logo & Name */}
        <div>
          <h1>Campus Lost & Found</h1>
          <p className="subtitle">Welcome, {user.full_name} ({user.role})</p>
        </div>

        {/* RIGHT SIDE: Notifications & Logout (Grouped) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* 1. NOTIFICATION BELL */}
          <div className="notif-container" onClick={toggleNotifications}>
            <span className="bell-icon" style={{ fontSize: '1.5rem', cursor: 'pointer' }}>🔔</span>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            
            {showNotifDropdown && (
              <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="notif-header">
                  Notifications 
                  {unreadCount > 0 && <span style={{fontSize:'0.7rem', fontWeight:'normal', float:'right', cursor:'pointer', color:'#2563eb'}} onClick={toggleNotifications}>Mark all read</span>}
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="empty-notif">No notifications yet.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.is_read === 'N' ? 'unread' : ''}`}>
                        <div style={{fontWeight: n.is_read === 'N' ? 'bold' : 'normal'}}>{n.message}</div>
                        <span className="notif-date">{new Date(n.date).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. LOGOUT BUTTON */}
          <button onClick={handleLogout} className="cancel-btn" style={{fontSize:'0.9rem', padding:'8px 16px'}}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        <div className="tabs-container">
          <button className={`tab-button ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`tab-button ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>Browse Reports</button>
          <button className={`tab-button ${activeTab === "claims" ? "active" : ""}`} onClick={() => setActiveTab("claims")}>My Claims</button>
          <button className={`tab-button ${activeTab === "discoveries" ? "active" : ""}`} onClick={() => setActiveTab("discoveries")}>My Discoveries</button>
          <button className={`tab-button ${activeTab === "my_reports" ? "active" : ""}`} onClick={() => setActiveTab("my_reports")}>My Reports</button>
          {user.role === "ADMIN" && (
            <button className={`tab-button ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>Admin</button>
          )}
        </div>

        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <section className="overview-section">
            <h2>Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Total Reports</div><div className="stat-value">{totalReports}</div></div>
              <div className="stat-card"><div className="stat-label">Lost Items</div><div className="stat-value" style={{color:'#fca5a5'}}>{lostCount}</div></div>
              <div className="stat-card"><div className="stat-label">Found Items</div><div className="stat-value" style={{color:'#86efac'}}>{foundCount}</div></div>
              <div className="stat-card"><div className="stat-label">Resolved</div><div className="stat-value" style={{color:'#60a5fa'}}>{resolvedCount}</div></div>
            </div>
            <div className="breakdown-section">
              <h3>Reports by Category</h3>
              <div className="category-list">
                {Object.entries(categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} className="category-item">
                    <span className="category-name">{cat}</span>
                    <div className="category-bar-container"><div className="category-bar" style={{width: `${(count/totalReports)*100}%`}}></div></div>
                    <span className="category-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 2. REPORTS (BROWSE) */}
        {activeTab === "reports" && (
          <>
            {/* Filters */}
            <div className="filters-row">
              <div className="filter-group"><label>Type <select value={filterType} onChange={(e)=>setFilterType(e.target.value)}><option value="ALL">All</option><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label></div>
              <div className="filter-group"><label>Category <select value={filterCategoryName} onChange={(e)=>setFilterCategoryName(e.target.value)}><option value="ALL">All</option>{categories.map(c=><option key={c.category_id} value={c.name}>{c.name}</option>)}</select></label></div>
              <div className="filter-group"><label>Search <input type="text" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search..." /></label></div>
            </div>

            {/* Table */}
            {loadingReports ? <p className="info">Loading...</p> : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Img</th><th>Type</th><th>Title</th><th>Category</th><th>Location</th><th>Status</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => {
                    const isMyReport = r.reporter_id === user.user_id;
                    const isClaimedByMe = myClaims.some(c => c.item_id === r.item_id);

                    return (
                      <tr key={r.report_id}>
                        <td>
                          {r.item_image_url ? 
                            <img src={`${API_BASE}${r.item_image_url}`} alt="Img" style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'6px'}}/> 
                            : <span style={{fontSize:'0.8rem', color:'#aaa'}}>No Photo</span>
                          }
                        </td>
                        <td>
                          <span style={{fontWeight:'bold', color: r.report_type==='LOST'?'#c8102e':'#059669'}}>
                            {r.report_type}
                          </span>
                        </td>
                        <td style={{fontWeight:'600'}}>{r.item_title}</td>
                        <td>{r.category_name}</td>
                        <td>{r.location_name}</td>
                        <td><span className={`status-badge ${r.item_status.toLowerCase()}`}>{r.item_status}</span></td>
                        <td style={{fontSize:'0.85rem'}}>{new Date(r.created_at).toLocaleDateString()}</td>
                        
                        {/* ACTION COLUMN */}
                        <td>
                          <div style={{display:'flex', gap:'5px', alignItems:'center', flexWrap:'wrap'}}>
                            {/* Chat Button */}
                            {r.claim_id && (
                              <button className="claim-btn" style={{background:'#2563eb', padding:'4px 10px'}} onClick={() => openChat(r.claim_id)}>Chat</button>
                            )}

                            {/* PENDING Decision */}
                            {/* FIX: Show if Admin OR (I am Reporter AND it is a FOUND report) */}
                            {r.claim_status === 'PENDING' && (user.role === 'ADMIN' || (isMyReport && r.report_type === 'FOUND')) && (
                              <>
                                 {/* NEW: If I am NOT Admin AND it is High Value -> Show Lock */ }
                                 {user.role !== 'ADMIN' && r.is_high_value === 1 ? (
                                  <span style={{fontSize:'0.7rem', color:'#c8102e', fontWeight:'bold', border:'1px solid #c8102e', padding:'4px', borderRadius:'4px', display:'inline-block'}}>🔒 Admin Only</span>
                                  ) : (
                                   <>
                                <button 
                                  className="submit-btn" 
                                  style={{padding:'4px 8px', fontSize:'0.75rem', background:'#059669'}} 
                                  onClick={()=>handleDecision("Approve", r.claim_id)}
                                >
                                  Accept
                                </button>
                                <button 
                                  className="cancel-btn" 
                                  style={{padding:'4px 8px', fontSize:'0.75rem', background:'#dc2626', color:'white'}} 
                                  onClick={()=>handleDecision("Reject", r.claim_id)}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                         </>
                       )}

                            {/* REJECTED -> ESCALATE */}
                            {/* FIX: Only show if *I* am the one who claimed it */}
                            {r.claim_status === 'REJECTED' && isClaimedByMe && (
                               <button className="submit-btn" style={{padding:'4px 8px', fontSize:'0.75rem', background:'#eab308', color:'black', border:'1px solid #ca8a04'}} onClick={() => handleEscalate(r.claim_id)}>Escalate</button>
                            )}
                            
                            {/* ESCALATED Badge */}
                            {r.claim_status === 'ESCALATED' && <span style={{fontSize:'0.75rem', color:'#ca8a04', fontWeight:'bold', fontStyle:'italic'}}>⚠️ Under Review</span>}

                            {/* CLAIMED -> MARK RETURNED */}
                            {/* FIX: Only Admin or Reporter can mark returned */}
                            {r.item_status === 'CLAIMED' && (user.role === 'ADMIN' || isMyReport) && (
                               <button className="submit-btn" style={{padding:'4px 8px', fontSize:'0.75rem', background:'#0f172a', border:'1px solid white'}} onClick={()=>handleMarkReturned(r.item_id)}>Mark Returned</button>
                            )}
                            
                            {/* CLAIM THIS ITEM (If found, not mine, and not claimed yet) */}
                            {r.report_type === 'FOUND' && r.item_status === 'OPEN' && !isMyReport && !isClaimedByMe && (
                               <button className="submit-btn" style={{padding:'4px 8px', fontSize:'0.75rem', background:'#7c3aed'}} onClick={() => openClaimModal(r)}>Claim This!</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Create Form */}
            <section className="form-section">
              <h2>Report a Lost or Found Item</h2>
              {saveError && <p className="error">{saveError}</p>}
              {saveSuccess && <p className="success">{saveSuccess}</p>}
              <form className="report-form" onSubmit={handleSubmit}>
                <div className="form-row"><label>Type <select name="report_type" value={form.report_type} onChange={handleInputChange}><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label></div>
                <div className="form-row"><label>Title <input name="title" value={form.title} onChange={handleInputChange} placeholder="e.g. Blue Bottle" /></label></div>
                <div className="form-row two-cols">
                  <label>Category <select name="category_id" value={form.category_id} onChange={handleInputChange}><option value="">Select</option>{categories.map(c=><option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></label>
                  <label>Location <select name="location_id" value={form.location_id} onChange={handleInputChange}><option value="">Select</option>{locations.map(l=><option key={l.location_id} value={l.location_id}>{l.name}</option>)}</select></label>
                </div>
                <div className="form-row"><label>Description <textarea name="description" value={form.description} onChange={handleInputChange} rows={2} /></label></div>
                <div className="form-row three-cols">
                  <label>Color <input name="primary_color" value={form.primary_color} onChange={handleInputChange}/></label>
                  <label>Brand <input name="brand" value={form.brand} onChange={handleInputChange}/></label>
                  <label>Marks <input name="unique_marks" value={form.unique_marks} onChange={handleInputChange}/></label>
                </div>
                <div className="form-row"><label>Details <input name="additional_details" value={form.additional_details} onChange={handleInputChange}/></label></div>
                <div className="form-row"><label>Photo <input type="file" onChange={(e)=>setSelectedFile(e.target.files[0])}/></label></div>
                <div className="form-row"><button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit Report"}</button></div>
              </form>
            </section>
          </>
        )}

        {/* 3. MY CLAIMS (Items I Lost and am Claiming) */}
        {activeTab === "claims" && (
          <section className="overview-section">
            <h2>My Claims (Items I Lost)</h2>
            {myClaims.filter(c => c.report_type === 'FOUND').length === 0 ? (
              <p className="info">You haven't claimed any found items yet.</p> 
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Item</th><th>Status</th><th>My Message</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myClaims.filter(c => c.report_type === 'FOUND').map(c => (
                    <tr key={c.claim_id}>
                      <td>{c.claim_id}</td>
                      <td style={{fontWeight:'bold'}}>{c.item_title}</td>
                      <td><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                      <td style={{color:'#555'}}>{c.message}</td>
                      <td style={{fontSize:'0.85rem'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                            <button className="claim-btn" style={{background:'#2563eb', padding:'4px 10px'}} onClick={() => openChat(c.claim_id)}>Chat</button>
                            {c.status === 'REJECTED' && <button className="submit-btn" style={{background:'#eab308', padding:'4px 8px', color:'black'}} onClick={() => handleEscalate(c.claim_id)}>Escalate</button>}
                            {c.status === 'ESCALATED' && <span style={{fontSize:'0.75rem', color:'#ca8a04', fontWeight:'bold', fontStyle:'italic'}}>Under Review</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      
        {/* 4. MY DISCOVERIES (Items I Found and Contacted Owner) */}
        {activeTab === "discoveries" && (
          <section className="overview-section">
            <h2>My Discoveries (Items I Found)</h2>
            {myClaims.filter(c => c.report_type === 'LOST').length === 0 ? (
              <p className="info">You haven't contacted any item owners yet.</p> 
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Item</th><th>Status</th><th>My Message</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myClaims.filter(c => c.report_type === 'LOST').map(c => (
                    <tr key={c.claim_id}>
                      <td>{c.claim_id}</td>
                      <td style={{fontWeight:'bold'}}>{c.item_title}</td>
                      <td><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                      <td style={{color:'#555'}}>{c.message}</td>
                      <td style={{fontSize:'0.85rem'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="claim-btn" style={{background:'#eab308', color:'black', padding:'4px 10px'}} onClick={() => openChat(c.claim_id)}>
                          Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* 5. ADMIN DASHBOARD */}
        {activeTab === "admin" && (
          <section className="overview-section">
            <h2>Admin Dashboard</h2>
            {user.role !== "ADMIN" ? (
              <p className="error">Access Denied</p>
            ) : (
              adminClaims.length === 0 ? (
                <p className="info">No pending claims.</p>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Claim ID</th><th>Item</th><th>User ID</th><th>Message</th><th>Proof</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminClaims.map((c) => (
                      <tr key={c.claim_id}>
                        <td>{c.claim_id}</td>
                        <td style={{ fontWeight: 'bold' }}>{c.item_title}</td>
                        <td>{c.claimant_id}</td>
                        <td style={{ fontSize: '0.9rem' }}>{c.message}</td>
                        <td>
                          {c.proof_url ? (
                            <a href={`${API_BASE}${c.proof_url}`} target="_blank" rel="noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>View</a>
                          ) : '-'}
                        </td>
                        <td>
                           <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                              {c.status === 'ESCALATED' && <span style={{color:'#dc2626', fontWeight:'bold', fontSize:'0.75rem', marginRight:'5px'}}>⚠ DISPUTED</span>}
                              <button 
                                className="claim-btn" 
                                style={{background:'#4b5563', padding:'4px 8px', fontSize:'0.75rem'}} 
                                onClick={() => openChat(c.claim_id, true)} // true = Read Only Mode
                              >
                                View Chat
                              </button>
                              <button className="submit-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#059669' }} onClick={() => handleDecision("Approve", c.claim_id)}>Approve</button>
                              <button className="cancel-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#dc2626', color: 'white' }} onClick={() => handleDecision("Reject", c.claim_id)}>Reject</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </section>
        )}
        
        {/* 6. MY REPORTS (Split into Lost & Found) */}
        {activeTab === "my_reports" && (
          <section className="overview-section">
            
            {/* Table 1: Items I Lost */}
            <h2 style={{color:'#c8102e'}}>My Lost Items</h2>
            <p className="subtitle" style={{marginBottom:'10px'}}>Items you reported as LOST. Check here if someone found them.</p>
            {myReports.filter(r => r.report_type === 'LOST').length === 0 ? <p className="info">No lost reports.</p> : (
              <table className="reports-table" style={{marginBottom:'40px'}}>
                <thead><tr><th>Item</th><th>Status</th><th>Found By</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {myReports.filter(r => r.report_type === 'LOST').map((r, idx) => (
                    <tr key={idx}>
                      <td style={{fontWeight:'bold'}}>{r.item_title}</td>
                      <td><span className={`status-badge ${r.item_status.toLowerCase()}`}>{r.item_status}</span></td>
                      <td>{r.claimant_name ? <strong>{r.claimant_name}</strong> : <span style={{color:'#aaa', fontStyle:'italic'}}>Not found yet</span>}</td>
                      <td>{r.claim_status ? <span className={`status-badge ${r.claim_status.toLowerCase()}`}>{r.claim_status}</span> : '-'}</td>
                      {/* ACTION COLUMN: Chat or Match Search */}
                      <td>
                        <div style={{display:'flex', gap:'5px'}}>
                           {/* 1. If someone found it -> Show Chat */}
                           {r.claim_id ? (
                             <button className="claim-btn" style={{background:'#2563eb', padding:'4px 10px'}} onClick={() => openChat(r.claim_id)}>Chat</button>
                           ) : (
                             /* 2. If no one found it yet -> Show Match Search */
                             (r.item_status === 'OPEN' || r.item_status === 'LOST') ? (
                               <button 
                                 className="submit-btn" 
                                 style={{background:'#7c3aed', padding:'4px 10px', fontSize:'0.75rem'}}
                                 onClick={() => handleFindMatches(r.report_id)}
                               >
                                 🔍 Check Matches
                               </button>
                             ) : <span>-</span>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Table 2: Items I Found (Where I am the decision maker) */}
            <h2 style={{color:'#059669'}}>My Found Items</h2>
            <p className="subtitle" style={{marginBottom:'10px'}}>Items you reported as FOUND. Review claims here.</p>
            
            {myReports.filter(r => r.report_type === 'FOUND').length === 0 ? <p className="info">No found reports.</p> : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Item</th><th>Status</th><th>Claimed By</th><th>Message</th><th>Proof</th><th>Claim Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myReports.filter(r => r.report_type === 'FOUND').map((r, idx) => (
                    <tr key={idx}>
                      {/* 1. Item Title */}
                      <td style={{fontWeight:'bold'}}>{r.item_title}</td>
                      
                      {/* 2. Item Status */}
                      <td><span className={`status-badge ${r.item_status.toLowerCase()}`}>{r.item_status}</span></td>
                      
                      {/* 3. Claimed By */}
                      <td>{r.claimant_name || <span style={{color:'#aaa', fontStyle:'italic'}}>No claims</span>}</td>
                      
                      {/* ▼▼▼ NEW COLUMN 4: MESSAGE ▼▼▼ */}
                      <td style={{maxWidth:'150px', fontSize:'0.9rem', color:'#555'}}>
                        {r.claim_message ? `"${r.claim_message}"` : '-'}
                      </td>

                      {/* ▼▼▼ NEW COLUMN 5: PROOF ▼▼▼ */}
                      <td>
                        {r.proof_url ? (
                           <a 
                             href={`${API_BASE}${r.proof_url}`} 
                             target="_blank" 
                             rel="noreferrer"
                             style={{color:'#2563eb', textDecoration:'underline', fontWeight:'bold', fontSize:'0.9rem'}}
                           >
                             View Photo
                           </a>
                        ) : (
                           <span style={{color:'#ccc', fontSize:'0.8rem'}}>No photo</span>
                        )}
                      </td>

                      {/* 6. Claim Status */}
                      <td>
                        {r.claim_status ? <span className={`status-badge ${r.claim_status.toLowerCase()}`}>{r.claim_status}</span> : '-'}
                      </td>
                      
                      {/* 7. ACTIONS (With High Value Logic) */}
                      <td>
                        <div style={{display:'flex', gap:'5px', alignItems:'center', flexWrap:'wrap'}}>
                          
                          {/* Chat Button */}
                          {r.claim_id && (
                            <button className="claim-btn" style={{background:'#2563eb', padding:'4px 10px'}} onClick={() => openChat(r.claim_id)}>Chat</button>
                          )}

                          {/* PENDING Decision Logic */}
                          {r.claim_status === 'PENDING' && (
                            <>
                              {/* SCENARIO 1: ADMIN (Can always approve) */}
                              {user.role === 'ADMIN' && (
                                <>
                                  <button 
                                    className="submit-btn" 
                                    style={{padding:'4px 8px', fontSize:'0.75rem', background:'#059669'}} 
                                    onClick={()=>handleDecision("Approve", r.claim_id)}
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    className="cancel-btn" 
                                    style={{padding:'4px 8px', fontSize:'0.75rem', background:'#dc2626', color:'white'}} 
                                    onClick={()=>handleDecision("Reject", r.claim_id)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* SCENARIO 2: REPORTER (Can approve ONLY if NOT High Value) */}
                              {user.role !== 'ADMIN' && (
                                <>
                                  {r.is_high_value === 1 ? (
                                    // IF HIGH VALUE: Show Lock
                                    <span style={{fontSize:'0.7rem', color:'#c8102e', fontWeight:'bold', border:'1px solid #c8102e', padding:'4px', borderRadius:'4px', display:'inline-block'}}>
                                      🔒 Admin Approval Reqd.
                                    </span>
                                  ) : (
                                    // IF NORMAL ITEM: Show Buttons
                                    <>
                                      <button 
                                        className="submit-btn" 
                                        style={{padding:'4px 8px', fontSize:'0.75rem', background:'#059669'}} 
                                        onClick={()=>handleDecision("Approve", r.claim_id)}
                                      >
                                        Accept
                                      </button>
                                      <button 
                                        className="cancel-btn" 
                                        style={{padding:'4px 8px', fontSize:'0.75rem', background:'#dc2626', color:'white'}} 
                                        onClick={()=>handleDecision("Reject", r.claim_id)}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                          
                          {/* ESCALATED Badge */}
                          {r.claim_status === 'ESCALATED' && (
                             <span style={{fontSize:'0.75rem', color:'#ca8a04', fontWeight:'bold', fontStyle:'italic'}}>⚠️ Under Review</span>
                          )}

                          {/* MARK RETURNED */}
                          {r.item_status === 'CLAIMED' && (
                             <button className="submit-btn" style={{padding:'4px 8px', fontSize:'0.75rem', background:'#0f172a', border:'1px solid white'}} onClick={() => handleMarkReturned(r.item_id)}>Mark Returned</button>
                          )}
                          
                          {/* Case Closed */}
                          {r.item_status === 'RETURNED' && (
                             <span style={{color:'green', fontSize:'0.8rem', fontStyle:'italic', alignSelf:'center'}}>Case Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>

      {/* ==============================
      // 8. MODALS (ABSOLUTE POSITIONED)
      // ============================== */}

      {/* CLAIM MODAL */}
      {showClaimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Claim Item: {selectedItem?.item_title}</h3>
            <p style={{fontSize:'0.9rem', marginBottom:'10px'}}>Provide proof of ownership (description, photo, etc).</p>
            <form onSubmit={handleClaimSubmit}>
              <textarea 
                className="chat-input-field" 
                placeholder="Describe markings, contents, or details only you would know..." 
                value={claimEvidence} 
                onChange={(e) => setClaimEvidence(e.target.value)} 
                rows={4} 
                style={{width:'100%', marginBottom:'10px'}}
              />
              <div style={{marginBottom:'15px'}}>
                <label style={{display:'block', fontSize:'0.85rem', marginBottom:'5px'}}>Upload Proof (Optional)</label>
                <input type="file" onChange={(e) => setClaimFile(e.target.files[0])} />
              </div>
              <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                <button type="button" className="cancel-btn" onClick={() => setShowClaimModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submittingClaim}>{submittingClaim ? 'Sending...' : 'Submit Claim'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {showChatModal && (
        <div className="modal-overlay">
          <div className="modal-content chat-modal">
            <h3>
             Message Thread
             <span className="close-btn" onClick={() => setShowChatModal(false)}>&times;</span>
            </h3>
            <div className="chat-window">
              {/* STATE 1: LOADING */}
              {chatLoading ? (
                 <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#aaa'}}>
                    <p>Loading conversation...</p>
                 </div>
              ) : chatMessages.length === 0 ? (
                 /* STATE 2: EMPTY */
                 <p style={{color:'#aaa', textAlign:'center', marginTop:'20px'}}>No messages yet.</p>
              ) : (
                 /* STATE 3: MESSAGES */
                 chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.sender_id === user.user_id ? "my-message" : "other-message"}`}>
                    <div className="message-content">
                      {user.role === 'ADMIN' && (
                        <div style={{fontSize:'0.75rem', fontWeight:'bold', color:'#ea580c', marginBottom:'4px'}}>
                          {msg.sender_name}
                        </div>
                      )}
                      <p>{msg.content}</p>
                      <span className="message-time">{new Date(msg.sent_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
        {chatReadOnly ? (
                <div style={{
                    padding: '12px', 
                    background: '#f3f4f6', 
                    textAlign: 'center', 
                    color: '#555', 
                    borderRadius: '8px',
                    marginTop: '10px',
                    fontSize: '0.9rem',
                    border: '1px solid #e5e7eb'
                }}>
                    🔒 <b>Audit Mode:</b> You are viewing this chat as Admin.
                </div>
            ) : (
                <form onSubmit={handleSendMessage} className="chat-input-form">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e)=>setChatInput(e.target.value)} 
                    placeholder="Type a message..." 
                    className="chat-input-field" 
                  />
                  <button type="submit" className="send-btn">Send</button>
                </form>
            )}
          </div>
        </div>
      )}

      {/* MATCHES MODAL */}
      {showMatchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'600px', width:'90%'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
               <h3>Potential Matches</h3>
               <button onClick={()=>setShowMatchModal(false)} style={{border:'none', background:'none', fontSize:'1.5rem', cursor:'pointer'}}>&times;</button>
            </div>

            {matchLoading ? (
              <p>Scanning database for similar found items...</p>
            ) : potentialMatches.length === 0 ? (
              <div style={{textAlign:'center', padding:'20px', color:'#555'}}>
                 <p>No similar items found yet.</p>
                 <small>We matched based on Category, Color, and Location.</small>
              </div>
            ) : (
              <div style={{maxHeight:'400px', overflowY:'auto'}}>
                <p style={{marginBottom:'10px', color:'green', fontWeight:'bold'}}>
                   We found {potentialMatches.length} items that might be yours:
                </p>
                
                {potentialMatches.map((m) => (
                  <div key={m.item_id} style={{
                      border:'1px solid #ddd', 
                      borderRadius:'8px', 
                      padding:'10px', 
                      marginBottom:'10px',
                      display:'flex', 
                      gap:'10px',
                      alignItems:'center'
                  }}>
                    {/* Image */}
                    <div style={{width:'60px', height:'60px', flexShrink:0}}>
                       {m.image_url ? (
                         <img src={`${API_BASE}${m.image_url}`} alt="Item" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'4px'}} />
                       ) : <div style={{width:'100%', height:'100%', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem'}}>No Img</div>}
                    </div>

                    {/* Details */}
                    <div style={{flex:1}}>
                       <div style={{fontWeight:'bold'}}>{m.title}</div>
                       <div style={{fontSize:'0.85rem', color:'#555'}}>
                          Color: {m.color} | Loc: {m.location}
                       </div>
                       <div style={{fontSize:'0.8rem', color:'#888'}}>{new Date(m.date).toLocaleDateString()}</div>
                    </div>

                    {/* Action */}
                    <div>
                       <button 
                         className="submit-btn" 
                         style={{background:'#2563eb', padding:'6px 12px', fontSize:'0.8rem'}}
                         onClick={() => {
                            setShowMatchModal(false); // Close matching
                            openClaimModal(m);        // Open claim form for this item
                         }}
                       >
                         It's Mine!
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;