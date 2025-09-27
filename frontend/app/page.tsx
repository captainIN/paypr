'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

interface Payment {
  id: number
  repoName: string
  developer: string
  prNumber: number
  amount: string
  timestamp: number
  txHash?: string
}

interface Repository {
  name: string
  maintainer: string
  registered: boolean
}

interface Developer {
  username: string
  wallet: string
  registered: boolean
}

export default function Home() {
  const [account, setAccount] = useState<string>('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Form states
  const [repoName, setRepoName] = useState<string>('')
  const [githubUsername, setGithubUsername] = useState<string>('')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [paymentsRes, reposRes, devsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/payments`),
        axios.get(`${BACKEND_URL}/api/repositories`),
        axios.get(`${BACKEND_URL}/api/developers`)
      ])

      setPayments(paymentsRes.data)
      setRepositories(reposRes.data)
      setDevelopers(devsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is required!')
      return
    }

    try {
      setLoading(true)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      setAccount(accounts[0])

      // Check if on Arbitrum Sepolia
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== '0x66eee') { // 421614 in hex
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66eee' }],
          })
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x66eee',
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia.arbiscan.io']
              }]
            })
          }
        }
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const registerRepository = async () => {
    if (!account || !repoName) return

    try {
      setLoading(true)
      await axios.post(`${BACKEND_URL}/api/register-repository`, {
        repoName,
        maintainerAddress: account
      })

      alert('Repository registered successfully!')
      setRepoName('')
      loadData()
    } catch (error) {
      console.error('Registration failed:', error)
      alert('Registration failed: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const registerDeveloper = async () => {
    if (!account || !githubUsername) return

    try {
      setLoading(true)
      await axios.post(`${BACKEND_URL}/api/register-developer`, {
        githubUsername,
        walletAddress: account
      })

      alert('Developer registered successfully!')
      setGithubUsername('')
      loadData()
    } catch (error) {
      console.error('Registration failed:', error)
      alert('Registration failed: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const testPayment = async () => {
    if (repositories.length === 0 || developers.length === 0) {
      alert('Please register at least one repository and one developer first')
      return
    }

    try {
      setLoading(true)
      await axios.post(`${BACKEND_URL}/api/test-payment`, {
        repoName: repositories[0].name,
        developer: developers[0].username,
        prNumber: Math.floor(Math.random() * 1000)
      })

      alert('Test payment processed!')
      loadData()
    } catch (error) {
      console.error('Test payment failed:', error)
      alert('Test payment failed: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <header className="header">
        <h1>🚀 PayPR</h1>
        <p>Automated PYUSD payments for GitHub PR merges</p>

        {!account ? (
          <button onClick={connectWallet} disabled={loading} className="connect-btn">
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
          </div>
        )}
      </header>

      <div className="container">
        {account && (
          <>
            <div className="forms-section">
              <div className="form-card">
                <h3>Register Repository</h3>
                <input
                  type="text"
                  placeholder="owner/repository"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="input"
                />
                <button
                  onClick={registerRepository}
                  disabled={loading || !repoName}
                  className="btn primary"
                >
                  Register Repository (1 PYUSD per PR)
                </button>
              </div>

              <div className="form-card">
                <h3>Register Developer</h3>
                <input
                  type="text"
                  placeholder="GitHub username"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="input"
                />
                <button
                  onClick={registerDeveloper}
                  disabled={loading || !githubUsername}
                  className="btn primary"
                >
                  Register Developer
                </button>
              </div>

              <div className="form-card">
                <h3>Demo Test</h3>
                <p>Simulate a PR payment</p>
                <button
                  onClick={testPayment}
                  disabled={loading}
                  className="btn secondary"
                >
                  Test Payment
                </button>
              </div>
            </div>

            <div className="stats-section">
              <div className="stat-card">
                <h4>Repositories</h4>
                <div className="stat-number">{repositories.length}</div>
                {repositories.map((repo, i) => (
                  <div key={i} className="stat-item">
                    📁 {repo.name}
                  </div>
                ))}
              </div>

              <div className="stat-card">
                <h4>Developers</h4>
                <div className="stat-number">{developers.length}</div>
                {developers.map((dev, i) => (
                  <div key={i} className="stat-item">
                    👨‍💻 {dev.username}
                  </div>
                ))}
              </div>

              <div className="stat-card">
                <h4>Payments</h4>
                <div className="stat-number">{payments.length}</div>
                <div className="stat-total">
                  Total: {(payments.reduce((sum, p) => sum + parseInt(p.amount), 0) / 1000000).toFixed(2)} PYUSD
                </div>
              </div>
            </div>

            <div className="payments-section">
              <h3>Recent Payments</h3>
              {payments.length === 0 ? (
                <p className="no-data">No payments yet. Register a repository and developer, then test a payment!</p>
              ) : (
                <div className="payments-list">
                  {payments.slice().reverse().map((payment, i) => (
                    <div key={i} className="payment-card">
                      <div className="payment-header">
                        <span className="payment-amount">
                          {(parseInt(payment.amount) / 1000000).toFixed(2)} PYUSD
                        </span>
                        <span className="payment-time">
                          {new Date(payment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="payment-details">
                        <div>📁 {payment.repoName}</div>
                        <div>👨‍💻 {payment.developer}</div>
                        <div>🔗 PR #{payment.prNumber}</div>
                        {payment.txHash && (
                          <div>🔗 <a href={`https://sepolia.arbiscan.io/tx/${payment.txHash}`} target="_blank" rel="noopener noreferrer">
                            View Transaction
                          </a></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <footer className="footer">
          <p>🏗️ Built for Hackathon - Powered by PYUSD & The Graph</p>
          <p>Webhook URL: <code>{BACKEND_URL}/webhook/github</code></p>
          <p>Contract: <code>0x1afd0Ec4340845c8E317F7B56489d08A48bAB2E4</code></p>
        </footer>
      </div>
    </div>
  )
}

// Extend window for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}