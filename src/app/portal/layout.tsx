import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — verified live: /portal/login showed
// the root layout's own default title ("HamishAI Agency Platform...")
// in the browser tab, since it's a client-component page with no
// metadata of its own and no layout-level fallback existed here. Kept
// deliberately brand-neutral, not any one tenant's name: this one route
// serves every tenant's own white-labeled client portal, so claiming a
// specific tenant's brand here would be inaccurate for everyone else.
// Any (authed)/* page under here that already sets its own title
// correctly overrides this — this is only the fallback for pages, like
// login, that don't.
export const metadata: Metadata = { title: "Client Portal | Hamish AI" };

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground font-sans">{children}</div>;
}
