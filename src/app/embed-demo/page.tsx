// A real, live page proving the embeddable client-website chatbot
// end-to-end, for a human to actually click through in their own
// browser — not a Studio screen, the real thing a visitor on a
// tenant's client's own site would see. Points at one specific, real,
// enabled demo client so this only works while that client's embed
// stays configured — remove this page once it's served its purpose.
export const metadata = { title: "Embed chatbot demo" };

const DEMO_CLIENT_ID = "b64d73fe-83f8-4d19-925f-2a1c9d1ad7b8";

export default function EmbedDemoPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Embed chatbot demo</h1>
      <p style={{ marginTop: 12, color: "#555", lineHeight: 1.6 }}>
        This page stands in for a tenant&apos;s client&apos;s own website. The chat bubble in the bottom-right
        corner is the real, live widget — click it, ask a question, and the answer comes from real knowledge base
        entries on a real client record, through the real public API.
      </p>
      <p style={{ marginTop: 12, color: "#555", lineHeight: 1.6 }}>
        Try asking: <em>&ldquo;What are your opening hours?&rdquo;</em> or <em>&ldquo;What do you do?&rdquo;</em>
      </p>
      <script src="/api/embed/widget" data-client={DEMO_CLIENT_ID} async />
    </div>
  );
}
