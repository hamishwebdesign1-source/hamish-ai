import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Help | Hamish AI";

export default async function Image() {
  return ogImageResponse({
    eyebrow: "Help",
    title: "Real answers before you sign up.",
    highlight: "before you sign up.",
  });
}
