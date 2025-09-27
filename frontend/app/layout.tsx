import type { Metadata } from 'next'
import './globals.css'
import GraphApolloProvider from '../components/ApolloProvider'

export const metadata: Metadata = {
  title: 'paypr - Automated PYUSD Payments for GitHub PRs',
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
        <GraphApolloProvider>
          <div id="root">{children}</div>
        </GraphApolloProvider>
      </body>
    </html>
  )
}