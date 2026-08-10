"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Client portal redesign Phase 1 — ports src/components/admin/theme-toggle.tsx
// verbatim except for the storage key. A separate key (not the admin's
// hamishai-admin-theme) is deliberate: these are different users on a
// different trust boundary, and there's no reason a client's light/dark
// preference should ever read from or write to the same localStorage
// entry the internal admin tool uses, even though both run on the same
// origin.
const STORAGE_KEY = "hamishai-portal-theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    // Private browsing / storage disabled — the toggle still works for
    // this page load, it just won't be remembered next visit.
  }
  listeners.forEach((listener) => listener());
}

export function PortalThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setDark(!isDark)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

// Inline, render-blocking script — must run before the rest of the authed
// layout paints, or the page flashes light before JS catches up.
export function PortalThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
      }}
    />
  );
}
