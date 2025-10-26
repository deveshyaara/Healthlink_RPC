import { FabricClient } from './fabric-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.resolve(__dirname, 'wallet');
const userId = 'admin';
const channelName = 'mychannel';
const chaincodeName = 'healthlink';

async function main() {
  const fabricClient = new FabricClient(ccpPath, walletPath, userId, channelName);

  try {
    await fabricClient.init();

    // 1. Test CreatePatient with Private Data
    const patientId = 'P104'; // New patient
    const patientPrivateData = {
      patientId: patientId,
      name: 'Dana Scully',
      dob: '1964-02-23',
      metaJson: JSON.stringify({ specialty: 'Forensic Pathology' })
    };

    console.log('\n--- Submitting private CreatePatient transaction ---');
    // We must pass transient data as an object: { key: value }
    // The chaincode expects the key to be 'patient'
    const createResult = await fabricClient.submitPrivate(
      chaincodeName,
      'CreatePatient',
      { patient: patientPrivateData }
    );
    console.log(`Public result: ${createResult}`);


    // 2. Test GetPatient (Public)
    console.log('\n--- Evaluating GetPatient (Public Data) ---');
    const publicData = await fabricClient.evaluate(
      chaincodeName,
      'GetPatient',
      [patientId]
    );
    console.log(`Result (Public): ${publicData}`);


    // 3. Test GetPatientPrivateDetails
    console.log('\n--- Evaluating GetPatientPrivateDetails ---');
    const privateData = await fabricClient.evaluate(
      chaincodeName,
      'GetPatientPrivateDetails',
      [patientId]
    );
    console.log(`Result (Private): ${privateData}`);

  } catch (error) {
    console.error(`\n*** FAILED to run application: ${error}`);
  } finally {
    fabricClient.disconnect();
  }
}

main();
