import Script from "next/script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";

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
