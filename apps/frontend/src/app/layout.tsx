import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/auth-provider";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const SITE_URL = "https://pailoshoes.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pailo Shoes | Nepal-made footwear that lasts",
    template: "%s | Pailo Shoes",
  },
  description:
    "Pailo Shoes — durable, comfortable footwear made in Nepal. Built for daily life, school days, and shop shelves. Quality you can feel, supply you can count on.",
  keywords: [
    "Pailo Shoes",
    "Nepal shoes",
    "Nepal-made footwear",
    "durable shoes Nepal",
    "school shoes Nepal",
    "wholesale shoes Nepal",
    "Nepali shoe manufacturer",
    "factory direct shoes",
    "comfortable footwear",
    "shoe supplier Nepal",
  ],
  authors: [{ name: "Pailo Shoes", url: SITE_URL }],
  creator: "Pailo Shoes",
  publisher: "Pailo Shoes",
  formatDetection: {
    telephone: true,
    email: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Pailo Shoes",
    title: "Pailo Shoes | Nepal-made footwear that lasts",
    description:
      "Durable, comfortable footwear made in Nepal. Built for daily life, school days, and shop shelves. Quality you can feel, supply you can count on.",
    images: [
      {
        url: "/landing/pailo-factory-vision.png",
        width: 1200,
        height: 630,
        alt: "Pailo Shoes — Nepal-made footwear factory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pailo Shoes | Nepal-made footwear that lasts",
    description:
      "Durable, comfortable footwear made in Nepal. Built for daily life, school days, and shop shelves.",
    images: ["/landing/pailo-factory-vision.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#17211c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
