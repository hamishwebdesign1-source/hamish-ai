import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Portfolio | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Portfolio",
    title: "Case studies, not just concepts.",
    highlight: "Case studies",
  });
}
