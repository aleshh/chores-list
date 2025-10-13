"use client";
import React, { useEffect, useRef, useState } from "react";

export function CircularProgress({
  size = 80,
  stroke = 10,
  value = 0,
  showLabel = true,
  label,
  duration = 700,
}: {
  size?: number;
  stroke?: number;
  value?: number; // 0..1
  showLabel?: boolean;
  label?: string;
  duration?: number; // ms
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clampedTarget = Math.max(0, Math.min(1, value));

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [display, setDisplay] = useState(clampedTarget);
  const fromRef = useRef(clampedTarget);

  useEffect(() => {
    if (prefersReducedMotion) { setDisplay(clampedTarget); fromRef.current = clampedTarget; return; }
    const start = performance.now();
    const from = fromRef.current;
    const to = clampedTarget;
    if (Math.abs(to - from) < 0.001) return; // no-op
    let raf = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(1, duration));
      const v = from + (to - from) * ease(t);
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [clampedTarget, duration, prefersReducedMotion]);

  const dash = c * Math.max(0, Math.min(1, display));
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
        label != null ? (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight={800} fill="#fff">
            {label}
          </text>
        ) : (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight={800} fill="#fff">
            <tspan fontSize={Math.max(12, Math.round(size * 0.30))}>{Math.round(Math.max(0, Math.min(1, display)) * 100)}</tspan>
            <tspan fontSize={Math.max(10, Math.round(size * 0.16))}>%</tspan>
          </text>
        )
      )}
    </svg>
  );
}
