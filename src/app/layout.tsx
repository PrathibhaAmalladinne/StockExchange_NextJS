import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Financial Metrics and Comparision",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className=" min-h-screen bg-background">
        <main className=" container mx-auto">{children}</main>
      </body>
    </html>
  )
}
