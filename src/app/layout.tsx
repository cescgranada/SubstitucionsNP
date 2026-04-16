import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SubsCoop — Escola Nou Patufet',
  description: 'Gestió de substitucions docents',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ca" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
        {children}
      </body>
    </html>
  )
}
