"use client";

import { useEffect, useRef, useState } from "react";

// Scope rule (decided, not an oversight to "fix" later) — Reveal/CountUp
// are reserved for numeric KPI/stat-card surfaces: Command Centre
// (command-centre-stat-cards.tsx, today-strip.tsx), Analytics'
// KPI grid (analytics-panel.tsx), and Billing's usage-this-month card
// (studio/(authed)/billing/page.tsx). Those three are the only
// /studio routes with content genuinely comparable to a stat card —
// a number that changes over time and is worth drawing the eye to.
// The other 10 /studio routes (Clients, Prospects, Requests, Projects,
// Campaigns, Website Builder, Settings, Feedback, Knowledge, Help) are
// list/form/CRUD pages with nothing analogous to animate; their lack of
// motion is intentional, not a gap to close by spreading Reveal/CountUp
// there mechanically. See docs/ai-team/BACKLOG.md's "Decide and apply a
// real rule for Reveal/CountUp motion beyond Command Centre" entry.

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className ?? ""}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
