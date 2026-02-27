import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SWRProvider } from "@/lib/swr-provider"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "PersonaPost - AI-Powered LinkedIn Content Creation",
  description:
    "Create engaging LinkedIn posts with AI personas that match your unique voice and style. Build your personal brand with authentic content.",
  generator: "v0.app",
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
    <html lang="en" className="dark">
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
