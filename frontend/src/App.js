// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

// URL where your Flask backend is running
const API_BASE = "http://127.0.0.1:5000";

function App() {
  // 1) React state variables
  const [reports, setReports] = useState([]);   // list of reports from backend
  const [loading, setLoading] = useState(true); // are we currently loading?
  const [error, setError] = useState("");       // error message (if any)

  // 2) Fetch reports once when component mounts
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        setError("");

        // Send HTTP GET request to Flask: /api/reports
        const response = await fetch(`${API_BASE}/api/reports`);

        // If Flask responded with e.g. 500 or 404
        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }

        // Convert JSON body into JavaScript array
        const data = await response.json();

        // Save the data into state
        setReports(data);
      } catch (err) {
        // If anything fails (network, JSON, etc.)
        setError(err.message);
      } finally {
        // Either success or error, loading is finished
        setLoading(false);
      }
    }

    // Call the inner async function
    fetchReports();
  }, []); // [] means: run this effect only once (like "on page load")

  // 3) JSX – how the UI looks
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lost &amp; Found – Reports</h1>
        <p className="subtitle">
          Data coming live from your Flask + Oracle backend 🚀
        </p>
      </header>

      <main className="app-main">
        {/* Show while loading */}
        {loading && <p className="info">Loading reports...</p>}

        {/* Show if there is an error */}
        {error && (
          <p className="error">
            Something went wrong: {error}
          </p>
        )}

        {/* When not loading AND no error, show table or 'no data' */}
        {!loading && !error && (
          <>
            {reports.length === 0 ? (
              <p className="info">No reports yet.</p>
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
                  {reports.map((r) => (
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
      </main>
    </div>
  );
}

export default App;
