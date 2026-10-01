import type { Metadata } from "next";
import { AdminMode } from "@/components/admin-mode";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { LeadPopup } from "@/components/lead-popup";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import "./kanikara.css";
import "./live-bridge.css";

export const metadata: Metadata = {
  title: {
    default: "Kanikara — Grace in Gold, Stories Untold",
    template: "%s | Kanikara",
  },
  description:
    "Fine gold, diamond and bridal jewellery crafted in Rajasthan.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AdminMode />
          <AnalyticsTracker />
          <LeadPopup />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
