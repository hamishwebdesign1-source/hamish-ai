"use client";

import { useEffect, useState } from "react";

export function HealthRing({
  score,
  size = 140,
  strokeWidth = 10,
  centerLabel,
  centerSublabel,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOffset(targetOffset);
      return;
    }
    const raf = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetOffset]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-primary-foreground/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="health-ring-arc"
          style={{ filter: "drop-shadow(0 0 6px var(--gradient-blue-line))" }}
        />
      </svg>
      {(centerLabel || centerSublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="font-heading text-3xl font-semibold text-primary-foreground tabular-nums">
              {centerLabel}
            </span>
          )}
          {centerSublabel && (
            <span className="mt-0.5 text-[11px] text-primary-foreground/60">{centerSublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
