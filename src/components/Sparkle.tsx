"use client";
import React, { useEffect, useRef } from "react";

export function Sparkle({ x, y, emoji }: { x: number; y: number; emoji: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const t = setTimeout(() => node.remove(), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div ref={ref} className="sparkle" style={{ left: x, top: y }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
    </div>
  );
}

