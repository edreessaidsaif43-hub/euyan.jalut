import type { MetadataRoute } from "next";
import { getPublicContents, getPublicSettings, SECTIONS, siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getPublicSettings();
  if (settings.demo_mode) return [];
  const origin = siteOrigin();
  const rows = await getPublicContents({ limit: 1000 });
  return [
    { url: origin },
    ...SECTIONS.map(({ href }) => ({ url: origin + href })),
    ...rows.filter((row) => !row.is_demo).map((row) => ({ url: `${origin}/details/${row.slug}`, lastModified: row.updated_at })),
  ];
}
