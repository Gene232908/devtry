import type { Metadata } from "next";
import { fontDisplay, fontSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarVibeDubai — Dubai's Luxury Car Valuation",
  description:
    "Get a fast, no-obligation luxury car valuation in Dubai. Submit your car details and our team will reach you on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontDisplay.variable} ${fontSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
