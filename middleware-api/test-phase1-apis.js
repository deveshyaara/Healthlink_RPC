/**
 * Phase 1 API Testing Script
 * Tests all new pharmacy, hospital, and insurance endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
let adminToken = '';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Login as Admin
async function testAdminLogin() {
    log('\n📝 Test 1: Admin Login', 'blue');
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@healthlink.com',
            password: 'Admin@123', // Update with your admin password
        });

        adminToken = response.data.token;
        log('✅ Admin login successful', 'green');
        log(`   Token: ${adminToken.substring(0, 20)}...`, 'reset');
        return true;
    } catch (error) {
        log(`❌ Admin login failed: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// Test 2: Register Pharmacy
async function testPharmacyRegistration() {
    log('\n📝 Test 2: Register Pharmacy', 'blue');
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/pharmacy/register`,
            {
                name: 'HealthPlus Pharmacy',
                licenseNumber: 'PH-TEST-001',
                address: '123 Main Street, Test City',
                phone: '555-0001',
                email: 'contact@healthplus.com',
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` },
            }
        );

        log('✅ Pharmacy registered successfully', 'green');
        log(`   ID: ${response.data.data.id}`, 'reset');
        log(`   Name: ${response.data.data.name}`, 'reset');
        return response.data.data.id;
    } catch (error) {
        log(`❌ Pharmacy registration failed: ${error.response?.data?.message || error.message}`, 'red');
        return null;
    }
}

// Test 3: List Pharmacies
async function testListPharmacies() {
    log('\n📝 Test 3: List Pharmacies', 'blue');
    try {
        const response = await axios.get(`${BASE_URL}/api/v1/pharmacy`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        log('✅ Pharmacies listed successfully', 'green');
        log(`   Total: ${response.data.data.length}`, 'reset');
        return true;
    } catch (error) {
        log(`❌ List pharmacies failed: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// Test 4: Register Hospital
async function testHospitalRegistration() {
    log('\n📝 Test 4: Register Hospital', 'blue');
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/hospital/register`,
            {
                name: 'City General Hospital',
                registrationNumber: 'HOS-TEST-001',
                type: 'Government',
                address: '456 Hospital Road, Test City',
                phone: '555-0002',
                email: 'info@citygeneral.com',
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` },
            }
        );

        log('✅ Hospital registered successfully', 'green');
        log(`   ID: ${response.data.data.id}`, 'reset');
        log(`   Name: ${response.data.data.name}`, 'reset');
        return response.data.data.id;
    } catch (error) {
        log(`❌ Hospital registration failed: ${error.response?.data?.message || error.message}`, 'red');
        return null;
    }
}

// Test 5: Add Department to Hospital
async function testAddDepartment(hospitalId) {
    log('\n📝 Test 5: Add Department to Hospital', 'blue');
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/hospital/${hospitalId}/departments`,
            {
                name: 'Cardiology',
                description: 'Heart and cardiovascular care',
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` },
            }
        );

        log('✅ Department added successfully', 'green');
        log(`   Department: ${response.data.data.name}`, 'reset');
        return true;
    } catch (error) {
        log(`❌ Add department failed: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// Test 6: List Hospitals
async function testListHospitals() {
    log('\n📝 Test 6: List Hospitals', 'blue');
    try {
        const response = await axios.get(`${BASE_URL}/api/v1/hospital`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        log('✅ Hospitals listed successfully', 'green');
        log(`   Total: ${response.data.data.length}`, 'reset');
        return true;
    } catch (error) {
        log(`❌ List hospitals failed: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// Test 7: Register Insurance Provider
async function testInsuranceProviderRegistration() {
    log('\n📝 Test 7: Register Insurance Provider', 'blue');
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/insurance/providers`,
            {
                name: 'HealthShield Insurance',
                registrationNumber: 'INS-TEST-001',
                contactEmail: 'claims@healthshield.com',
                contactPhone: '555-0003',
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` },
            }
        );

        log('✅ Insurance provider registered successfully', 'green');
        log(`   ID: ${response.data.data.id}`, 'reset');
        log(`   Name: ${response.data.data.name}`, 'reset');
        return response.data.data.id;
    } catch (error) {
        log(`❌ Insurance provider registration failed: ${error.response?.data?.message || error.message}`, 'red');
        return null;
    }
}

// Test 8: List Insurance Providers
async function testListInsuranceProviders() {
    log('\n📝 Test 8: List Insurance Providers', 'blue');
    try {
        const response = await axios.get(`${BASE_URL}/api/v1/insurance/providers`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        log('✅ Insurance providers listed successfully', 'green');
        log(`   Total: ${response.data.data.length}`, 'reset');
        return true;
    } catch (error) {
        log(`❌ List insurance providers failed: ${error.response?.data?.message || error.message}`, 'red');
        return false;
    }
}

// Test 9: Server Health Check
async function testHealthCheck() {
    log('\n📝 Test 9: Server Health Check', 'blue');
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        log('✅ Server is healthy', 'green');
        log(`   Status: ${response.data.status}`, 'reset');
        return true;
    } catch (error) {
        log(`❌ Health check failed: ${error.message}`, 'red');
        return false;
    }
}

// Main test runner
async function runAllTests() {
    log('\n🧪 Phase 1 API Testing Suite', 'yellow');
    log('================================', 'yellow');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
    };

    // Test 0: Health Check
    results.total++;
    if (await testHealthCheck()) results.passed++;
    else results.failed++;

    // Test 1: Admin Login
    results.total++;
    const loginSuccess = await testAdminLogin();
    if (loginSuccess) results.passed++;
    else {
        results.failed++;
        log('\n❌ Admin login failed - cannot continue tests', 'red');
        log('💡 Make sure admin account exists and password is correct', 'yellow');
        return;
    }

    // Test 2: Register Pharmacy
    results.total++;
    const pharmacyId = await testPharmacyRegistration();
    if (pharmacyId) results.passed++;
    else results.failed++;

    // Test 3: List Pharmacies
    results.total++;
    if (await testListPharmacies()) results.passed++;
    else results.failed++;

    // Test 4: Register Hospital
    results.total++;
    const hospitalId = await testHospitalRegistration();
    if (hospitalId) results.passed++;
    else results.failed++;

    // Test 5: Add Department (only if hospital was created)
    if (hospitalId) {
        results.total++;
        if (await testAddDepartment(hospitalId)) results.passed++;
        else results.failed++;
    }

    // Test 6: List Hospitals
    results.total++;
    if (await testListHospitals()) results.passed++;
    else results.failed++;

    // Test 7: Register Insurance Provider
    results.total++;
    const insuranceId = await testInsuranceProviderRegistration();
    if (insuranceId) results.passed++;
    else results.failed++;

    // Test 8: List Insurance Providers
    results.total++;
    if (await testListInsuranceProviders()) results.passed++;
    else results.failed++;

    // Summary
    log('\n📊 Test Summary', 'yellow');
    log('================================', 'yellow');
    log(`Total Tests: ${results.total}`, 'reset');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'blue');

    if (results.failed === 0) {
        log('\n🎉 All tests passed! Phase 1 APIs are working correctly!', 'green');
    } else {
        log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
    }
}

// Run tests
runAllTests().catch((error) => {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
});
