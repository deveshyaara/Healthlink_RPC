#!/usr/bin/env node

/**
 * verify_full_stack.js - The "Trident" Connection Test
 * 
 * Purpose: Verify all three pillars of HealthLink Pro infrastructure
 * Author: DevOps & QA Lead
 * Date: December 5, 2025
 * 
 * Tests:
 * 1. Database (Supabase/Prisma)
 * 2. Blockchain (Hyperledger Fabric)
 * 3. API Server (Express)
 * 
 * NO EXTERNAL DEPENDENCIES - Uses only Node.js built-ins
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes (no external dependencies)
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  reset: '\x1b[0m',
};

// Results storage
const results = {
  database: null,
  blockchain: null,
  api: null,
};

/**
 * Test 1: Database Connection (Supabase/Prisma)
 */
async function testDatabase() {
  const startTime = Date.now();
  console.log(colors.blue('⏳ Testing database connection...'));
  
  try {
    // Dynamic import to handle if Prisma is not available
    const dbServicePath = join(__dirname, 'src', 'services', 'db.service.prisma.js');
    const { default: dbService } = await import(dbServicePath);
    
    // Check if database is ready
    if (!dbService.isReady()) {
      await dbService.connect();
    }
    
    // Test query: Count users
    const prisma = dbService.getPrismaClient();
    const userCount = await prisma.user.count();
    
    const elapsed = Date.now() - startTime;
    results.database = {
      status: 'success',
      message: `Connected successfully. Found ${userCount} users.`,
      time: elapsed,
      details: {
        userCount,
        connectionType: 'Supabase PostgreSQL (via Prisma)',
      }
    };
    
    console.log(colors.green('✅ Database: Connected') + colors.reset);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    results.database = {
      status: 'error',
      message: error.message || 'Unknown error',
      time: elapsed,
      details: {
        error: error.code || 'CONNECTION_FAILED',
      }
    };
    
    console.log(colors.red('❌ Database: Disconnected') + colors.reset);
  }
}

/**
 * Test 2: Blockchain Connection (Hyperledger Fabric)
 */
async function testBlockchain() {
  const startTime = Date.now();
  console.log(colors.blue('⏳ Testing blockchain connection...'));
  
  try {
    // Dynamic import to handle if Fabric gateway is not available
    const fabricServicePath = join(__dirname, 'src', 'services', 'fabricGateway.service.js');
    const { getGatewayInstance } = await import(fabricServicePath);
    
    // Get gateway instance
    const gateway = await getGatewayInstance();
    
    // Test query: Health check or simple query
    let result;
    try {
      // Try a simple health check function if it exists
      result = await gateway.evaluateTransaction('HealthCheck');
    } catch (e) {
      // If HealthCheck doesn't exist, try getting all assets
      result = await gateway.evaluateTransaction('GetAllAssets');
    }
    
    const elapsed = Date.now() - startTime;
    results.blockchain = {
      status: 'success',
      message: 'Connected successfully. Chaincode responding.',
      time: elapsed,
      details: {
        network: 'Hyperledger Fabric v2.5',
        channel: 'mychannel',
        responseType: typeof result,
      }
    };
    
    console.log(colors.green('✅ Blockchain: Connected') + colors.reset);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    results.blockchain = {
      status: 'error',
      message: error.message || 'Unknown error',
      time: elapsed,
      details: {
        error: error.code || 'LEDGER_UNAVAILABLE',
        hint: 'Is the Fabric network running? (./start.sh)',
      }
    };
    
    console.log(colors.red('❌ Blockchain: Disconnected') + colors.reset);
  }
}

/**
 * Test 3: API Server Connection
 */
async function testAPIServer() {
  const startTime = Date.now();
  console.log(colors.blue('⏳ Testing API server...'));
  
  return new Promise((resolve) => {
    const ports = [4000, 3000]; // Try both common ports
    let portFound = false;
    
    const testPort = (port) => {
      return new Promise((portResolve) => {
        const options = {
          hostname: 'localhost',
          port: port,
          path: '/health',
          method: 'GET',
          timeout: 3000,
        };
        
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            const elapsed = Date.now() - startTime;
            results.api = {
              status: 'success',
              message: `Server responding on port ${port}`,
              time: elapsed,
              details: {
                port,
                statusCode: res.statusCode,
                response: data.substring(0, 100),
              }
            };
            console.log(colors.green(`✅ API Server: Running on port ${port}`) + colors.reset);
            portFound = true;
            portResolve(true);
          });
        });
        
        req.on('error', () => {
          portResolve(false);
        });
        
        req.on('timeout', () => {
          req.destroy();
          portResolve(false);
        });
        
        req.end();
      });
    };
    
    // Test ports sequentially
    (async () => {
      for (const port of ports) {
        if (portFound) break;
        await testPort(port);
      }
      
      if (!portFound) {
        const elapsed = Date.now() - startTime;
        results.api = {
          status: 'error',
          message: `Server not responding on ports ${ports.join(', ')}`,
          time: elapsed,
          details: {
            hint: 'Is the backend running? (cd middleware-api && npm run dev)',
          }
        };
        console.log(colors.red('❌ API Server: Not Running') + colors.reset);
      }
      
      resolve();
    })();
  });
}

/**
 * Print results table
 */
function printResults() {
  console.log('\n' + colors.bold('========================================'));
  console.log(colors.bold('HEALTHLINK PRO - FULL STACK VERIFICATION'));
  console.log(colors.bold('========================================') + '\n');
  
  // Database
  if (results.database) {
    console.log(colors.cyan('📊 DATABASE'));
    console.log(`Status: ${results.database.status === 'success' ? colors.green('✅ Connected') : colors.red('❌ Disconnected')}`);
    console.log(`Message: ${results.database.message}`);
    console.log(`Time: ${results.database.time}ms`);
    if (results.database.details) {
      console.log(`Details: ${JSON.stringify(results.database.details, null, 2)}`);
    }
    console.log('');
  }
  
  // Blockchain
  if (results.blockchain) {
    console.log(colors.cyan('⛓️  BLOCKCHAIN'));
    console.log(`Status: ${results.blockchain.status === 'success' ? colors.green('✅ Connected') : colors.red('❌ Disconnected')}`);
    console.log(`Message: ${results.blockchain.message}`);
    console.log(`Time: ${results.blockchain.time}ms`);
    if (results.blockchain.details) {
      console.log(`Details: ${JSON.stringify(results.blockchain.details, null, 2)}`);
    }
    console.log('');
  }
  
  // API
  if (results.api) {
    console.log(colors.cyan('🌐 API SERVER'));
    console.log(`Status: ${results.api.status === 'success' ? colors.green('✅ Running') : colors.red('❌ Not Running')}`);
    console.log(`Message: ${results.api.message}`);
    console.log(`Time: ${results.api.time}ms`);
    if (results.api.details) {
      console.log(`Details: ${JSON.stringify(results.api.details, null, 2)}`);
    }
    console.log('');
  }
  
  // Final verdict
  const allSuccess = results.database?.status === 'success' && 
                     results.blockchain?.status === 'success' && 
                     results.api?.status === 'success';
  
  console.log(colors.bold('========================================'));
  if (allSuccess) {
    console.log(colors.green(colors.bold('FINAL VERDICT: ✅ ALL SYSTEMS OPERATIONAL')));
  } else {
    console.log(colors.red(colors.bold('FINAL VERDICT: ❌ SOME SYSTEMS DOWN')));
  }
  console.log(colors.bold('========================================') + '\n');
  
  // Exit with proper code
  process.exit(allSuccess ? 0 : 1);
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + colors.bold(colors.cyan('🔱 THE TRIDENT TEST')));
  console.log(colors.yellow('Testing Database + Blockchain + API connectivity...') + '\n');
  
  try {
    // Run tests sequentially
    await testDatabase();
    await testBlockchain();
    await testAPIServer();
    
    // Print final results
    printResults();
  } catch (error) {
    console.error(colors.red('\n❌ Fatal error during verification:'));
    console.error(error);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error(colors.red('Unhandled error:'), error);
  process.exit(1);
});
