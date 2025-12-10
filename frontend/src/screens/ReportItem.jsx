import React, { useState } from "react";
import { API_BASE } from "../config";
import { UploadCloud } from "lucide-react"; // Assuming you have lucide-react installed

export default function ReportItem({ user, categories, locations, onReportSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    report_type: "LOST", // Default
    title: "",
    category_id: "",
    location_id: "",
    primary_color: "",
    brand: "",
    unique_marks: "",
    description: "",
    additional_details: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category_id || !form.location_id) {
        return alert("Please fill in the required fields (*).");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("reporter_id", user.user_id);
      
      // Append all text fields
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      
      // Append image if exists
      if (file) formData.append("image", file);

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Failed to submit report");

      const data = await res.json();
      alert("Report submitted successfully!");
      
      // Reset Form
      setForm({
        report_type: "LOST", title: "", category_id: "", location_id: "",
        primary_color: "", brand: "", unique_marks: "", description: "", additional_details: ""
      });
      setFile(null);

      if (onReportSuccess) onReportSuccess();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine button styles based on selection
  const isLost = form.report_type === 'LOST';
  const lostColor = '#f4af0dff'; // Yellow
  const foundColor = '#10b981'; // Green

  return (
    // Outer Transparent Wrapper
    <section className="report-view-wrapper"> 
      
      {/* Inner White Card */}
      <div className="report-form-card">
        
        <h2 style={{textAlign:'center', marginBottom:'10px'}}>Report an Item</h2>
        <p style={{textAlign:'center', color:'#010000ff', marginBottom:'30px'}}>
          Help us connect lost items with their owners.
        </p>

        <form onSubmit={handleSubmit}>
          
          {/* --- 1. TYPE TOGGLE (Pill Selector) --- */}
          <div className="report-type-toggle">
            <div className="pill-selector">
              <button 
                type="button"
                onClick={() => setForm({...form, report_type: 'LOST'})}
                className={`type-button ${isLost ? 'active' : ''}`}
                style={{
                  '--active-bg': lostColor,
                  '--active-shadow': 'rgba(124, 18, 18, 0.3)',
                  '--active-color': isLost ? 'white' : 'var(--text-main)' // Use text-main for unselected button text
                }}
              >
                I Lost Something
              </button>
              <button 
                type="button"
                onClick={() => setForm({...form, report_type: 'FOUND'})}
                className={`type-button ${!isLost ? 'active' : ''}`}
                style={{
                  '--active-bg': foundColor,
                  '--active-shadow': 'rgba(16,185,129,0.3)',
                  '--active-color': !isLost ? 'white' : 'var(--text-main)' // Use text-main for unselected button text
                }}
              >
                I Found Something
              </button>
            </div>
          </div>

          {/* --- 2. MAIN DETAILS --- */}
          <div className="form-row">
            <label>Item Title *</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Blue Hydro Flask" required />
          </div>

          <div className="form-row two-cols" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
            <div>
              <label>Category *</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} required>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label>Location {isLost ? 'Last Seen' : 'Found At'} *</label>
              <select name="location_id" value={form.location_id} onChange={handleChange} required>
                <option value="">Select Location</option>
                {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* --- 3. VISUAL DETAILS --- */}
          <div className="form-row three-cols" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
            <div>
              <label>Color</label>
              <input name="primary_color" value={form.primary_color} onChange={handleChange} placeholder="e.g. Black" />
            </div>
            <div>
              <label>Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Nike" />
            </div>
            <div>
              <label>Unique Marks</label>
              <input name="unique_marks" value={form.unique_marks} onChange={handleChange} placeholder="Stickers, scratches..." />
            </div>
          </div>

          <div className="form-row">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="3" placeholder="Provide more details..." />
          </div>

          {/* --- 4. IMAGE UPLOAD (Using custom label) --- */}
          <div className="form-row file-upload-row">
            <label>Upload Photo (Optional)</label>
            <div className="file-upload-box">
                <input type="file" id="report-file-upload" onChange={(e) => setFile(e.target.files[0])} hidden />
                <label htmlFor="report-file-upload" className="file-upload-label">
                    <UploadCloud size={20} style={{marginRight:8}} />
                    {file ? file.name : "Click here to upload an image of the item"}
                </label>
            </div>
          </div>

          {/* --- 5. SUBMIT --- */}
          <div style={{marginTop: '30px'}}>
            <button type="submit" className="submit-btn" disabled={loading} style={{
              background: isLost ? lostColor : foundColor
            }}>
              {loading ? "Submitting..." : `Submit ${form.report_type} Report`}
            </button>
          </div>

        </form>
      </div> {/* End of report-form-card */}
    </section>
  );
}