import type { Metadata } from "next";
import { fontDisplay, fontSans } from "./fonts";
import "./globals.css";
import { MetaPixel } from "@/components/public/MetaPixel";

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
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
