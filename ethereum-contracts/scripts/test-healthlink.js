const hre = require("hardhat");

async function main() {
  const [admin, doctor, patient] = await hre.ethers.getSigners();

  const Factory = await hre.ethers.getContractFactory("HealthLink");
  const health = await Factory.deploy(admin.address);
  await health.deployed();
  console.log("Deployed HealthLink at:", health.address);

  // Grant doctor role via admin
  let tx = await health.connect(admin).addDoctor(doctor.address);
  await tx.wait();
  console.log("Doctor granted:", doctor.address);

  // Admin uploads a record on behalf of doctor
  tx = await health.connect(admin).uploadRecord(patient.address, "QmAdminUploadHash", doctor.address);
  let rcpt = await tx.wait();
  console.log("Admin uploaded record tx:", rcpt.transactionHash);

  // Doctor uploads a record (author forced to msg.sender)
  tx = await health.connect(doctor).uploadRecord(patient.address, "QmDoctorUploadHash", hre.ethers.constants.AddressZero);
  rcpt = await tx.wait();
  console.log("Doctor uploaded record tx:", rcpt.transactionHash);

  // Read records for patient
  const recs = await health.getRecordsForPatient(patient.address);
  console.log("Records for patient:", recs.map((r) => r.toString()));

  if (recs.length > 0) {
    const record = await health.getRecord(recs[0]);
    console.log("First record:", record.id.toString(), record.ipfsHash, record.doctorAddress, record.uploader);
  }

  // Create appointments
  const future = Math.floor(Date.now() / 1000) + 3600;
  tx = await health.connect(admin).createAppointment(patient.address, future, doctor.address, "Checkup");
  rcpt = await tx.wait();
  console.log("Admin created appointment tx:", rcpt.transactionHash);

  tx = await health.connect(doctor).createAppointment(patient.address, future + 7200, hre.ethers.constants.AddressZero, "Followup");
  rcpt = await tx.wait();
  console.log("Doctor created appointment tx:", rcpt.transactionHash);

  const appts = await health.getAppointmentsForPatient(patient.address);
  console.log("Appointments for patient:", appts.map((a) => a.toString()));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
