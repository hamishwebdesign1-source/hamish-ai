import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <Logo className="text-base" />
          <p className="mt-1">{siteConfig.location}</p>
        </div>

        <nav className="flex flex-wrap gap-6">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-1 md:text-right">
          <a href={`mailto:${siteConfig.email}`} className="hover:text-foreground">
            {siteConfig.email}
          </a>
          <a href={`tel:${siteConfig.phone}`} className="hover:text-foreground">
            {siteConfig.phone}
          </a>
        </div>
      </div>

      <div className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}
