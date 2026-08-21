import { Diamond, Waves } from "lucide-react";

// /platform hero rebuild, section 08 from the brief ("your agency, your
// brand, your infrastructure"). Two identical browser-chrome mockups,
// same nav shape and widget layout underneath, different logo/colour/
// domain on top — the point is meant to be obvious at a glance, not
// explained in a paragraph. Uses --gradient-violet (an existing site
// token, chart-5) for the example agency's own brand — deliberately
// distinct from both HamishAI's blue and the client-portal preview's
// clay elsewhere on this page, so all three read as three genuinely
// different brands, not variations on one.

function BrowserChrome({ domain, logo, name, accentVar, navItems }: { domain: string; logo: React.ReactNode; name: string; accentVar: string; navItems: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-lg shadow-black/5">
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/50 px-3 py-2">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-2 rounded-md bg-background px-2 py-0.5 font-mono text-[9px] text-muted-foreground">{domain}</span>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-md text-white" style={{ backgroundColor: `var(${accentVar})` }}>
            {logo}
          </span>
          <p className="text-xs font-semibold">{name}</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {navItems.map((n) => (
            <span key={n} className="text-[10px] text-muted-foreground">
              {n}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-md border border-border p-2">
            <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: `var(${accentVar})`, opacity: 0.3 }} />
            <div className="mt-2 h-1 w-full rounded-full bg-secondary" />
            <div className="mt-1 h-1 w-2/3 rounded-full bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhiteLabelPreview() {
  return (
    <div className="space-y-3">
      <BrowserChrome
        domain="app.hamishai.org"
        logo={<Diamond className="size-3" />}
        name="HamishAI Studio"
        accentVar="--accent"
        navItems={["Prospects", "Clients", "Reports"]}
      />
      <BrowserChrome
        domain="app.brightpathdigital.co"
        logo={<Waves className="size-3" />}
        name="Bright Path Digital"
        accentVar="--gradient-violet"
        navItems={["Prospects", "Clients", "Reports"]}
      />
    </div>
  );
}
