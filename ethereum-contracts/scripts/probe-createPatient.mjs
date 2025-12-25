import hre from 'hardhat';

async function main() {
  const provider = hre.ethers.provider;

  // Simple revert decoder (solidity Error(string) selector)
  function decodeRevertData(data) {
    if (!data) return null;
    try {
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

  // Basic arg parsing: --attach to attach to deployed Sepolia address and impersonate deployer
  const args = process.argv.slice(2).reduce((acc, cur) => {
    const [k, v] = cur.split('=');
    acc[k.replace(/^--/, '')] = v === undefined ? true : v;
    return acc;
  }, {});

  let signer = (await hre.ethers.getSigners())[0];
  let healthLink;

  if (args.attach || process.env.ATTACH === 'true') {
    // Attach mode: use the deployment on Sepolia and impersonate the deployer address
    console.log('Attach mode: forking Sepolia and impersonating deployer from deployment-addresses.json');
    // Use fs to read JSON to avoid import assertion issues in some Node versions
    const fs = await import('fs');
    const addressesRaw = fs.readFileSync(new URL('../deployment-addresses.json', import.meta.url), 'utf8');
    const addresses = JSON.parse(addressesRaw);
    const healthLinkAddr = addresses.contracts.HealthLink;
    const impersonateAddr = addresses.deployer;

    console.log('Impersonating', impersonateAddr, 'and attaching to', healthLinkAddr);
    await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [impersonateAddr] });
    signer = provider.getSigner(impersonateAddr);
    healthLink = await hre.ethers.getContractAt('HealthLink', healthLinkAddr, signer);
  } else {
    // Deploy a fresh instance of HealthLink (local test) to capture traces and revert reasons
    signer = (await hre.ethers.getSigners())[0];
    console.log('Deploying HealthLink to local network...');
    const HealthLink = await hre.ethers.getContractFactory('HealthLink', signer);
    healthLink = await HealthLink.deploy(signer.address);
    await healthLink.waitForDeployment && await healthLink.waitForDeployment(); // ethers v6 compatibility
    console.log('HealthLink deployed at', healthLink.target || healthLink.address);
  }

  // Probe inputs
  const patientId = `probe-fork-${Date.now()}`;
  const name = 'Fork Probe';
  const age = 30;
  const gender = 'unknown';
  const ipfs = '';

  console.log('Running callStatic for createPatient (should reveal revert if any)...');
  try {
    const res = await healthLink.callStatic.createPatient(patientId, name, age, gender, ipfs, { from: signer.address });
    console.log('callStatic result:', res);
  } catch (err) {
    console.error('callStatic error:', err);
    if (err?.error?.data) console.error('err.error.data:', err.error.data);
    if (err?.data) console.error('err.data:', err.data);
  }

  console.log('Sending a failing transaction to capture trace...');
  // First attempt: provider.call (simulate) with from override
  let fromAddr;
  if (typeof impersonateAddr !== 'undefined') {
    fromAddr = impersonateAddr;
  } else {
    try {
      fromAddr = await signer.getAddress();
    } catch (e) {
      fromAddr = signer.address || null;
    }
  }

  try {
    const encoded = healthLink.interface.encodeFunctionData('createPatient', [patientId, name, age, gender, ipfs]);
    const callRes = await provider.call({ from: fromAddr, to: healthLink.target || healthLink.address, data: encoded });
    if (callRes && callRes !== '0x') {
      console.log('provider.call returned data (unexpected):', callRes);
      console.log('Decoded:', callRes.startsWith('0x08c379a0') ? decodeRevertData(callRes) : callRes);
    } else {
      console.log('provider.call simulation returned no revert/data — call would succeed (simulation)');
    }

    // Try eth_estimateGas like the live env does
    try {
      const est = await provider.send('eth_estimateGas', [{ from: fromAddr, to: healthLink.target || healthLink.address, data: encoded }]);
      console.log('estimateGas succeeded (hex):', est);
    } catch (egErr) {
      console.error('estimateGas failed:', egErr?.message || egErr);
      const data = egErr?.data || egErr?.reason || egErr?.message || null;
      if (typeof data === 'string' && data.startsWith('0x')) {
        console.log('Decoded estimateGas revert:', decodeRevertData(data));
      }
    }

  } catch (simErr) {
    const data = simErr?.data || simErr?.reason || simErr?.message || null;
    console.error('provider.call simulation error:', data || simErr);
    if (typeof data === 'string' && data.startsWith('0x')) {
      console.log('Decoded simulation revert:', decodeRevertData(data));
    }
  }

  try {
    // Prefer using direct contract call first
    try {
      const tx = await healthLink.createPatient(patientId, name, age, gender, ipfs);
      console.log('TX sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Receipt:', receipt.status, receipt);

      if (receipt && receipt.status === 0) {
        console.log('Transaction reverted on-chain; fetching trace...');
        const trace = await provider.send('debug_traceTransaction', [tx.hash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      }
    } catch (cErr) {
      // Fallback: send raw transaction via eth_sendTransaction (use impersonated account)
      console.warn('healthLink.createPatient call failed to send; falling back to eth_sendTransaction:', cErr.message || cErr);
      const encoded = healthLink.interface.encodeFunctionData('createPatient', [patientId, name, age, gender, ipfs]);
      const txHash = await provider.send('eth_sendTransaction', [{ from: fromAddr, to: healthLink.target || healthLink.address, data: encoded, gas: '0xc3500' }]);
      console.log('eth_sendTransaction txHash:', txHash);
      const receipt = await provider.waitForTransaction(txHash);
      console.log('Receipt:', receipt?.status, receipt);

      if (receipt && receipt.status === 0) {
        console.log('Transaction reverted on-chain; fetching trace...');
        const trace = await provider.send('debug_traceTransaction', [txHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      }
    }
  } catch (txErr) {
    console.error('Transaction error (expected):', txErr);
    if (txErr?.transactionHash) {
      console.log('Has transactionHash:', txErr.transactionHash);
      try {
        const trace = await provider.send('debug_traceTransaction', [txErr.transactionHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('Trace request failed:', tErr);
      }
    } else if (txErr?.receipt?.transactionHash) {
      try {
        const trace = await provider.send('debug_traceTransaction', [txErr.receipt.transactionHash, {}]);
        console.log('Trace:', JSON.stringify(trace, null, 2));
      } catch (tErr) {
        console.error('Trace request failed:', tErr);
      }
    } else {
      console.log('No transaction hash available on error, cannot trace.');
    }
  }
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});