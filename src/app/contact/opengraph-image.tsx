import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Contact | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Contact",
    title: "Let's see what AI could do for your business.",
    highlight: "AI could do",
  });
}
