"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Users, Loader2 } from "lucide-react";
import { getNavSections } from "@/components/platform/studio-nav";
import { searchStudio, type StudioSearchResult } from "@/app/studio/(authed)/command-search-actions";
import { cn } from "@/lib/utils";

type PaletteItem = {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Navigate" | "Prospects" | "Clients";
};

// Studio's counterpart to the admin command palette (Portal redesign
// Stage 7) — same search-and-jump scope, not command execution: every
// nav destination plus a live prospect/client name lookup. Deliberately
// not the natural-language "ask Mission Control" data-query surface from
// the Studio Mission Control concept — that needs its own Claude
// tool-use engine (a sibling of command-centre-design-assistant.ts) and
// is real enough work to be its own later piece, not bundled in here
// under the same name.
export function StudioCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudioSearchResult>({ prospects: [], clients: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults({ prospects: [], clients: [] });
    setActiveIndex(0);
  }, []);

  // Cmd/Ctrl+K opens from anywhere on an authed Studio page; Escape
  // closes. Also listens for the CustomEvent the visible header trigger
  // dispatches (studio-command-palette-trigger.tsx) — same open path, two
  // ways in, mounted once in the (authed) layout, not per-page.
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
    window.addEventListener("hamishai:open-studio-command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hamishai:open-studio-command-palette", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Same react-hooks/set-state-in-effect shape as the admin palette: below
  // 2 characters the effect returns without touching state, so
  // activeResults/activeLoading below (derived from `trimmed`, not raw
  // `results`) are what actually mask stale data once a query shortens.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchStudio(query.trim());
        setResults(data);
      } catch {
        setResults({ prospects: [], clients: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navItems: PaletteItem[] = getNavSections().flatMap((section) =>
    section.items.map((item) => ({ key: item.href, label: item.label, href: item.href, group: "Navigate" as const }))
  );
  const trimmed = query.trim().toLowerCase();
  const filteredNav = trimmed ? navItems.filter((n) => n.label.toLowerCase().includes(trimmed)) : navItems;
  const activeResults = trimmed.length >= 2 ? results : { prospects: [], clients: [] };
  const activeLoading = trimmed.length >= 2 && loading;

  const items: PaletteItem[] = [
    ...filteredNav,
    ...activeResults.prospects.map((p) => ({
      key: `prospect-${p.id}`,
      label: p.business_name,
      sublabel: p.status.replace("_", " "),
      href: "/studio/prospects",
      group: "Prospects" as const,
    })),
    ...activeResults.clients.map((c) => ({
      key: `client-${c.id}`,
      label: c.business_name,
      href: "/studio/clients",
      group: "Clients" as const,
    })),
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
            placeholder="Jump to a page, prospect, or client…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {activeLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {trimmed.length >= 2 ? "Nothing found." : "Keep typing to search prospects and clients…"}
            </p>
          )}
          {items.map((item, i) => {
            const showGroupHeader = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {showGroupHeader && <p className="text-eyebrow px-2.5 pt-2.5 pb-1 first:pt-1">{item.group}</p>}
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
