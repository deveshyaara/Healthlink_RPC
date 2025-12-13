// Test Supabase Connection
import 'dotenv/config';
import dbService from './src/services/db.service.js';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    await dbService.initialize();
    console.log('✅ Supabase connection successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
