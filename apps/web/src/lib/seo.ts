import type { Metadata } from "next";

export const SITE_NAME = "Shopping Website";
const FALLBACK_DESCRIPTION = "Shop fashion, home and beauty products at Shopping Website.";

/** Single source of title, description, canonical and robots for every catalogue page. */
export function buildMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: input.title.trim() || SITE_NAME,
    description: input.description.trim() || FALLBACK_DESCRIPTION,
    alternates: { canonical: input.path },
    robots: { index: true, follow: true },
  };
}
