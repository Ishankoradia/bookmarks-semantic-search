import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import AuthSessionProvider from '@/components/auth/session-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Semantic Bookmarks',
  description: 'Search your bookmarks by meaning with AI-powered semantic search',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
        <Toaster />
        <SonnerToaster position="top-center" />
        <Analytics />
      </body>
    </html>
  )
}
