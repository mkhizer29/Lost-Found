import React, { useState } from "react";
import { API_BASE } from "../config";
import { X, UploadCloud } from "lucide-react";

export default function ClaimModal({ item, user, onClose, onRefresh }) {
  const [evidence, setEvidence] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // --- LOGIC: Dynamic Text ---
  const isFoundReport = item.report_type === 'FOUND'; // Green Theme
  
  const title = isFoundReport ? "Claim This Item" : "I Found This!";
  const themeColor = isFoundReport ? "#2563eb" : "#10b981"; // Blue vs Green
  
  const instruction = isFoundReport 
    ? "To verify ownership, please describe the item in detail or upload proof." 
    : "Great news! Please tell the owner where you found it or where they can pick it up.";

  const placeholder = isFoundReport 
    ? "e.g. It has a small scratch on the bottom left corner..." 
    : "e.g. I dropped it off at the Library security desk...";

  const buttonText = isFoundReport ? "Submit Claim" : "Notify Owner";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!evidence.trim()) return alert("Please write a message.");

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("item_id", item.item_id);
      formData.append("claimant_id", user.user_id);
      formData.append("evidence_text", evidence);
      if (file) formData.append("proof_image", file);

      const res = await fetch(`${API_BASE}/api/claims`, { method: "POST", body: formData });
      
      // --- NEW ERROR HANDLING LOGIC ---
      const data = await res.json(); // Always parse JSON first

      if (!res.ok) {
          // If the error is "Already Claimed", we treat it as a success for the UI
          // This fixes the "Button didn't update" bug.
          if (data.error && data.error.includes("already claimed")) {
              alert("You have already claimed this! Updating your dashboard...");
              onRefresh();
              onClose();
              return;
          }
          throw new Error(data.error || "Failed to submit");
      }
      
      alert(isFoundReport ? "Claim submitted!" : "Owner notified!");
      onRefresh(); // Updates the list so 'It's Mine' becomes 'Request Sent'
      onClose();

    } catch (err) { 
        alert("Error: " + err.message); 
    } finally { 
        setSubmitting(false); 
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stylish-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* --- HEADER --- */}
        <div className="modal-header">
            <div>
                <h3 style={{color: themeColor}}>{title}</h3>
                <span className="modal-subtitle">{item.item_title}</span>
            </div>
            <button className="icon-close-btn" onClick={onClose}>
                <X size={24} />
            </button>
        </div>

        {/* --- BODY --- */}
        <div className="modal-body">
            <p className="instruction-text">{instruction}</p>
            
            <form onSubmit={handleSubmit}>
                <textarea
                    className="styled-textarea"
                    placeholder={placeholder}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    rows={4}
                    autoFocus
                />
                
                {/* Custom File Upload */}
                <div className="file-upload-box">
                    <input 
                        type="file" 
                        id="file-upload" 
                        onChange={(e) => setFile(e.target.files[0])} 
                        hidden 
                    />
                    <label htmlFor="file-upload" className="file-upload-label">
                        <UploadCloud size={20} style={{marginRight:8}} />
                        {file ? file.name : "Upload Photo / Proof (Optional)"}
                    </label>
                </div>

                {/* --- FOOTER --- */}
                <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={submitting}
                        style={{background: themeColor, border: 'none'}}
                    >
                        {submitting ? "Sending..." : buttonText}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}