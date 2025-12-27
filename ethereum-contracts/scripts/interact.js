// Quick interaction example with deployed contracts
import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs/promises';

async function main() {
  console.log("🔍 Interacting with deployed HealthLink contracts...\n");

  // Load deployment addresses
  const deployment = JSON.parse(await fs.readFile('deployment-addresses.json', 'utf8'));
  console.log("📋 Loaded deployment from:", deployment.network);
  console.log("Chain ID:", deployment.chainId, "\n");

  // Get signers
  const [owner, admin, doctor, patient] = await ethers.getSigners();
  console.log("👤 Using accounts:");
  console.log("Owner:", owner.address);
  console.log("Admin:", admin.address);
  console.log("Doctor:", doctor.address);
  console.log("Patient:", patient.address, "\n");

  // Load contract ABIs
  const HealthLink = await ethers.getContractFactory("HealthLink");
  const PatientRecords = await ethers.getContractFactory("PatientRecords");

  // Connect to deployed contracts
  const healthLink = HealthLink.attach(deployment.contracts.HealthLink);
  const patientRecords = PatientRecords.attach(deployment.contracts.PatientRecords);

  // Example 1: Create a patient
  console.log("📝 Creating a patient...");
  const patientId = "PAT001";
  const publicData = JSON.stringify({ name: "Rahul Sharma", age: 35 });

  const tx1 = await healthLink.connect(admin).createPatient(patientId, publicData);
  await tx1.wait();
  console.log("✅ Patient created with ID:", patientId);

  // Verify patient exists
  const patient1 = await healthLink.getPatient(patientId);
  console.log("   Data:", JSON.parse(patient1.publicData));
  console.log("   Created at:", new Date(Number(patient1.createdAt) * 1000).toISOString(), "\n");

  // Example 2: Create a medical record
  console.log("📄 Creating a medical record...");
  const recordId = "REC001";
  const ipfsHash = "QmExampleHash123...";
  const metadata = JSON.stringify({ test: "Blood Test", result: "Normal" });

  const tx2 = await patientRecords.connect(doctor).createRecord(
    recordId,
    patientId,
    "DR001",
    "lab_report",
    ipfsHash,
    metadata
  );
  await tx2.wait();
  console.log("✅ Medical record created");

  // Get record
  const record = await patientRecords.getRecord(recordId);
  console.log("   Record ID:", record.recordId);
  console.log("   Type:", record.recordType);
  console.log("   IPFS Hash:", record.ipfsHash);
  console.log("   Metadata:", JSON.parse(record.metadata), "\n");

  // Example 3: Get all patient records
  console.log("📊 Fetching all records for patient...");
  const allRecords = await patientRecords.getRecordsByPatient(patientId);
  console.log("✅ Found", allRecords.length, "record(s)");

  // Example 4: Create consent
  console.log("\n🤝 Creating consent...");
  const consentId = "CONSENT001";
  const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

  const tx3 = await healthLink.connect(patient).createConsent(
    consentId,
    patientId,
    doctor.address,
    "medical_records",
    "treatment",
    validUntil
  );
  await tx3.wait();
  console.log("✅ Consent created");

  const consent = await healthLink.getConsent(consentId);
  console.log("   Grantee:", consent.granteeAddress);
  console.log("   Scope:", consent.scope);
  console.log("   Status:", consent.status === 0 ? "Active" : "Revoked");

  // Example 5: Get audit records
  console.log("\n📜 Fetching recent audit records...");
  const auditRecords = await healthLink.getAuditRecords(5);
  console.log("✅ Found", auditRecords.length, "audit record(s)");
  auditRecords.forEach((audit, i) => {
    console.log(`   ${i + 1}. Action: ${audit.action} by ${audit.actor}`);
  });

  console.log("\n✨ Interaction complete!");
  console.log("\n💡 Contract addresses:");
  console.log("   HealthLink:", deployment.contracts.HealthLink);
  console.log("   PatientRecords:", deployment.contracts.PatientRecords);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
