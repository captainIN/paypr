'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xA9852D119cCDf5Ff0c3C6b450bA129B8b5219B30'
const PYUSD_ADDRESS = '0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1'

// Contract ABIs
const PYUSD_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
]

const PAYPR_ABI = [
  'function registerRepository(string calldata repoName, uint256 bountyAmount) external',
  'function depositFunds(string calldata repoName, uint256 amount) external',
  'function registerDeveloper(string calldata githubUsername) external',
  'function getRepository(string calldata repoName) external view returns (tuple(address maintainer, uint256 bountyAmount, uint256 totalFunds, bool active))',
  'function getDeveloper(address developer) external view returns (tuple(string githubUsername, bool registered))'
]

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
  const [webhookGuideOpen, setWebhookGuideOpen] = useState<boolean>(false)

  // Form states
  const [repoName, setRepoName] = useState<string>('')
  const [githubUsername, setGithubUsername] = useState<string>('')
  const [fundingAmount, setFundingAmount] = useState<string>('')
  const [bountyAmount, setBountyAmount] = useState<string>('1')
  const [selectedRepo, setSelectedRepo] = useState<string>('')

  // Funding states
  const [pyusdBalance, setPyusdBalance] = useState<string>('0')
  const [pyusdAllowance, setPyusdAllowance] = useState<string>('0')
  const [repoBalance, setRepoBalance] = useState<string>('0')
  const [repoActive, setRepoActive] = useState<boolean>(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (account) {
      loadBalances()
    }
  }, [account, selectedRepo])

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

  const loadBalances = async () => {
    if (!account || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, provider)
      const payprContract = new ethers.Contract(CONTRACT_ADDRESS, PAYPR_ABI, provider)

      // Load PYUSD balance and allowance
      const balance = await pyusdContract.balanceOf(account)
      const allowance = await pyusdContract.allowance(account, CONTRACT_ADDRESS)

      setPyusdBalance(ethers.formatUnits(balance, 6))
      setPyusdAllowance(ethers.formatUnits(allowance, 6))

      // Load repository balance if a repo is selected
      if (selectedRepo) {
        try {
          const repoData = await payprContract.getRepository(selectedRepo)
          setRepoBalance(ethers.formatUnits(repoData.totalFunds, 6))
          setRepoActive(repoData.active)
        } catch (error) {
          console.log('Repository not found on-chain:', selectedRepo)
          setRepoBalance('0')
          setRepoActive(false)
        }
      }
    } catch (error) {
      console.error('Error loading balances:', error)
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
    if (!account || !repoName || !fundingAmount || !bountyAmount) return

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, signer)
      const payprContract = new ethers.Contract(CONTRACT_ADDRESS, PAYPR_ABI, signer)

      const fundAmount = ethers.parseUnits(fundingAmount, 6) // PYUSD has 6 decimals
      const bountyAmountParsed = ethers.parseUnits(bountyAmount, 6)

      // First register the repository with bounty amount
      alert('Registering repository on-chain...')
      const registerTx = await payprContract.registerRepository(repoName, bountyAmountParsed)
      await registerTx.wait()

      // Check allowance for funding
      const currentAllowance = await pyusdContract.allowance(account, CONTRACT_ADDRESS)

      if (currentAllowance < fundAmount) {
        alert('Approving PYUSD spending...')
        const approveTx = await pyusdContract.approve(CONTRACT_ADDRESS, fundAmount)
        await approveTx.wait()
      }

      // Deposit funds
      alert('Depositing funds...')
      const depositTx = await payprContract.depositFunds(repoName, fundAmount)
      await depositTx.wait()

      // Also register in backend database
      await axios.post(`${BACKEND_URL}/api/register-repository`, {
        repoName,
        maintainerAddress: account
      })

      alert('Repository registered and funded successfully!')
      setRepoName('')
      setFundingAmount('')
      setBountyAmount('1')
      loadData()
      loadBalances()
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
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const payprContract = new ethers.Contract(CONTRACT_ADDRESS, PAYPR_ABI, signer)

      // Register developer on-chain
      alert('Registering developer on-chain...')
      const registerTx = await payprContract.registerDeveloper(githubUsername)
      await registerTx.wait()

      // Also register in backend database
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

          {!account ? (
            <button onClick={connectWallet} disabled={loading} className="connect-btn">
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {!account ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#FFD700' }}>🔗 Connect Your Wallet</h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
              Connect your wallet to start using paypr for automated GitHub payments
            </p>
            <button onClick={connectWallet} disabled={loading} className="connect-btn">
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#FFD700' }}>Howdy!</h2>
              <p style={{ margin: '0', fontSize: '1rem', opacity: 0.9 }}>
                <strong>Repository Owners:</strong> Register your repo and fund it to enable automatic payments.<br />
                <strong>Developers:</strong> Register your GitHub username to receive payments when your PRs are merged.
              </p>
            </div>
            <div className="forms-section">
              <div className="form-card">
                <h3>🏗️ Repository Maintainer</h3>
                <div style={{ background: 'rgba(76, 175, 80, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <strong>For Repository Owners:</strong><br />
                  Register your GitHub repository to enable automatic PYUSD payments when PRs are merged.
                  Set the bounty amount per PR and add initial funding.
                </div>

                <div style={{ background: 'rgba(255, 193, 7, 0.15)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <button
                    onClick={() => setWebhookGuideOpen(!webhookGuideOpen)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '1rem',
                      color: '#FFD700',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '8px'
                    }}
                  >
                    <span>⚙️ Required: GitHub Webhook Setup</span>
                    <span style={{ transform: webhookGuideOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                  </button>

                  {webhookGuideOpen && (
                    <div style={{ padding: '0 1rem 1rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
                      <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>After registering below, configure your GitHub repository webhook:</p>

                      <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', lineHeight: '1.8' }}>
                        <div style={{ marginBottom: '0.8rem' }}><strong>1. Go to your GitHub repository</strong></div>
                        <div style={{ marginBottom: '0.8rem' }}><strong>2. Navigate to:</strong> Settings → Webhooks → Add webhook</div>
                        <div style={{ marginBottom: '0.8rem' }}><strong>3. Enter these values:</strong></div>
                        <div style={{ paddingLeft: '1rem', lineHeight: '2' }}>
                          <div style={{ marginBottom: '0.5rem' }}>• <strong>Payload URL:</strong><br />
                            <code style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '3px', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                              https://paypr-production.up.railway.app/webhook/github
                            </code>
                          </div>
                          <div style={{ marginBottom: '0.5rem' }}>• <strong>Content type:</strong> application/json</div>
                          <div style={{ marginBottom: '0.5rem' }}>• <strong>Secret:</strong><br />
                            <code style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '3px', fontSize: '0.8rem' }}>
                              my-safe-secret
                            </code>
                          </div>
                          <div style={{ marginBottom: '0.5rem' }}>• <strong>Events:</strong> Select "Pull requests" only</div>
                          <div>• <strong>Active:</strong> ✅ Check this box</div>
                        </div>
                      </div>

                      <p style={{ margin: '0', fontSize: '0.8rem', opacity: '0.9', lineHeight: '1.5' }}>
                        💡 <strong>Note:</strong> Without the webhook, payments won't trigger automatically when PRs are merged.
                      </p>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                  Your PYUSD Balance: {pyusdBalance} PYUSD
                </p>
                <input
                  type="text"
                  placeholder="owner/repository"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="input"
                />
                <input
                  type="number"
                  placeholder="Bounty per PR (PYUSD)"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  className="input"
                  min="0.1"
                  step="0.1"
                />
                <input
                  type="number"
                  placeholder="Initial funding (PYUSD)"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  className="input"
                  min="1"
                  step="0.1"
                />
                <button
                  onClick={registerRepository}
                  disabled={loading || !repoName || !fundingAmount || !bountyAmount || parseFloat(fundingAmount) <= 0 || parseFloat(bountyAmount) <= 0}
                  className="btn primary"
                >
                  Register & Fund Repository
                </button>
              </div>

              <div className="form-card">
                <h3>👨‍💻 Developer Registration</h3>
                <div style={{ background: 'rgba(33, 150, 243, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <strong>For Contributors:</strong><br />
                  Link your GitHub account to this wallet to receive automatic PYUSD payments
                  when your pull requests are merged in registered repositories.
                </div>
                <input
                  type="text"
                  placeholder="Your GitHub username"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="input"
                />
                <button
                  onClick={registerDeveloper}
                  disabled={loading || !githubUsername}
                  className="btn primary"
                >
                  Register as Developer
                </button>
              </div>

            </div>

            <div className="stats-section">
              <div className="stat-card">
                <h4>Your Wallet</h4>
                <div className="stat-item">
                  💰 PYUSD: {parseFloat(pyusdBalance).toFixed(2)}
                </div>
                <div className="stat-item">
                  ✅ Allowance: {parseFloat(pyusdAllowance).toFixed(2)}
                </div>
                <div className="stat-item">
                  📱 {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>

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
          <p>Contract: <code>{process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}</code></p>
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