import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo";
import "./globals.css";
import { getPublicSettings, siteOrigin } from "@/lib/site";
import { PublicFrame } from "@/components/public-frame";
import { SiteFooter, SiteHeader } from "@/components/public-shell";

export const viewport: Viewport = { themeColor: "#09243b" };
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: s.brand_name, template: `%s | ${s.brand_name}` },
    description: `${s.school_name} في سلطنة عُمان. ${s.tagline}. أخبار المدرسة والفعاليات والجداول والموارد التعليمية.`,
    openGraph: { type: "website", locale: "ar_OM", siteName: s.brand_name },
    robots: s.demo_mode ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PublicFrame header={<SiteHeader />} footer={<SiteFooter />}>{children}</PublicFrame>
      </body>
    </html>
  );
}
