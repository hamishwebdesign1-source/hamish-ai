"use client";

import { Search } from "lucide-react";

// Visible entry point for the same palette Cmd/Ctrl+K opens — the
// shortcut alone isn't discoverable on a first visit. Talks to
// studio-command-palette.tsx via a plain DOM CustomEvent, same reasoning
// as the admin version: the two components have no other reason to know
// about each other, and it keeps the palette mountable once in the
// layout with zero prop plumbing.
export function StudioCommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("hamishai:open-studio-command-palette"))}
      className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
    </button>
  );
}
