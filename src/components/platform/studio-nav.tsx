import { LayoutDashboard, Search, Users, CreditCard, Mail, Inbox, FolderKanban, HelpCircle, BookOpen, BarChart3, Megaphone, Globe, MessageSquare } from "lucide-react";
import { StudioNavLink } from "@/components/platform/studio-nav-link";

// Grown from a flat top nav (11 items, horizontal-scroll on desktop by
// the time Campaigns/Knowledge/Analytics all landed) to a grouped left
// sidebar — same restructuring the client portal already went through
// for the same reason. Grouping mirrors how the product's own
// information architecture already reads: prospecting work, delivery
// work, then account-level pages.
export function getNavSections(): { label: string | null; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] {
  return [
    {
      label: null,
      items: [{ href: "/studio", label: "Command Centre", icon: LayoutDashboard }],
    },
    {
      label: "Grow",
      items: [
        { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/studio/prospects", label: "Prospects", icon: Search },
        { href: "/studio/campaigns", label: "Campaigns", icon: Megaphone },
      ],
    },
    {
      label: "Build",
      items: [{ href: "/studio/website-builder", label: "Website Builder", icon: Globe }],
    },
    {
      label: "Deliver",
      items: [
        { href: "/studio/clients", label: "Clients", icon: Users },
        { href: "/studio/requests", label: "Requests", icon: Inbox },
        { href: "/studio/projects", label: "Projects", icon: FolderKanban },
        { href: "/studio/knowledge", label: "Knowledge", icon: BookOpen },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/studio/billing", label: "Billing", icon: CreditCard },
        { href: "/studio/settings", label: "Settings", icon: Mail },
        { href: "/studio/feedback", label: "Feedback", icon: MessageSquare },
        { href: "/studio/help", label: "Help", icon: HelpCircle },
      ],
    },
  ];
}

// Studio improvement — the nav had no way to see "something's waiting"
// without clicking into a page first, the same problem the Command
// Centre's own actions_required queue exists to solve, just at the nav
// level. Scoped to Requests only (the one nav item that's genuinely
// inbox-shaped — unanswered client requests) rather than a count on
// every item, which would just be noise. requestsBadgeCount is optional
// and defaults to undefined (no badge) so getNavSections()'s other
// caller (studio-command-palette.tsx, which has no count to pass) is
// completely unaffected.
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex size-4.5 shrink-0 items-center justify-center rounded-full bg-destructive/15 font-mono text-[10px] font-semibold text-destructive">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function StudioSidebar({ requestsBadgeCount }: { requestsBadgeCount?: number }) {
  const navSections = getNavSections();
  return (
    // Reported live: with 14 items across 5 groups, the nav is taller than
    // most pages' own content on a normal viewport, and it was scrolling
    // away with the page instead of staying put — every other app with a
    // grouped sidebar this size keeps it fixed. sticky (not fixed) so it
    // stays within its own flex column rather than needing separate
    // width/offset math to match the centred max-w-6xl layout; self-start
    // stops the flex row from stretching it to the main column's height
    // (which would make "sticky" a no-op — nothing to scroll past inside
    // its own box).
    //
    // First cut added max-h + overflow-y-auto here as a short-viewport
    // guard — reported live as its own, unwanted scrollbar sitting next
    // to the page's own, which reads as broken rather than helpful.
    // Dropped: the nav's natural height fits a normal viewport fine, and
    // "static, not another scroll region" was the actual ask.
    <aside className="sticky top-8 hidden w-52 shrink-0 flex-col gap-6 self-start py-8 md:flex">
      {navSections.map((section, i) => (
        <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
          {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
          {section.items.map((item) => (
            <StudioNavLink key={item.href} href={item.href} className="w-full">
              <item.icon className="size-4" />
              {item.label}
              {item.href === "/studio/requests" && requestsBadgeCount !== undefined && <NavBadge count={requestsBadgeCount} />}
            </StudioNavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
