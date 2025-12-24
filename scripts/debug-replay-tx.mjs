import hre from 'hardhat';
import { ethers as Ethers } from 'ethers';

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((a) => {
    const [k, v] = a.split('=');
    if (k) args[k.replace(/^--/, '')] = v === undefined ? true : v;
  });
  return args;
}

function decodeRevertData(data) {
  if (!data) return null;
  try {
    if (typeof data !== 'string') data = String(data);
    if (data.startsWith('0x08c379a0')) {
      const hex = data.slice(10);
      const lenHex = hex.slice(64, 128);
      const len = parseInt(lenHex, 16);
      const strHex = hex.slice(128, 128 + len * 2);
      return Buffer.from(strHex, 'hex').toString('utf8');
    }
    return `Unknown revert data: ${data}`;
  } catch (err) {
    return `Failed to decode revert data: ${err.message}`;
  }
}

async function main() {
  const argv = parseArgs();
  const txHash = argv.txHash || argv.txhash || process.env.TX_HASH || process.env.TXHASH;
  if (!txHash) {
    console.error('Usage: set TX_HASH env or pass --txhash=<txHash>. Example:');
    console.error("  $env:TX_HASH='0x..' ; npx hardhat run scripts/debug-replay-tx.mjs --network hardhat");
    process.exit(1);
  }

  const RPC = process.env.ETHEREUM_RPC_URL || argv.rpc || 'https://eth-sepolia.g.alchemy.com/v2/yourkey';
  console.log('\n🔧 Debug replay script');
  console.log('RPC (live):', RPC);
  console.log('txHash:', txHash);

  // Connect to live Sepolia (or provided RPC) to fetch transaction
  const liveProvider = new Ethers.JsonRpcProvider(RPC);

  console.log('Fetching transaction details from live RPC...');
  const tx = await liveProvider.getTransaction(txHash);
  if (!tx) {
    console.error('Transaction not found on the provided RPC. Check txHash and RPC URL.');
    process.exit(1);
  }

  if (!tx.blockNumber) {
    console.error('Transaction is not yet mined (no blockNumber). Cannot replay a pending tx via this script.');
    process.exit(1);
  }

  console.log('Original tx details:');
  console.log({ from: tx.from, to: tx.to, value: tx.value?.toString(), gasLimit: tx.gasLimit?.toString(), data: tx.data, blockNumber: tx.blockNumber });

  const forkBlock = Math.max(1, tx.blockNumber - 1);
  console.log('\n⏳ Forking local Hardhat network at block', forkBlock);

  // Reset hardhat network to fork at blockNumber - 1
  await hre.network.provider.request({
    method: 'hardhat_reset',
    params: [{
      forking: {
        jsonRpcUrl: RPC,
        blockNumber: forkBlock
      }
    }]
  });

  console.log('Fork configured. Verifying chain state...');
  const localProvider = hre.ethers.provider;
  const block = await localProvider.getBlock('latest');
  console.log('Local fork latest block:', block.number);

  // Impersonate account
  const sender = tx.from;
  console.log('\n🕵️ Impersonating original sender:', sender);
  await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [sender] });

  // Ensure balance
  const balanceHex = '0x8AC7230489E80000'; // 1e18 wei (1 ETH)
  console.log('Setting balance for impersonated account to 1 ETH');
  await hre.network.provider.request({ method: 'hardhat_setBalance', params: [sender, balanceHex] });

  // Obtain signer
  const signer = localProvider.getSigner(sender);

  // Re-simulate with provider.call
  console.log('\n🔬 Simulating original transaction with provider.call');
  try {
    const callRes = await localProvider.call({ from: sender, to: tx.to, data: tx.data, value: tx.value?.toString(), gasLimit: tx.gasLimit?.toString() });
    if (callRes && callRes !== '0x') {
      console.log('provider.call returned data:', callRes);
      console.log('Decoded revert/return:', decodeRevertData(callRes));
    } else {
      console.log('provider.call returned no revert/data — call would succeed (simulation)');
    }
  } catch (err) {
    console.error('provider.call simulation errored:', err.message || err);
    const raw = err?.data || err?.reason || err?.message || null;
    if (typeof raw === 'string' && raw.startsWith('0x')) console.log('Decoded simulation revert:', decodeRevertData(raw));
  }

  // Now resend the exact transaction locally
  console.log('\n🚀 Replaying transaction locally');
  try {
    const txResponse = await signer.sendTransaction({ to: tx.to, data: tx.data, value: tx.value || 0n, gasLimit: tx.gasLimit || undefined });
    console.log('Local tx sent:', txResponse.hash);
    const receipt = await txResponse.wait();
    console.log('Local receipt:', { status: receipt.status, gasUsed: receipt.gasUsed?.toString() });

    if (receipt.status === 0) {
      console.error('Transaction reverted locally. Attempting to extract trace and revert data...');
      try {
        const trace = await localProvider.send('debug_traceTransaction', [txResponse.hash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('debug_traceTransaction failed:', tErr.message || tErr);
      }
    } else {
      console.log('The transaction SUCCEEDED on the fork — environment-specific issue likely.');
    }
  } catch (err) {
    console.error('Replay transaction threw:', err);
    // Try to decode revert data if present
    const raw = err?.error?.data || err?.data || err?.reason || err?.message || null;
    if (typeof raw === 'string' && raw.startsWith('0x')) {
      console.error('Decoded revert data:', decodeRevertData(raw));
    }

    // If we have a tx hash from the error, try trace
    const possibleHash = err?.transactionHash || err?.receipt?.transactionHash;
    if (possibleHash) {
      try {
        const trace = await localProvider.send('debug_traceTransaction', [possibleHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('Trace request failed:', tErr.message || tErr);
      }
    }
  }

  console.log('\n✅ Replay complete');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});