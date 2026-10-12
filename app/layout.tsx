import type { Metadata } from "next";
import { fontDisplay, fontSans } from "./fonts";
import "./globals.css";
import { MetaPixel } from "@/components/public/MetaPixel";
import { CookieConsentProvider } from "@/components/public/CookieConsentContext";
import { CookieConsent } from "@/components/public/CookieConsent";

export const metadata: Metadata = {
  title: "CarVibeDubai - Get Your Free Valuation",
  description:
    "Get your free car valuation in Dubai. Share your contact details, car information, and inspection area so the CarVibeDubai team can follow up on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontDisplay.variable} antialiased`}>
        <CookieConsentProvider>
          {children}
          <CookieConsent />
          <MetaPixel />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
