import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { SalesKit } from "@/lib/draft-sales-kit";
import { type RateCardItem, formatRateCardPrice } from "@/lib/rate-card";
import { pdfDocStyles as styles, DEFAULT_PDF_ACCENT, pdfDateLabel } from "@/lib/pdf-doc-styles";

// Roadmap item #6 ("AI-generated client proposals") — deliberately
// composed from data that already exists rather than a new AI call: the
// sales kit's own proposal_outline (overview/included/timeline_note,
// generated once alongside the rest of the kit) plus the org's own real
// rate card (rate-card.ts). No new prompt to get right, no new marginal
// AI cost, and the PDF can never say something the kit's own preview in
// Prospects doesn't already show — same content, just a branded,
// ready-to-send document instead of a text block in a review tab.
//
// @react-pdf/renderer, not a headless-Chrome approach (Puppeteer etc.) —
// pure JS, no browser binary to ship or cold-start in a Vercel serverless
// function, the deciding factor for a repo already on Vercel Hobby-plan
// constraints elsewhere (cron-schedule.ts's own header). Shared visual
// chrome (accent bar, org name, footer) lives in pdf-doc-styles.ts —
// monthly-report-pdf.tsx is the second document built on the same styles.

export type ProposalPdfInput = {
  orgName: string;
  accentColor: string | null;
  prospectBusinessName: string;
  proposalOutline: SalesKit["proposal_outline"];
  rateCard: RateCardItem[];
  contactEmail: string | null;
};

function ProposalDocument({ orgName, accentColor, prospectBusinessName, proposalOutline, rateCard, contactEmail }: ProposalPdfInput) {
  const accent = accentColor || DEFAULT_PDF_ACCENT;

  return (
    <Document title={`Proposal for ${prospectBusinessName}`}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text style={styles.orgName}>{orgName}</Text>
        <Text style={styles.meta}>{pdfDateLabel()}</Text>

        <Text style={styles.title}>Proposal</Text>
        <Text style={styles.subtitle}>Prepared for {prospectBusinessName}</Text>

        <Text style={styles.sectionHeading}>Overview</Text>
        <Text style={styles.paragraph}>{proposalOutline.overview}</Text>

        {proposalOutline.included.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>What&apos;s included</Text>
            {proposalOutline.included.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </>
        )}

        {rateCard.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Pricing</Text>
            {rateCard.map((item, i) => (
              <View key={i} style={styles.statRow}>
                <Text style={styles.statLabel}>{item.label}</Text>
                <Text style={[styles.statValue, { color: accent }]}>{formatRateCardPrice(item)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionHeading}>Timeline</Text>
        <Text style={styles.paragraph}>{proposalOutline.timeline_note}</Text>

        <Text style={styles.footer}>
          {orgName}
          {contactEmail ? ` · ${contactEmail}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderProposalPdf(input: ProposalPdfInput): Promise<Buffer> {
  return renderToBuffer(<ProposalDocument {...input} />);
}
