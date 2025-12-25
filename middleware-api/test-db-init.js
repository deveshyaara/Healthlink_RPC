// Test script to see startup errors
import('./src/services/db.service.js')
    .then(async (module) => {
        console.log('✅ DB Service imported successfully');
        const dbService = module.default;
        console.log('Initializing database...');
        await dbService.initialize();
        console.log('✅ Database initialized successfully');
        console.log('isReady:', dbService.isReady());
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    });
