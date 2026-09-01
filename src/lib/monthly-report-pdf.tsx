import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { MonthlyReportSnapshot } from "@/lib/monthly-report";
import { pdfDocStyles as styles, DEFAULT_PDF_ACCENT } from "@/lib/pdf-doc-styles";

// Studio big-ticket — "branded, delivered monthly client reports."
// monthly-report.ts already computes and stores a real per-client
// snapshot every month; until now it only ever rendered as a plain list
// row in the portal (monthly-reports-list.tsx) and, for HamishAI's own
// clients only, a bare-text email notification. This is the same data,
// rendered as the branded document proposal-pdf.tsx already proved works
// (same shared pdf-doc-styles.ts chrome) — no new computation, just a
// second real output format for a report that already exists.

export type MonthlyReportPdfInput = {
  orgName: string;
  accentColor: string | null;
  clientBusinessName: string;
  periodLabel: string; // e.g. "August 2026" — monthLabelFromDateStr's own format
  snapshot: MonthlyReportSnapshot;
};

function MonthlyReportDocument({ orgName, accentColor, clientBusinessName, periodLabel, snapshot }: MonthlyReportPdfInput) {
  const accent = accentColor || DEFAULT_PDF_ACCENT;

  return (
    <Document title={`${periodLabel} report for ${clientBusinessName}`}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text style={styles.orgName}>{orgName}</Text>
        <Text style={styles.meta}>{periodLabel}</Text>

        <Text style={styles.title}>Monthly report</Text>
        <Text style={styles.subtitle}>{clientBusinessName}</Text>

        {snapshot.healthScore !== null && (
          <>
            <Text style={styles.sectionHeading}>Health score</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Overall</Text>
              <Text style={[styles.statValue, { color: accent }]}>{snapshot.healthScore}%</Text>
            </View>
            {snapshot.components.map((c) => (
              <View key={c.label} style={styles.statRow}>
                <Text style={styles.statLabel}>{c.label}</Text>
                <Text style={styles.statValue}>{c.value}%</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionHeading}>This month</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Requests handled</Text>
          <Text style={styles.statValue}>
            {snapshot.requestsCompleted} of {snapshot.requestsTotal}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Tasks completed</Text>
          <Text style={styles.statValue}>
            {snapshot.tasksCompleted} of {snapshot.tasksTotal}
          </Text>
        </View>
        {snapshot.uptimePct !== null && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Uptime</Text>
            <Text style={styles.statValue}>{snapshot.uptimePct}%</Text>
          </View>
        )}
        {snapshot.spendPence > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Spend this month</Text>
            <Text style={[styles.statValue, { color: accent }]}>£{(snapshot.spendPence / 100).toFixed(2)}</Text>
          </View>
        )}

        <Text style={styles.footer}>{orgName}</Text>
      </Page>
    </Document>
  );
}

export async function renderMonthlyReportPdf(input: MonthlyReportPdfInput): Promise<Buffer> {
  return renderToBuffer(<MonthlyReportDocument {...input} />);
}
