import { ogImageResponse, ogSize, ogContentType } from "@/lib/og-image";
import { getCaseStudy } from "@/lib/case-studies-data";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Case study | Hamish AI";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  return ogImageResponse({
    eyebrow: study ? study.industry : "Case study",
    title: study ? study.name : "Hamish AI portfolio",
  });
}
