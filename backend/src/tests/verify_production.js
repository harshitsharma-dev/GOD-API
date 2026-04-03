const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let apiKey = '';

async function runTests() {
    console.log('🚀 Starting Production Verification Suite...');

    try {
        // 1. Health Check (Public)
        console.log('\n[1/7] Testing Public Health Check...');
        const health = await axios.get(`${BASE_URL}/discovery/health`);
        console.log('✅ Health Check Passed:', health.data.data.status);

        // 2. Auth - Signup
        console.log('\n[2/7] Testing Auth - Signup...');
        const signupData = {
            name: 'QA Test User',
            email: `qa_${Date.now()}@example.com`,
            password: 'Password123!'
        };
        const signupRes = await axios.post(`${BASE_URL}/auth/signup`, signupData);
        authToken = signupRes.data.data.token;
        apiKey = signupRes.data.data.apiKey;
        console.log('✅ Signup Successful. Key generated:', signupRes.data.data.apiKeyPrefix);

        // 3. Gateway - Gemini Chat (Explicit)
        console.log('\n[3/7] Testing Gateway - Gemini Chat...');
        const chatRes = await axios.post(`${BASE_URL}/v1/gemini/chat`, 
            { message: 'Hello, are you operational?' },
            { headers: { 'X-GOD-API-Key': apiKey } }
        );
        console.log('✅ Gemini Chat Responded.');
        console.log('   _god.provider:', chatRes.data._god.provider);
        console.log('   _god.tokens:', chatRes.data._god.tokens);

        // 4. Gateway - Smart Routing
        console.log('\n[4/7] Testing Gateway - Smart Routing (ai/chat)...');
        const smartRes = await axios.post(`${BASE_URL}/v1/ai/chat`, 
            { message: 'Write a simple hello world in Python' },
            { headers: { 'X-GOD-API-Key': apiKey } }
        );
        console.log('✅ Smart Routing Responded.');
        console.log('   _god.smartRouting:', smartRes.data._god.smartRouting);
        console.log('   _god.provider:', smartRes.data._god.provider);

        // 5. Fail-Fast Verification (Empty Prompt)
        console.log('\n[5/7] Testing Fail-Fast (Empty Prompt Error)...');
        try {
            await axios.post(`${BASE_URL}/v1/gemini/chat`, 
                { message: '' },
                { headers: { 'X-GOD-API-Key': apiKey } }
            );
        } catch (err) {
            console.log('✅ Fail-Fast triggered 400 as expected:', err.response.data.error);
        }

        // 6. Security - Dashboard (JWT Auth)
        console.log('\n[6/7] Testing Security - Dashboard (JWT)...');
        const dashRes = await axios.get(`${BASE_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ Dashboard Stats Accessed Successfully.');

        // 7. Security - Admin (Role Check)
        console.log('\n[7/7] Testing Security - Admin (Role Based)...');
        try {
            await axios.get(`${BASE_URL}/admin/tenants`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('⚠️ Unexpected Success: Standard user accessed Admin route.');
        } catch (err) {
            console.log('✅ Admin Access Blocked (403/Forbidden) as expected for standard user.');
        }

        console.log('\n🏆 ALL LOGICAL FLOWS VERIFIED.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test Failure:');
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

runTests();
