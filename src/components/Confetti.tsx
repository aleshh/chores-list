"use client";
import React, { useEffect, useRef } from "react";

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export function Confetti({ show }: { show: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show || !ref.current) return;
    const el = ref.current;
    el.innerHTML = "";
    const colors = ["#fff", "#ffe066", "#ffd43b", "#fab005", "#fff" /* white sprinkle */];
    const count = 120;
    const height = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      piece.style.left = `${rand(0, 100)}%`;
      piece.style.background = colors[i % colors.length];
      const rotate = rand(-180, 180);
      const duration = rand(1.8, 3.2);
      piece.animate([
        { transform: `translateY(-20px) rotate(${rotate}deg)`, opacity: 1 },
        { transform: `translateY(${height + 20}px) rotate(${rotate + rand(-90, 90)}deg)`, opacity: 0.9 }
      ], { duration: duration * 1000, easing: "cubic-bezier(.2,.8,.2,1)" });
      el.appendChild(piece);
    }
    const t = setTimeout(() => { if (ref.current) ref.current.innerHTML = ""; }, 3500);
    return () => clearTimeout(t);
  }, [show]);
  return <div ref={ref} className="confetti" aria-hidden />;
}

