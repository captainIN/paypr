const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const { ARBITRUM_SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS, GITHUB_WEBHOOK_SECRET } = process.env;

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
  "event BountyPaid(string indexed repoName, string indexed developerGithub, uint256 indexed prNumber, uint256 amount)",
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
app.get("/", (req, res) => {
  res.json({ message: "PayPR Backend API", status: "running" });
});

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) return true; // Skip verification if no secret configured

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// GitHub webhook handler
app.post("/webhook/github", async (req, res) => {
  try {
    console.log("\n🔔 GitHub Webhook received");

    // Verify webhook signature if secret is configured
    if (GITHUB_WEBHOOK_SECRET) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature || !verifyWebhookSignature(JSON.stringify(req.body), signature, GITHUB_WEBHOOK_SECRET)) {
        console.log("❌ Invalid webhook signature");
        return res.status(401).send("Unauthorized");
      }
      console.log("✅ Webhook signature verified");
    }

    console.log("Headers:", req.headers);

    const { action, pull_request, repository } = req.body;

    // Log basic webhook info
    console.log(`Action: ${action}`);
    console.log(`Repository: ${repository?.full_name}`);
    console.log(`PR: #${pull_request?.number} by ${pull_request?.user?.login}`);

    // Check if this is a PR merge event
    if (action === "closed" && pull_request?.merged) {
      const repoName = repository.full_name;
      const developer = pull_request.user.login;
      const prNumber = pull_request.number;
      const mergedAt = pull_request.merged_at;

      console.log("\n🎉 PR MERGED EVENT DETECTED!");
      console.log(`Repository: ${repoName}`);
      console.log(`Developer: ${developer}`);
      console.log(`PR Number: #${prNumber}`);
      console.log(`Merged at: ${mergedAt}`);
      console.log(`PR Title: ${pull_request.title}`);

      // Enhanced validation
      if (!repoName || !developer || !prNumber) {
        console.log("❌ Missing required data in webhook payload");
        return res.status(400).send("Invalid webhook payload");
      }

      // Check if repo and developer are registered (in memory check first)
      const repoRegistered = repositories.has(repoName);
      const devRegistered = developers.has(developer);

      console.log(`Repository registered in memory: ${repoRegistered}`);
      console.log(`Developer registered in memory: ${devRegistered}`);

      // Process payment regardless of memory state - let contract handle validation
      console.log("\n🚀 Initiating payment process...");
      await processPRPayment(repoName, developer, prNumber);

    } else if (action === "opened") {
      console.log(`📝 New PR opened: ${repository.full_name}#${pull_request.number}`);
    } else if (action === "closed" && !pull_request?.merged) {
      console.log(`❌ PR closed without merge: ${repository.full_name}#${pull_request.number}`);
    } else {
      console.log(`ℹ️ Unhandled webhook action: ${action}`);
    }

    res.status(200).json({
      status: "received",
      action,
      processed: action === "closed" && pull_request?.merged
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

async function processPRPayment(repoName, developer, prNumber) {
  try {
    if (!contract) {
      console.log("Contract not configured, simulating payment...");
      // Simulate payment for demo
      const payment = {
        id: payments.length,
        repoName,
        developer,
        prNumber,
        amount: "1000000", // 1 PYUSD (6 decimals)
        timestamp: Date.now(),
      };
      payments.push(payment);
      console.log("Simulated payment:", payment);
      return;
    }

    console.log(
      `🚀 Processing blockchain payment: ${repoName} -> ${developer} (PR #${prNumber})`
    );

    // Check if repository and developer are registered on-chain
    try {
      const repoData = await contract.getRepository(repoName);
      if (!repoData.active) {
        console.log(`❌ Repository ${repoName} not active on-chain`);
        return;
      }
      console.log(`✅ Repository verified: ${repoData.bountyAmount} PYUSD bounty`);
    } catch (error) {
      console.log(`❌ Repository ${repoName} not found on-chain:`, error.message);
      return;
    }

    try {
      const devData = await contract.getDeveloper(developer);
      if (devData.wallet === ethers.ZeroAddress) {
        console.log(`❌ Developer ${developer} not registered on-chain`);
        return;
      }
      console.log(`✅ Developer verified: ${devData.wallet}`);
    } catch (error) {
      console.log(`❌ Developer ${developer} not found on-chain:`, error.message);
      return;
    }

    // Process the payment on blockchain
    console.log("📝 Calling contract.processPRPayment...");
    const tx = await contract.processPRPayment(repoName, developer, prNumber);
    console.log(`⏳ Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Payment successful! Block: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`);

    // Extract payment amount from BountyPaid event
    let paymentAmount = "1000000"; // Default fallback
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog.name === "BountyPaid") {
          paymentAmount = parsedLog.args.amount.toString();
          console.log(`💰 Payment amount from event: ${ethers.formatUnits(paymentAmount, 6)} PYUSD`);
          break;
        }
      } catch (e) {
        // Skip logs that aren't from our contract
      }
    }

    // Store payment info
    const payment = {
      id: payments.length,
      repoName,
      developer,
      prNumber,
      amount: paymentAmount,
      timestamp: Date.now(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
    payments.push(payment);

    console.log(`🎉 Payment recorded:`, payment);
  } catch (error) {
    console.error("❌ Payment processing error:", error.message);

    // If it's a known contract error, log more details
    if (error.reason) {
      console.error("Contract error reason:", error.reason);
    }
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

// API Routes
app.post("/api/register-repository", async (req, res) => {
  try {
    const { repoName, maintainerAddress } = req.body;

    // Store in memory for demo
    repositories.set(repoName, {
      maintainer: maintainerAddress,
      bountyAmount: "1000000", // 1 PYUSD (6 decimals)
      registered: true,
    });

    console.log(`Repository registered: ${repoName} by ${maintainerAddress}`);

    res.json({
      success: true,
      message: "Repository registered successfully",
      repository: { repoName, maintainerAddress },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/register-developer", async (req, res) => {
  try {
    const { githubUsername, walletAddress } = req.body;

    // Store in memory for demo
    developers.set(githubUsername, {
      wallet: walletAddress,
      githubUsername,
      totalEarned: "0",
      registered: true,
    });

    console.log(`Developer registered: ${githubUsername} (${walletAddress})`);

    res.json({
      success: true,
      message: "Developer registered successfully",
      developer: { githubUsername, walletAddress },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/payments", async (req, res) => {
  try {
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/repositories", async (req, res) => {
  try {
    const repoList = Array.from(repositories.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
    res.json(repoList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/developers", async (req, res) => {
  try {
    const devList = Array.from(developers.entries()).map(
      ([username, data]) => ({
        username,
        ...data,
      })
    );
    res.json(devList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to simulate PR merge
app.post("/api/test-payment", async (req, res) => {
  try {
    const { repoName, developer, prNumber } = req.body;

    console.log("\n🧪 TEST PAYMENT INITIATED");
    console.log(`Repository: ${repoName || repositories.keys().next().value}`);
    console.log(`Developer: ${developer || developers.keys().next().value}`);
    console.log(`PR Number: ${prNumber || 999}`);

    await processPRPayment(
      repoName || repositories.keys().next().value,
      developer || developers.keys().next().value,
      prNumber || 999
    );

    res.json({
      success: true,
      message: "Test payment processed",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Test payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook status endpoint
app.get("/api/webhook-status", (req, res) => {
  res.json({
    contract_configured: !!contract,
    contract_address: CONTRACT_ADDRESS,
    rpc_url: ARBITRUM_SEPOLIA_RPC_URL,
    registered_repositories: repositories.size,
    registered_developers: developers.size,
    total_payments: payments.length,
    last_payment: payments[payments.length - 1] || null,
    webhook_url: `${req.protocol}://${req.get('host')}/webhook/github`
  });
});

app.listen(PORT, () => {
  console.log(`PayPR Backend running on port ${PORT}`);
  console.log(`Contract: ${CONTRACT_ADDRESS || "Not configured"}`);
  console.log(`RPC: ${ARBITRUM_SEPOLIA_RPC_URL}`);
});
