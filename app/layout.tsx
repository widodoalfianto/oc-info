import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import Footer from '@/components/Footer'
import './globals.css'

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'IFGF OC Info',
  description: 'Care group details, ministry signups, and the IFGF OC events calendar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} bg-black font-sans text-zinc-100 antialiased`}>
        <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent_24%),linear-gradient(180deg,#010101_0%,#050505_52%,#090909_100%)]">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
