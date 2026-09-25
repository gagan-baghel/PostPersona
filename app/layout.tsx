import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google"
import { SWRProvider } from "@/lib/swr-provider"
import { Toaster } from "sonner"
import "./globals.css"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-ui" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-ui" })
// Marketing pages only (see .marketing in globals.css).
const fontDisplay = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display" })
const fontPlex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" })
const fontPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" })

const description =
  "Rework your whole LinkedIn in your own voice: headline, About, posts and replies. Nothing goes out without your approval."

// Share previews (LinkedIn, Slack, X) need absolute image URLs. Without an explicit app URL,
// fall back to the Vercel production domain rather than localhost.
const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: "PersonaPost: rework your whole LinkedIn",
  description,
  openGraph: {
    title: "PersonaPost: rework your whole LinkedIn",
    description,
    siteName: "PersonaPost",
    type: "website",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "PersonaPost: rework your whole LinkedIn", description },
  icons: {
    icon: [
      {
        url: "/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontPlex.variable} ${fontPlexMono.variable}`}>
      <body className="font-sans antialiased text-[13px] sm:text-[14px]">
        <SWRProvider>
          {children}
          <Analytics />
          <Toaster position="top-right" />
        </SWRProvider>
      </body>
    </html>
  )
}
