"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortalEvent } from "@/lib/portal-events";

// No server-persisted read state — this is a solo-tenant-per-device
// signal (localStorage), not a synced-across-devices notification
// system. That's a deliberate, proportionate call for this product's
// traffic: a real "read" column + write policy on client_members is
// more infrastructure than a client checking their own portal from
// (usually) one browser actually needs. Revisit if that stops being true.
//
// Reading localStorage safely across server and client render passes is
// exactly what useSyncExternalStore exists for — getServerSnapshot
// returns null (SSR has no localStorage; treat as "nothing seen yet"),
// and React reconciles to the real client value right after hydration,
// without the extra render pass (and the "calling setState in an
// effect" lint warning) a manual useEffect + useState would need.
const SEEN_KEY = "portal-notifications-seen-at";
const listeners = new Set<() => void>();

function getSeenAt() {
  return localStorage.getItem(SEEN_KEY);
}
function getServerSeenAt() {
  return null;
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
function markSeenNow() {
  const now = new Date().toISOString();
  localStorage.setItem(SEEN_KEY, now);
  listeners.forEach((l) => l());
}

export function NotificationBell({ events }: { events: PortalEvent[] }) {
  const [open, setOpen] = useState(false);
  const seenAt = useSyncExternalStore(subscribe, getSeenAt, getServerSeenAt);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unseenCount = events.filter((e) => !seenAt || e.at > seenAt).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) markSeenNow();
  }

  return (
    <div ref={ref} className="relative">
      <Button type="button" size="icon" variant="ghost" aria-label="Notifications" aria-expanded={open} onClick={toggle}>
        <span className="relative">
          <Bell className="size-4" />
          {unseenCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </span>
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background shadow-lg">
          <div className="border-b border-border px-4 py-2.5">
            <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Recent activity</p>
          </div>
          {!events.length && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>}
          {!!events.length && (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.detail} · {new Date(event.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
