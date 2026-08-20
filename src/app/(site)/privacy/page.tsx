import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy | Hamish AI",
  description: "How Hamish AI and the Agency Platform collect, use, and protect your data.",
};

const lastUpdated = "20 August 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${lastUpdated}. Plain English, no legalese we don't have to use.`}
      />

      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_strong]:text-foreground">
          <div>
            <h2>Who this covers</h2>
            <p>
              This policy applies to hamishai.org, the Agency Platform (Studio, at hamishai.org/studio), and the
              client portal (hamishai.org/portal). Hamish AI is the data controller for hamishai.org&apos;s own
              services. For the Agency Platform, each agency using it is the data controller for their own
              clients&apos; data — Hamish AI acts as a processor on their behalf. If you&apos;re a client of an
              agency using this platform, your agency is who to contact about your data first; they can reach us if
              they need to.
            </p>
          </div>

          <div>
            <h2>What we collect</h2>
            <p>Depending on how you use the site or platform, this can include:</p>
            <ul>
              <li>
                <strong>Contact details</strong> you give us directly — name, email, phone number, business name.
              </li>
              <li>
                <strong>Business information</strong> about companies we or an agency using the platform research —
                publicly available details like a business&apos;s website, location, and category.
              </li>
              <li>
                <strong>Account data</strong> — login email, organisation details, plan and billing status.
              </li>
              <li>
                <strong>Content you create</strong> in the platform — prospect notes, client requests, generated
                outreach drafts, and similar.
              </li>
              <li>
                <strong>Payment information</strong>, handled entirely by Stripe — we never see or store your card
                details.
              </li>
            </ul>
          </div>

          <div>
            <h2>How we use it</h2>
            <p>To actually deliver the service: running the prospecting and research tools, managing client
              requests, generating AI drafts, processing payments, and keeping you updated about your account. We
              don&apos;t sell your data, and we don&apos;t use it to train AI models beyond what&apos;s needed to
              generate the specific output you asked for.
            </p>
          </div>

          <div>
            <h2>Who else sees it</h2>
            <p>A small number of specific services we rely on to run the platform, each only seeing what they need to do their job:</p>
            <ul>
              <li><strong>Anthropic (Claude)</strong> — processes text to generate research, drafts, and analysis. Not used to train Anthropic&apos;s models.</li>
              <li><strong>Supabase</strong> — hosts our database, with row-level security enforcing that one organisation&apos;s data is never visible to another.</li>
              <li><strong>Stripe</strong> — processes payments. Agency Platform tenants who connect their own Stripe account are paid directly by their clients; we never hold that money.</li>
              <li><strong>Resend</strong> — sends transactional emails (invoices, notifications).</li>
              <li><strong>Microsoft</strong> — only if you explicitly connect an Outlook inbox for reply detection, and only to check whether a message exists, never its content.</li>
            </ul>
            <p>We don&apos;t use third-party analytics or advertising trackers on this site.</p>
          </div>

          <div>
            <h2>How long we keep it</h2>
            <p>
              For as long as your account is active, plus a reasonable period afterwards in case you want to
              reactivate or need a record for a dispute. If you ask us to delete your data (see below), we do — some
              operational records (like security logs) are kept in an anonymised form rather than deleted outright,
              since they don&apos;t identify you once the link to your account is removed.
            </p>
          </div>

          <div>
            <h2>Your rights</h2>
            <p>Under UK GDPR, you can ask to see what we hold about you, correct it, or have it deleted. In practice:</p>
            <ul>
              <li>
                Agency Platform tenants can export everything held about their organisation from{" "}
                <span className="font-mono text-xs">Studio → Settings</span>, or request full account deletion from
                the same page.
              </li>
              <li>
                An agency&apos;s own clients should contact that agency directly — they can remove your data from
                their side of the platform on request.
              </li>
              <li>
                For anything else, or if your agency isn&apos;t reachable, email us at{" "}
                <a href={`mailto:${siteConfig.email}`} className="text-accent hover:underline">
                  {siteConfig.email}
                </a>{" "}
                and we&apos;ll help directly.
              </li>
            </ul>
          </div>

          <div>
            <h2>Security</h2>
            <p>
              Every organisation&apos;s data is isolated at the database level (row-level security), not just in
              application code. Connections are encrypted in transit. Access to production data is limited to what&apos;s
              needed to run and support the platform.
            </p>
          </div>

          <div>
            <h2>Changes to this policy</h2>
            <p>
              If this changes in a way that affects how your data is handled, we&apos;ll update the date at the top
              of this page. Significant changes will be communicated directly, not just posted quietly here.
            </p>
          </div>

          <div>
            <h2>Questions</h2>
            <p>
              Email{" "}
              <a href={`mailto:${siteConfig.email}`} className="text-accent hover:underline">
                {siteConfig.email}
              </a>{" "}
              and we&apos;ll get back to you.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
