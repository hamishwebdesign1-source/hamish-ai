"use client";

import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";

// Real-improvement pass — the Command Centre's tab choice reset to
// Overview on every visit, even mid-session, with nothing remembering
// what a tenant had open. A cookie, not localStorage: page.tsx reads it
// server-side (via next/headers' cookies()) and picks the right
// activeTab before the very first render, so there's no client-only
// flash from Overview to whatever was actually last selected the way a
// localStorage-read-in-useEffect approach would cause. This component's
// only job is writing the cookie back on change — the read, and which
// tab is genuinely valid right now (a cookied tab that's since become
// empty falls back to the first real one), stays page.tsx's call.
const COOKIE_NAME = "studio_cc_tab";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months — a real preference, not a session-only one

export function CommandCentreTabs({
  activeTab,
  tabs,
}: {
  activeTab: string;
  tabs: { id: string; label: string; content: React.ReactNode }[];
}) {
  function onValueChange(next: string) {
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }

  return (
    <Tabs defaultValue={activeTab} onValueChange={onValueChange}>
      {/* overflow-x-auto safety net — fine today at 4 short labels, but
          nothing stopped this overflowing a narrow viewport if a 5th
          tab or a longer label ever gets added. The page body itself
          must never scroll sideways; this container absorbs it instead. */}
      <div className="overflow-x-auto">
        <TabsList>
          {tabs.map((t) => (
            <TabsTab key={t.id} value={t.id}>
              {t.label}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsPanel key={t.id} value={t.id}>
          {t.content}
        </TabsPanel>
      ))}
    </Tabs>
  );
}
