import React from 'react';
import './StatCard.css';

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`stat-card glass-card stat-card--${accent || 'purple'}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default StatCard;
