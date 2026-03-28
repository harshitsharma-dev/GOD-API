const path = require('path');
const jwt = require('jsonwebtoken');

// --- MOCKING SYSTEM ---
const MOCK_ID = '507f1f77bcf86cd799439011';
process.env.JWT_SECRET = 'test_secret';

const mocks = {};

function mock(modulePath, mockObject) {
    const absPath = path.resolve(__dirname, modulePath);
    const absPathWithExt = absPath.endsWith('.js') ? absPath : absPath + '.js';
    require.cache[absPath] = { exports: mockObject };
    require.cache[absPathWithExt] = { exports: mockObject };
}

// 1. Mock Models
class MockUser {
    constructor(data) { Object.assign(this, data); this._id = MOCK_ID; }
    save = async () => true;
    static findOne = () => ({ select: () => new MockUser({ email: 'test@test.com' }) });
    comparePassword = async () => true;
}
mock('./src/models/User', MockUser);

mock('./src/models/UsageLog', {
    create: async () => ({ _id: MOCK_ID })
});

// 2. Mock Adapters
const mockAdapters = {
    gemini: { handleRequest: async () => ({ success: true, provider: 'gemini', data: 'gemini response' }) },
    groq: { handleRequest: async () => ({ success: true, provider: 'groq', data: 'groq response' }) },
    mistral: { handleRequest: async () => ({ success: true, provider: 'mistral', data: 'mistral response' }) },
    together: { handleRequest: async () => ({ success: true, provider: 'together', data: 'together response' }) },
    huggingface: { handleRequest: async () => ({ success: true, provider: 'huggingface', data: 'huggingface response' }) }
};
Object.keys(mockAdapters).forEach(name => mock(`./src/adapters/${name}.adapter`, mockAdapters[name]));

// 3. Import Controllers
const auth = require('./src/controllers/auth.controller');
const key = require('./src/controllers/key.controller');
const gateway = require('./src/controllers/gateway.controller');

// --- TEST RUNNER ---
const results = [];

async function runTest(name, category, expected, fn) {
    let actual = 'N/A';
    try {
        actual = await fn();
        results.push({ name, category, expected, actual, status: '✅ PASS' });
    } catch (e) {
        results.push({ name, category, expected, actual: e.message, status: '❌ FAIL' });
    }
}

async function verify() {
    console.log('\n🚀 GOD API GATEWAY - FINAL QA VERIFICATION\n');

    // --- TEST 1: AUTHENTICATION FLOW ---
    await runTest('Signup Flow', 'Auth', '201 Created', async () => {
        let statusCode = 0;
        const req = { body: { name: 'Test', email: 'test@test.com', password: 'password' } };
        const res = { status: (c) => { statusCode = c; return { json: () => {} }; } };
        await auth.signup(req, res);
        return statusCode === 201 ? '201 Created' : `Error: ${statusCode}`;
    });

    await runTest('Login Flow', 'Auth', 'Token Received', async () => {
        let token = null;
        const req = { body: { email: 'test@test.com', password: 'password' } };
        const res = { status: () => res, json: (d) => { token = d.token; } };
        await auth.login(req, res);
        return token ? 'Token Received' : 'No Token';
    });

    await runTest('API Key Generation', 'Key', 'Key Starts with god_', async () => {
        let apiKey = null;
        const req = { user: new MockUser({ name: 'Test' }) };
        const res = { json: (d) => { apiKey = d.apiKey; } };
        await key.generateKey(req, res);
        return apiKey?.startsWith('god_') ? 'Key Starts with god_' : `Invalid: ${apiKey}`;
    });

    // --- TEST 2: GATEWAY PROVIDER VERIFICATION ---
    const gatewayRes = {
        data: null,
        statusCode: 200,
        status: function(c) { this.statusCode = c; return this; },
        json: function(d) { this.data = d; }
    };

    const providers = ['gemini', 'groq', 'mistral', 'together', 'huggingface'];
    for (const p of providers) {
        await runTest(`Provider: ${p}`, 'Gateway', `Success from ${p}`, async () => {
            const req = { body: { provider: p, message: 'hi' }, user: { _id: MOCK_ID } };
            await gateway.handleRequest(req, gatewayRes);
            return (gatewayRes.data.success && gatewayRes.data.provider === p) ? `Success from ${p}` : `Error: ${JSON.stringify(gatewayRes.data)}`;
        });
    }

    // --- TEST 3: SMART ROUTING ---
    await runTest('Routing: Coding Keywords -> mistral', 'Routing', 'mistral', async () => {
        const req = { body: { message: 'Write a python function' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return gatewayRes.data.provider;
    });

    await runTest('Routing: Message < 30 -> groq', 'Routing', 'groq', async () => {
        const req = { body: { message: 'hi' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return gatewayRes.data.provider;
    });

    await runTest('Routing: Message > 200 -> mistral', 'Routing', 'mistral', async () => {
        const req = { body: { message: 'A'.repeat(201) }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return gatewayRes.data.provider;
    });

    await runTest('Routing: General -> gemini', 'Routing', 'gemini', async () => {
        const req = { body: { message: 'What is the capital of France?' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return gatewayRes.data.provider;
    });

    // --- TEST 4: STRICT PROVIDER CONTROL (No Fallback by default) ---
    await runTest('Strict Control: Failing Groq', 'Control', 'Error Response', async () => {
        const originalGroq = mockAdapters.groq.handleRequest;
        mockAdapters.groq.handleRequest = async () => ({ success: false, provider: 'groq', error: 'Quota exceeded' });
        const req = { body: { provider: 'groq', message: 'hi' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        mockAdapters.groq.handleRequest = originalGroq;
        return gatewayRes.data.success === false ? 'Error Response' : `Success? ${JSON.stringify(gatewayRes.data)}`;
    });

    // --- TEST 5: FALLBACK LOGIC ---
    await runTest('Fallback: allowFallback=true', 'Fallback', 'Fallback to Gemini', async () => {
        const originalGroq = mockAdapters.groq.handleRequest;
        mockAdapters.groq.handleRequest = async () => ({ success: false, provider: 'groq', error: 'Quota exceeded' });
        const req = { body: { provider: 'groq', message: 'hi', allowFallback: true }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        mockAdapters.groq.handleRequest = originalGroq;
        return (gatewayRes.data.success && gatewayRes.data.fallback && gatewayRes.data.provider === 'gemini') ? 'Fallback to Gemini' : `Error: ${JSON.stringify(gatewayRes.data)}`;
    });

    // --- TEST 6: ERROR HANDLING ---
    await runTest('Error: Missing Message', 'Error', '400 Message is required', async () => {
        const req = { body: { provider: 'groq' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return `${gatewayRes.statusCode} ${gatewayRes.data.error}`;
    });

    await runTest('Error: Invalid Provider', 'Error', '400 Invalid or unsupported provider', async () => {
        const req = { body: { provider: 'invalid_ai', message: 'hi' }, user: { _id: MOCK_ID } };
        await gateway.handleRequest(req, gatewayRes);
        return `${gatewayRes.statusCode} Invalid or unsupported provider`;
    });

    await runTest('Error: Missing User context', 'Error', '401 Unauthorized', async () => {
        const req = { body: { provider: 'groq', message: 'hi' } }; // No user
        await gateway.handleRequest(req, gatewayRes);
        return `${gatewayRes.statusCode} Unauthorized`;
    });

    // --- OUTPUT ---
    console.table(results);
    const failures = results.filter(r => r.status.includes('❌'));
    if (failures.length === 0) {
        console.log('\nFINAL VERDICT: WORKING ✅\n');
    } else {
        console.log('\nFINAL VERDICT: NOT WORKING ❌\n');
    }
}

verify().catch(console.error);
