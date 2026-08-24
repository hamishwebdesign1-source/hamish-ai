import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { siteConfig } from "@/lib/site-config";
import { platformPlans, formatMonthlyPrice, PROSPECT_CREDIT_PACK } from "@/lib/platform-plans";

export const metadata: Metadata = {
  title: "Terms of Service | Hamish AI",
  description: "The terms for using hamishai.org, the Agency Platform, and the client portal.",
};

const lastUpdated = "24 August 2026";

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${lastUpdated}. Plain English, no legalese we don't have to use.`}
      />

      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_strong]:text-foreground">
          <div>
            <h2>What this covers</h2>
            <p>
              These terms apply to hamishai.org, the Agency Platform (Studio, at hamishai.org/studio), and the
              client portal (hamishai.org/portal). By creating an account on any of these, you&apos;re agreeing to
              them. See our <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a> for how we
              handle data — these terms are about the service itself.
            </p>
          </div>

          <div>
            <h2>The free trial</h2>
            <p>
              New Agency Platform accounts get 14 days free, no card required. If you don&apos;t add a card and
              subscribe by the end of the trial, prospecting is paused until you do — your existing prospects,
              clients and data are kept, not deleted.
            </p>
          </div>

          <div>
            <h2>Plans and billing</h2>
            <p>Three plans, billed monthly through Stripe and renewing automatically until cancelled:</p>
            <ul>
              {platformPlans.map((plan) => (
                <li key={plan.slug}>
                  <strong>{plan.name}</strong> — {formatMonthlyPrice(plan.monthlyPence)}/mo, up to {plan.prospectsPerMonth} researched
                  prospects a month.
                </li>
              ))}
            </ul>
            <p>
              A one-time credit pack (+{PROSPECT_CREDIT_PACK.prospects} prospects for £
              {(PROSPECT_CREDIT_PACK.pricePence / 100).toFixed(0)}) is also available if you go over your monthly
              allowance — this is a single purchase, not a subscription, and doesn&apos;t renew. Current prices are
              always shown on the <a href="/platform" className="text-accent hover:underline">pricing page</a>; if
              we change them, it won&apos;t affect a subscription you already have until you&apos;re told in
              advance.
            </p>
          </div>

          <div>
            <h2>Cancelling and refunds</h2>
            <p>
              Cancel any time from Studio → Billing → Manage billing — you&apos;ll keep access until the end of the
              period you&apos;ve already paid for, then it stops renewing. We don&apos;t offer refunds for partial
              billing periods, but if something genuinely went wrong on our end, email us and we&apos;ll sort it out
              directly rather than hide behind a policy.
            </p>
          </div>

          <div>
            <h2>Usage limits</h2>
            <p>
              Every AI action (discovery, research, sales kits, website mockups, request triage) is capped per
              calendar month based on your plan. If you hit a limit, that action is blocked with a clear message
              until next month or a plan upgrade — never a silent failure or a surprise bill.
            </p>
          </div>

          <div>
            <h2>Using it fairly</h2>
            <p>The platform is for running your own agency&apos;s prospecting, delivery and client work. Not for:</p>
            <ul>
              <li>Reselling or redistributing the platform itself, or wholesale-scraping its output for use outside it.</li>
              <li>Anything illegal, including outreach that breaches spam or marketing-communication law in your jurisdiction.</li>
              <li>Trying to access another agency&apos;s data, or interfering with the platform&apos;s normal operation.</li>
            </ul>
            <p>
              You&apos;re responsible for how you use outreach features, including complying with the marketing and
              data protection laws that apply to the businesses you contact.
            </p>
          </div>

          <div>
            <h2>Your data, your clients</h2>
            <p>
              As set out in our Privacy Policy, you&apos;re the data controller for your own clients&apos; data — we
              act as a processor on your behalf. You can export or delete your organisation&apos;s data at any time
              from Studio → Settings.
            </p>
          </div>

          <div>
            <h2>AI-generated content</h2>
            <p>
              Research, scores, sales kits, drafts and other AI-generated output are meant to save you time, not
              replace your judgement — review them before you send or rely on anything. We don&apos;t guarantee
              AI-generated content is accurate, and you&apos;re responsible for what you actually send to a
              prospect or client.
            </p>
          </div>

          <div>
            <h2>Service availability</h2>
            <p>
              We work to keep the platform up and reliable, but don&apos;t currently offer a formal uptime guarantee
              or service-level agreement. If something&apos;s down, we&apos;re usually already aware — see{" "}
              <a href="/studio/help" className="text-accent hover:underline">Studio → Help</a> for how to report an
              issue.
            </p>
          </div>

          <div>
            <h2>Liability</h2>
            <p>
              We&apos;re not liable for indirect or consequential losses (like lost profits or lost business) arising
              from your use of the platform. Where we are liable for something, our total liability is limited to
              what you&apos;ve paid us in the 12 months before the issue arose. Nothing here limits liability where
              the law doesn&apos;t allow us to — for example, for fraud or death or personal injury caused by
              negligence.
            </p>
          </div>

          <div>
            <h2>Changes to these terms</h2>
            <p>
              If we change these terms in a way that materially affects you, we&apos;ll tell you directly rather
              than just updating the date at the top of this page quietly.
            </p>
          </div>

          <div>
            <h2>Governing law</h2>
            <p>These terms are governed by the law of Scotland, and any dispute is subject to the exclusive jurisdiction of the Scottish courts.</p>
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
