import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PatientRecords Contract", function () {
  let patientRecords;
  let owner, admin, doctor, patient, other;

  beforeEach(async function () {
    [owner, admin, doctor, patient, other] = await ethers.getSigners();
    
    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    patientRecords = await PatientRecords.deploy();
    await patientRecords.waitForDeployment();

    // Grant roles
    await patientRecords.grantAdminRole(admin.address);
    await patientRecords.grantDoctorRole(doctor.address);
    await patientRecords.grantPatientRole(patient.address);
  });

  describe("Record Creation", function () {
    it("Should create a medical record as doctor", async function () {
      const recordId = "record123";
      const patientId = "patient456";
      const doctorId = "doctor789";
      const recordType = "lab_report";
      const ipfsHash = "QmHash123...";
      const metadata = JSON.stringify({ test: "Blood Test" });

      await patientRecords.connect(doctor).createRecord(
        recordId,
        patientId,
        doctorId,
        recordType,
        ipfsHash,
        metadata
      );

      const record = await patientRecords.getRecord(recordId);
      expect(record.recordId).to.equal(recordId);
      expect(record.patientId).to.equal(patientId);
      expect(record.recordType).to.equal(recordType);
      expect(record.ipfsHash).to.equal(ipfsHash);
      expect(record.exists).to.be.true;
    });

    it("Should create a self-uploaded record as patient", async function () {
      const recordId = "record123";
      const patientId = "patient456";
      const recordType = "self_report";
      const ipfsHash = "QmHash456...";

      await patientRecords.connect(patient).createRecord(
        recordId,
        patientId,
        "",
        recordType,
        ipfsHash,
        ""
      );

      const record = await patientRecords.getRecord(recordId);
      expect(record.doctorId).to.equal("self-uploaded");
    });

    it("Should not allow duplicate record creation", async function () {
      const recordId = "record123";
      await patientRecords.connect(doctor).createRecord(
        recordId,
        "patient456",
        "doctor789",
        "lab",
        "hash",
        ""
      );

      await expect(
        patientRecords.connect(doctor).createRecord(
          recordId,
          "patient456",
          "doctor789",
          "lab",
          "hash",
          ""
        )
      ).to.be.revertedWith("Record already exists");
    });

    it("Should not allow unauthorized users to create records", async function () {
      await expect(
        patientRecords.connect(other).createRecord(
          "record123",
          "patient456",
          "doctor789",
          "lab",
          "hash",
          ""
        )
      ).to.be.reverted;
    });
  });

  describe("Record Retrieval", function () {
    beforeEach(async function () {
      await patientRecords.connect(doctor).createRecord(
        "record1",
        "patient456",
        "doctor789",
        "lab",
        "hash1",
        ""
      );
      await patientRecords.connect(doctor).createRecord(
        "record2",
        "patient456",
        "doctor789",
        "xray",
        "hash2",
        ""
      );
      await patientRecords.connect(doctor).createRecord(
        "record3",
        "patient999",
        "doctor789",
        "lab",
        "hash3",
        ""
      );
    });

    it("Should get records by patient", async function () {
      const records = await patientRecords.getRecordsByPatient("patient456");
      expect(records.length).to.equal(2);
    });

    it("Should get correct patient record count", async function () {
      const count = await patientRecords.getPatientRecordCount("patient456");
      expect(count).to.equal(2);
    });

    it("Should return empty array for patient with no records", async function () {
      const records = await patientRecords.getRecordsByPatient("patient000");
      expect(records.length).to.equal(0);
    });
  });

  describe("Record Updates", function () {
    beforeEach(async function () {
      await patientRecords.connect(doctor).createRecord(
        "record123",
        "patient456",
        "doctor789",
        "lab",
        "hash",
        JSON.stringify({ test: "initial" })
      );
    });

    it("Should update record metadata as doctor", async function () {
      const newMetadata = JSON.stringify({ test: "updated", result: "negative" });

      await patientRecords.connect(doctor).updateRecordMetadata("record123", newMetadata);

      const record = await patientRecords.getRecord("record123");
      expect(record.metadata).to.equal(newMetadata);
    });

    it("Should update record metadata as admin", async function () {
      const newMetadata = JSON.stringify({ test: "admin update" });

      await patientRecords.connect(admin).updateRecordMetadata("record123", newMetadata);

      const record = await patientRecords.getRecord("record123");
      expect(record.metadata).to.equal(newMetadata);
    });

    it("Should not allow non-authorized to update metadata", async function () {
      await expect(
        patientRecords.connect(patient).updateRecordMetadata("record123", "{}")
      ).to.be.reverted;
    });
  });

  describe("Record Deletion", function () {
    beforeEach(async function () {
      await patientRecords.connect(doctor).createRecord(
        "record123",
        "patient456",
        "doctor789",
        "lab",
        "hash",
        ""
      );
    });

    it("Should delete record as admin", async function () {
      await patientRecords.connect(admin).deleteRecord("record123");

      const exists = await patientRecords.recordExists("record123");
      expect(exists).to.be.false;
    });

    it("Should not allow non-admin to delete records", async function () {
      await expect(
        patientRecords.connect(doctor).deleteRecord("record123")
      ).to.be.reverted;
    });

    it("Should remove record from patient's list on deletion", async function () {
      await patientRecords.connect(admin).deleteRecord("record123");

      const records = await patientRecords.getRecordsByPatient("patient456");
      expect(records.length).to.equal(0);
    });
  });

  describe("Statistics", function () {
    it("Should track total records", async function () {
      await patientRecords.connect(doctor).createRecord(
        "record1",
        "patient1",
        "doctor1",
        "lab",
        "hash1",
        ""
      );
      await patientRecords.connect(doctor).createRecord(
        "record2",
        "patient2",
        "doctor1",
        "xray",
        "hash2",
        ""
      );

      const total = await patientRecords.getTotalRecords();
      expect(total).to.equal(2);
    });
  });
});
