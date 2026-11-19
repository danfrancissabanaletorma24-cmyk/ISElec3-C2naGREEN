// src/admin/components/StatusBadge.jsx
import React from 'react';
import { statusStyles } from '../../data/adminData';

export default function StatusBadge({ status, className = '' }) {
  const styles = statusStyles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
