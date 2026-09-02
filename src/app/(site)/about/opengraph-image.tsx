import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "About | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "About",
    title: "An analyst who ships, not just advises.",
    highlight: "ships,",
  });
}
