import { StyleSheet } from "@react-pdf/renderer";

// Shared visual chrome for every branded PDF this app generates
// (proposal-pdf.tsx, monthly-report-pdf.tsx) — pulled out once a second
// document needed the exact same accent-bar/org-name header and footer,
// so both stay visually consistent automatically rather than by two
// copies of the same numbers happening to agree.

export const DEFAULT_PDF_ACCENT = "#2f6fe4"; // same fallback branding-panel.tsx seeds its colour picker with

export const pdfDocStyles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  accentBar: { height: 6, marginBottom: 24 },
  orgName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 9, color: "#666666", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#444444", marginBottom: 24 },
  sectionHeading: { fontSize: 12, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  paragraph: { fontSize: 11, lineHeight: 1.5, color: "#222222" },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletMark: { width: 12, fontSize: 11 },
  bulletText: { flex: 1, fontSize: 11, lineHeight: 1.4, color: "#222222" },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#999999", textAlign: "center" },
});

export function pdfDateLabel(date = new Date()): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
