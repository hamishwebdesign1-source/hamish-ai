import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

function getContentHtml() {
  const filePath = path.join(process.cwd(), "public", "docs", "ba-pack-content.html");
  return fs.readFileSync(filePath, "utf8");
}

export default function BaDocumentationPage() {
  const html = getContentHtml();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/process"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Process map
        </Link>
        <Button render={<a href="/docs/HamishAI-Business-Analysis-Documentation-Pack.pdf" download />}>
          <FileDown className="size-4" />
          Download PDF
        </Button>
      </div>

      <div className="ba-doc mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      <style>{`
        .ba-doc { max-width: 900px; margin: 0 auto; font-size: 0.9375rem; line-height: 1.65; color: var(--foreground); }
        .ba-doc h1 { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 600; color: var(--foreground); margin: 2.5rem 0 0.75rem; scroll-margin-top: 5rem; }
        .ba-doc h1:first-of-type { margin-top: 0; }
        .ba-doc h2 { font-family: var(--font-heading); font-size: 1.125rem; font-weight: 600; color: var(--accent); margin: 1.5rem 0 0.5rem; }
        .ba-doc h3 { font-size: 1rem; font-weight: 600; color: var(--muted-foreground); margin: 1.1rem 0 0.4rem; }
        .ba-doc p { margin: 0 0 0.75rem; }
        .ba-doc ul, .ba-doc ol { margin: 0 0 0.75rem; padding-left: 1.25rem; }
        .ba-doc li { margin-bottom: 0.25rem; }
        .ba-doc strong { font-weight: 600; }
        .ba-doc em { color: var(--muted-foreground); }
        .ba-doc .table-scroll { overflow-x: auto; margin: 0.75rem 0 1.25rem; }
        .ba-doc table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 0.8125rem; }
        .ba-doc th, .ba-doc td { border: 1px solid var(--border); padding: 0.4rem 0.55rem; text-align: left; vertical-align: top; }
        .ba-doc th { background: var(--secondary); font-weight: 600; }
        .ba-doc .toc-list { column-count: 1; padding-left: 1.1rem; }
        .ba-doc .toc-list a { color: var(--accent); text-decoration: none; }
        .ba-doc .toc-list a:hover { text-decoration: underline; }
        .ba-doc .toc-list li { margin-bottom: 0.35rem; }
      `}</style>
    </div>
  );
}
