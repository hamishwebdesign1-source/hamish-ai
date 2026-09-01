import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { SalesKit } from "@/lib/draft-sales-kit";
import { type RateCardItem, formatRateCardPrice } from "@/lib/rate-card";

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
// constraints elsewhere (cron-schedule.ts's own header).

const DEFAULT_ACCENT = "#2f6fe4"; // same fallback branding-panel.tsx seeds its colour picker with

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  accentBar: { height: 6, marginBottom: 24 },
  orgName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 9, color: "#666666", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  preparedFor: { fontSize: 11, color: "#444444", marginBottom: 24 },
  sectionHeading: { fontSize: 12, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 11, lineHeight: 1.5, color: "#222222" },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletMark: { width: 12, fontSize: 11 },
  bulletText: { flex: 1, fontSize: 11, lineHeight: 1.4, color: "#222222" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  priceLabel: { fontSize: 11 },
  priceValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#999999", textAlign: "center" },
});

export type ProposalPdfInput = {
  orgName: string;
  accentColor: string | null;
  prospectBusinessName: string;
  proposalOutline: SalesKit["proposal_outline"];
  rateCard: RateCardItem[];
  contactEmail: string | null;
};

function ProposalDocument({ orgName, accentColor, prospectBusinessName, proposalOutline, rateCard, contactEmail }: ProposalPdfInput) {
  const accent = accentColor || DEFAULT_ACCENT;
  const dateLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Document title={`Proposal for ${prospectBusinessName}`}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text style={styles.orgName}>{orgName}</Text>
        <Text style={styles.meta}>{dateLabel}</Text>

        <Text style={styles.title}>Proposal</Text>
        <Text style={styles.preparedFor}>Prepared for {prospectBusinessName}</Text>

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
              <View key={i} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{item.label}</Text>
                <Text style={[styles.priceValue, { color: accent }]}>{formatRateCardPrice(item)}</Text>
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
