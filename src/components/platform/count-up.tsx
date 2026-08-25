"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Extracted from hero-product-panel.tsx's own useCountUp — same
// ease-out count-from-zero, same reduced-motion short-circuit (renders
// the final value directly at render time under reduced motion, no
// setState call in that path at all — the exact fix that pattern's own
// comment already worked out for the react-hooks/purity "no setState in
// a component's own render" rule). Pulled into its own component now
// that the Command Centre's TODAY strip needs the same treatment
// hero-product-panel.tsx already proved correct, rather than copy-pasting
// the hook a second time.
function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export function CountUp({ value, prefix = "", suffix = "", durationMs = 900 }: { value: number; prefix?: string; suffix?: string; durationMs?: number }) {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reducedMotion]);

  return (
    <>
      {prefix}
      {(reducedMotion ? value : display).toLocaleString("en-GB")}
      {suffix}
    </>
  );
}
