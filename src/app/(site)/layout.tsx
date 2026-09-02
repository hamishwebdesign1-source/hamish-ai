import type { Metadata } from "next";
import Script from "next/script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";

// SEO/GEO audit (2026-09-02) — verified live: no page anywhere set
// `og:type`, `og:site_name`, or `og:locale` (confirmed via a live meta
// tag dump on /about — og:title/description/image were present,
// auto-derived by Next.js from each page's own plain title/description,
// but nothing in this codebase had ever set the `openGraph` object
// itself). Set once here, at the same marketing-layout scope as the
// Organization schema above, and it applies to every page under it —
// each page's own `title`/`description` still flow through and
// override the title/description a social platform actually shows;
// this only fills in the structural fields nothing was setting.
export const metadata: Metadata = {
  openGraph: {
    type: "website",
    siteName: "Hamish AI",
    locale: "en_GB",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* SEO/GEO audit (2026-09-02) — same "marketing layout, not root"
          scoping this layout's own Preferred Sources script below already
          established: Organization/WebSite entity markup is about this
          public site as a publisher, not the authed app surfaces
          (/studio, /portal, /admin) the root layout also covers. */}
      <OrganizationJsonLd />
      {/* Google Preferred Sources — lets a reader add hamishai.org as a
          preferred source in Search/Discover/AI Overviews (Google Search
          Central: developers.google.com/search/docs/appearance/preferred-sources).
          Loaded only in this marketing-site layout, not the root layout —
          the button itself (SiteFooter) is the only place it's shown, and
          Google's own eligibility rule is domain/subdomain-level content
          (this public site), not the authed app surfaces (/studio,
          /portal, /admin) the root layout also covers.
          afterInteractive, not beforeInteractive: this is a reader
          convenience widget, not something that should compete with the
          page's own content for the critical rendering path. */}
      <Script async src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
