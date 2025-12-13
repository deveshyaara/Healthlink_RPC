import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HealthLink Contract", function () {
  let healthLink;
  let owner, admin, doctor, patient, other;

  beforeEach(async function () {
    [owner, admin, doctor, patient, other] = await ethers.getSigners();
    
    const HealthLink = await ethers.getContractFactory("HealthLink");
    healthLink = await HealthLink.deploy();
    await healthLink.waitForDeployment();

    // Grant roles
    await healthLink.grantAdminRole(admin.address);
    await healthLink.grantDoctorRole(doctor.address);
    await healthLink.grantPatientRole(patient.address);
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      const ADMIN_ROLE = await healthLink.ADMIN_ROLE();
      expect(await healthLink.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should grant doctor role", async function () {
      const DOCTOR_ROLE = await healthLink.DOCTOR_ROLE();
      expect(await healthLink.hasRole(DOCTOR_ROLE, doctor.address)).to.be.true;
    });

    it("Should grant patient role", async function () {
      const PATIENT_ROLE = await healthLink.PATIENT_ROLE();
      expect(await healthLink.hasRole(PATIENT_ROLE, patient.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        healthLink.connect(other).grantDoctorRole(other.address)
      ).to.be.reverted;
    });
  });

  describe("Patient Management", function () {
    it("Should create a patient", async function () {
      const patientId = "patient123";
      const publicData = JSON.stringify({ name: "John Doe", age: 30 });

      await healthLink.connect(admin).createPatient(patientId, publicData);

      const patient = await healthLink.getPatient(patientId);
      expect(patient.patientId).to.equal(patientId);
      expect(patient.exists).to.be.true;
    });

    it("Should not allow duplicate patient creation", async function () {
      const patientId = "patient123";
      const publicData = JSON.stringify({ name: "John Doe" });

      await healthLink.connect(admin).createPatient(patientId, publicData);

      await expect(
        healthLink.connect(admin).createPatient(patientId, publicData)
      ).to.be.revertedWith("Patient already exists");
    });

    it("Should not allow non-admin to create patient", async function () {
      await expect(
        healthLink.connect(other).createPatient("patient123", "{}")
      ).to.be.reverted;
    });
  });

  describe("Record Hash Management", function () {
    beforeEach(async function () {
      const patientId = "patient123";
      const publicData = JSON.stringify({ name: "John Doe" });
      await healthLink.connect(admin).createPatient(patientId, publicData);
    });

    it("Should add record hash as admin", async function () {
      const patientId = "patient123";
      const recordId = "record456";
      const recordHash = "QmHash123...";

      await healthLink.connect(admin).addRecordHash(patientId, recordId, recordHash);

      const retrievedHash = await healthLink.getRecordHash(patientId, recordId);
      expect(retrievedHash).to.equal(recordHash);
    });

    it("Should add record hash as doctor", async function () {
      const patientId = "patient123";
      const recordId = "record456";
      const recordHash = "QmHash123...";

      await healthLink.connect(doctor).addRecordHash(patientId, recordId, recordHash);

      const retrievedHash = await healthLink.getRecordHash(patientId, recordId);
      expect(retrievedHash).to.equal(recordHash);
    });

    it("Should not allow non-authorized to add record hash", async function () {
      await expect(
        healthLink.connect(other).addRecordHash("patient123", "record456", "hash")
      ).to.be.reverted;
    });
  });

  describe("Consent Management", function () {
    beforeEach(async function () {
      const patientId = "patient123";
      const publicData = JSON.stringify({ name: "John Doe" });
      await healthLink.connect(admin).createPatient(patientId, publicData);
    });

    it("Should create consent", async function () {
      const consentId = "consent789";
      const patientId = "patient123";
      const granteeAddress = doctor.address;
      const scope = "medical_records";
      const purpose = "treatment";
      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

      await healthLink.connect(patient).createConsent(
        consentId,
        patientId,
        granteeAddress,
        scope,
        purpose,
        validUntil
      );

      const consent = await healthLink.getConsent(consentId);
      expect(consent.consentId).to.equal(consentId);
      expect(consent.patientId).to.equal(patientId);
      expect(consent.granteeAddress).to.equal(granteeAddress);
    });

    it("Should revoke consent", async function () {
      const consentId = "consent789";
      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30;

      await healthLink.connect(patient).createConsent(
        consentId,
        "patient123",
        doctor.address,
        "records",
        "treatment",
        validUntil
      );

      await healthLink.connect(patient).revokeConsent(consentId);

      const consent = await healthLink.getConsent(consentId);
      expect(consent.status).to.equal(1); // ConsentStatus.Revoked
    });

    it("Should get consents by patient", async function () {
      const patientId = "patient123";
      const validUntil = Math.floor(Date.now() / 1000) + 86400 * 30;

      await healthLink.connect(patient).createConsent(
        "consent1",
        patientId,
        doctor.address,
        "records",
        "treatment",
        validUntil
      );

      await healthLink.connect(patient).createConsent(
        "consent2",
        patientId,
        admin.address,
        "records",
        "research",
        validUntil
      );

      const consents = await healthLink.getConsentsByPatient(patientId);
      expect(consents.length).to.equal(2);
    });
  });

  describe("Audit Trail", function () {
    it("Should create audit records", async function () {
      const patientId = "patient123";
      const publicData = JSON.stringify({ name: "John Doe" });

      await healthLink.connect(admin).createPatient(patientId, publicData);

      const auditRecords = await healthLink.getAuditRecords(10);
      expect(auditRecords.length).to.be.greaterThan(0);
      expect(auditRecords[0].action).to.equal("CreatePatient");
    });
  });
});
