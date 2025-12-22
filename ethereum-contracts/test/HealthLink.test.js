import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HealthLink Contract", function () {
  let healthLink;
  let owner, admin, doctor, patient, other;

  beforeEach(async function () {
    [owner, admin, doctor, patient, other] = await ethers.getSigners();
    
    const HealthLink = await ethers.getContractFactory("HealthLink");
    healthLink = await HealthLink.deploy(owner.address);
    await healthLink.waitForDeployment();

    // Grant roles
    await healthLink.addDoctor(doctor.address);
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      const DEFAULT_ADMIN_ROLE = await healthLink.DEFAULT_ADMIN_ROLE();
      expect(await healthLink.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should grant doctor role", async function () {
      const DOCTOR_ROLE = await healthLink.DOCTOR_ROLE();
      expect(await healthLink.hasRole(DOCTOR_ROLE, doctor.address)).to.be.true;
    });

    it("Should not allow non-admin to add doctors", async function () {
      await expect(
        healthLink.connect(other).addDoctor(other.address)
      ).to.be.reverted;
    });
  });

  describe("Record Management", function () {
    it("Should allow admin to upload record on behalf of doctor", async function () {
      await expect(
        healthLink.uploadRecord(patient.address, "QmTestHash", "test.pdf", doctor.address)
      ).to.emit(healthLink, "RecordUploaded");

      const records = await healthLink.getRecordsForPatient(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0].ipfsHash).to.equal("QmTestHash");
      expect(records[0].fileName).to.equal("test.pdf");
      expect(records[0].patient).to.equal(patient.address);
      expect(records[0].doctor).to.equal(doctor.address);
      expect(records[0].uploadedBy).to.equal(owner.address);
    });

    it("Should allow doctor to upload record for themselves", async function () {
      await expect(
        healthLink.connect(doctor).uploadRecord(patient.address, "QmDocHash", "doc-record.pdf", doctor.address)
      ).to.emit(healthLink, "RecordUploaded");

      const records = await healthLink.getRecordsForPatient(patient.address);
      expect(records.length).to.equal(1);
      expect(records[0].uploadedBy).to.equal(doctor.address);
    });

    it("Should not allow doctor to upload for other doctors", async function () {
      await expect(
        healthLink.connect(doctor).uploadRecord(patient.address, "QmTest", "test.pdf", other.address)
      ).to.be.revertedWith("HealthLink: doctor must be msg.sender");
    });

    it("Should not allow non-authorized users to upload records", async function () {
      await expect(
        healthLink.connect(other).uploadRecord(patient.address, "QmTest", "test.pdf", doctor.address)
      ).to.be.revertedWith("HealthLink: only doctor or admin");
    });
  });

  describe("Appointment Management", function () {
    it("Should allow admin to create appointment", async function () {
      const appointmentTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      await expect(
        healthLink.createAppointment(patient.address, doctor.address, appointmentTime, "Checkup appointment")
      ).to.emit(healthLink, "AppointmentCreated");

      const doctorAppointments = await healthLink.getAppointmentsForDoctor(doctor.address);
      const patientAppointments = await healthLink.getAppointmentsForPatient(patient.address);
      
      expect(doctorAppointments.length).to.equal(1);
      expect(patientAppointments.length).to.equal(1);
      expect(doctorAppointments[0].patient).to.equal(patient.address);
      expect(doctorAppointments[0].doctor).to.equal(doctor.address);
      expect(doctorAppointments[0].details).to.equal("Checkup appointment");
      expect(doctorAppointments[0].isActive).to.be.true;
    });

    it("Should allow doctor to create appointment", async function () {
      const appointmentTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      
      await expect(
        healthLink.connect(doctor).createAppointment(patient.address, doctor.address, appointmentTime, "Follow-up visit")
      ).to.emit(healthLink, "AppointmentCreated");

      const appointments = await healthLink.getAppointmentsForDoctor(doctor.address);
      expect(appointments.length).to.equal(1);
      expect(appointments[0].scheduledBy).to.equal(doctor.address);
    });

    it("Should not allow non-authorized users to create appointments", async function () {
      const appointmentTime = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        healthLink.connect(other).createAppointment(patient.address, doctor.address, appointmentTime, "Unauthorized")
      ).to.be.revertedWith("HealthLink: only doctor or admin");
    });
  });
});
