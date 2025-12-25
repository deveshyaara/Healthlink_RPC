// Test registration endpoint locally
import('./src/services/db.service.js')
    .then(async (module1) => {
        const dbService = module1.default;
        await dbService.initialize();
        console.log('✅ Database initialized');

        const authService = await import('./src/services/auth.service.js');
        console.log('✅ Auth service imported');

        // Test registration
        try {
            const user = await authService.default.registerUser({
                userId: 'testuser123',
                email: 'testlocaluser@example.com',
                password: 'test123456',
                role: 'client',
                name: 'Test Local User'
            });
            console.log('✅ Registration successful:', user);
        } catch (error) {
            console.error('❌ Registration failed:', error.message);
            console.error('Stack:', error.stack);
        }
    })
    .catch((error) => {
        console.error('❌ Setup Error:', error);
    });
