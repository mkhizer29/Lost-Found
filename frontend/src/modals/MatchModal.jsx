// MatchModal.jsx
import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function MatchModal({ reportId, onClose, onClaim }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function fetchMatches() {
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/matches`);
      if (res.ok) setMatches(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getMatchStrength = (score) => {
    if (score >= 18) return { label: "Strong match", color: "#16a34a" };   // green
    if (score >= 12) return { label: "Likely match", color: "#f59e0b" };   // amber
    return { label: "Loose match", color: "#64748b" };                     // slate
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content stylish-modal match-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px", width: "94%" }}
      >
        {/* HEADER */}
        <div className="match-header">
          <div>
            <p className="match-label">Smart suggestions</p>
            <h3 className="match-title">Potential Matches</h3>
          </div>
          <button className="icon-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="match-empty-state">
            <div className="match-empty-icon">🌀</div>
            <h4>Scanning campus for your item…</h4>
            <p>Checking recent FOUND reports by category, color and location.</p>
          </div>
        ) : matches.length === 0 ? (
          // EMPTY STATE
          <div className="match-empty-state">
            <div className="match-empty-icon">🔍</div>
            <h4>No close matches yet</h4>
            <p>
              We didn’t find any strong matches for this report right now.
              New FOUND items are checked automatically based on{" "}
              <strong>category</strong>, <strong>color</strong> and{" "}
              <strong>location</strong>.
            </p>
          </div>
        ) : (
          // LIST
          <div className="match-list">
            <p className="match-subtitle">
              We found <strong>{matches.length}</strong>{" "}
              {matches.length === 1 ? "item" : "items"} that look similar:
            </p>

            {matches.map((m) => {
              const strength = getMatchStrength(m.score);
              return (
                <div key={m.item_id} className="match-card">
                  <div className="match-thumb">
                    {m.image_url ? (
                      <img
                        src={`${API_BASE}${m.image_url}`}
                        alt="Item"
                        className="match-thumb-img"
                      />
                    ) : (
                      <div className="match-thumb-placeholder">No image</div>
                    )}
                  </div>

                  <div className="match-body">
                    <div className="match-title-row">
                      <h4>{m.title}</h4>
                      <span
                        className="match-score-pill"
                        style={{
                          color: strength.color,
                          backgroundColor: strength.color + "1a", // 10% alpha
                        }}
                      >
                        {strength.label}
                      </span>
                    </div>

                    <div className="match-meta">
                      <span className="match-tag">
                        🎨 {m.color || "Colour not specified"}
                      </span>
                      <span className="match-tag">
                        📍 {m.location || "Location not specified"}
                      </span>
                      {m.date && (
                        <span className="match-tag">
                          🗓 {new Date(m.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="submit-btn match-claim-btn"
                    onClick={() => {
                      onClose();
                      onClaim(m); // Opens ClaimModal for this item
                    }}
                  >
                    Looks like mine
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
