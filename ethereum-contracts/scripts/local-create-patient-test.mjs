import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const HF = await hre.ethers.getContractFactory('HealthLink');
  const c = await HF.deploy(deployer.address);
  await c.waitForDeployment();
  console.log('Deployed HealthLink at', await c.getAddress());

  const args = {
    patientId: 'debug-patient-1766607186077',
    name: 'Debug Patient',
    age: 30,
    gender: 'unknown',
    ipfs: ''
  };

  try {
    const tx = await c.callStatic.createPatient(args.patientId, args.name, args.age, args.gender, args.ipfs, { from: deployer.address });
    console.log('CallStatic succeeded:', tx);
  } catch (err) {
    console.error('CallStatic failed:', err.message || err);
  }

  try {
    const tx = await c.createPatient(args.patientId, args.name, args.age, args.gender, args.ipfs);
    const receipt = await tx.wait();
    console.log('Transaction succeeded, receipt:', receipt.status);
  } catch (err) {
    console.error('Transaction failed:', err.message || err);
  }
}

main().catch(e => { console.error(e); process.exit(1); });