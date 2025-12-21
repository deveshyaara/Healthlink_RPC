// Test Backend Integration
import 'dotenv/config';
import ethereumService from './src/services/ethereum.service.js';
import dbService from './src/services/db.service.js';

async function testBackend() {
  try {
    console.log('\n🔍 Testing Backend Integration...\n');

    // Test Supabase
    console.log('1️⃣ Testing Supabase connection...');
    await dbService.initialize();
    console.log('✅ Supabase connected successfully\n');

    // Test Ethereum
    console.log('2️⃣ Testing Ethereum connection...');
    await ethereumService.initialize();
    console.log('✅ Ethereum service initialized\n');

    // Test contract interaction
    console.log('3️⃣ Testing contract interaction...');
    const testPatientAddress = '0x' + '1'.repeat(40); // Mock wallet address
    const receipt = await ethereumService.createPatient(
      testPatientAddress,
      'Test Patient',
      30,
      'Male',
      'QmTestHash123'
    );
    console.log('✅ Test patient created:', receipt.hash);

    const patient = await ethereumService.getPatient(testPatientId);
    console.log('✅ Test patient retrieved:', patient.name);

    console.log('\n✅ All backend tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backend test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testBackend();
