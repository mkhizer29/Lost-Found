import React, { useState } from "react";
import { API_BASE } from "../config";

export default function Auth({ onLogin }) {
  const [authMode, setAuthMode] = useState("LOGIN"); // LOGIN, REGISTER, VERIFY
  const [authForm, setAuthForm] = useState({ 
    full_name: "", email: "", password: "", role: "STUDENT", admin_secret: "" 
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
        // ==========================================
        // 1. LOGIN LOGIC
        // ==========================================
        if (authMode === "LOGIN") {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({email: authForm.email, password: authForm.password}),
                credentials: "include"
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            onLogin(data.user);
        } 
        
        // ==========================================
        // 2. REGISTER LOGIC (Sends OTP Email)
        // ==========================================
        else if (authMode === "REGISTER") {
            const res = await fetch(`${API_BASE}/api/register`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify(authForm)
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            // Success: Switch to Verify Mode
            alert("✅ Code sent to your email! Please check your inbox.");
            setAuthMode("VERIFY");
        }
        
        // ==========================================
        // 3. VERIFY LOGIC (Checks OTP)
        // ==========================================
        else if (authMode === "VERIFY") {
            const res = await fetch(`${API_BASE}/api/verify-otp`, {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({email: authForm.email, code: otp})
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.error);
            
            // Success: Account Verified
            alert("✅ Verified! You can now login.");
            setAuthMode("LOGIN");
        }
    } catch(err) { 
        setError(err.message); 
    } finally {
        setLoading(false);
    }
  }

  // --- HELPER TO GET BUTTON TEXT ---
  const getButtonText = () => {
      if (loading) return "Processing...";
      if (authMode === "LOGIN") return "Sign In";
      if (authMode === "REGISTER") return "Send Verification Code"; // <--- Explicit Text
      if (authMode === "VERIFY") return "Verify & Activate";
  };

  return (
    <div className="auth-page">
      {/* Background Decor */}
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      {/* Top Header */}
      <div className="brand-section">
        <h1>Campus <br /> Lost & Found</h1>
        <p>Recover What's Yours</p>
      </div>
      
      {/* Middle Card */}
      <div className="auth-card">
        <h2 style={{textAlign:'center', marginBottom:'20px', fontSize:'1.5rem', fontWeight:'700'}}>
            {authMode === "LOGIN" ? "Welcome Back" : authMode === "REGISTER" ? "Create Account" : "Verify Email"}
        </h2>
        
        {error && <p className="error" style={{textAlign:'center'}}>{error}</p>}
        
        <form onSubmit={handleAuthSubmit}>
            
            {/* --- INPUT FIELDS (Hidden when Verifying) --- */}
            {authMode !== "VERIFY" ? (
                <>
                    {authMode === "REGISTER" && (
                        <div className="form-row">
                            <label>Full Name</label>
                            <input type="text" value={authForm.full_name} onChange={(e)=>setAuthForm({...authForm, full_name:e.target.value})} required placeholder="John Doe" />
                        </div>
                    )}
                    
                    <div className="form-row">
                        <label>University Email</label>
                        <input type="email" value={authForm.email} onChange={(e)=>setAuthForm({...authForm, email:e.target.value})} required placeholder="k.user@iba.edu.pk" />
                    </div>
                    
                    <div className="form-row">
                        <label>Password</label>
                        <input type="password" value={authForm.password} onChange={(e)=>setAuthForm({...authForm, password:e.target.value})} required placeholder="••••••••" />
                    </div>

                    {authMode === "REGISTER" && (
                        <>
                            <div className="form-row">
                                <label>Role</label>
                                <select value={authForm.role} onChange={(e)=>setAuthForm({...authForm, role:e.target.value})}>
                                    <option value="STUDENT">Student</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            {authForm.role === 'ADMIN' && (
                                <div className="form-row">
                                    <label style={{color:'var(--primary)'}}>Admin Secret Key</label>
                                    <input type="password" value={authForm.admin_secret} onChange={(e)=>setAuthForm({...authForm, admin_secret:e.target.value})} />
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                /* --- OTP INPUT (Only shown when Verifying) --- */
                <div className="form-row">
                    <label style={{textAlign:'center', fontSize:'1.1rem'}}>Enter 6-Digit Code</label>
                    <p style={{fontSize:'0.8rem', color:'#666', textAlign:'center', marginBottom:'10px'}}>Sent to {authForm.email}</p>
                    <input 
                        type="text" 
                        value={otp} 
                        onChange={(e)=>setOtp(e.target.value)} 
                        placeholder="123 456" 
                        maxLength="6" 
                        required 
                        style={{textAlign:'center', fontSize:'1.5rem', letterSpacing:'5px'}} 
                    />
                </div>
            )}

            {/* --- ACTION BUTTON --- */}
            <div className="form-row" style={{marginTop:'30px'}}>
                <button type="submit" className="submit-btn" disabled={loading}>
                    {getButtonText()}
                </button>
            </div>
        </form>

        {/* --- TOGGLE LOGIN/REGISTER --- */}
        {authMode !== "VERIFY" && (
            <p style={{textAlign:'center', marginTop:'20px', fontSize:'0.9rem', color:'#64748b'}}>
                {authMode === "LOGIN" ? "New here? " : "Already have an account? "}
                <span 
                    style={{color:'var(--primary)', fontWeight:'bold', cursor:'pointer'}}
                    onClick={() => {
                        setAuthMode(authMode === "LOGIN" ? "REGISTER" : "LOGIN");
                        setError("");
                    }}
                >
                    {authMode === "LOGIN" ? "Create Account" : "Login"}
                </span>
            </p>
        )}
        
        {/* --- CANCEL VERIFY --- */}
        {authMode === "VERIFY" && (
            <p style={{textAlign:'center', marginTop:'15px', fontSize:'0.85rem', color:'#64748b', cursor:'pointer', textDecoration:'underline'}} onClick={() => setAuthMode("REGISTER")}>
                Incorrect email? Go back
            </p>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="bottom-panel">
        <div className="panel-text">
            <h4>System Operational</h4>
            <p>Secure Connection • v2.0.4</p>
        </div>
        <div className="panel-decoration">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot active"></div>
        </div>
      </div>
    </div>
  );
}