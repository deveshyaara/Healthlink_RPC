const hre = require("hardhat");

async function main() {
  const [admin, doctor, patient] = await hre.ethers.getSigners();

  let health;
  let deployedAddress;
  // support ethers v6 helper
  if (typeof hre.ethers.deployContract === 'function') {
    health = await hre.ethers.deployContract("HealthLink", [admin.address]);
    if (typeof health.waitForDeployment === 'function') await health.waitForDeployment();
    deployedAddress = health.target || health.address;
  } else {
    const Factory = await hre.ethers.getContractFactory("HealthLink");
    health = await Factory.deploy(admin.address);
    if (typeof health.waitForDeployment === 'function') {
      await health.waitForDeployment();
    } else if (typeof health.deployed === 'function') {
      await health.deployed();
    }
    deployedAddress = health.target || health.address;
  }
  console.log("Deployed HealthLink at:", deployedAddress);

  // Grant doctor role via admin
  let tx = await health.connect(admin).addDoctor(doctor.address);
  if (tx && typeof tx.wait === 'function') await tx.wait();
  console.log("Doctor granted:", doctor.address);

  // Admin uploads a record on behalf of doctor
  tx = await health.connect(admin).uploadRecord(patient.address, "QmAdminUploadHash", doctor.address);
  if (tx && typeof tx.wait === 'function') {
    let rcpt = await tx.wait();
    console.log("Admin uploaded record tx:", rcpt.transactionHash || rcpt.transactionHash);
  } else {
    console.log("Admin uploaded record call returned:", tx);
  }

  // Doctor uploads a record (author forced to msg.sender)
  const ZERO = (hre.ethers.constants && hre.ethers.constants.AddressZero) || hre.ethers.ZeroAddress || "0x0000000000000000000000000000000000000000";
  tx = await health.connect(doctor).uploadRecord(patient.address, "QmDoctorUploadHash", ZERO);
  if (tx && typeof tx.wait === 'function') {
    rcpt = await tx.wait();
    console.log("Doctor uploaded record tx:", rcpt.transactionHash || rcpt.transactionHash);
  } else {
    console.log("Doctor uploaded record call returned:", tx);
  }

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

  tx = await health.connect(doctor).createAppointment(patient.address, future + 7200, ZERO, "Followup");
  if (tx && typeof tx.wait === 'function') {
    rcpt = await tx.wait();
    console.log("Doctor created appointment tx:", rcpt.transactionHash || rcpt.transactionHash);
  } else {
    console.log("Doctor created appointment call returned:", tx);
  }

  const appts = await health.getAppointmentsForPatient(patient.address);
  console.log("Appointments for patient:", appts.map((a) => a.toString()));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
