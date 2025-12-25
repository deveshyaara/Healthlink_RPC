// Simple registration test with full error output
import dbService from './src/services/db.service.js';
import authService from './src/services/auth.service.js';

async function test() {
    try {
        await dbService.initialize();
        console.log('✅ DB initialized');

        const result = await authService.registerUser({
            userId: 'testuser' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'test123456',
            role: 'client',
            name: 'Test User'
        });

        console.log('✅ SUCCESS! Registration worked!');
        console.log('User:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ FAILED:', error.message);
        console.error('Full error:', error);
    }
}

test();
