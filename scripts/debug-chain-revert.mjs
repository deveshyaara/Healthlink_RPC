let transactionService;
let ethereumService;
let ethers;

// Prefer importing services relative to repository root (when executed from repo root),
// fall back to paths relative to `middleware-api` (when executed from that folder).
try {
  ({ default: transactionService } = await import('../middleware-api/src/services/transaction.service.js'));
  ({ default: ethereumService } = await import('../middleware-api/src/services/ethereum.service.js'));
} catch (err) {
  // Try local paths (execute this script from middleware-api folder)
  ({ default: transactionService } = await import('./src/services/transaction.service.js'));
  ({ default: ethereumService } = await import('./src/services/ethereum.service.js'));
}



function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((a) => {
    const [k, v] = a.split('=');
    if (k && v) args[k.replace(/^--/, '')] = v;
  });
  return args;
}

function decodeRevertData(data, contract) {
  if (!data) return null;
  try {
    // Common Solidity Error(string) selector (0x08c379a0)
    if (data.startsWith('0x08c379a0')) {
      // data layout after selector:
      // 4 bytes selector | 32 bytes offset | 32 bytes length | string bytes
      const hex = data.slice(10); // remove 0x and selector (8 chars)
      const offsetHex = hex.slice(0, 64);
      const lenHex = hex.slice(64, 128);
      const len = parseInt(lenHex, 16);
      const strHex = hex.slice(128, 128 + len * 2);
      try {
        const buf = Buffer.from(strHex, 'hex');
        return buf.toString('utf8');
      } catch (e) {
        return `Revert string decode failed: ${e.message}`;
      }
    }

    // Try to use contract interface to parse custom errors (if available)
    try {
      if (contract && contract.interface && typeof contract.interface.parseError === 'function') {
        const parsed = contract.interface.parseError(data);
        return `${parsed.name} ${JSON.stringify(parsed.args)}`;
      }
    } catch (e) {
      // fallback
    }

    return `Unknown revert data: ${data}`;
  } catch (err) {
    return `Failed to decode revert data: ${err.message}`;
  }
}

// Small helper to produce a random hex address-like string (prefix omitted)
function cryptoRandomHex(bytes = 20) {
  // returns hex string of `bytes` length (e.g., 20 bytes -> 40 hex chars)
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    // fallback to Math.random
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const argv = parseArgs();

  const RPC_URL = argv.rpc || process.env.ETHEREUM_RPC_URL || 'https://rpc.sepolia.org';
  const PRIVATE_KEY = argv.privateKey || process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || process.env.DOCTOR_PRIVATE_KEY;
  const patientIdArg = argv.patientId || process.env.PATIENT_ID || `debug-patient-${Date.now()}`;
  const appointmentIdArg = argv.appointmentId || `debug-apt-${Date.now()}`;
  const doctorIdArg = argv.doctorId || process.env.DOCTOR_ID || null; // if null, we'll use signer address (string)
  const createPatientIfMissing = (argv.createPatient === 'true') || (process.env.CREATE_PATIENT === 'true');

  if (!PRIVATE_KEY) {
    console.warn('WARNING: No private key provided. Attempting to use provider signer (may not be available on remote RPC).');
  }

  console.log('\n🔧 Debugging createAppointment revert');
  console.log('RPC:', RPC_URL);
  console.log('Using private key?:', !!PRIVATE_KEY);
  console.log('PatientId:', patientIdArg);
  console.log('AppointmentId:', appointmentIdArg);

  // Initialize services
  await ethereumService.initialize(RPC_URL, PRIVATE_KEY || null);

  const signerAddress = await ethereumService.getSignerAddress();
  console.log('\n👤 Signer Address:', signerAddress);

  // Contracts
  const appointments = ethereumService.getContract('Appointments');
  const healthLink = ethereumService.getContract('HealthLink');

  if (!appointments) {
    console.error('Could not load Appointments contract. Check deployment-addresses.json and artifacts.');
    process.exit(1);
  }

  // ROLE checks
  console.log('\n🔎 Role checks');
  try {
    const DOCTOR_ROLE = await appointments.DOCTOR_ROLE();
    const ADMIN_ROLE = await appointments.ADMIN_ROLE();
    const PATIENT_ROLE = await appointments.PATIENT_ROLE();

    const isDoctor = await appointments.hasRole(DOCTOR_ROLE, signerAddress);
    const isAdmin = await appointments.hasRole(ADMIN_ROLE, signerAddress);
    const isPatient = await appointments.hasRole(PATIENT_ROLE, signerAddress);

    console.log('DOCTOR_ROLE:', DOCTOR_ROLE);
    console.log('ADMIN_ROLE :', ADMIN_ROLE);
    console.log('PATIENT_ROLE:', PATIENT_ROLE);
    console.log('Signer has roles -> doctor:', isDoctor, ', admin:', isAdmin, ', patient:', isPatient);
  } catch (err) {
    console.warn('Role check failed:', err.message || err);
  }

  // Inspect contract bytecode (detect proxies or thin deployments)
  try {
    const code = await ethereumService.provider.getCode(healthLink.target || healthLink.address);
    console.log('HealthLink bytecode length:', code?.length || 0);
    console.log('HealthLink bytecode prefix:', (code || '').slice(0, 200));
  } catch (e) {
    console.warn('Failed to fetch HealthLink bytecode:', e.message || e);
  }

  // Patient existence
  console.log('\n🔎 Patient existence check');
  let patientExists = false;
  try {
    const patient = await healthLink.getPatient(patientIdArg);
    patientExists = Boolean(patient?.exists);
    console.log('On-chain patient.exists:', patientExists, ' | patientId:', patient.patientId || 'N/A');
  } catch (err) {
    console.warn('getPatient call failed:', err.message || err);
  }

  // Helper: simulate createPatient via low-level call
  async function simulateCreatePatient(pId, _name, _age, _gender, _ipfs, fromAddr) {
    const encoded = healthLink.interface.encodeFunctionData('createPatient', [pId, _name, _age, _gender, _ipfs]);
    const from = fromAddr || signerAddress;
    const callTx = { from, to: healthLink.target || healthLink.address, data: encoded };

    // Primary: basic eth_call
    try {
      const callResult = await ethereumService.provider.call(callTx);
      if (callResult && callResult !== '0x') {
        console.log(`Provider.call returned data for createPatient(${pId}):`, callResult);
        try {
          // Attempt to parse as normal result
          const decoded = healthLink.interface.decodeFunctionResult('createPatient', callResult);
          console.log('Decoded success result:', decoded);
        } catch (e) {
          console.log('Could not decode as success — treat as revert payload');
          console.log('Decoded revert data:', decodeRevertData(callResult, healthLink));
        }
      } else {
        console.log(`Provider.call simulation for createPatient(${pId}) returned no revert and no data — call would succeed from ${from}`);
      }
      return;
    } catch (err) {
      // If primary call failed, try again with explicit gas limit (sometimes nodes behave differently)
      console.log(`Primary call error for createPatient(${pId}):`, err.message || err);
      try {
        const callWithGas = { ...callTx, gas: 1_000_000 };
        const callResult = await ethereumService.provider.call(callWithGas);
        if (callResult && callResult !== '0x') {
          console.log(`Provider.call (with gas limit) returned data for createPatient(${pId}):`, callResult);
          try {
            const decoded = healthLink.interface.decodeFunctionResult('createPatient', callResult);
            console.log('Decoded success result (gas call):', decoded);
          } catch (e) {
            console.log('Decoded revert data (gas call):', decodeRevertData(callResult, healthLink));
          }
        } else {
          console.log(`Provider.call (with gas) for createPatient(${pId}) returned no revert and no data — call would succeed from ${from}`);
        }
        return;
      } catch (err2) {
        console.log(`Call with gas also failed for createPatient(${pId}):`, err2.message || err2);

        // Try explicit blockTag variants
        try {
          const callPending = await ethereumService.provider.call(callTx, 'pending');
          if (callPending && callPending !== '0x') {
            console.log('Provider.call (pending) returned data:', callPending);
            console.log('Decoded (pending):', decodeRevertData(callPending, healthLink));
            return;
          }
        } catch (ePending) {
          console.log('Provider.call (pending) error:', ePending.message || ePending);
        }

        try {
          const callLatest = await ethereumService.provider.call(callTx, 'latest');
          if (callLatest && callLatest !== '0x') {
            console.log('Provider.call (latest explicit) returned data:', callLatest);
            console.log('Decoded (latest):', decodeRevertData(callLatest, healthLink));
            return;
          }
        } catch (eLatest) {
          console.log('Provider.call (latest) error:', eLatest.message || eLatest);
        }

        // As another fallback, try contract.callStatic (if available) — this may include revert reasons
        try {
          if (healthLink.callStatic && typeof healthLink.callStatic.createPatient === 'function') {
            await healthLink.callStatic.createPatient(pId, _name, _age, _gender, _ipfs, { from });
            console.log('callStatic succeeded (unexpected).');
          } else {
            console.log('callStatic unavailable for createPatient on this contract instance.');
          }
        } catch (csErr) {
          const csData = csErr?.data || csErr?.reason || csErr?.message || null;
          if (typeof csData === 'string' && csData.startsWith('0x')) {
            console.log('callStatic revert data:', csData);
            console.log('Decoded callStatic revert:', decodeRevertData(csData, healthLink));
          } else {
            console.log('callStatic error:', csErr.message || csErr);
          }
        }

        // If all attempts failed, surface the original error
        console.log(`Final error for createPatient(${pId}):`, err.message || err);
      }
    }
  }

  // Optionally run probes to isolate createPatient revert causes
  const runProbes = argv.runProbes === 'true' || argv.probe === '1' || argv.probe === 'true';
  if (runProbes) {
    console.log('\n🧪 Running createPatient probes (duplicate id, empty fields, role variations)');

    // Probe 0: current payload (re-run simulation to capture detailed revert if any)
    const name = argv.name || 'Debug Patient';
    const age = Number(argv.age || 30);
    const gender = argv.gender || 'unknown';
    const ipfs = argv.ipfs || '';
    console.log('\nProbe 0: current patientId simulation');
    await simulateCreatePatient(patientIdArg, name, age, gender, ipfs);

    // Probe 1: Duplicate check with random id (should succeed if duplicate id was the reason)
    const randId = `probe-rand-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    console.log('\nProbe 1: random patientId simulation (duplicate check) ->', randId);
    await simulateCreatePatient(randId, name, age, gender, ipfs);

    // Probe 2: Empty payloads (name empty should trigger "name required")
    console.log('\nProbe 2: empty name simulation (should revert with name required)');
    await simulateCreatePatient(`probe-emptyname-${Date.now()}`, '', age, gender, ipfs);

    // Probe 2b: empty ipfs / gender variations
    console.log('\nProbe 2b: empty ipfs (likely OK)');
    await simulateCreatePatient(`probe-emptyipfs-${Date.now()}`, name, age, gender, '');

    // Probe 3: Role variations — simulate from an address with no known roles
    const randomAddr = '0x' + cryptoRandomHex(20);
    console.log('\nProbe 3: simulate from random address (no roles) ->', randomAddr);
    await simulateCreatePatient(`probe-role-${Date.now()}`, name, age, gender, ipfs, randomAddr);

    // Additionally simulate from zero address (edge case)
    console.log('\nProbe 3b: simulate from zero address (edge-case)');
    await simulateCreatePatient(`probe-zaddr-${Date.now()}`, name, age, gender, ipfs, '0x0000000000000000000000000000000000000000');
  }

  // Continue: create patient on-chain if missing and user requested it
  if (!patientExists && createPatientIfMissing) {
    console.log('Patient not found, creating patient on-chain (this will send a transaction).');
    try {
      const name = argv.name || 'Debug Patient';
      const age = Number(argv.age || 30);
      const gender = argv.gender || 'unknown';
      const ipfs = argv.ipfs || '';

      const res = await transactionService.createPatient(patientIdArg, name, age, gender, ipfs);
      console.log('createPatient result:', res);
      // re-check
      const patient = await healthLink.getPatient(patientIdArg);
      patientExists = Boolean(patient?.exists);
      console.log('New patient.exists:', patientExists);
    } catch (err) {
      console.error('Failed to create patient:', err.message || err);
    }
  }

  if (!patientExists) {
    console.warn('Patient does not exist on-chain. You can set --createPatient=true or create one first. Aborting before attempting createAppointment.');
    // We won't abort outright; user might be trying to test failure path too. Continue but marked.
  }

  // Prepare appointment parameters
  const appointmentId = appointmentIdArg;
  const patientId = patientIdArg;
  const doctorId = doctorIdArg || signerAddress;
  const futureTimestamp = Math.floor(Date.now() / 1000) + Number(argv.offset || 3600); // seconds
  const reason = argv.reason || 'debug - test appointment';
  const notes = argv.notes || '';

  console.log('\n📋 Appointment payload');
  console.log({ appointmentId, patientId, doctorId, appointmentDate: futureTimestamp, reason, notes });

  // Check for appointment existence
  try {
    const exists = await appointments.appointmentExists(appointmentId);
    console.log('appointmentExists:', exists);
    if (exists) {
      console.warn('Appointment id already exists on-chain. Use a different appointmentId to avoid "already exists" revert.');
    }
  } catch (err) {
    console.warn('appointmentExists check failed (this contract may not implement it):', err.message || err);
  }

  // Check timestamp vs block.timestamp
  try {
    const latest = await ethereumService.provider.getBlock('latest');
    console.log('Latest block timestamp:', Number(latest.timestamp), ' (now + offset):', futureTimestamp);
    if (futureTimestamp <= Number(latest.timestamp)) {
      console.warn('Appointment timestamp is not in the future relative to latest block timestamp. This will revert.');
    }
  } catch (err) {
    console.warn('Failed to fetch latest block timestamp:', err.message || err);
  }

  // Deep inspection: simulate with low-level eth_call (specifying from) so msg.sender is correct
  console.log('\n🔬 Simulating with provider.call to inspect revert reason (no gas consumed, using signer as from)');
  try {
    const encoded = appointments.interface.encodeFunctionData('createAppointment', [appointmentId, patientId, doctorId, futureTimestamp, reason, notes]);
    const callResult = await ethereumService.provider.call({ from: signerAddress, to: appointments.target || appointments.address, data: encoded });

    if (callResult && callResult !== '0x') {
      // Non-empty return data — try decoding as a normal result
      console.log('Provider.call returned data:', callResult);
      try {
        const decoded = appointments.interface.decodeFunctionResult('createAppointment', callResult);
        console.log('Provider.call decoded result:', decoded);
      } catch (decErr) {
        console.log('Provider.call returned data but decode failed (may be revert payload):', decErr.message || decErr);
        // If decode failed, attempt to treat it as revert data
        console.error('Decoded revert data (fallback):', decodeRevertData(callResult, appointments));
      }
    } else {
      console.log('Provider.call simulation returned no revert and no data (likely void return) — call would succeed from signer address');

      // Also attempt callStatic with from override to confirm (some environments expose richer errors)
      if (appointments.callStatic && typeof appointments.callStatic.createAppointment === 'function') {
        try {
          const csRes = await appointments.callStatic.createAppointment(appointmentId, patientId, doctorId, futureTimestamp, reason, notes, { from: signerAddress });
          console.log('callStatic (with from override) succeeded:', csRes);
        } catch (csErr) {
          const csData = csErr?.data || csErr?.error?.data || csErr?.reason || csErr?.message || null;
          console.error('callStatic (with from) error after provider simulation succeeded:', (typeof csData === 'string' && csData.startsWith('0x')) ? decodeRevertData(csData, appointments) : csData || csErr.message || String(csErr));
        }
      }
    }
  } catch (callErr) {
    // Error from eth_call — likely a revert with data available on callErr.data
    const callData = callErr?.data || callErr?.reason || callErr?.message || null;
    if (typeof callData === 'string' && callData.startsWith('0x')) {
      console.error('Provider.call revert data:', callData);
      console.error('Decoded revert data:', decodeRevertData(callData, appointments));
    } else {
      console.error('Provider.call failed:', callErr.message || callErr);
    }

    // As a fallback, also try callStatic if available (may provide richer error in some setups)
    if (appointments.callStatic && typeof appointments.callStatic.createAppointment === 'function') {
      try {
        const staticResult = await appointments.callStatic.createAppointment(appointmentId, patientId, doctorId, futureTimestamp, reason, notes, { from: signerAddress });
        console.log('callStatic succeeded (fallback):', staticResult);
      } catch (err) {
        const data = err?.data || err?.error?.data || err?.reason || err?.message || null;
        console.error('callStatic fallback error reason:', (typeof data === 'string' && data.startsWith('0x')) ? decodeRevertData(data, appointments) : data || err.message || String(err));
      }
    }

    // Stop here if simulation indicates it will revert — still we can try a transaction if desired
  }

  // Attempt to send an actual transaction (this will spend gas if it goes through)
  console.log('\n🚀 Attempting to send createAppointment transaction (will be queued by EthereumService.sendTransaction)');
  try {
    const txResult = await ethereumService.createAppointment(appointmentId, patientId, doctorId, futureTimestamp, reason, notes);
    console.log('Transaction succeeded:', txResult);
  } catch (txErr) {
    console.error('Transaction failed. Inspecting error details...');
    console.error('Error message:', txErr.message || txErr);
    if (txErr.reason) console.error('Error.reason:', txErr.reason);
    if (txErr.data) console.error('Error.data:', txErr.data);

    // If the error has a receipt or revert info, print it
    if (txErr.transaction) console.error('Transaction object:', txErr.transaction);
    if (txErr.receipt) console.error('Receipt:', txErr.receipt);

    // Try to decode any data embedded in the error
    const raw = txErr?.data || txErr?.error?.data || txErr?.reason;
    if (typeof raw === 'string' && raw.startsWith('0x')) {
      console.error('Decoded revert reason (from tx error):', decodeRevertData(raw, appointments));
    }
  }

  console.log('\n✅ Done. Summary: Reviewed role membership, patient existence, simulated transaction (callStatic) and attempted on-chain transaction.');
  console.log('Run this script with:');
  console.log("  ETHEREUM_RPC_URL=... PRIVATE_KEY=... node scripts/debug-chain-revert.mjs --patientId=yourPatientId --appointmentId=yourAptId --createPatient=true\n");
}

main().catch(err => {
  console.error('Fatal error in debug script:', err.message || err);
  process.exit(1);
});
