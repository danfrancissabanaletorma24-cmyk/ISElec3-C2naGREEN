// src/admin/components/StatCard.jsx
import React from 'react';
import { Ticket, CircleDollarSign, Users, Ship, TrendingUp, TrendingDown } from 'lucide-react';

const ICONS = {
  ticket: Ticket,
  revenue: CircleDollarSign,
  passengers: Users,
  vessels: Ship,
};

export default function StatCard({ label, value, delta, hint, icon }) {
  const Icon = ICONS[icon] ?? Ticket;
  const positive = delta >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0056FF]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
            positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {positive ? '+' : ''}
          {delta}%
        </span>
        <span className="text-slate-400">{hint}</span>
      </div>
    </div>
  );
}
