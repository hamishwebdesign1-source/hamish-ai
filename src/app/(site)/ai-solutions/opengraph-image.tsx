import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "AI Solutions | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "AI Solutions",
    title: "Six practical AI solutions for real businesses.",
    highlight: "AI solutions",
  });
}
