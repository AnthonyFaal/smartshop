import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/lib/trpc/provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SmartShop — Ghana's Trusted Marketplace",
    template: "%s | SmartShop",
  },
  description:
    "AI-powered marketplace for Ghana. Buy and sell with verified sellers, smart search, and secure payments in GHS.",
  keywords: ["marketplace", "Ghana", "UMaT", "e-commerce", "GHS"],
  openGraph: {
    title: "SmartShop — Ghana's Trusted Marketplace",
    description: "AI-powered marketplace for Ghana",
    locale: "en_GH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GH" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <TRPCProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TRPCProvider>
      </body>
    </html>
  );
}
