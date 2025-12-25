import hre from 'hardhat';
import { ethers as Ethers } from 'ethers';

async function main() {
  const txHash = process.env.TX_HASH;
  if (!txHash) {
    console.error('Set TX_HASH env var');
    process.exit(1);
  }
  const RPC = process.env.ETHEREUM_RPC_URL;
  const liveProvider = new Ethers.JsonRpcProvider(RPC);
  const tx = await liveProvider.getTransaction(txHash);
  if (!tx) { console.error('tx not found'); process.exit(1); }
  console.log('tx.to:', tx.to);
  try {
    const hf = await hre.ethers.getContractFactory('HealthLink');
    const parsed = hf.interface.parseTransaction({ data: tx.data });
    console.log('Function:', parsed.name);
    console.log('Args:', parsed.args);
  } catch (err) {
    console.error('Decode failed:', err.message || err);
  }

  try {
    const codeAtBlock = await liveProvider.getCode(tx.to, tx.blockNumber);
    console.log('Contract code (hex length):', codeAtBlock ? codeAtBlock.length : 0);
    if (codeAtBlock && codeAtBlock.length < 100) console.log('Code seems very small; may be a proxy or minimal contract');
  } catch (cErr) {
    console.error('Error fetching code at block:', cErr.message || cErr);
  }
}

main().catch(e => { console.error(e); process.exit(1); });