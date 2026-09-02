import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Services & pricing | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Services & pricing",
    title: "Three AI transformation packages, honestly priced.",
    highlight: "AI transformation",
  });
}
