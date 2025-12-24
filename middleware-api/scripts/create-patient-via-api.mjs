import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TOKEN = process.env.DOCTOR_TOKEN;
if (!TOKEN) { console.error('DOCTOR_TOKEN required'); process.exit(1); }

(async function(){
  const email = `int-patient-via-api-${Date.now()}@example.com`;
  const wallet = '0x' + crypto.randomBytes(20).toString('hex').slice(0,40);
  const body = { name: 'Integration Patient', email, walletAddress: wallet };

  const res = await fetch(`${API_BASE}/api/v1/healthcare/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  console.log('status:', res.status);
  console.log('body:', data);
  if (res.ok) {
    console.log('Created patient email:', email, 'wallet:', wallet);
  }
})();