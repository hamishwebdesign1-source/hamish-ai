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

export function StudioSidebar() {
  const navSections = getNavSections();
  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-6 py-8 md:flex">
      {navSections.map((section, i) => (
        <div key={section.label ?? `ungrouped-${i}`} className="flex flex-col gap-1">
          {section.label && <p className="text-eyebrow px-2.5 pb-1">{section.label}</p>}
          {section.items.map((item) => (
            <StudioNavLink key={item.href} href={item.href} className="w-full">
              <item.icon className="size-4" />
              {item.label}
            </StudioNavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
