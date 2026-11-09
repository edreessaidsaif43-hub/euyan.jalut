import type { MetadataRoute } from "next";
import { getPublicSettings, siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSettings();
  return {
    rules: { userAgent: "*", ...(settings.demo_mode ? { disallow: "/" } : { allow: "/", disallow: ["/admin", "/auth", "/search", "/media"] }) },
    sitemap: settings.demo_mode ? undefined : `${siteOrigin()}/sitemap.xml`,
  };
}
