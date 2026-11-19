// src/admin/components/Charts.jsx
import React, { useId, useState } from 'react';

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 24, right: 18, bottom: 38, left: 58 };

function niceMax(value) {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

function smoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    if (p1.y === p2.y) {
      d += ` L ${p2.x} ${p2.y}`;
      continue;
    }
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function labelIndices(length, target = 7) {
  if (length <= target) return new Set(Array.from({ length }, (_, i) => i));
  const step = Math.ceil(length / target);
  const set = new Set();
  for (let i = 0; i < length; i += step) set.add(i);
  set.add(length - 1);
  return set;
}

export function AreaChart({ data, color = '#0056FF', valueFormat = (v) => v, height = HEIGHT }) {
  const gradientId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState(null);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const values = data.map((d) => Number(d.value) || 0);
  const max = niceMax(Math.max(...values, 0));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const bottom = PAD.top + plotH;

  const points = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + plotH - (Math.max(0, Number(d.value) || 0) / max) * plotH,
    ...d,
  }));

  const line = smoothPath(points);
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
    : '';

  const visibleLabels = labelIndices(data.length);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Revenue trend chart"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const y = PAD.top + plotH * g;
          const value = max * (1 - g);
          return (
            <g key={g}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
                {value >= 1000 ? `${Math.round(value / 1000)}k` : Math.round(value)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <rect
              x={p.x - plotW / Math.max(data.length * 2, 2)}
              y={PAD.top}
              width={Math.max(plotW / Math.max(data.length, 1), 12)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
            {hovered === i && (
              <line x1={p.x} x2={p.x} y1={PAD.top} y2={bottom} stroke="#CBD5E1" strokeDasharray="3 4" />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 5 : 3.5}
              fill="#fff"
              stroke={color}
              strokeWidth="2.5"
            />
            {visibleLabels.has(i) && (
              <text x={p.x} y={height - 12} textAnchor="middle" className="fill-slate-400" fontSize="11">
                {p.label}
              </text>
            )}
          </g>
        ))}

        {hovered !== null && (
          <g transform={`translate(${Math.min(Math.max(points[hovered].x - 55, 4), WIDTH - 118)}, ${Math.max(points[hovered].y - 62, 4)})`}>
            <rect width="112" height="44" rx="8" fill="#0F172A" opacity="0.94" />
            <text x="12" y="18" fill="#94A3B8" fontSize="10">
              {points[hovered].label}
            </text>
            <text x="12" y="34" fill="#fff" fontSize="13" fontWeight="700">
              {valueFormat(points[hovered].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function BarChart({ data, color = '#0056FF', valueFormat = (v) => v, height = 240 }) {
  const [hovered, setHovered] = useState(null);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const values = data.map((d) => Number(d.value) || 0);
  const max = niceMax(Math.max(...values, 0));
  const slot = plotW / Math.max(data.length, 1);
  const barW = Math.min(slot * 0.55, 46);
  const bottom = PAD.top + plotH;
  const visibleLabels = labelIndices(data.length, 8);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Bookings bar chart"
        onMouseLeave={() => setHovered(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = PAD.top + plotH * g;
          const value = max * (1 - g);
          return (
            <g key={g}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
                {value >= 1000 ? `${Math.round(value / 1000)}k` : Math.round(value)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const safeValue = Math.max(0, Number(d.value) || 0);
          const barH = (safeValue / max) * plotH;
          const y = bottom - barH;
          const active = hovered === i;
          return (
            <g key={`${d.label}-${i}`} onMouseEnter={() => setHovered(i)}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill={color} opacity={active ? 1 : 0.78} />
              {active && (
                <g transform={`translate(${Math.min(Math.max(x + barW / 2 - 55, 4), WIDTH - 116)}, ${Math.max(y - 48, 4)})`}>
                  <rect width="110" height="38" rx="8" fill="#0F172A" opacity="0.94" />
                  <text x="10" y="16" fill="#94A3B8" fontSize="10">
                    {d.label}
                  </text>
                  <text x="10" y="30" fill="#fff" fontSize="12" fontWeight="700">
                    {valueFormat(d.value)}
                  </text>
                </g>
              )}
              {visibleLabels.has(i) && (
                <text x={x + barW / 2} y={height - 12} textAnchor="middle" className="fill-slate-400" fontSize="11">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
