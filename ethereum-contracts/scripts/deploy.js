import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Starting HealthLink Ethereum Contract Deployment...\n");

  const [deployer, admin, doctor, patient] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Deploy HealthLink Contract
  console.log("📄 Deploying HealthLink contract...");
  const HealthLink = await ethers.getContractFactory("HealthLink");
  const healthLink = await HealthLink.deploy(deployer.address);
  await healthLink.waitForDeployment();
  const healthLinkAddress = await healthLink.getAddress();
  console.log("✅ HealthLink deployed to:", healthLinkAddress);

  // Deploy PatientRecords Contract
  console.log("\n📄 Deploying PatientRecords contract...");
  const PatientRecords = await ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecords.deploy();
  await patientRecords.waitForDeployment();
  const patientRecordsAddress = await patientRecords.getAddress();
  console.log("✅ PatientRecords deployed to:", patientRecordsAddress);

  // Deploy Appointments Contract
  console.log("\n📄 Deploying Appointments contract...");
  const Appointments = await ethers.getContractFactory("Appointments");
  const appointments = await Appointments.deploy();
  await appointments.waitForDeployment();
  const appointmentsAddress = await appointments.getAddress();
  console.log("✅ Appointments deployed to:", appointmentsAddress);

  // Deploy Prescriptions Contract
  console.log("\n📄 Deploying Prescriptions contract...");
  const Prescriptions = await ethers.getContractFactory("Prescriptions");
  const prescriptions = await Prescriptions.deploy();
  await prescriptions.waitForDeployment();
  const prescriptionsAddress = await prescriptions.getAddress();
  console.log("✅ Prescriptions deployed to:", prescriptionsAddress);

  // Deploy DoctorCredentials Contract
  console.log("\n📄 Deploying DoctorCredentials contract...");
  const DoctorCredentials = await ethers.getContractFactory("DoctorCredentials");
  const doctorCredentials = await DoctorCredentials.deploy();
  await doctorCredentials.waitForDeployment();
  const doctorCredentialsAddress = await doctorCredentials.getAddress();
  console.log("✅ DoctorCredentials deployed to:", doctorCredentialsAddress);

  // Grant roles for testing (if additional accounts are available)
  if (admin && doctor && patient) {
    console.log("\n🔐 Setting up roles...");
    
    // HealthLink roles (use AccessControl grantRole for constants)
    const HL_ADMIN = await healthLink.DEFAULT_ADMIN_ROLE();
    const HL_DOCTOR = await healthLink.DOCTOR_ROLE();
    await healthLink.grantRole(HL_ADMIN, admin.address);
    await healthLink.grantRole(HL_DOCTOR, doctor.address);
    console.log("✅ HealthLink roles granted");

    // PatientRecords roles
    await patientRecords.grantAdminRole(admin.address);
    await patientRecords.grantDoctorRole(doctor.address);
    await patientRecords.grantPatientRole(patient.address);
    console.log("✅ PatientRecords roles granted");

    // Appointments roles
    await appointments.grantAdminRole(admin.address);
    await appointments.grantDoctorRole(doctor.address);
    await appointments.grantPatientRole(patient.address);
    console.log("✅ Appointments roles granted");

    // Prescriptions roles
    await prescriptions.grantAdminRole(admin.address);
    await prescriptions.grantDoctorRole(doctor.address);
    await prescriptions.grantPatientRole(patient.address);
    console.log("✅ Prescriptions roles granted");

    // DoctorCredentials roles
    await doctorCredentials.grantAdminRole(admin.address);
    await doctorCredentials.grantVerifierRole(admin.address);
    console.log("✅ DoctorCredentials roles granted");
  }

  console.log("\n✨ Deployment Summary:");
  console.log("========================");
  console.log("HealthLink:", healthLinkAddress);
  console.log("PatientRecords:", patientRecordsAddress);
  console.log("Appointments:", appointmentsAddress);
  console.log("Prescriptions:", prescriptionsAddress);
  console.log("DoctorCredentials:", doctorCredentialsAddress);
  console.log("========================");

  // Save deployment addresses to a file
  const fs = await import('fs/promises');
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HealthLink: healthLinkAddress,
      PatientRecords: patientRecordsAddress,
      Appointments: appointmentsAddress,
      Prescriptions: prescriptionsAddress,
      DoctorCredentials: doctorCredentialsAddress
    }
  };

  await fs.writeFile(
    'deployment-addresses.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment addresses saved to deployment-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
