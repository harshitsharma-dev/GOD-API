const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3000/api';
let token = '';
let apiKey = '';
const testEmail = `tester_${crypto.randomBytes(4).toString('hex')}@example.com`;

async function testE2E() {
    try {
        console.log('--- STARTING E2E TEST ---');

        // 1. SIGNUP
        console.log('\n[1] Testing Signup...');
        const signupRes = await axios.post(`${API_BASE}/auth/signup`, {
            name: 'E2E Tester',
            email: testEmail,
            password: 'password123'
        });
        console.log('Signup Response:', signupRes.status);
        token = signupRes.data.data.token;
        apiKey = signupRes.data.data.apiKey;
        if (!token || !apiKey) throw new Error('Signup failed to return token or apiKey');

        // 2. ME (PROFILE)
        console.log('\n[2] Testing Profile Fetch (Me)...');
        const meRes = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Profile Response:', meRes.status);
        if (meRes.data.data.user.email !== testEmail) throw new Error('Profile returned wrong email');

        // 3. DASHBOARD
        console.log('\n[3] Testing Dashboard...');
        const dRes = await axios.get(`${API_BASE}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Dashboard Data Keys:', Object.keys(dRes.data.data).join(', '));

        // 4. AI CHAT (Gateway)
        console.log('\n[4] Testing AI Gateway (Gemini)...');
        const chatRes = await axios.post(`${API_BASE}/v1/ai/chat`, {
            message: 'Say "Hello, World!"',
            provider: 'gemini'
        }, {
            headers: { 'X-GOD-API-Key': apiKey }
        });
        console.log('Chat Status:', chatRes.status);
        console.log('Chat Success:', chatRes.data.success);
        console.log('Tokens Logged:', chatRes.data._god.tokens);

        // Wait a second for async analytics to save
        await new Promise(r => setTimeout(r, 1000));

        // 5. DISCOVERY (Tokens & Stats)
        console.log('\n[5] Testing Providers Discovery...');
        const usageRes = await axios.get(`${API_BASE}/discovery/usage?days=7`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Usage Data Keys:', Object.keys(usageRes.data.data.usage).join(', '));
        const geminiStat = usageRes.data.data.usage.byProvider.find(p => p.provider === 'gemini');
        console.log('Gemini Stats:', geminiStat);
        if (!geminiStat || geminiStat.requests === 0) throw new Error('Analytics failed to track the gateway request');

        console.log('\n--- ALL E2E TESTS PASSED SUCCESSFULLY! ---');
        process.exit(0);

    } catch (err) {
        console.error('\n!!! E2E TEST FAILED !!!');
        console.error('Error Status:', err.response?.status);
        console.error('Error Message:', err.response?.data?.error || err.message);
        process.exit(1);
    }
}

testE2E();
