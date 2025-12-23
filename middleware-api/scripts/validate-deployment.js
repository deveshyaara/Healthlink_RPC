#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Health Check Validation Script
 * Comprehensive validation of Authentication, Blockchain Connectivity, and Error formats
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function makeRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error };
  }
}

async function testAPIHealth() {
  logSection('Part A: Verify Critical Services');

  log('1. Testing API Health...', 'blue');
  const { response, data, error } = await makeRequest('GET', '/health');

  if (error) {
    log('❌ API Health Check FAILED: Unable to connect to server', 'red');
    return false;
  }

  // Accept 200 or 201 and require flat success:true
  if ((response.status === 200 || response.status === 201) && data?.success === true) {
    log('✅ API Health Check PASSED', 'green');
    return true;
  } else {
    log(`❌ API Health Check FAILED: Status ${response.status}`, 'red');
    console.log('Received:', JSON.stringify(data, null, 2));
    return false;
  }
}

async function testDatabaseConnection() {
  log('2. Testing Database Connection...', 'blue');
  const { response, data, error } = await makeRequest('GET', '/api/health');

  if (error) {
    log('❌ Database Health Check FAILED: Unable to connect', 'red');
    return false;
  }

  // Accept 200 or 201 and prefer flat success flag; fall back to status === 'UP'
  if ((response.status === 200 || response.status === 201) && (data?.success === true || data?.status === 'UP')) {
    log('✅ Database Connection PASSED', 'green');
    return true;
  } else {
    log(`❌ Database Health Check FAILED: Status ${data?.status || 'unknown'}`, 'red');
    console.log('Received:', JSON.stringify(data, null, 2));
    return false;
  }
}

async function testBlockchainConnection() {
  log('3. Testing Blockchain Connection...', 'blue');
  const { response, data, error } = await makeRequest('GET', '/api/blockchain/status');

  if (error) {
    log('❌ Blockchain Health Check FAILED: Unable to connect', 'red');
    return false;
  }

  if (response.status === 200 && data.success === true) {
    log('✅ Blockchain Connection PASSED', 'green');
    return true;
  } else {
    log(`❌ Blockchain Health Check FAILED: ${data?.message || 'Unknown error'}`, 'red');
    return false;
  }
}

async function testAuthenticationFlow() {
  logSection('Part B: Verify Authentication Flow');

  log('4. Testing Authentication Registration and Login...', 'blue');

  // Generate dynamic test credentials
  const randomId = Date.now();
  const testCredentials = {
    name: 'Test User',
    email: `test-${randomId}@example.com`,
    password: 'Password123!',
    role: 'patient',
  };

  // First, register the new user
  const registerResponse = await makeRequest('POST', '/api/auth/register', testCredentials);

  if (registerResponse.error || !(registerResponse.response.status === 201 || registerResponse.response.status === 200)) {
    log('❌ User Registration FAILED', 'red');
    console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
    return false;
  }

  // Verify the response format
  if (!registerResponse.data.success || !registerResponse.data.token || !registerResponse.data.user) {
    log('❌ User Registration FAILED: Invalid response format', 'red');
    console.log('Expected: { success: true, token, user, message }');
    console.log('Received:', JSON.stringify(registerResponse.data, null, 2));
    return false;
  }

  log('✅ User Registration PASSED', 'green');

  // Now, attempt login with the same credentials
  const { response, data, error } = await makeRequest('POST', '/api/auth/login', {
    email: testCredentials.email,
    password: testCredentials.password,
  });

  if (error) {
    log('❌ Authentication Test FAILED: Unable to connect', 'red');
    return false;
  }

  if (response.status === 200 || response.status === 201) {
    // Check for the new flat format: { success: true, token: "...", user: {...} }
    if (data.success === true && data.token && data.user) {
      log('✅ Authentication Flow PASSED: Valid JWT token and user data received', 'green');
      return true;
    } else if (data.token && data.user) {
      // Fallback for current format without success flag
      log('⚠️  Authentication Flow PARTIAL: Token and user received but missing success flag', 'yellow');
      return true;
    } else {
      log('❌ Authentication Test FAILED: Invalid response structure', 'red');
      console.log('Expected: { success: true, token: "...", user: {...} }');
      console.log('Received:', JSON.stringify(data, null, 2));
      return false;
    }
  } else {
    log(`❌ Authentication Test FAILED: Status ${response.status}`, 'red');
    console.log('Response:', JSON.stringify(data, null, 2));
    return false;
  }
}

async function testErrorStandardization() {
  logSection('Part C: Verify Error Standardization');

  log('5. Testing Error Standardization...', 'blue');

  // Trigger an error by requesting a non-existent route
  const { response, data, error } = await makeRequest('GET', '/api/nonexistent-endpoint');

  if (error) {
    log('❌ Error Test FAILED: Unable to connect', 'red');
    return false;
  }

  // Check for the new error format: { success: false, error: "...", code: "..." }
  if (response.status >= 400 && data.success === false && typeof data.error === 'string' && typeof data.code === 'string') {
    log('✅ Error Standardization PASSED: Correct error format received', 'green');
    return true;
  } else {
    log('❌ Error Standardization FAILED: Invalid error response structure', 'red');
    console.log('Expected: { success: false, error: "...", code: "..." }');
    console.log('Received:', JSON.stringify(data, null, 2));
    return false;
  }
}

async function runHealthCheck() {
  logSection('🏥 HealthLink System Health Check');
  log(`Target Server: ${BASE_URL}`, 'magenta');
  log(`Timestamp: ${new Date().toISOString()}`, 'magenta');

  // Part A: Critical Services
  const apiHealth = await testAPIHealth();
  const dbHealth = await testDatabaseConnection();
  const blockchainHealth = await testBlockchainConnection();

  // Part B: Authentication
  const authHealth = await testAuthenticationFlow();

  // Part C: Error Handling
  const errorHealth = await testErrorStandardization();

  // Summary
  logSection('📊 Health Check Summary');

  const results = {
    'API Health': apiHealth,
    'Database Connection': dbHealth,
    'Blockchain Connection': blockchainHealth,
    'Authentication Flow': authHealth,
    'Error Standardization': errorHealth,
  };

  let passedCount = 0;
  const totalCount = Object.keys(results).length;

  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? 'green' : 'red';
    log(`${test}: ${status}`, color);
    if (passed) passedCount++;
  }

  logSection('🎯 Final Result');
  /* eslint-disable-next-line curly */
  if (passedCount === totalCount) {
    log(`🎉 ALL TESTS PASSED (${passedCount}/${totalCount})`, 'green');
    log('✅ System is ready for deployment!', 'green');
    process.exit(0);
  } else {
    log(`❌ SOME TESTS FAILED (${passedCount}/${totalCount})`, 'red');
    log('🔧 Please fix the failed components before deployment.', 'yellow');
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  log(`💥 Health check script error: ${error.message}`, 'red');
  process.exit(1);
});
