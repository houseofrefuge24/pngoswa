import type { Metadata } from "next"
import { Lexend, Merriweather } from "next/font/google"
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin"
import { extractRouterConfig } from "uploadthing/server"

import { uploadRouter } from "@/app/api/uploadthing/core"

import "./globals.css"

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pngoswa.org"
).replace(/\/$/, "")

const defaultOgImage =
  "/api/og?title=PNGOSWA&description=Philippine%20NGO%20Social%20Workers%20Association"

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
})

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "PNGOSWA",
  title: {
    default: "PNGOSWA | Philippine NGO Social Workers Association",
    template: "%s | PNGOSWA",
  },
  description:
    "PNGOSWA is the Philippine NGO Social Workers Association supporting NGO social workers in the Philippines through advocacy, programs, and professional development.",
  keywords: [
    "Pngosw",
    "PNGOSWA",
    "Ph NGO",
    "Philippine NGO",
    "Philippine NGO Social Workers Association",
    "Social Workers",
    "Association",
    "NGO Philippines",
    "Social Work",
    "Professional Development",
  ],
  alternates: {
    canonical: "/",
  },
  icons: { icon: "/logo.jpg" },
  openGraph: {
    title: "PNGOSWA | Philippine NGO Social Workers Association",
    description:
      "PNGOSWA is the Philippine NGO Social Workers Association supporting NGO social workers in the Philippines.",
    url: "/",
    siteName: "PNGOSWA",
    type: "website",
    locale: "en_PH",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "PNGOSWA | Philippine NGO Social Workers Association",
    description:
      "PNGOSWA supports NGO social workers in the Philippines through advocacy, programs, and membership development.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NonprofitOrganization",
      "@id": `${siteUrl}#organization`,
      name: "Philippine NGO Social Workers Association",
      alternateName: ["PNGOSWA", "Ph NGO Social Workers Association"],
      url: siteUrl,
      logo: `${siteUrl}/logo.jpg`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: "PNGOSWA",
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
    },
    {
      "@type": "SiteNavigationElement",
      name: "About",
      url: `${siteUrl}/about`,
    },
    {
      "@type": "SiteNavigationElement",
      name: "Membership",
      url: `${siteUrl}/membership`,
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${lexend.variable} ${merriweather.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <NextSSRPlugin routerConfig={extractRouterConfig(uploadRouter)} />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  )
}
