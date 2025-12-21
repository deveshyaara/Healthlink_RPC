import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HealthLink (proxy/admin/doctor)", function () {
  let HealthLink, healthLink;
  let owner, doctor, patient, other;

  beforeEach(async () => {
    [owner, doctor, patient, other] = await ethers.getSigners();
    HealthLink = await ethers.getContractFactory("HealthLink");
     healthLink = await HealthLink.deploy(owner.address);
     await healthLink.waitForDeployment();
  });

  it("admin can add doctor and upload record on behalf", async () => {
    const DOCTOR_ROLE = await healthLink.DOCTOR_ROLE();

    await expect(healthLink.addDoctor(doctor.address)).to.emit(healthLink, "DoctorAdded");
    expect(await healthLink.hasRole(DOCTOR_ROLE, doctor.address)).to.equal(true);

    await expect(
      healthLink.uploadRecord(patient.address, "QmAdminHash", "record-admin.pdf", doctor.address)
    ).to.emit(healthLink, "RecordUploaded");

    const records = await healthLink.getRecordsForPatient(patient.address);
    expect(records.length).to.equal(1);
    const rec = records[0];
    expect(rec.ipfsHash).to.equal("QmAdminHash");
    expect(rec.fileName).to.equal("record-admin.pdf");
    expect(rec.patient).to.equal(patient.address);
    expect(rec.doctor).to.equal(doctor.address);
    expect(rec.uploadedBy).to.equal(owner.address);
  });

  it("doctor can upload for self and cannot upload for others", async () => {
    await healthLink.addDoctor(doctor.address);

    await healthLink.connect(doctor).uploadRecord(patient.address, "QmDocHash", "doc-record.pdf", doctor.address);
    let records = await healthLink.getRecordsForPatient(patient.address);
    expect(records.length).to.equal(1);
    expect(records[0].uploadedBy).to.equal(doctor.address);

    await expect(
      healthLink.connect(doctor).uploadRecord(patient.address, "QmX", "x.pdf", other.address)
    ).to.be.revertedWith("HealthLink: doctor must be msg.sender");
  });

  it("non-doctor non-admin cannot upload records", async () => {
    await expect(
      healthLink.connect(patient).uploadRecord(patient.address, "QmNo", "no.pdf", patient.address)
    ).to.be.revertedWith("HealthLink: only doctor or admin");
  });

  it("admin and doctor can create appointments with proper checks", async () => {
    await healthLink.addDoctor(doctor.address);

    const latest = await ethers.provider.getBlock("latest");
    const future = latest.timestamp + 3600;

    await expect(
      healthLink.createAppointment(patient.address, doctor.address, future, "admin-schedule")
    ).to.emit(healthLink, "AppointmentCreated");

    let dApts = await healthLink.getAppointmentsForDoctor(doctor.address);
    expect(dApts.length).to.equal(1);
    expect(dApts[0].scheduledBy).to.equal(owner.address);

    const future2 = future + 3600;
    await healthLink.connect(doctor).createAppointment(patient.address, doctor.address, future2, "doc-schedule");
    dApts = await healthLink.getAppointmentsForDoctor(doctor.address);
    expect(dApts.length).to.equal(2);

    await expect(
      healthLink.connect(doctor).createAppointment(patient.address, other.address, future2 + 10, "bad")
    ).to.be.revertedWith("HealthLink: doctor must be msg.sender");

    await expect(
      healthLink.connect(patient).createAppointment(patient.address, doctor.address, future2 + 20, "nope")
    ).to.be.revertedWith("HealthLink: only doctor or admin");
  });
});
