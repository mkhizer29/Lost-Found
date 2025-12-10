import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { TrendingUp, CheckCircle, Search, AlertCircle } from "lucide-react";

export default function Overview({ reports = [] }) { // Default to empty array
  
  // --- SAFETY CHECK ---
  // If reports is null or undefined, show a loading placeholder instead of crashing
  if (!reports) {
    return <div style={{padding:'20px', textAlign:'center'}}>Loading dashboard data...</div>;
  }

  // --- 1. DATA CALCULATIONS ---
  const total = reports.length;
  const lostCount = reports.filter(r => r.report_type === "LOST").length;
  const foundCount = reports.filter(r => r.report_type === "FOUND").length;
  const resolvedCount = reports.filter(r => r.item_status === "CLAIMED" || r.item_status === "RETURNED").length;

  // --- 2. PREPARE CHART DATA ---
  
  // A. Category Breakdown
  const categoryMap = {};
  reports.forEach(r => {
    // Safety check: ensure name exists
    const name = r.category_name || "Uncategorized";
    categoryMap[name] = (categoryMap[name] || 0) + 1;
  });
  
  const categoryData = Object.keys(categoryMap).map(key => ({
    name: key,
    count: categoryMap[key]
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // B. Status Breakdown
  const statusMap = { 'OPEN': 0, 'CLAIMED': 0, 'RETURNED': 0 };
  reports.forEach(r => {
    const s = r.item_status || 'OPEN';
    if (statusMap[s] !== undefined) statusMap[s]++;
    else statusMap['OPEN']++;
  });
  
  const statusData = [
    { name: 'Active', value: statusMap['OPEN'] },
    { name: 'Claimed', value: statusMap['CLAIMED'] },
    { name: 'Returned', value: statusMap['RETURNED'] },
  ];

  // Prevent Pie Chart Crash if all values are 0
  const isDataEmpty = statusData.every(d => d.value === 0);

  // --- 3. THEME COLORS ---
  const COLORS = ['#2563eb', '#10b981', '#c8102e', '#f59e0b', '#8b5cf6'];

  return (
    <section className="dashboard-container">
      
      {/* --- HEADER --- */}
      <div style={{marginBottom: '30px'}}>
        <h2 style={{fontSize:'1.8rem', fontWeight:'800', color:'var(--text-main)'}}>
          Analytics Overview
        </h2>
        <p style={{color:'var(--text-muted)'}}>Real-time campus reporting metrics</p>
      </div>

      {/* --- ROW 1: KPI CARDS --- */}
      <div className="stats-grid">
        <div className="stat-card kpi-box">
          <div className="icon-box" style={{background: '#dbeafe', color: '#2563eb'}}>
            <Search size={24} />
          </div>
          <div>
            <p className="kpi-label">Total Reports</p>
            <h3 className="kpi-value">{total}</h3>
          </div>
        </div>

        <div className="stat-card kpi-box">
          <div className="icon-box" style={{background: '#fee2e2', color: '#c8102e'}}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="kpi-label">Items Lost</p>
            <h3 className="kpi-value">{lostCount}</h3>
          </div>
        </div>

        <div className="stat-card kpi-box">
          <div className="icon-box" style={{background: '#dcfce7', color: '#10b981'}}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="kpi-label">Items Found</p>
            <h3 className="kpi-value">{foundCount}</h3>
          </div>
        </div>

        <div className="stat-card kpi-box">
          <div className="icon-box" style={{background: '#f3e8ff', color: '#9333ea'}}>
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="kpi-label">Resolved</p>
            <h3 className="kpi-value">{resolvedCount}</h3>
          </div>
        </div>
      </div>

      {/* --- ROW 2: CHARTS --- */}
      <div className="charts-row">
        
        {/* CHART 1: CATEGORIES */}
        <div className="stat-card chart-card">
          <h4>Reports by Category</h4>
          <div style={{ width: '100%', height: 300 }}>
            {categoryData.length > 0 ? (
                <ResponsiveContainer>
                <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                    <XAxis dataKey="name" tick={{fill:'#6b7280', fontSize:12}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill:'#6b7280', fontSize:12}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 10px 20px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa'}}>
                    No data available
                </div>
            )}
          </div>
        </div>

        {/* CHART 2: STATUS */}
        <div className="stat-card chart-card">
          <h4>Resolution Status</h4>
          <div style={{ width: '100%', height: 300 }}>
            {!isDataEmpty ? (
                <ResponsiveContainer>
                <PieChart>
                    <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 10px 20px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa'}}>
                    No data available
                </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}