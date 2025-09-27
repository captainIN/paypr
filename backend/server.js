const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const {
  ARBITRUM_SEPOLIA_RPC_URL = "https://arb-sepolia.g.alchemy.com/v2/C_glfLqNmcZHqPEtcfpt8",
  PRIVATE_KEY,
  CONTRACT_ADDRESS
} = process.env;

// Contract setup
const CONTRACT_ABI = [
  "function registerRepository(string repoName, uint256 bountyAmount) external",
  "function registerDeveloper(string githubUsername) external",
  "function depositFunds(string repoName, uint256 amount) external",
  "function processPRPayment(string repoName, string developerGithub, uint256 prNumber) external",
  "function getRepository(string repoName) external view returns (tuple(address maintainer, uint256 bountyAmount, uint256 totalFunds, bool active))",
  "function getDeveloper(string githubUsername) external view returns(tuple(address wallet, string githubUsername, uint256 totalEarned))",
  "function getPayment(uint256 id) external view returns(tuple(string repoName, string developerGithub, uint256 prNumber, uint256 amount, uint256 timestamp))",
  "function paymentCounter() external view returns(uint256)",
  "event BountyPaid(string indexed repoName, string indexed developerGithub, uint256 indexed prNumber, uint256 amount)"
];

let provider, contract;

if (PRIVATE_KEY && CONTRACT_ADDRESS) {
  provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
}

// In-memory storage for demo (replace with database in production)
const repositories = new Map();
const developers = new Map();
const payments = [];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'PayPR Backend API', status: 'running' });
});

// GitHub webhook handler (simplified for demo)
app.post('/webhook/github', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    const { action, pull_request, repository } = req.body;

    if (action === 'closed' && pull_request?.merged) {
      const repoName = repository.full_name;
      const developer = pull_request.user.login;
      const prNumber = pull_request.number;

      console.log(`Processing PR merge: ${repoName} by ${developer} (PR #${prNumber})`);

      // Check if repo and developer are registered
      if (repositories.has(repoName) && developers.has(developer)) {
        await processPRPayment(repoName, developer, prNumber);
      } else {
        console.log('Repository or developer not registered');
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function processPRPayment(repoName, developer, prNumber) {
  try {
    if (!contract) {
      console.log('Contract not configured, simulating payment...');
      // Simulate payment for demo
      const payment = {
        id: payments.length,
        repoName,
        developer,
        prNumber,
        amount: '1000000', // 1 PYUSD (6 decimals)
        timestamp: Date.now()
      };
      payments.push(payment);
      console.log('Simulated payment:', payment);
      return;
    }

    console.log(`Processing payment: ${repoName} -> ${developer} (PR #${prNumber})`);

    const tx = await contract.processPRPayment(repoName, developer, prNumber);
    const receipt = await tx.wait();

    console.log(`Payment successful: ${receipt.hash}`);

    // Store payment info
    const payment = {
      id: payments.length,
      repoName,
      developer,
      prNumber,
      amount: '1000000', // 1 PYUSD
      timestamp: Date.now(),
      txHash: receipt.hash
    };
    payments.push(payment);

  } catch (error) {
    console.error('Payment processing error:', error);
  }
}

// API Routes
app.post('/api/register-repository', async (req, res) => {
  try {
    const { repoName, maintainerAddress } = req.body;

    // Store in memory for demo
    repositories.set(repoName, {
      maintainer: maintainerAddress,
      bountyAmount: '1000000', // 1 PYUSD (6 decimals)
      registered: true
    });

    console.log(`Repository registered: ${repoName} by ${maintainerAddress}`);

    res.json({
      success: true,
      message: 'Repository registered successfully',
      repository: { repoName, maintainerAddress }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/register-developer', async (req, res) => {
  try {
    const { githubUsername, walletAddress } = req.body;

    // Store in memory for demo
    developers.set(githubUsername, {
      wallet: walletAddress,
      githubUsername,
      totalEarned: '0',
      registered: true
    });

    console.log(`Developer registered: ${githubUsername} (${walletAddress})`);

    res.json({
      success: true,
      message: 'Developer registered successfully',
      developer: { githubUsername, walletAddress }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/repositories', async (req, res) => {
  try {
    const repoList = Array.from(repositories.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
    res.json(repoList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/developers', async (req, res) => {
  try {
    const devList = Array.from(developers.entries()).map(([username, data]) => ({
      username,
      ...data
    }));
    res.json(devList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to simulate PR merge
app.post('/api/test-payment', async (req, res) => {
  try {
    const { repoName, developer, prNumber } = req.body;
    await processPRPayment(repoName, developer, prNumber || 999);
    res.json({ success: true, message: 'Test payment processed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PayPR Backend running on port ${PORT}`);
  console.log(`Contract: ${CONTRACT_ADDRESS || 'Not configured'}`);
  console.log(`RPC: ${ARBITRUM_SEPOLIA_RPC_URL}`);
});