"use client";
import React from "react";

export function CircularProgress({
  size = 80,
  stroke = 10,
  value = 0,
  showLabel = true,
  label,
}: {
  size?: number;
  stroke?: number;
  value?: number; // 0..1
  showLabel?: boolean;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = c * clamped;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#fff"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {showLabel && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight={800} fill="#fff">
          {label ?? `${Math.round(clamped * 100)}%`}
        </text>
      )}
    </svg>
  );
}

