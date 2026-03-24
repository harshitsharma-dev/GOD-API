async function runTests() {
  try {
    const rand = Date.now();
    const email = `test${rand}@godapi.com`;
    const password = "Password123!";

    console.log('--- 1. Testing Signup API ---');
    const signupRes = await fetch('http://localhost:3000/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "Tester", email, password })
    });
    const signupData = await signupRes.json();
    console.log('Signup Status:', signupRes.status);
    console.log('Signup Response:', JSON.stringify(signupData).substring(0, 100) + '...');
    
    if (signupRes.status !== 201) return;
    const apiKey = signupData.data.apiKey; // Correctly get the API key
    
    console.log('\n--- 2. Testing Login API ---');
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    const token = loginData.data.token; // Correctly get token

    console.log('\n--- 3. Testing Protected Route (/dashboard) ---');
    const dashRes = await fetch('http://localhost:3000/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Dashboard Status:', dashRes.status);

    console.log('\n--- 4. Testing OpenAI Route with GOD API Key ---');
    const aiRes = await fetch('http://localhost:3000/v1/openai/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{role: "user", content: "Say hello!"}], max_tokens: 5 })
    });
    const aiData = await aiRes.json();
    console.log('OpenAI Status:', aiRes.status);
    // Ignore AI actual failure if missing upstream mock, but status is what matters.

  } catch (err) {
    console.error('Error:', err.message);
  }
}
runTests();
