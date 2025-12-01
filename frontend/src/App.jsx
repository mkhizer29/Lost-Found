// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

// Flask backend base URL
const API_BASE = "http://127.0.0.1:5000";

// For now this is hard-coded to an existing APP_USER.user_id (e.g. Ali Ahmed).
const DEFAULT_REPORTER_ID = 21; // NOTE: set to actual user_id from APP_USER

function App() {
  // ====== Tab state ======
  const [activeTab, setActiveTab] = useState("overview"); // "overview" or "reports"

  // ====== Reports list state ======
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState("");

  // ====== Lookup data (categories, locations) ======
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // ====== Form state for "Report Lost / Found Item" ======
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    primary_color: "",
    brand: "",
    unique_marks: "",
    location_id: "",
    additional_details: "",
    // report_type lives in the form state and defaults to LOST
    report_type: "LOST",
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // ====== Filters state (for reports table) ======
  const [filterType, setFilterType] = useState("ALL"); // ALL | LOST | FOUND
  const [filterCategoryName, setFilterCategoryName] = useState("ALL"); // ALL or category name
  const [searchTerm, setSearchTerm] = useState("");

  // ---------- Helper: load reports list ----------
  async function loadReports() {
    try {
      setLoadingReports(true);
      setReportsError("");

      const response = await fetch(`${API_BASE}/api/reports`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      setReports(data);
    } catch (err) {
      setReportsError(err.message);
    } finally {
      setLoadingReports(false);
    }
  }

  // ---------- Helper: load categories + locations ----------
  async function loadLookups() {
    try {
      const [catRes, locRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/locations`),
      ]);

      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
      } else {
        console.error("Failed to load categories", catRes.status);
      }

      if (locRes.ok) {
        const locs = await locRes.json();
        setLocations(locs);
      } else {
        console.error("Failed to load locations", locRes.status);
      }
    } catch (err) {
      console.error("Error loading lookups:", err);
    }
  }

  // Load reports once on first render
  useEffect(() => {
    loadReports();
  }, []);

  // Load lookup data once on first render
  useEffect(() => {
    loadLookups();
  }, []);

  // ---------- Form handlers ----------
  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    const title = form.title.trim();
    const categoryId = Number(form.category_id);
    const locationId = Number(form.location_id);

    // Ensure report_type is a valid value and uppercase, fallback to LOST
    const reportType = (form.report_type || "LOST").toUpperCase();

    // very simple validation
    if (!title || !categoryId || !locationId) {
      setSaveError("Please fill in Title, Category and Location.");
      return;
    }

    if (reportType !== "LOST" && reportType !== "FOUND") {
      setSaveError("Report type must be LOST or FOUND.");
      return;
    }

    // Build payload exactly how backend expects
    const payload = {
      report_type: reportType,
      title,
      description: form.description.trim() || null,
      category_id: categoryId,
      primary_color: form.primary_color.trim() || null,
      brand: form.brand.trim() || null,
      unique_marks: form.unique_marks.trim() || null,
      image_url: null,
      location_id: locationId,
      additional_details: form.additional_details.trim() || null,
      reporter_id: DEFAULT_REPORTER_ID,
    };

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Backend error: ${res.status}`;
        try {
          const body = await res.json();
          if (body && body.error) msg = body.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(msg);
      }

      // After successful creation, reload the reports list
      await loadReports();

      // Clear the form back to initial state
      setForm({
        title: "",
        description: "",
        category_id: "",
        primary_color: "",
        brand: "",
        unique_marks: "",
        location_id: "",
        additional_details: "",
        report_type: "LOST", // reset dropdown to LOST by default
      });

      setSaveSuccess("Report created successfully!");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- Derived: filtered reports for the table ----------
  const filteredReports = reports.filter((r) => {
    // Filter by type (LOST / FOUND / ALL)
    if (filterType !== "ALL" && r.report_type !== filterType) {
      return false;
    }

    // Filter by category name
    if (
      filterCategoryName !== "ALL" &&
      r.category_name !== filterCategoryName
    ) {
      return false;
    }

    // Simple search on item title
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const title = (r.item_title || "").toLowerCase();
      if (!title.includes(term)) {
        return false;
      }
    }

    return true;
  });

  // Dynamic button label, just for nicer UX
  const reportTypeLabel =
    form.report_type === "FOUND" ? "Found Item" : "Lost Item";

  // -------- Overview statistics --------
  const lostCount = reports.filter((r) => r.report_type === "LOST").length;
  const foundCount = reports.filter((r) => r.report_type === "FOUND").length;
  const resolvedCount = reports.filter(
    (r) => r.item_status === "RESOLVED"
  ).length;
  const totalReports = reports.length;
  const categoryBreakdown = {};
  reports.forEach((r) => {
    categoryBreakdown[r.category_name] =
      (categoryBreakdown[r.category_name] || 0) + 1;
  });

  // ---------------- UI ----------------
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lost &amp; Found – Reports</h1>
        <p className="subtitle">
          Data coming live from your Flask + Oracle backend 🚀
        </p>
      </header>

      <main className="app-main">
        {/* ====== TAB NAVIGATION ====== */}
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
        </div>

        {/* ====== OVERVIEW TAB ====== */}
        {activeTab === "overview" && (
          <section className="overview-section">
            <h2>Dashboard Overview</h2>

            {loadingReports ? (
              <p className="info">Loading statistics...</p>
            ) : (
              <>
                {/* Stats grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Reports</div>
                    <div className="stat-value">{totalReports}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Lost Items</div>
                    <div className="stat-value" style={{ color: "#fca5a5" }}>
                      {lostCount}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Found Items</div>
                    <div className="stat-value" style={{ color: "#86efac" }}>
                      {foundCount}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Resolved</div>
                    <div className="stat-value" style={{ color: "#60a5fa" }}>
                      {resolvedCount}
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="breakdown-section">
                  <h3>Reports by Category</h3>
                  {Object.keys(categoryBreakdown).length === 0 ? (
                    <p className="info">No reports yet.</p>
                  ) : (
                    <div className="category-list">
                      {Object.entries(categoryBreakdown).map(
                        ([category, count]) => (
                          <div key={category} className="category-item">
                            <span className="category-name">{category}</span>
                            <div className="category-bar-container">
                              <div
                                className="category-bar"
                                style={{
                                  width: `${(count / totalReports) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="category-count">{count}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ====== REPORTS TAB ====== */}
        {activeTab === "reports" && (
          <>
            {/* ====== REPORT LIST ====== */}
            {loadingReports && <p className="info">Loading reports...</p>}
        {reportsError && (
          <p className="error">Something went wrong: {reportsError}</p>
        )}

        {!loadingReports && !reportsError && (
          <>
            {reports.length === 0 ? (
              <p className="info">No reports yet.</p>
            ) : (
              <>
                {/* ====== FILTERS BAR ====== */}
                <div className="filters-row">
                  <div className="filter-group">
                    <label>
                      Type
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                      >
                        <option value="ALL">All</option>
                        <option value="LOST">Lost</option>
                        <option value="FOUND">Found</option>
                      </select>
                    </label>
                  </div>

                  <div className="filter-group">
                    <label>
                      Category
                      <select
                        value={filterCategoryName}
                        onChange={(e) =>
                          setFilterCategoryName(e.target.value)
                        }
                      >
                        <option value="ALL">All categories</option>
                        {categories.map((c) => (
                          <option key={c.category_id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="filter-group">
                    <label>
                      Search title
                      <input
                        type="text"
                        placeholder="e.g. wallet, hoodie..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* ====== TABLE OR 'NO MATCH' MESSAGE ====== */}
                {filteredReports.length === 0 ? (
                  <p className="info">
                    No reports match the current filters.
                  </p>
                ) : (
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Reported At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((r) => (
                        <tr key={r.report_id}>
                          <td>{r.report_id}</td>
                          <td>{r.report_type}</td>
                          <td>{r.item_title}</td>
                          <td>{r.category_name}</td>
                          <td>{r.location_name}</td>
                          <td>{r.item_status}</td>
                          <td>{r.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </>
        )}
            </> 
        )}

        {/* ====== FORM SECTION (shown in reports tab) ====== */}
        {activeTab === "reports" && (
        <section className="form-section">
          <h2>Report a Lost or Found Item</h2>
          <p className="info">
            Fill this form to create a new LOST or FOUND report using your
            backend API.
          </p>

          {saveError && <p className="error">{saveError}</p>}
          {saveSuccess && <p className="success">{saveSuccess}</p>}

          <form className="report-form" onSubmit={handleSubmit}>
            {/* Report Type dropdown */}
            <div className="form-row">
              <label>
                Report type*
                <select
                  name="report_type"
                  value={form.report_type}
                  onChange={handleInputChange}
                >
                  <option value="LOST">Lost</option>
                  <option value="FOUND">Found</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Title*
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Grey hoodie"
                />
              </label>
            </div>

            <div className="form-row two-cols">
              <label>
                Category*
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Location*
                <select
                  name="location_id"
                  value={form.location_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe the item and where it was lost/found..."
                />
              </label>
            </div>

            <div className="form-row three-cols">
              <label>
                Primary color
                <input
                  type="text"
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleInputChange}
                  placeholder="Grey"
                />
              </label>

              <label>
                Brand
                <input
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleInputChange}
                  placeholder="Adidas"
                />
              </label>

              <label>
                Unique marks
                <input
                  type="text"
                  name="unique_marks"
                  value={form.unique_marks}
                  onChange={handleInputChange}
                  placeholder="IBA logo on left sleeve"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Additional details
                <input
                  type="text"
                  name="additional_details"
                  value={form.additional_details}
                  onChange={handleInputChange}
                  placeholder="Any other info you'd like to add"
                />
              </label>
            </div>

            <div className="form-row">
              <button
                type="submit"
                disabled={saving || !categories.length || !locations.length}
              >
                {saving
                  ? "Submitting..."
                  : `Submit ${reportTypeLabel} Report`}
              </button>
            </div>

            {(!categories.length || !locations.length) && (
              <p className="info">
                Categories/locations not loaded yet – make sure backend
                /api/categories and /api/locations are working.
              </p>
            )}
          </form>
        </section>
        )}
      </main>
    </div>
  );
}

export default App;
