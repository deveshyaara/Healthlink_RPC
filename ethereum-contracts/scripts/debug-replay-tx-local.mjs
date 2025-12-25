import hre from 'hardhat';
import { ethers as Ethers } from 'ethers';

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
  const txHash = process.env.TX_HASH;
  if (!txHash) {
    console.error('Set TX_HASH env var. Example: $env:TX_HASH="0x..."; npx hardhat run scripts/debug-replay-tx-local.mjs --network hardhat');
    process.exit(1);
  }

  const RPC = process.env.ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/your_key';
  console.log('\n🔧 Local debug replay (inside ethereum-contracts)');
  console.log('RPC (live):', RPC);
  console.log('txHash:', txHash);

  const liveProvider = new Ethers.JsonRpcProvider(RPC);
  const tx = await liveProvider.getTransaction(txHash);
  if (!tx) {
    console.error('Transaction not found on the provided RPC.');
    process.exit(1);
  }

  // Try to decode the input using the compiled contract ABI if available
  try {
    const hf = await hre.ethers.getContractFactory('HealthLink');
    const parsed = hf.interface.parseTransaction({ data: tx.data });
    console.log('Decoded function:', parsed.name);
    console.log('Decoded args:', parsed.args);
  } catch (dErr) {
    console.log('Failed to decode input with HealthLink ABI:', dErr.message || dErr);
  }

  if (!tx.blockNumber) {
    console.error('Transaction not yet mined (no blockNumber).');
    process.exit(1);
  }

  console.log('Original tx', { from: tx.from, to: tx.to, value: tx.value?.toString(), gasLimit: tx.gasLimit?.toString(), blockNumber: tx.blockNumber });
  const forkBlock = Math.max(1, tx.blockNumber - 1);

  console.log('Forking at block', forkBlock);
  await hre.network.provider.request({ method: 'hardhat_reset', params: [{ forking: { jsonRpcUrl: RPC, blockNumber: forkBlock } }] });

  const localProvider = hre.ethers.provider;
  const block = await localProvider.getBlock('latest');
  console.log('Local latest block:', block.number);

  const sender = tx.from;
  console.log('Impersonating', sender);
  await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [sender] });
  await hre.network.provider.request({ method: 'hardhat_setBalance', params: [sender, '0x8AC7230489E80000'] });

  const signer = localProvider.getSigner(sender);
  // Simulate
  console.log('\nSimulating provider.call...');
  try {
    const callRes = await localProvider.call({ from: sender, to: tx.to, data: tx.data, value: tx.value?.toString(), gasLimit: tx.gasLimit?.toString() });
    if (callRes && callRes !== '0x') {
      console.log('provider.call returned:', callRes);
      console.log('Decoded:', decodeRevertData(callRes));
    } else {
      console.log('provider.call returned no revert/data (would succeed)');
    }
  } catch (err) {
    console.error('provider.call error:', err.message || err);
    const raw = err?.data || err?.reason || err?.message || null;
    if (typeof raw === 'string' && raw.startsWith('0x')) console.log('Decoded revert:', decodeRevertData(raw));
  }

  // Replay
  console.log('\nReplaying transaction locally...');
  try {
    // Prefer raw eth_sendTransaction with impersonated account to avoid signer limitations
    const txParams = { from: sender, to: tx.to, data: tx.data };
    if (tx.gasLimit) txParams.gas = '0x' + BigInt(tx.gasLimit.toString()).toString(16);
    if (tx.value && tx.value !== '0') txParams.value = '0x' + BigInt(tx.value.toString()).toString(16);

    const txHash = await localProvider.send('eth_sendTransaction', [txParams]);
    console.log('Sent eth_sendTransaction ->', txHash);

    const receipt = await localProvider.waitForTransaction(txHash);
    console.log('Local receipt:', { status: receipt?.status, gasUsed: receipt?.gasUsed?.toString() });

    if (receipt && receipt.status === 0) {
      console.error('Local tx reverted; fetching trace...');
      try {
        const trace = await localProvider.send('debug_traceTransaction', [txHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('Trace failed:', tErr.message || tErr);
      }
    } else if (receipt && receipt.status === 1) {
      console.log('The transaction SUCCEEDED on the fork — environment-specific issue likely.');
    } else {
      console.warn('No receipt or unexpected receipt:', receipt);
    }
  } catch (err) {
    console.error('Replay error (full):', err);
    try {
      console.error('Replay error (json):', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch (e) {
      /* ignore */
    }

    const raw = err?.error?.data || err?.data || err?.reason || err?.message || null;
    if (typeof raw === 'string' && raw.startsWith('0x')) {
      console.log('Decoded revert data:', decodeRevertData(raw));
    }

    // If there is a transactionHash in the error, try to fetch a trace anyway
    const possibleTxHash = err?.transactionHash || (err?.error && err.error.transactionHash) || null;
    if (possibleTxHash) {
      console.log('Found transaction hash in error:', possibleTxHash, 'attempting trace...');
      try {
        const trace = await localProvider.send('debug_traceTransaction', [possibleTxHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('Trace from error txHash failed:', tErr.message || tErr);
      }
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });