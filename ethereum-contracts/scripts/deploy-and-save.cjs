const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with', deployer.address);

  // Deploy HealthLink
  const HealthFactory = await hre.ethers.getContractFactory('HealthLink');
  const health = await HealthFactory.deploy(deployer.address);
  if (health.waitForDeployment) await health.waitForDeployment();
  else if (health.deployed) await health.deployed();
  const healthAddr = health.target || health.address;
  console.log('HealthLink deployed to', healthAddr);

  // Prepare deployment object
  const out = {
    network: hre.network.name || 'hardhat',
    chainId: hre.network.config.chainId || 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HealthLink: healthAddr,
    },
  };

  // Write to middleware-api contracts deployment file
  const targetPath = path.join(__dirname, '..', '..', 'middleware-api', 'contracts', 'deployment-addresses.json');
  fs.writeFileSync(targetPath, JSON.stringify(out, null, 2));
  console.log('Saved deployment addresses to', targetPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
