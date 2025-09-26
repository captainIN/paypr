const { ethers } = require("hardhat");

async function main() {
  // PYUSD contract address on Arbitrum Sepolia
  const PYUSD_ADDRESS = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"; // Real PYUSD on Arbitrum Sepolia

  console.log("Deploying PayPR contract...");

  const PayPR = await ethers.getContractFactory("PayPR");
  const paypr = await PayPR.deploy(PYUSD_ADDRESS);

  await paypr.waitForDeployment();
  const address = await paypr.getAddress();

  console.log("PayPR deployed to:", address);
  console.log("PYUSD address:", PYUSD_ADDRESS);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: address,
    pyusdAddress: PYUSD_ADDRESS,
    network: "arbitrumSepolia",
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync('../deploy/contract-address.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deploy/contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});