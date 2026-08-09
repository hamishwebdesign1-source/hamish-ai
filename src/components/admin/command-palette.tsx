"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Users, Loader2 } from "lucide-react";
import { NAV_SECTIONS } from "@/components/admin/sidebar";
import { cn } from "@/lib/utils";

type SearchResult = { leads: { id: string; business_name: string; status: string }[]; clients: { id: string; business_name: string }[] };

type PaletteItem = {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Navigate" | "Leads" | "Clients";
};

// Portal redesign Stage 7 — the brief's "global command/search interface,
// designed to eventually become an AI command interface." This stage only
// builds the search-and-jump part (every nav destination plus live lead/
// client lookup) — no command execution yet, that's a later step once
// there's an actual set of actions worth exposing here rather than just
// navigation.
//
// Static nav items are free (already in memory via NAV_SECTIONS, the same
// list the sidebar renders — one definition, not a second copy that can
// drift). Lead/client search only fires once the query is 2+ characters
// and debounces 250ms, so fast typing doesn't fire a request per keystroke.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ leads: [], clients: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults({ leads: [], clients: [] });
    setActiveIndex(0);
  }, []);

  // Cmd/Ctrl+K opens from anywhere; Escape closes. Also listens for the
  // CustomEvent the visible header trigger dispatches (command-palette-trigger.tsx)
  // — same open path, two ways in. A single window-level listener, mounted
  // once in the authed layout — not per-page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("hamishai:open-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hamishai:open-command-palette", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Focus after the overlay actually paints, not before.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Below 2 characters there's nothing to fetch, so the effect just
  // returns without touching state at all — resetting results/loading
  // synchronously in that branch is the exact "derive it at render time
  // instead" anti-pattern react-hooks/set-state-in-effect flags. The
  // `activeResults`/`activeLoading` values below mask whatever's left in
  // state from a previous longer query once the user shortens it again.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;

    // setLoading(true) lives inside the timer callback, not the effect's
    // synchronous body — both because react-hooks/set-state-in-effect
    // flags any top-level setState call there, and because it's the
    // better behaviour anyway: no spinner flash on every keystroke while
    // still inside the debounce window, only once the fetch actually starts.
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/internal/command-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults({ leads: [], clients: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navItems: PaletteItem[] = NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ key: item.href, label: item.label, href: item.href, group: "Navigate" as const }))
  );
  const trimmed = query.trim().toLowerCase();
  const filteredNav = trimmed ? navItems.filter((n) => n.label.toLowerCase().includes(trimmed)) : navItems;
  const activeResults = trimmed.length >= 2 ? results : { leads: [], clients: [] };
  const activeLoading = trimmed.length >= 2 && loading;

  const items: PaletteItem[] = [
    ...filteredNav,
    ...activeResults.leads.map((l) => ({ key: `lead-${l.id}`, label: l.business_name, sublabel: l.status.replace("_", " "), href: `/admin/leads/${l.id}`, group: "Leads" as const })),
    ...activeResults.clients.map((c) => ({ key: `client-${c.id}`, label: c.business_name, href: `/admin/clients/${c.id}`, group: "Clients" as const })),
  ];

  function select(item: PaletteItem) {
    close();
    router.push(item.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) select(item);
    }
  }

  if (!open) return null;

  let lastGroup: string | null = null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a page, lead, or client…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {activeLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {trimmed.length >= 2 ? "Nothing found." : "Keep typing to search leads and clients…"}
            </p>
          )}
          {items.map((item, i) => {
            const showGroupHeader = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {showGroupHeader && (
                  <p className="text-eyebrow px-2.5 pt-2.5 pb-1 first:pt-1">{item.group}</p>
                )}
                <button
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                    i === activeIndex ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.group !== "Navigate" && <Users className="size-3.5 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{item.label}</span>
                    {item.sublabel && <span className="shrink-0 text-xs text-muted-foreground capitalize">{item.sublabel}</span>}
                  </span>
                  {i === activeIndex && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
