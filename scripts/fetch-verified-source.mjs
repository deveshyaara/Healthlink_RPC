#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'src', 'verified-healthlink.sol');

function usage() {
  console.log(`Usage: node scripts/fetch-verified-source.mjs --address <CONTRACT_ADDRESS>`);
  process.exit(1);
}

function findArg(name) {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf(name);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  return null;
}

async function main() {
  const address = findArg('--address') || findArg('-a');
  if (!address) usage();

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ETHERSCAN_API_KEY environment variable is not set.');
    process.exit(2);
  }

  // Use Etherscan API V2 unified endpoint. Provide chainid (11155111 = Sepolia) unless overridden
  const CHAINID = process.env.CHAINID || '11155111';
  const baseV2 = 'https://api.etherscan.io/v2/api';
  const paramsV2 = new URLSearchParams({
    chainid: CHAINID,
    module: 'contract',
    action: 'getsourcecode',
    address: address,
    apikey: apiKey
  });
  const urlV2 = `${baseV2}?${paramsV2.toString()}`;

  console.log('Querying Etherscan V2 for address', address, '(chainid=' + CHAINID + ')');

  let resp;
  try {
    resp = await fetch(urlV2);
  } catch (err) {
    console.error('Network error while calling Etherscan V2:', err.message || err);
    process.exit(3);
  }

  if (!resp.ok) {
    console.error('Etherscan HTTP error:', resp.status, resp.statusText);
    process.exit(3);
  }

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    console.error('Failed to parse JSON response from Etherscan:', err.message || err);
    process.exit(3);
  }

  // Some legacy responses may contain a deprecation notice. If so, try an alternative V2 fallback construction
  if (json && json.status === '0' && typeof json.result === 'string' && json.result.includes('deprecated')) {
    console.log('Etherscan reported deprecated V1 endpoint; retrying using alternate V2 path...');
    // Alternate: call the chain-specific API host if needed
    const alt = `https://api-sepolia.etherscan.io/v2/api?chainid=${CHAINID}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    try {
      const resp2 = await fetch(alt);
      if (!resp2.ok) { console.error('Etherscan HTTP error on alt:', resp2.status, resp2.statusText); process.exit(3); }
      json = await resp2.json();
    } catch (err) {
      console.error('Retry failed:', err.message || err); process.exit(3);
    }
  }

  if (!json || !Array.isArray(json.result)) {
    console.error('Unexpected Etherscan response shape:', JSON.stringify(json));
    process.exit(4);
  }

  // Prefer an entry named HealthLink if present
  let entry = json.result.find(r => r.ContractName === 'HealthLink') || json.result[0];
  if (!entry) {
    console.error('No contract entry found in Etherscan result.');
    process.exit(5);
  }

  const { SourceCode, CompilerVersion, ContractName } = entry;

  if (!SourceCode || SourceCode.trim() === '' || SourceCode.includes('Contract source code not verified')) {
    console.warn('WARNING: Contract not verified on Etherscan (no source). Check git history or deployment artifacts for the deployed implementation.');
    process.exit(0);
  }

  let output = `// Verified source fetched from Etherscan (Sepolia) for ${address}\n`;
  output += `// ContractName: ${ContractName || 'unknown'}\n`;
  output += `// CompilerVersion: ${CompilerVersion || 'unknown'}\n\n`;

  // SourceCode may be a plain flattened source string OR a JSON wrapper with sources
  let sc = SourceCode.trim();

  // Etherscan sometimes returns a JSON string but wrapped with extra braces. Try to parse safely.
  let parsed = null;
  if (sc.startsWith('{') || sc.startsWith('{{')) {
    try {
      // Some responses double-wrap JSON with an extra leading brace; try a couple of normalizations
      let tryStr = sc;
      try {
        parsed = JSON.parse(tryStr);
      } catch (e1) {
        // If starts with '{{', try removing one leading/trailing brace
        if (tryStr.startsWith('{{') && tryStr.endsWith('}}')) {
          tryStr = tryStr.slice(1, -1);
          try { parsed = JSON.parse(tryStr); } catch (e2) { parsed = null; }
        }
      }
    } catch (err) {
      parsed = null;
    }
  }

  if (parsed && parsed.sources && typeof parsed.sources === 'object') {
    // Multi-file input (solc-standard-json): combine files with headers
    for (const [fname, fileDesc] of Object.entries(parsed.sources)) {
      let content = null;
      if (typeof fileDesc === 'string') content = fileDesc;
      else content = fileDesc.content || '';
      output += `// ===== File: ${fname} =====\n`;
      output += content + '\n\n';
    }
  } else {
    // Not JSON "sources" form — treat as flattened source
    // Some Etherscan responses place the raw source directly in SourceCode
    // If SourceCode contains multiple files separated by '=====' or SPDX markers, just save as-is
    output += sc + '\n';
  }

  // Ensure output directory exists
  const outDir = path.dirname(OUT_PATH);
  try { await fs.mkdir(outDir, { recursive: true }); } catch (e) { /* ignore */ }

  await fs.writeFile(OUT_PATH, output, 'utf8');
  console.log('Saved verified source to', OUT_PATH);

  console.log('\nNext: run `git --no-pager diff --no-index src/HealthLink.sol src/verified-healthlink.sol` or `diff src/HealthLink.sol src/verified-healthlink.sol` to inspect differences.');
  console.log('If the contract is not verified, check deployment CI artifacts or your git history for the deployed implementation.');
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(10); });