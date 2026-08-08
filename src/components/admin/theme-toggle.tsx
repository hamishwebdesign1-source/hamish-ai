"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// Scoped to /admin only, not the public site — the full .dark token set
// already existed in globals.css but nothing toggled it anywhere.
//
// Reads document.documentElement's class directly via useSyncExternalStore
// rather than useState+useEffect: the class can be changed from outside
// this component's own render cycle (ThemeInitScript sets it before
// hydration even runs), so this needs to be a real external-store read,
// not local state that only happens to agree with the DOM at mount time.
// getServerSnapshot() returning false is safe — the server never renders
// dark, and useSyncExternalStore patches the mismatch on hydration without
// an extra effect-driven render.
const STORAGE_KEY = "hamishai-admin-theme";
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

export function ThemeToggle() {
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
// layout paints, or the page flashes light before JS catches up. Reads the
// same key setDark() writes; falls back to the OS preference on a first
// visit with nothing stored yet.
export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
      }}
    />
  );
}
