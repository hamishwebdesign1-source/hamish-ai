"use client";

import { useEffect, useState } from "react";

export function HealthRing({
  score,
  size = 140,
  strokeWidth = 10,
  centerLabel,
  centerSublabel,
  // Real-improvement pass — this was hardcoded to text-primary-foreground
  // for every one of this component's 5 real consumers (Studio stat
  // cards, portal insights, the marketing-site platform preview). Fine
  // as a default (every existing caller keeps working unchanged), but
  // wrong to assume forever: .studio-shell's Business Health stat card
  // moved to bg-card (2026-08 UX audit), where --card-foreground and
  // --primary-foreground only happen to be near-identical near-white
  // values today. An explicit prop, not a currentColor switch, so each
  // of the other 4 real consumers (portal, marketing preview) is
  // unaffected rather than silently re-scoped along with this one.
  //
  // A `tone` enum with static class lookups, not a freeform className
  // string composed at runtime (`${x}/10`) — Tailwind's JIT scanner
  // needs the complete literal class string present somewhere in source
  // to generate its CSS; a runtime-interpolated string never matches
  // and silently produces no styling at all.
  tone = "primary",
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
  tone?: "primary" | "card";
}) {
  const FOREGROUND: Record<"primary" | "card", { track: string; label: string; sublabel: string }> = {
    primary: { track: "text-primary-foreground/10", label: "text-primary-foreground", sublabel: "text-primary-foreground/60" },
    card: { track: "text-card-foreground/10", label: "text-card-foreground", sublabel: "text-card-foreground/60" },
  };
  const foreground = FOREGROUND[tone];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  // Reduced-motion state is decided once, synchronously, via useState's
  // lazy initializer rather than an effect that calls setState directly
  // on mount — the pattern React's own lint rule now flags (cascading
  // renders), pre-existing in this file and fixed in passing while
  // already here for the tone prop above.
  const [offset, setOffset] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? targetOffset : circumference
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // already set correctly above
    const raf = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(raf);
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
          className={foreground.track}
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
            <span className={`font-heading text-3xl font-semibold tabular-nums ${foreground.label}`}>
              {centerLabel}
            </span>
          )}
          {centerSublabel && <span className={`mt-0.5 text-[11px] ${foreground.sublabel}`}>{centerSublabel}</span>}
        </div>
      )}
    </div>
  );
}
