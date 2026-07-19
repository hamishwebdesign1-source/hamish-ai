import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 100px",
          background: "#0b0f1a",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          <polygon points="60,16 60,60 24,60" fill="#e7eaf2" opacity={0.45} />
          <polygon points="60,16 96,60 60,60" fill="#e7eaf2" opacity={0.85} />
          <polygon points="96,60 60,104 60,60" fill="#e7eaf2" opacity={0.65} />
          <polygon points="60,60 60,104 24,60" fill="#8b6bea" />
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "56px",
            maxWidth: "760px",
          }}
        >
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#e7eaf2" }}>Hamish</span>
            <span style={{ color: "#5ec9d9", marginLeft: "22px" }}>AI</span>
          </div>
          <div style={{ display: "flex", marginTop: "20px", fontSize: 28, color: "#8a93a8" }}>
            {siteConfig.tagline}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
