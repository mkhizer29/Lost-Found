// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

// Flask backend base URL
const API_BASE = "http://127.0.0.1:5000";

// For now this is hard-coded to an existing APP_USER.user_id (e.g. Ali Ahmed).
const DEFAULT_REPORTER_ID = 21; 

function App() {
  // ====== Tab state ======
  const [activeTab, setActiveTab] = useState("overview"); 

  // ====== Claims Modal State ======
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [claimEvidence, setClaimEvidence] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimFile, setClaimFile] = useState(null); // File upload for claim

  // ====== File Upload State (for Report) ======
  const [selectedFile, setSelectedFile] = useState(null); 
  
  // ====== Reports & Claims Data State (CRITICAL FOR BLANK SCREEN FIX) ======
  const [reports, setReports] = useState([]);
  const [myClaims, setMyClaims] = useState([]); // <--- This was likely missing!
  
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState("");

  // ====== Lookup data ======
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // ====== Form state ======
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", primary_color: "",
    brand: "", unique_marks: "", location_id: "", additional_details: "",
    report_type: "LOST",
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // ====== Filters state ======
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategoryName, setFilterCategoryName] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // ---------- Helper: load reports ----------
  async function loadReports() {
    try {
      setLoadingReports(true);
      setReportsError("");
      const response = await fetch(`${API_BASE}/api/reports`);
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const data = await response.json();
      setReports(data);
    } catch (err) {
      setReportsError(err.message);
    } finally {
      setLoadingReports(false);
    }
  }

  // ---------- Helper: load MY CLAIMS (CRITICAL FIX) ----------
  async function loadMyClaims() {
    try {
      const res = await fetch(`${API_BASE}/api/my-claims`);
      if (res.ok) {
        const data = await res.json();
        setMyClaims(data);
      }
    } catch (err) {
      console.error("Failed to load claims", err);
    }
  }

  // ---------- Helper: load lookups ----------
  async function loadLookups() {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/locations`),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch (err) {
      console.error("Error loading lookups:", err);
    }
  }

  // Initial Data Load
  useEffect(() => {
    loadReports();
    loadLookups();
    loadMyClaims(); // <--- Make sure this runs!
  }, []);

  // ---------- Form handlers ----------
  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    const title = form.title.trim();
    const categoryId = form.category_id;
    const locationId = form.location_id;
    const reportType = (form.report_type || "LOST").toUpperCase();

    if (!title || !categoryId || !locationId) {
      setSaveError("Please fill in Title, Category and Location.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("report_type", reportType);
    formData.append("category_id", categoryId);
    formData.append("location_id", locationId);
    formData.append("reporter_id", DEFAULT_REPORTER_ID); 

    if (form.description) formData.append("description", form.description);
    if (form.primary_color) formData.append("primary_color", form.primary_color);
    if (form.brand) formData.append("brand", form.brand);
    if (form.unique_marks) formData.append("unique_marks", form.unique_marks);
    if (form.additional_details) formData.append("additional_details", form.additional_details);
    if (selectedFile) formData.append("image", selectedFile);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", body: formData });
      if (!res.ok) {
        let msg = `Backend error: ${res.status}`;
        try { const body = await res.json(); if (body.error) msg = body.error; } catch { }
        throw new Error(msg);
      }
      await loadReports();
      setForm({
        title: "", description: "", category_id: "", primary_color: "",
        brand: "", unique_marks: "", location_id: "", additional_details: "",
        report_type: "LOST",
      });
      setSelectedFile(null);
      setSaveSuccess("Report created successfully!");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- CLAIM LOGIC ----------
  function openClaimModal(item) {
    setSelectedItem(item);
    setClaimEvidence("");
    setClaimFile(null); // Reset file
    setShowClaimModal(true);
  }

  async function handleClaimSubmit(e) {
    e.preventDefault();
    if (!claimEvidence.trim()) return;

    try {
      setSubmittingClaim(true);
      const TEST_CLAIMANT_ID = 22; 

      const formData = new FormData();
      formData.append("item_id", selectedItem.item_id);
      formData.append("claimant_id", TEST_CLAIMANT_ID);
      formData.append("evidence_text", claimEvidence);
      
      if (claimFile) {
        formData.append("proof_image", claimFile);
      }

      const res = await fetch(`${API_BASE}/api/claims`, {
        method: "POST",
        body: formData 
      });

      if (!res.ok) {
        let msg = "Failed to submit claim";
        try { const body = await res.json(); if(body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }

      alert("Claim submitted successfully!");
      setShowClaimModal(false);
      loadReports(); 
      loadMyClaims(); // Refresh my claims list
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingClaim(false);
    }
  }

  // ---------- Filters ----------
  const filteredReports = reports.filter((r) => {
    if (filterType !== "ALL" && r.report_type !== filterType) return false;
    if (filterCategoryName !== "ALL" && r.category_name !== filterCategoryName) return false;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const title = (r.item_title || "").toLowerCase();
      if (!title.includes(term)) return false;
    }
    return true;
  });

  const reportTypeLabel = form.report_type === "FOUND" ? "Found Item" : "Lost Item";

  // -------- Stats --------
  const lostCount = reports.filter((r) => r.report_type === "LOST").length;
  const foundCount = reports.filter((r) => r.report_type === "FOUND").length;
  const resolvedCount = reports.filter((r) => r.item_status === "RESOLVED").length;
  const totalReports = reports.length;
  const categoryBreakdown = {};
  reports.forEach((r) => {
    categoryBreakdown[r.category_name] = (categoryBreakdown[r.category_name] || 0) + 1;
  });

  // ---------------- UI ----------------
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lost &amp; Found – Reports</h1>
        <p className="subtitle">Data coming live from your Flask + Oracle backend 🚀</p>
      </header>

      <main className="app-main">
        {/* Navigation */}
        <div className="tabs-container">
          <button className={`tab-button ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`tab-button ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>Browse Reports</button>
          <button className={`tab-button ${activeTab === "claims" ? "active" : ""}`} onClick={() => setActiveTab("claims")}>My Claims</button>
          <button className={`tab-button ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>Admin</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <section className="overview-section">
            <h2>Dashboard Overview</h2>
            {loadingReports ? (
              <p className="info">Loading statistics...</p>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-label">Total Reports</div><div className="stat-value">{totalReports}</div></div>
                  <div className="stat-card"><div className="stat-label">Lost Items</div><div className="stat-value" style={{ color: "#fca5a5" }}>{lostCount}</div></div>
                  <div className="stat-card"><div className="stat-label">Found Items</div><div className="stat-value" style={{ color: "#86efac" }}>{foundCount}</div></div>
                  <div className="stat-card"><div className="stat-label">Resolved</div><div className="stat-value" style={{ color: "#60a5fa" }}>{resolvedCount}</div></div>
                </div>
                <div className="breakdown-section">
                  <h3>Reports by Category</h3>
                  {Object.keys(categoryBreakdown).length === 0 ? (
                    <p className="info">No reports yet.</p>
                  ) : (
                    <div className="category-list">
                      {Object.entries(categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="category-item">
                          <span className="category-name">{category}</span>
                          <div className="category-bar-container">
                            <div className="category-bar" style={{ width: `${(count / totalReports) * 100}%` }}></div>
                          </div>
                          <span className="category-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <>
            {loadingReports && <p className="info">Loading reports...</p>}
            {reportsError && <p className="error">Something went wrong: {reportsError}</p>}

            {!loadingReports && !reportsError && (
              <>
                {reports.length === 0 ? (
                  <p className="info">No reports yet.</p>
                ) : (
                  <>
                    <div className="filters-row">
                      <div className="filter-group">
                        <label>Type <select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="ALL">All</option><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label>
                      </div>
                      <div className="filter-group">
                        <label>Category <select value={filterCategoryName} onChange={(e) => setFilterCategoryName(e.target.value)}><option value="ALL">All categories</option>{categories.map((c) => <option key={c.category_id} value={c.name}>{c.name}</option>)}</select></label>
                      </div>
                      <div className="filter-group">
                        <label>Search title <input type="text" placeholder="e.g. wallet..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></label>
                      </div>
                    </div>

                    {filteredReports.length === 0 ? (
                      <p className="info">No reports match the current filters.</p>
                    ) : (
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Photo</th>
                            <th>Type</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Reported At</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReports.map((r) => (
                            <tr key={r.report_id}>
                              <td>{r.report_id}</td>
                              <td>
                                {r.item_image_url ? (
                                  <img 
                                    src={`${API_BASE}${r.item_image_url}`} 
                                    alt="Item" 
                                    style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid #ddd" }} 
                                  />
                                ) : (
                                  <span style={{ color: "#999", fontSize: "0.85rem", fontStyle: "italic" }}>No Photo</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontWeight: "bold", color: r.report_type === "LOST" ? "#c8102e" : "#059669", background: r.report_type === "LOST" ? "#fee2e2" : "#d1fae5", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>
                                  {r.report_type}
                                </span>
                              </td>
                              <td style={{ fontWeight: "600" }}>{r.item_title}</td>
                              <td>{r.category_name}</td>
                              <td>{r.location_name}</td>
                              <td><span className={`status-badge ${r.item_status.toLowerCase()}`}>{r.item_status}</span></td>
                              <td style={{ fontSize: "0.85rem", color: "#666" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                              <td>
                                {r.report_type === "FOUND" && r.item_status === "OPEN" && (
                                  <button className="claim-btn" onClick={() => openClaimModal(r)}>
                                    Claim This
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </>
            )}

            <section className="form-section">
              <h2>Report a Lost or Found Item</h2>
              <p className="info">Fill this form to create a new LOST or FOUND report.</p>

              {saveError && <p className="error">{saveError}</p>}
              {saveSuccess && <p className="success">{saveSuccess}</p>}

              <form className="report-form" onSubmit={handleSubmit}>
                <div className="form-row"><label>Report type*<select name="report_type" value={form.report_type} onChange={handleInputChange}><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label></div>
                <div className="form-row"><label>Title*<input type="text" name="title" value={form.title} onChange={handleInputChange} placeholder="e.g. Grey hoodie" /></label></div>
                <div className="form-row two-cols">
                  <label>Category*<select name="category_id" value={form.category_id} onChange={handleInputChange}><option value="">Select category</option>{categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></label>
                  <label>Location*<select name="location_id" value={form.location_id} onChange={handleInputChange}><option value="">Select location</option>{locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}</select></label>
                </div>
                <div className="form-row"><label>Description<textarea name="description" value={form.description} onChange={handleInputChange} rows={3} /></label></div>
                <div className="form-row three-cols">
                  <label>Color<input type="text" name="primary_color" value={form.primary_color} onChange={handleInputChange} /></label>
                  <label>Brand<input type="text" name="brand" value={form.brand} onChange={handleInputChange} /></label>
                  <label>Marks<input type="text" name="unique_marks" value={form.unique_marks} onChange={handleInputChange} /></label>
                </div>
                <div className="form-row"><label>Details<input type="text" name="additional_details" value={form.additional_details} onChange={handleInputChange} /></label></div>
                <div className="form-row"><label>Upload Photo<input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} /></label></div>
                <div className="form-row"><button type="submit" disabled={saving || !categories.length || !locations.length}>{saving ? "Submitting..." : `Submit ${reportTypeLabel} Report`}</button></div>
              </form>
            </section>
          </>
        )}

        {/* ====== MY CLAIMS TAB (FIXED) ====== */}
        {activeTab === "claims" && (
          <section className="overview-section">
            <h2>My Claims</h2>
            {myClaims.length === 0 ? (
              <p className="info">You have no active claims.</p>
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th>My Message</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myClaims.map((c) => (
                    <tr key={c.claim_id}>
                      <td>{c.claim_id}</td>
                      <td style={{fontWeight:'bold'}}>{c.item_title}</td>
                      <td><span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                      <td style={{color:'#555', fontSize:'0.9rem'}}>{c.message}</td>
                      <td style={{fontSize:'0.85rem', color:'#888'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === "admin" && (
          <section className="overview-section">
            <h2>Admin Dashboard</h2>
            <p className="info">Restricted Access. (Coming soon)</p>
          </section>
        )}

        {/* CLAIM MODAL UI */}
        {showClaimModal && selectedItem && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Claim Item: {selectedItem.item_title}</h3>
              <p className="info">Please describe why this item belongs to you (evidence).</p>
              <form onSubmit={handleClaimSubmit}>
                <textarea rows={4} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "16px" }} value={claimEvidence} onChange={(e) => setClaimEvidence(e.target.value)} placeholder="e.g. It has a sticker of a cat on the back..." required />
                
                <label style={{display:'block', marginBottom:'8px', fontSize:'0.9rem', color:'#555'}}>
                    Upload Proof (Receipt/Photo):
                    <input type="file" accept="image/*" onChange={(e) => setClaimFile(e.target.files[0])} style={{marginTop:'4px'}} />
                </label>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowClaimModal(false)}>Cancel</button>
                  <button type="submit" className="submit-btn" disabled={submittingClaim}>{submittingClaim ? "Submitting..." : "Submit Claim"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;