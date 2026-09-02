import type { Metadata } from "next";

// SEO/metadata audit (2 Sep 2026) — same gap and same fix as
// portal/layout.tsx's own: verified live that /admin/login (and, by the
// same missing-fallback mechanism, all 19 real pages under
// /admin/(authed) — none of which have their own title either) showed
// the root layout's own default title. Lower stakes than /portal (this
// is Hamish's own single-operator internal tool, not tenant/client-
// facing), but the same real, honest, easy fix. Any page under here
// that later sets its own title still correctly overrides this default.
export const metadata: Metadata = { title: "Admin | Hamish AI" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground font-sans">{children}</div>;
}
