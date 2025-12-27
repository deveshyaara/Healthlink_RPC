/**
 * Test Database Migration
 * Quick test script to verify Phase 1 database schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMigration() {
    console.log('🧪 Testing Phase 1 Database Schema...\n');

    try {
        // Test Hospital model
        console.log('1️⃣ Testing Hospital model...');
        const hospitalCount = await prisma.hospital.count();
        console.log(`   ✅ Hospital table exists (${hospitalCount} records)`);

        // Test Pharmacy model
        console.log('2️⃣ Testing Pharmacy model...');
        const pharmacyCount = await prisma.pharmacy.count();
        console.log(`   ✅ Pharmacy table exists (${pharmacyCount} records)`);

        // Test DrugInventory model
        console.log('3️⃣ Testing DrugInventory model...');
        const inventoryCount = await prisma.drugInventory.count();
        console.log(`   ✅ DrugInventory table exists (${inventoryCount} records)`);

        // Test InsuranceProvider model
        console.log('4️⃣ Testing InsuranceProvider model...');
        const providerCount = await prisma.insuranceProvider.count();
        console.log(`   ✅ InsuranceProvider table exists (${providerCount} records)`);

        // Test InsurancePolicy model
        console.log('5️⃣ Testing InsurancePolicy model...');
        const policyCount = await prisma.insurancePolicy.count();
        console.log(`   ✅ InsurancePolicy table exists (${policyCount} records)`);

        // Test InsuranceClaim model
        console.log('6️⃣ Testing InsuranceClaim model...');
        const claimCount = await prisma.insuranceClaim.count();
        console.log(`   ✅ InsuranceClaim table exists (${claimCount} records)`);

        // Test SystemAuditLog model
        console.log('7️⃣ Testing SystemAuditLog model...');
        const auditCount = await prisma.systemAuditLog.count();
        console.log(`   ✅ SystemAuditLog table exists (${auditCount} records)`);

        // Test User model 2FA fields
        console.log('8️⃣ Testing User model 2FA fields...');
        const userWithFields = await prisma.user.findFirst({
            select: {
                id: true,
                twoFactorEnabled: true,
                hospitalId: true,
            },
        });
        console.log('   ✅ User 2FA and hospital fields exist');

        console.log('\n✅ All Phase 1 models verified successfully!\n');

        // Create test data
        console.log('💾 Creating test data...\n');

        // Create test hospital
        const testHospital = await prisma.hospital.create({
            data: {
                name: 'Test City Hospital',
                registrationNumber: 'TEST-HOS-001',
                type: 'Government',
                address: '123 Test Street, Test City',
                phone: '555-0001',
                email: 'test@hospital.com',
            },
        });
        console.log('   ✅ Created test hospital:', testHospital.name);

        // Create test pharmacy
        const testPharmacy = await prisma.pharmacy.create({
            data: {
                name: 'Test Pharmacy',
                licenseNumber: 'TEST-PH-001',
                address: '456 Pharmacy Lane, Test City',
                phone: '555-0002',
                email: 'test@pharmacy.com',
            },
        });
        console.log('   ✅ Created test pharmacy:', testPharmacy.name);

        // Create test insurance provider
        const testInsurance = await prisma.insuranceProvider.create({
            data: {
                name: 'Test Insurance Co.',
                registrationNumber: 'TEST-INS-001',
                contactEmail: 'test@insurance.com',
                contactPhone: '555-0003',
            },
        });
        console.log('   ✅ Created test insurance provider:', testInsurance.name);

        console.log('\n🎉 Database migration test complete!');
        console.log('\n📋 Summary:');
        console.log(`   - ${hospitalCount + 1} hospitals`);
        console.log(`   - ${pharmacyCount + 1} pharmacies`);
        console.log(`   - ${providerCount + 1} insurance providers`);
        console.log(`   - All models functioning correctly`);

    } catch (error) {
        console.error('\n❌ Migration test failed:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testMigration();
