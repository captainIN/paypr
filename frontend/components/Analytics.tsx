'use client';

import { useQuery } from '@apollo/client';
import {
  GET_DEVELOPER_LEADERBOARD,
  GET_PAYMENT_HISTORY,
  GET_REPOSITORY_STATS,
  GET_ANALYTICS_OVERVIEW
} from '../lib/graph-queries';
import { ethers } from 'ethers';

interface Payment {
  id: string;
  repoName: string;
  developerGithub: string;
  prNumber: string;
  amount: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface Developer {
  id: string;
  githubUsername: string;
  wallet: string;
  blockTimestamp: string;
}

interface Repository {
  id: string;
  repoName: string;
  maintainer: string;
  bountyAmount: string;
  blockTimestamp: string;
}

export default function Analytics() {
  const { data: overviewData, loading: overviewLoading } = useQuery(GET_ANALYTICS_OVERVIEW);
  const { data: paymentsData, loading: paymentsLoading } = useQuery(GET_PAYMENT_HISTORY);
  const { data: developersData, loading: developersLoading } = useQuery(GET_DEVELOPER_LEADERBOARD);
  const { data: reposData, loading: reposLoading } = useQuery(GET_REPOSITORY_STATS);

  const formatAmount = (amount: string) => {
    try {
      return parseFloat(ethers.formatUnits(amount, 6)).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
  };

  const getTotalPayouts = () => {
    if (!overviewData?.bountyPaids) return '0.00';
    const total = overviewData.bountyPaids.reduce((sum: number, payment: any) => {
      return sum + parseFloat(ethers.formatUnits(payment.amount, 6));
    }, 0);
    return total.toFixed(2);
  };

  if (overviewLoading) {
    return (
      <div className="App" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'white', opacity: 0.8 }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div>
            <img
              src="/paypr_logo.png"
              alt="Paypr"
              style={{
                height: '100px',
                width: 'auto',
                marginBottom: '0.5rem'
              }}
            />
          </div>
          <nav className="nav-links">
            <a href="/" className="nav-link">Home</a>
            <a href="/analytics" className="nav-link">Analytics</a>
          </nav>
        </div>
      </header>

      <div className="container">
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '2.5rem', color: '#FFD700' }}>📊 PayPR Analytics</h1>
          <p style={{ margin: '0', fontSize: '1.1rem', opacity: 0.9 }}>
            Real-time blockchain analytics powered by The Graph Protocol
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Payouts</h3>
            <p className="text-2xl font-bold text-green-600">${getTotalPayouts()} PYUSD</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Developers</h3>
            <p className="text-2xl font-bold text-blue-600">{overviewData?.developerRegistereds?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Repositories</h3>
            <p className="text-2xl font-bold text-purple-600">{overviewData?.repositoryRegistereds?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Payments</h3>
            <p className="text-2xl font-bold text-orange-600">{overviewData?.bountyPaids?.length || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            </div>
            <div className="p-6">
              {paymentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : paymentsData?.bountyPaids?.length > 0 ? (
                <div className="space-y-4">
                  {paymentsData.bountyPaids.slice(0, 5).map((payment: Payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900">{payment.developerGithub}</p>
                        <p className="text-sm text-gray-500">{payment.repoName} - PR #{payment.prNumber}</p>
                        <p className="text-xs text-gray-400">{formatDate(payment.blockTimestamp)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${formatAmount(payment.amount)} PYUSD</p>
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          View tx
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No payments yet</p>
              )}
            </div>
          </div>

          {/* Developer Leaderboard */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Registered Developers</h2>
            </div>
            <div className="p-6">
              {developersLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : developersData?.developerRegistereds?.length > 0 ? (
                <div className="space-y-4">
                  {developersData.developerRegistereds.slice(0, 5).map((developer: Developer, index: number) => (
                    <div key={developer.id} className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{developer.githubUsername}</p>
                        <p className="text-sm text-gray-500">{developer.wallet.slice(0, 6)}...{developer.wallet.slice(-4)}</p>
                        <p className="text-xs text-gray-400">Joined {formatDate(developer.blockTimestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No developers registered yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Repository Stats */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Registered Repositories</h2>
          </div>
          <div className="p-6">
            {reposLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : reposData?.repositoryRegistereds?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reposData.repositoryRegistereds.map((repo: Repository) => (
                  <div key={repo.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{repo.repoName}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Maintainer: {repo.maintainer.slice(0, 6)}...{repo.maintainer.slice(-4)}
                    </p>
                    <p className="text-sm font-medium text-green-600 mb-2">
                      Bounty: ${formatAmount(repo.bountyAmount)} PYUSD
                    </p>
                    <p className="text-xs text-gray-400">
                      Registered {formatDate(repo.blockTimestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No repositories registered yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}