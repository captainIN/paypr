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

  const decodeString = (encodedString: string, fallbackType: 'repo' | 'username' | 'generic' = 'generic') => {
    try {
      // If it's already readable text, return as is
      if (/^[a-zA-Z0-9\-_/.]+$/.test(encodedString)) {
        return encodedString;
      }

      // Check if string contains mostly non-printable characters
      const nonPrintableCount = (encodedString.match(/[\x00-\x1F\x7F-\x9F]/g) || []).length;
      const totalLength = encodedString.length;

      if (nonPrintableCount > totalLength * 0.3) {
        // Too many non-printable characters, return fallback
        switch (fallbackType) {
          case 'repo':
            return '[Repository Name]';
          case 'username':
            return '[GitHub User]';
          default:
            return '[Encoded Data]';
        }
      }

      // Try to decode from bytes if it's encoded
      if (encodedString.startsWith('0x')) {
        try {
          const decoded = ethers.toUtf8String(encodedString);
          // Validate decoded string
          if (/^[a-zA-Z0-9\-_/.]+$/.test(decoded)) {
            return decoded;
          }
        } catch {
          // Fall through to fallback
        }
      }

      // If we reach here, return a user-friendly fallback
      switch (fallbackType) {
        case 'repo':
          return '[Repository Name]';
        case 'username':
          return '[GitHub User]';
        default:
          return '[Encoded Data]';
      }
    } catch (error) {
      console.log('String decode failed:', error);
      switch (fallbackType) {
        case 'repo':
          return '[Repository Name]';
        case 'username':
          return '[GitHub User]';
        default:
          return '[Encoded Data]';
      }
    }
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
          background: 'rgba(255, 193, 7, 0.2)',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          opacity: 0.9
        }}>
          ℹ️ Note: Some data may display as placeholders ([Repository Name], [GitHub User]) due to encoding from The Graph subgraph
        </div>

        {/* Overview Stats */}
        <div className="stats-section">
          <div className="stat-card">
            <h4>💰 Total Payouts</h4>
            <div className="stat-number" style={{ color: '#4CAF50' }}>{getTotalPayouts()}</div>
            <div className="stat-total">PYUSD Distributed</div>
          </div>
          <div className="stat-card">
            <h4>👨‍💻 Active Developers</h4>
            <div className="stat-number" style={{ color: '#2196F3' }}>{overviewData?.developerRegistereds?.length || 0}</div>
            <div className="stat-total">Registered Contributors</div>
          </div>
          <div className="stat-card">
            <h4>📁 Repositories</h4>
            <div className="stat-number" style={{ color: '#9C27B0' }}>{overviewData?.repositoryRegistereds?.length || 0}</div>
            <div className="stat-total">Active Projects</div>
          </div>
          <div className="stat-card">
            <h4>🎯 Total Payments</h4>
            <div className="stat-number" style={{ color: '#FF9800' }}>{overviewData?.bountyPaids?.length || 0}</div>
            <div className="stat-total">Successful Merges</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Recent Payments */}
          <div className="payments-section">
            <h3>💳 Recent Payments</h3>
            {paymentsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : paymentsData?.bountyPaids?.length > 0 ? (
              <div className="payments-list">
                {paymentsData.bountyPaids.slice(0, 8).map((payment: Payment) => (
                  <div key={payment.id} className="payment-card">
                    <div className="payment-header">
                      <span className="payment-amount">
                        ${formatAmount(payment.amount)} PYUSD
                      </span>
                      <span className="payment-time">
                        {formatDate(payment.blockTimestamp)}
                      </span>
                    </div>
                    <div className="payment-details">
                      <div>👨‍💻 {decodeString(payment.developerGithub, 'username')}</div>
                      <div>📁 {decodeString(payment.repoName, 'repo')}</div>
                      <div>🔗 PR #{payment.prNumber}</div>
                      <div>
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Transaction
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No payments recorded yet</p>
            )}
          </div>

          {/* Developer Leaderboard */}
          <div className="payments-section">
            <h3>👨‍💻 Registered Developers</h3>
            {developersLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : developersData?.developerRegistereds?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {developersData.developerRegistereds.slice(0, 8).map((developer: Developer, index: number) => (
                  <div key={developer.id} className="stat-card">
                    <h4>#{index + 1} {decodeString(developer.githubUsername, 'username')}</h4>
                    <div className="stat-item">
                      📱 {developer.wallet.slice(0, 6)}...{developer.wallet.slice(-4)}
                    </div>
                    <div className="stat-item">
                      📅 Joined {formatDate(developer.blockTimestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No developers registered yet</p>
            )}
          </div>
        </div>

        {/* Repository Stats */}
        <div className="payments-section">
          <h3>📁 Registered Repositories</h3>
          {reposLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
          ) : reposData?.repositoryRegistereds?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
              {reposData.repositoryRegistereds.map((repo: Repository) => (
                <div key={repo.id} className="stat-card">
                  <h4>📁 {decodeString(repo.repoName, 'repo')}</h4>
                  <div className="stat-item">
                    👨‍💻 {repo.maintainer.slice(0, 6)}...{repo.maintainer.slice(-4)}
                  </div>
                  <div className="stat-item" style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    💰 ${formatAmount(repo.bountyAmount)} PYUSD per PR
                  </div>
                  <div className="stat-item">
                    📅 Registered {formatDate(repo.blockTimestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No repositories registered yet</p>
          )}
        </div>

        <footer className="footer">
          <p>🔗 Powered by The Graph Protocol on Arbitrum Sepolia</p>
          <p>Real-time data from blockchain events</p>
        </footer>
      </div>
    </div>
  );
}