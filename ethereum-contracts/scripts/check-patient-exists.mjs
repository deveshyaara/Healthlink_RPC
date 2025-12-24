import { ethers as Ethers } from 'ethers';
import hre from 'hardhat';

async function main() {
  const RPC = process.env.ETHEREUM_RPC_URL;
  const txHash = process.env.TX_HASH;
  if (!RPC || !txHash) {
    console.error('Set ETHEREUM_RPC_URL and TX_HASH env vars'); process.exit(1);
  }
  const liveProvider = new Ethers.JsonRpcProvider(RPC);
  const tx = await liveProvider.getTransaction(txHash);
  if (!tx) { console.error('tx not found'); process.exit(1); }
  const hf = await hre.ethers.getContractFactory('HealthLink');
  const iface = hf.interface;
  const contract = new Ethers.Contract(tx.to, iface, liveProvider);

  const patientId = 'debug-patient-1766607186077';
  try {
    const p = await contract.getPatient(patientId);
    console.log('getPatient:', p);
  } catch (err) {
    console.error('getPatient call failed:', err.message || err);
  }
}

main().catch(e => { console.error(e); process.exit(1); });