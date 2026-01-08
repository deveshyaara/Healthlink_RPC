import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Assign wallet addresses to existing doctors who don't have one
 * This script generates new Ethereum wallets for doctors
 */
async function assignWalletAddresses() {
    try {
        console.log('🔍 Finding doctors without wallet addresses...');

        // Find all doctors without wallet addresses
        const doctorsWithoutWallets = await prisma.user.findMany({
            where: {
                role: 'doctor',
                walletAddress: null
            },
            select: {
                id: true,
                email: true,
                fullName: true
            }
        });

        console.log(`\n📊 Found ${doctorsWithoutWallets.length} doctors without wallet addresses\n`);

        if (doctorsWithoutWallets.length === 0) {
            console.log('✅ All doctors already have wallet addresses!');
            return;
        }

        // Generate and assign wallet addresses
        for (const doctor of doctorsWithoutWallets) {
            console.log(`👨‍⚕️  Processing doctor: ${doctor.fullName} (${doctor.email})`);

            // Generate a new random wallet
            const wallet = ethers.Wallet.createRandom();
            const walletAddress = wallet.address;

            console.log(`   📝 Generated wallet address: ${walletAddress}`);

            // Update doctor with wallet address
            await prisma.user.update({
                where: { id: doctor.id },
                data: { walletAddress }
            });

            console.log(`   ✅ Updated database\n`);
        }

        console.log(`\n🎉 Successfully assigned wallet addresses to ${doctorsWithoutWallets.length} doctors!\n`);
        console.log('⚠️  IMPORTANT: These are newly generated wallets.');
        console.log('   The private keys are NOT stored in the database.');
        console.log('   Blockchain transactions will be signed by the server wallet.\n');

    } catch (error) {
        console.error('❌ Error assigning wallet addresses:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
assignWalletAddresses()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
