"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CornerDownLeft, Users, Loader2, Sparkles, ArrowLeft, Send, BookOpen, Megaphone, FolderKanban, Inbox, Zap } from "lucide-react";
import { getNavSections } from "@/components/platform/studio-nav";
import { searchStudio, type StudioSearchResult } from "@/app/studio/(authed)/command-search-actions";
import { askClientsCopilot } from "@/app/studio/(authed)/clients/actions";
import { runDiscovery } from "@/app/studio/(authed)/prospects/actions";
import { DiscoveryResultMessage, type DiscoveryResult } from "@/components/platform/discovery-result-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Same local shape as clients-copilot.tsx's own Message type — no
// exported type from actions.ts to share, and askClientsCopilot()
// itself just takes { role, content }[] inline.
type Message = { role: "user" | "assistant"; content: string };

type PaletteItem = {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Navigate" | "Actions" | "Prospects" | "Clients" | "Knowledge" | "Campaigns" | "Projects" | "Requests" | "Ask";
};

// Real-improvement pass — searchStudio() now covers 6 entity types, not
// 2; one shared empty value instead of the same object literal repeated
// at every reset site (initial state, close(), the catch branch below).
const EMPTY_RESULTS: StudioSearchResult = { prospects: [], clients: [], knowledgeBase: [], campaigns: [], projects: [], requests: [] };

// One real, distinct icon per result group — Prospects/Clients kept
// sharing Users (both are "a business," the distinction is status, not
// kind), the four new groups get their own rather than all reusing
// Users regardless of what they actually are.
const GROUP_ICON: Partial<Record<PaletteItem["group"], typeof Users>> = {
  Actions: Zap,
  Prospects: Users,
  Clients: Users,
  Knowledge: BookOpen,
  Campaigns: Megaphone,
  Projects: FolderKanban,
  Requests: Inbox,
};

// Studio improvement (backlog: "the palette is navigate-or-ask only, no
// direct action commands") — the same synthetic-href precedent ASK_HREF
// already established: select() branches on this exact value to run the
// action instead of navigating, rather than a parallel data structure.
// Runs the caller's own already-saved prospecting_config, exactly what
// "Find prospects now" on the Prospects page itself runs — one real,
// already-tested, already usage/rate-limited Server Action, just reachable
// from anywhere in Studio instead of only that one page.
const RUN_DISCOVERY_HREF = "__run_discovery_now__";
const ACTION_ITEMS: PaletteItem[] = [
  { key: "run-discovery", label: "Run prospect discovery now", href: RUN_DISCOVERY_HREF, group: "Actions" },
];

// A synthetic href, never a real route — select() branches on this
// exact value to run the ask flow instead of navigating. Kept inside
// the normal PaletteItem/items shape (rather than a parallel data
// structure) so arrow-key navigation, Enter, and hover-to-highlight all
// keep working unchanged; only select() and the row's own icon need to
// know this one entry is different.
const ASK_HREF = "__ask_mission_control__";

// Command Centre Phase 6e — "Ask Mission Control." The concept this was
// pitched from assumed a new Claude tool-use engine would be needed,
// sibling to command-centre-design-assistant.ts. It already existed:
// answer-clients-question.ts (the AI Business Analyst) already answers
// exactly this kind of question against real Studio data — it was just
// buried on the Clients page (clients-copilot.tsx), reachable nowhere
// else. This phase is wiring, not a new engine: the palette calls the
// exact same askClientsCopilot() Server Action the Clients-page chat
// calls, so it shares its rate limit and monthly quota rather than
// getting a second, uncounted one.
//
// Command Centre improvement #7 — the palette's own conversation had no
// memory: every question sent exactly one message, so a follow-up
// ("and what about last month?") had no idea what "and" referred to,
// even though askClientsCopilot() was always designed to take the full
// running history (clients-copilot.tsx's ClientsCopilot already does
// exactly that). Fixed by accumulating a real `conversation` array
// here, same shape and same "send the whole thing back each turn"
// pattern as that component — not a new engine, again just wiring the
// existing one up properly.
export function StudioCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudioSearchResult>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [conversation, setConversation] = useState<Message[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, startAsking] = useTransition();

  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [runningDiscovery, startDiscovery] = useTransition();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setActiveIndex(0);
    setConversation([]);
    setFollowUp("");
    setAskError(null);
    setDiscoveryResult(null);
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
        setResults(EMPTY_RESULTS);
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
  const trimmedRaw = query.trim();
  const trimmed = trimmedRaw.toLowerCase();
  const filteredNav = trimmed ? navItems.filter((n) => n.label.toLowerCase().includes(trimmed)) : navItems;
  // Same "always visible with no query, filtered by label once one is
  // typed" rule as filteredNav above — same reason: a real action command
  // should be reachable by typing what it does ("discovery"), not only by
  // its exact label.
  const filteredActions = trimmed ? ACTION_ITEMS.filter((a) => a.label.toLowerCase().includes(trimmed)) : ACTION_ITEMS;
  const activeResults = trimmed.length >= 2 ? results : EMPTY_RESULTS;
  const activeLoading = trimmed.length >= 2 && loading;

  const items: PaletteItem[] = [
    ...filteredNav,
    ...filteredActions,
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
    ...activeResults.knowledgeBase.map((k) => ({
      key: `kb-${k.id}`,
      label: k.title,
      href: "/studio/knowledge",
      group: "Knowledge" as const,
    })),
    ...activeResults.campaigns.map((c) => ({
      key: `campaign-${c.id}`,
      label: c.name,
      sublabel: c.status,
      href: "/studio/campaigns",
      group: "Campaigns" as const,
    })),
    ...activeResults.projects.map((p) => ({
      key: `project-${p.id}`,
      label: p.name,
      sublabel: p.status,
      href: "/studio/projects",
      group: "Projects" as const,
    })),
    ...activeResults.requests.map((r) => ({
      key: `request-${r.id}`,
      label: r.raw_text,
      sublabel: r.status.replace("_", " "),
      href: "/studio/requests",
      group: "Requests" as const,
    })),
    // Appended last, not first — a query that matches a real nav/prospect/
    // client entry should still jump there on a bare Enter, same muscle
    // memory as before this phase. A genuine question ("which clients
    // need attention this week?") won't match anything above, so this
    // ends up the only entry, and is exactly what Enter reaches.
    ...(trimmedRaw ? [{ key: "ask", label: `Ask: "${trimmedRaw}"`, href: ASK_HREF, group: "Ask" as const }] : []),
  ];

  function runAsk(question: string) {
    if (!question || asking) return;
    const next: Message[] = [...conversation, { role: "user", content: question }];
    setConversation(next);
    setFollowUp("");
    setAskError(null);
    startAsking(async () => {
      // The whole running conversation, not just this question — same
      // shape ClientsCopilot sends, and the same reason: a follow-up
      // needs the prior turns to know what it's a follow-up to.
      const result = await askClientsCopilot(next);
      if ("error" in result) setAskError(result.error ?? "Something went wrong — please try again.");
      else setConversation([...next, { role: "assistant", content: result.reply }]);
    });
  }

  // Left running whichever component happens to render next (no
  // router.refresh() here) — the Prospects page itself already
  // revalidates its own path inside runDiscovery(), so navigating there
  // after a run shows the real new rows the same way clicking "Find
  // prospects now" on that page always has.
  function runDiscoveryNow() {
    if (runningDiscovery) return;
    setDiscoveryResult(null);
    startDiscovery(async () => {
      const result = await runDiscovery();
      setDiscoveryResult(result);
    });
  }

  function select(item: PaletteItem) {
    if (item.href === ASK_HREF) {
      runAsk(trimmedRaw);
      return;
    }
    if (item.href === RUN_DISCOVERY_HREF) {
      runDiscoveryNow();
      return;
    }
    close();
    router.push(item.href);
  }

  function backToSearch() {
    setConversation([]);
    setFollowUp("");
    setAskError(null);
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
  const showingAnswer = conversation.length > 0;
  const hasReply = conversation.some((m) => m.role === "assistant");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {!showingAnswer && (
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
              placeholder="Ask a question, or jump to a page, prospect, or client…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {activeLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
          </div>
        )}

        {showingAnswer ? (
          <div className="max-h-96 overflow-y-auto p-4">
            <div className="flex flex-col gap-2.5">
              {conversation.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-left text-sm text-primary-foreground"
                      : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-left text-sm whitespace-pre-line text-secondary-foreground"
                  }
                >
                  {m.content}
                </div>
              ))}
              {asking && (
                <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" /> Thinking…
                </div>
              )}
              {askError && (
                <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-destructive/10 px-3.5 py-2 text-sm text-destructive">
                  {askError}
                </div>
              )}
            </div>

            <form
              className="mt-3 flex items-center gap-2 border-t border-border pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                runAsk(followUp.trim());
              }}
            >
              <input
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Ask a follow-up…"
                aria-label="Follow-up question"
                disabled={asking}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="icon" variant="ai" aria-label="Send follow-up" disabled={asking || !followUp.trim()}>
                <Send className="size-4" />
              </Button>
            </form>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={backToSearch}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to search
              </button>
              {hasReply && !asking && (
                <Link href="/studio/clients" onClick={close} className="text-xs text-accent underline underline-offset-2">
                  Keep asking in AI Business Analyst
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-1.5">
            {(runningDiscovery || discoveryResult) && (
              <div className="border-b border-border px-2.5 pb-2.5" aria-live="polite">
                {runningDiscovery ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 shrink-0 animate-spin" /> Running discovery…
                  </p>
                ) : (
                  discoveryResult && <DiscoveryResultMessage result={discoveryResult} />
                )}
              </div>
            )}
            {items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Keep typing to search or ask a question…</p>
            )}
            {items.map((item, i) => {
              const showGroupHeader = item.group !== lastGroup;
              lastGroup = item.group;
              const GroupIcon = item.group === "Ask" ? Sparkles : GROUP_ICON[item.group];
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
                      {GroupIcon && (
                        <GroupIcon className={`size-3.5 shrink-0 ${item.group === "Ask" ? "text-accent" : "text-muted-foreground"}`} />
                      )}
                      <span className="truncate">{item.label}</span>
                      {item.sublabel && <span className="shrink-0 text-xs text-muted-foreground capitalize">{item.sublabel}</span>}
                    </span>
                    {i === activeIndex && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

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
