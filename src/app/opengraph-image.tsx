import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Hamish AI — Edinburgh's AI transformation partner for small businesses";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Hamish AI · Edinburgh",
    title: "AI-powered digital solutions for small businesses.",
    highlight: "AI-powered",
  });
}
