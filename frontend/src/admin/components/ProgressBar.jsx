// src/admin/components/ProgressBar.jsx
import React from 'react';

export default function ProgressBar({ value, max = 100, color = '#0056FF', className = '' }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full w-[var(--bar-width)] rounded-full bg-[var(--bar-color)] transition-all duration-500"
        style={{ '--bar-width': `${pct}%`, '--bar-color': color }}
      />
    </div>
  );
}
