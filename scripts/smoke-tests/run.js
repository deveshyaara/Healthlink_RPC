#!/usr/bin/env node
/**
 * Simple smoke test script for HealthLink Middleware API
 * Usage: node run.js --baseUrl=http://localhost:3001
 *
 * This script performs:
 * - register a test user
 * - login to obtain JWT
 * - upload a small text file to /api/storage/upload
 * - create a medical record using returned hash
 * - fetch medical records
 * - create prescription and appointment
 * - fetch prescriptions and appointments
 */

const args = process.argv.slice(2);
const argMap = {};
args.forEach((a) => {
  const [k, v] = a.split('=');
  argMap[k.replace(/^--/, '')] = v;
});

const BASE = argMap.baseUrl || 'http://localhost:3001';
const API_V1 = `${BASE}/api/v1/healthcare`;
const STORAGE = `${BASE}/api/storage`;

async function http(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = text; }
  return { ok: res.ok, status: res.status, body: json };
}

async function run() {
  console.log('Smoke test start. API base:', BASE);

  // 1) Register
  const testUser = {
    name: 'Smoke Tester',
    email: `smoke+${Date.now()}@example.com`,
    password: 'P@ssw0rd!',
    role: 'patient'
  };

  console.log('Registering user:', testUser.email);
  const reg = await http('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(testUser)
  });
  console.log('Register:', reg.status, reg.ok);

  // 2) Login
  console.log('Logging in');
  const login = await http('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  if (!login.ok) {
    console.error('Login failed:', login.body);
    process.exit(1);
  }
  const token = login.body?.token || login.body?.data?.token;
  if (!token) {
    console.error('No token returned:', login.body);
    process.exit(1);
  }
  console.log('Login ok, token length:', token.length);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3) Upload a small file
  console.log('Uploading small file to storage');
  const fd = new FormData();
  const fileContent = new Blob(["Hello HealthLink"], { type: 'text/plain' });
  fd.append('file', fileContent, 'smoke.txt');

  const upRes = await fetch(`${STORAGE}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  const upJson = await upRes.json().catch(() => null);
  console.log('Upload status', upRes.status, upJson?.data || upJson);
  if (!upRes.ok) { console.error('Upload failed'); process.exit(1); }
  const hash = upJson?.data?.hash || upJson?.hash;
  if (!hash) { console.error('No hash from upload'); process.exit(1); }

  // 4) Create medical record
  console.log('Creating medical record with hash', hash);
  const recordPayload = {
    recordId: `smoke-rec-${Date.now()}`,
    patientId: login.body?.user?.id || login.body?.data?.user?.id || login.body?.userId || testUser.email,
    doctorId: '',
    recordType: 'Lab Report',
    ipfsHash: hash,
    metadata: JSON.stringify({ title: 'Smoke Test', uploadedAt: new Date().toISOString() }),
  };
  const rec = await http('/api/medical-records', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(recordPayload) });
  console.log('Create record:', rec.status, rec.body);

  // 5) Fetch records
  const list = await http('/api/medical-records', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  console.log('List records:', list.status, Array.isArray(list.body) ? list.body.length : list.body);

  // 6) Create prescription
  const presPayload = { prescriptionId: `pres-${Date.now()}`, patientId: recordPayload.patientId, doctorId: '', medications: [{ name: 'TestMed', dosage: '1 tablet', frequency: 'daily', duration: '7d' }] };
  const pres = await http('/api/v1/healthcare/prescriptions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(presPayload) });
  console.log('Create prescription:', pres.status, pres.body);

  // 7) List prescriptions
  const presList = await http('/api/v1/healthcare/prescriptions', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  console.log('Prescriptions list:', presList.status, presList.body?.data ? presList.body.data.length : presList.body);

  // 8) Create appointment (doctor-only path may require doctor role; try create via v1/healthcare/appointments)
  const apptPayload = { appointmentId: `appt-${Date.now()}`, patientId: recordPayload.patientId, doctorAddress: '', timestamp: Math.floor(Date.now()/1000) + 3600 };
  const appt = await http('/api/v1/healthcare/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(apptPayload) });
  console.log('Create appointment:', appt.status, appt.body);

  // 9) List appointments
  const apptList = await http('/api/v1/healthcare/appointments', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  console.log('Appointments list:', apptList.status, apptList.body?.data ? apptList.body.data.length : apptList.body);

  console.log('Smoke test completed');

  // ---- Doctor flow: register a doctor and test doctor-only endpoints ----
  console.log('\nStarting doctor flow...');
  const docUser = {
    name: 'Dr Smoke',
    email: `dr-smoke+${Date.now()}@example.com`,
    password: 'P@ssw0rd!',
    role: 'doctor',
  };
  const regDoc = await http('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(docUser) });
  console.log('Doctor register:', regDoc.status);
  const loginDoc = await http('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: docUser.email, password: docUser.password }) });
  if (!loginDoc.ok) { console.error('Doctor login failed', loginDoc.body); return; }
  const docToken = loginDoc.body?.token || loginDoc.body?.data?.token;
  console.log('Doctor token length:', docToken?.length || 0);

  // Doctor creates a prescription
  const docPresPayload = { prescriptionId: `pres-doc-${Date.now()}`, patientId: recordPayload.patientId, doctorId: loginDoc.body?.data?.user?.id || loginDoc.body?.user?.id || '', medications: [{ name: 'DocMed', dosage: '2 tablets', frequency: 'twice daily', duration: '5d' }] };
  const docPres = await http('/api/v1/healthcare/prescriptions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` }, body: JSON.stringify(docPresPayload) });
  console.log('Doctor create prescription:', docPres.status, docPres.body);

  // Doctor creates an appointment
  const docApptPayload = { appointmentId: `appt-doc-${Date.now()}`, patientId: recordPayload.patientId, doctorAddress: loginDoc.body?.data?.user?.id || loginDoc.body?.user?.id || '', timestamp: Math.floor(Date.now()/1000) + 7200 };
  const docAppt = await http('/api/v1/healthcare/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${docToken}` }, body: JSON.stringify(docApptPayload) });
  console.log('Doctor create appointment:', docAppt.status, docAppt.body);

  // List prescriptions as doctor
  const docPresList = await http('/api/v1/healthcare/prescriptions', { method: 'GET', headers: { Authorization: `Bearer ${docToken}` } });
  console.log('Doctor prescriptions list:', docPresList.status, docPresList.body?.data ? docPresList.body.data.length : docPresList.body);

  // List appointments as doctor
  const docApptList = await http('/api/v1/healthcare/appointments', { method: 'GET', headers: { Authorization: `Bearer ${docToken}` } });
  console.log('Doctor appointments list:', docApptList.status, docApptList.body?.data ? docApptList.body.data.length : docApptList.body);
}

run().catch((err) => { console.error('Smoke test error:', err); process.exit(1); });
