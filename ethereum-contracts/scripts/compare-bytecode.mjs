import { ethers as Ethers } from 'ethers';
import hre from 'hardhat';
import fs from 'fs';

async function main() {
  const RPC = process.env.ETHEREUM_RPC_URL;
  const addr = process.env.CONTRACT_ADDR;
  if (!RPC || !addr) { console.error('Set ETHEREUM_RPC_URL and CONTRACT_ADDR env vars'); process.exit(1); }
  const liveProvider = new Ethers.JsonRpcProvider(RPC);
  const code = await liveProvider.getCode(addr);
  console.log('Live code length:', code.length);

  const artifactPath = 'artifacts/contracts/HealthLink.sol/HealthLink.json';
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const deployed = artifact.deployedBytecode || artifact.bytecode;
  console.log('Artifact deployedBytecode length:', deployed.length);

  console.log('First 100 chars of live:', code.slice(0,100));
  console.log('First 100 chars of artifact:', deployed.slice(0,100));

  console.log('Are they equal?', code === deployed);
}

main().catch(e => { console.error(e); process.exit(1); });