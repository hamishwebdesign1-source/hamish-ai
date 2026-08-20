"use client";

import { createContext, useContext, useCallback, useSyncExternalStore } from "react";

// Command Centre Phase 4 — the "Help Mode" idea from the user's own IDEAS
// notes, not just the 38-point brief. Client-only state (localStorage),
// no DB column — this is a per-browser preference, not something that
// needs to sync across devices or be visible to anyone else.
//
// useSyncExternalStore rather than useState+useEffect — reading
// localStorage during an effect and then calling setState synchronously
// causes an extra render pass and a real hydration-mismatch risk (server
// always renders "off," a client whose first render already saw "on"
// would flash/mismatch). useSyncExternalStore is the React-recommended
// way to read genuinely external state like this: it returns the SSR-safe
// false on the server and first client render, then re-syncs once
// mounted, with no cascading setState call at all.
const STORAGE_KEY = "studio-help-mode";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false; // Fails open — private browsing etc., Help Mode just defaults off.
  }
}

function getServerSnapshot() {
  return false;
}

const HelpModeContext = createContext<{ helpMode: boolean; toggle: () => void }>({ helpMode: false, toggle: () => {} });

export function HelpModeProvider({ children }: { children: React.ReactNode }) {
  const helpMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    try {
      const next = !(localStorage.getItem(STORAGE_KEY) === "true");
      localStorage.setItem(STORAGE_KEY, String(next));
      // The native "storage" event only fires in *other* tabs — dispatch
      // one manually so this tab's own toggle click updates immediately.
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Same fail-open reasoning as getSnapshot().
    }
  }, []);

  return <HelpModeContext.Provider value={{ helpMode, toggle }}>{children}</HelpModeContext.Provider>;
}

export function useHelpMode() {
  return useContext(HelpModeContext);
}
