import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PayPR - Automated PYUSD Payments for GitHub PRs',
  description: 'Blockchain-powered payments for GitHub pull request merges using PYUSD on Arbitrum',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}