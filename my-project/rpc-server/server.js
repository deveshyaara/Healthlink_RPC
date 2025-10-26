import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { FabricClient } from './fabric-client.js';

// --- Server Setup ---
const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Fabric Client Setup ---
const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const walletPath = path.resolve(__dirname, 'wallet');
const userId = 'admin';
const channelName = 'mychannel';
const chaincodeName = 'healthlink';

const fabricClient = new FabricClient(ccpPath, walletPath, userId, channelName);

// --- API Endpoints ---

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Get public patient data
app.get('/api/patient/:id', async (req, res) => {
  try {
    const patientId = req.params.id;
    const result = await fabricClient.evaluate(chaincodeName, 'GetPatient', [patientId]);
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get private patient data
app.get('/api/patient-private/:id', async (req, res) => {
  try {
    const patientId = req.params.id;
    const result = await fabricClient.evaluate(chaincodeName, 'GetPatientPrivateDetails', [patientId]);
    res.status(200).json(JSON.parse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new patient
app.post('/api/patient', async (req, res) => {
  try {
    // The API body should contain the private data
    // e.g., { "patientId": "P105", "name": "...", "dob": "...", "metaJson": "{}" }
    const patientPrivateData = req.body;

    if (!patientPrivateData.patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const transientData = { patient: patientPrivateData };
    const result = await fabricClient.submitPrivate(chaincodeName, 'CreatePatient', transientData);
    res.status(201).json(JSON.parse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- Start Server ---
async function startServer() {
  try {
    console.log('Initializing Fabric client...');
    await fabricClient.init(); // Connect to the gateway ONCE
    console.log('Fabric client initialized.');

    app.listen(PORT, () => {
      console.log(`HealthLink API server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server or init Fabric client:', error);
    process.exit(1);
  }
}

startServer();
