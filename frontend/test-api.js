#!/usr/bin/env node

/**
 * HealthLink Pro - Frontend API Test
 * Tests core API endpoints from the frontend perspective
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://super-duper-spork-r4779p5vp5552xx69-4000.app.github.dev/api';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testResult(name, success, error = null) {
  totalTests++;
  const status = success ? 'PASS' : 'FAIL';
  const color = success ? colors.green : colors.red;

  console.log(`  [${totalTests.toString().padStart(2)}] ${name}... ${color}${status}${colors.reset}`);

  if (success) {
    passedTests++;
  } else {
    failedTests++;
    if (error) {
      console.log(`      Error: ${error}`);
    }
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('  🧪 HealthLink Pro - Frontend API Test', colors.blue);
  log('='.repeat(60), colors.blue);
  log('');

  // Check server health
  log('🔍 Checking API server...', colors.yellow);
  try {
    await apiRequest('/health');
    log('✅ Server is responding', colors.green);
  } catch (error) {
    log('❌ Server is not responding', colors.red);
    log(`   Error: ${error.message}`, colors.red);
    process.exit(1);
  }
  log('');

  // Generate unique IDs for testing
  const timestamp = Date.now();
  const testId = `TEST${timestamp}`;

  // ============================================================
  // MEDICAL RECORDS API
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  MEDICAL RECORDS API', colors.blue);
  log('='.repeat(50), colors.blue);

  try {
    // Create medical record
    const recordData = {
      recordId: `MR${testId}`,
      patientId: `P${testId}`,
      doctorId: `D${testId}`,
      recordType: 'consultation',
      ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      description: 'Test consultation record',
      isConfidential: false,
      tags: ['test', 'consultation']
    };

    await apiRequest('/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
    testResult('Create Medical Record', true);
  } catch (error) {
    testResult('Create Medical Record', false, error.message);
  }

  try {
    // Get medical record
    const record = await apiRequest(`/medical-records/MR${testId}?patientId=P${testId}&accessReason=testing`);
    testResult('Get Medical Record', true);
  } catch (error) {
    testResult('Get Medical Record', false, error.message);
  }

  try {
    // Get specific medical record (working endpoint)
    const record = await apiRequest('/api/medical-records/test-record-001');
    testResult('Get Medical Record', record && typeof record === 'object');
  } catch (error) {
    testResult('Get Medical Record', false, error.message);
  }

  log('');

  // ============================================================
  // DOCTOR CREDENTIALS API
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  DOCTOR CREDENTIALS API', colors.blue);
  log('='.repeat(50), colors.blue);

  try {
    // Register doctor
    const doctorData = {
      doctorId: `DR${testId}`,
      name: 'Dr. Test User',
      specialization: 'Cardiology',
      licenseNumber: `LIC${testId}`,
      hospital: 'Test Hospital',
      credentials: { degree: 'MD', experience: '5 years' },
      contact: { email: 'test@example.com', phone: '1234567890' }
    };

    await apiRequest('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData)
    });
    testResult('Register Doctor', true);
  } catch (error) {
    testResult('Register Doctor', false, error.message);
  }

  try {
    // Get doctor
    const doctor = await apiRequest(`/doctors/DR${testId}`);
    testResult('Get Doctor', doctor && doctor.doctorId === `DR${testId}`);
  } catch (error) {
    testResult('Get Doctor', false, error.message);
  }

  log('');

  // ============================================================
  // CONSENT MANAGEMENT API
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  CONSENT MANAGEMENT API', colors.blue);
  log('='.repeat(50), colors.blue);

  try {
    // Create consent
    const consentData = {
      consentId: `CON${testId}`,
      patientId: `P${testId}`,
      granteeId: `DR${testId}`,
      scope: 'medical_records',
      purpose: 'treatment',
      validUntil: '2026-12-31'
    };

    await apiRequest('/consents', {
      method: 'POST',
      body: JSON.stringify(consentData)
    });
    testResult('Create Consent', true);
  } catch (error) {
    testResult('Create Consent', false, error.message);
  }

  try {
    // Get consent
    const consent = await apiRequest(`/consents/CON${testId}`);
    testResult('Get Consent', consent && consent.consentId === `CON${testId}`);
  } catch (error) {
    testResult('Get Consent', false, error.message);
  }

  log('');

  // ============================================================
  // APPOINTMENTS API
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  APPOINTMENTS API', colors.blue);
  log('='.repeat(50), colors.blue);

  try {
    // Schedule appointment
    const appointmentData = {
      appointmentId: `APT${testId}`,
      patientId: `PAT${testId}`,
      doctorId: `DOC${testId}`,
      appointmentDate: '2025-12-01',
      startTime: '10:00',
      endTime: '11:00',
      reason: {
        purpose: 'General checkup',
        symptoms: ['routine checkup']
      }
    };

    await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
    testResult('Schedule Appointment', true);
  } catch (error) {
    testResult('Schedule Appointment', false, error.message);
  }

  try {
    // Get appointment
    const appointment = await apiRequest(`/appointments/APT${testId}`);
    testResult('Get Appointment', appointment && appointment.appointmentId === `APT${testId}`);
  } catch (error) {
    testResult('Get Appointment', false, error.message);
  }

  log('');

  // ============================================================
  // PRESCRIPTION API
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  PRESCRIPTION API', colors.blue);
  log('='.repeat(50), colors.blue);

  try {
    // Create prescription
    const prescriptionData = {
      prescriptionId: `RX${testId}`,
      patientId: `PAT${testId}`,
      doctorId: `DOC${testId}`,
      medications: [{
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        duration: '7',
        quantity: 21,
        instructions: 'Take after meals'
      }],
      diagnosis: {
        condition: 'Bacterial infection'
      },
      appointmentId: `APT${testId}`
    };

    await apiRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData)
    });
    testResult('Create Prescription', true);
  } catch (error) {
    testResult('Create Prescription', false, error.message);
  }

  try {
    // Get prescription
    const prescription = await apiRequest(`/prescriptions/RX${testId}`);
    testResult('Get Prescription', prescription && prescription.prescriptionId === `RX${testId}`);
  } catch (error) {
    testResult('Get Prescription', false, error.message);
  }

  log('');

  // ============================================================
  // DASHBOARD API (Aggregated Data)
  // ============================================================
  log('='.repeat(50), colors.blue);
  log('  DASHBOARD API (Aggregated Data)', colors.blue);
  log('='.repeat(50), colors.blue);

  log('  Note: Bulk listing endpoints may require authentication', colors.yellow);
  log('  Individual record access works correctly for authenticated users', colors.yellow);

  try {
    // Test prescriptions list (may require auth)
    const prescriptions = await apiRequest('/api/prescriptions');
    testResult('Get All Prescriptions', Array.isArray(prescriptions));
  } catch (error) {
    testResult('Get All Prescriptions', false, `Expected with auth: ${error.message}`);
  }

  log('');

  // ============================================================
  // TEST SUMMARY
  // ============================================================
  log('='.repeat(60), colors.blue);
  log('  📊 TEST SUMMARY', colors.blue);
  log('='.repeat(60), colors.blue);
  log('');
  log(`  Total Tests:    ${totalTests}`);
  log(`  Passed:         ${colors.green}${passedTests}${colors.reset}`);
  log(`  Failed:         ${colors.red}${failedTests}${colors.reset}`);
  log('');

  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  log(`  Success Rate:   ${successRate}%`);
  log('');

  if (failedTests === 0) {
    log('='.repeat(60), colors.green);
    log('  ✅ ALL TESTS PASSED! 🎉', colors.green);
    log('='.repeat(60), colors.green);
    process.exit(0);
  } else {
    log('='.repeat(60), colors.yellow);
    log('  ⚠️  SOME TESTS FAILED - Check backend connectivity', colors.yellow);
    log('='.repeat(60), colors.yellow);
    process.exit(1);
  }
}

// Handle Node.js environment
if (typeof fetch === 'undefined') {
  // Polyfill fetch for Node.js
  const { default: fetch } = require('node-fetch');
  global.fetch = fetch;
}

runTests().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, colors.red);
  process.exit(1);
});