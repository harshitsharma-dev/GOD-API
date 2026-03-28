const axios = require('axios');
require('dotenv').config();

// Standardized Providers List
const providers = [
    'gemini',
    'groq',
    'mistral',
    'together',
    'huggingface',
    'openrouter',
    'replicate'
];

async function testAll() {
    console.log('🚀 INITIALIZING LIVE API GATEWAY TEST (FINAL VERIFICATION)\n');
    console.log('--------------------------------------------------');

    const results = [];

    for (const provider of providers) {
        process.stdout.write(`Testing ${provider.padEnd(12)} ... `);
        
        const startTime = Date.now();
        try {
            // We'll directly require the adapter for the test
            const adapter = require(`./src/adapters/${provider}.adapter`);
            
            // Perform a simple check for API key presence first (using the new validateKey method)
            const validationResult = adapter.validateKey();
            if (validationResult) {
                console.log('❌ KEY MISSING');
                results.push({ provider, status: 'MISSING KEY', result: 'API key is empty in .env' });
                continue;
            }

            // Call the provider for a real live response
            const response = await adapter.handleRequest("Respond with the single word 'SUCCESS'.");
            const duration = Date.now() - startTime;
            
            if (response.success) {
                console.log('✅ PASS');
                results.push({ provider, status: 'PASS', time: `${duration}ms`, result: response.data.replace(/\n/g, ' ').substring(0, 50).trim() + '...' });
            } else {
                console.log('❌ FAIL');
                results.push({ provider, status: 'FAIL', time: `${duration}ms`, error: response.error });
            }
        } catch (error) {
            console.log('❌ ERROR');
            results.push({ provider, status: 'ERROR', error: error.message });
        }
    }

    console.log('\n--------------------------------------------------');
    console.log('📊 LIVE VERIFICATION REPORT\n');
    console.table(results);
    
    console.log('\nNote: Providers marked as MISSING KEY are not configured in your .env file.');
}

testAll().catch(console.error);
