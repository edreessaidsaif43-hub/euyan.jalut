"use client";
import { usePathname } from "next/navigation";

export function PublicFrame({ children, header, footer }: { children: React.ReactNode; header: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return children;
  return <>
    <a href="#site-content" className="skip-link">انتقل إلى المحتوى</a>
    {header}
    <div id="site-content" tabIndex={-1}>{children}</div>
    {footer}
  </>;
}
