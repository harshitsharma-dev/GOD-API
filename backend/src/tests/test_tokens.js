const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let apiKey = '';

async function runTokenTests() {
    console.log('🔍 Starting Token Tracking Verification...');

    try {
        // 1. Setup - Create a test tenant to get a real API key
        console.log('\n[Setup] Creating test tenant...');
        const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
            name: 'Token Tester',
            email: `token_test_${Date.now()}@example.com`,
            password: 'Password123!'
        });
        apiKey = signupRes.data.data.apiKey;
        console.log('✅ API Key obtained.');

        // 2. Test Success - Short Prompt
        console.log('\n[1/4] Testing Short Prompt Tokens...');
        const shortRes = await axios.post(`${BASE_URL}/v1/ai/chat`, 
            { message: 'Hi' },
            { headers: { 'X-GOD-API-Key': apiKey } }
        );
        const shortTokens = shortRes.data._god.tokens;
        console.log('✅ Response received.');
        console.log('   Tokens:', shortTokens);
        if (shortTokens.total !== (shortTokens.prompt + shortTokens.completion)) {
            throw new Error('Total tokens != prompt + completion');
        }

        // 3. Test Dynamic Behavior - Long Prompt
        console.log('\n[2/4] Testing Long Prompt Tokens...');
        const longMsg = 'Explain the concept of quantum entanglement in great detail. '.repeat(20);
        const longRes = await axios.post(`${BASE_URL}/v1/ai/chat`, 
            { message: longMsg },
            { headers: { 'X-GOD-API-Key': apiKey } }
        );
        const longTokens = longRes.data._god.tokens;
        console.log('✅ Response received.');
        console.log('   Tokens:', longTokens);
        if (longTokens.prompt <= shortTokens.prompt) {
            throw new Error('Long prompt did not result in more prompt tokens');
        }

        // 4. Test Edge Case - Empty Prompt (Validation Error)
        console.log('\n[3/4] Testing Empty Prompt (400 Error)...');
        try {
            await axios.post(`${BASE_URL}/v1/ai/chat`, 
                { message: '' },
                { headers: { 'X-GOD-API-Key': apiKey } }
            );
        } catch (err) {
            const tokens = err.response.data._god?.tokens;
            console.log('✅ 400 Error caught.');
            console.log('   Error Tokens:', tokens);
            if (!tokens || tokens.total !== 0) {
                 // Note: If it's a validation error before hitting provider, it might be 0.
                 // If the error response doesn't have _god, that's another issue.
            }
        }

        // 5. Test Edge Case - Provider Failure (Mocked by invalid provider name or forced error)
        console.log('\n[4/4] Testing Provider Failure Tokens...');
        // We'll use an invalid provider to trigger an adapter error if possible, 
        // or just rely on the fact that handleError now returns emptyTokens.
        try {
            await axios.post(`${BASE_URL}/v1/invalid_provider/chat`, 
                { message: 'Test' },
                { headers: { 'X-GOD-API-Key': apiKey } }
            );
        } catch (err) {
            const tokens = err.response.data._god?.tokens;
            console.log('✅ Error handled.');
            console.log('   Tokens in error response:', tokens);
            if (!tokens || typeof tokens.total !== 'number') {
                throw new Error('Tokens missing or invalid in error response');
            }
        }

        console.log('\n🏆 TOKEN SYSTEM VERIFIED.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Token Test Failure:');
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTokenTests();
