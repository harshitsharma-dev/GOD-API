# 🌐 GOD API — One Key. Every API. Zero Friction.

> A production-ready universal API gateway. Get **one API key** to access OpenAI, Stripe, GitHub, Twilio, and Google Maps through a single authenticated endpoint.

---

## 📁 Project Structure

```
god-api/
├── server.js                    # Entry point
├── .env.example                 # Environment template
├── package.json
└── src/
    ├── app.js                   # Express setup
    ├── config/
    │   └── db.js                # MongoDB connection
    ├── models/
    │   ├── Tenant.js            # Tenant + hashed API key
    │   └── UsageLog.js          # Analytics (TTL 30 days)
    ├── utils/
    │   ├── cryptoUtils.js       # Key generation + SHA-256 hashing
    │   └── response.js          # Uniform JSON envelope
    ├── providers/               # Adapter pattern
    │   ├── BaseProvider.js
    │   ├── OpenAIProvider.js
    │   ├── StripeProvider.js
    │   ├── GitHubProvider.js
    │   ├── TwilioProvider.js
    │   ├── GoogleMapsProvider.js
    │   └── ProviderFactory.js   # Registry + lazy singleton
    ├── middleware/
    │   ├── auth.js              # Bearer token → SHA-256 → DB lookup
    │   ├── rateLimiter.js       # Per-tenant rate limiting
    │   └── errorHandler.js      # Global error handler
    ├── services/
    │   ├── adminService.js      # Tenant lifecycle (create/suspend/activate)
    │   └── analyticsService.js  # Fire-and-forget usage logging
    ├── controllers/
    │   ├── adminController.js
    │   ├── gatewayController.js
    │   └── discoveryController.js
    └── routes/
        ├── index.js             # Root router
        ├── adminRoutes.js
        ├── gatewayRoutes.js
        └── discoveryRoutes.js
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- MongoDB running locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) URI

### 2. Install

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and provider keys
```

### 4. Run

```bash
npm run dev       # Development (auto-restart on change)
npm start         # Production
```

The server starts at `http://localhost:3000`.

---

## 📋 API Reference

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API info and endpoint map |
| `GET` | `/health` | Health check |

### Admin Endpoints (⚠️ secure in production)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/tenants` | Create tenant + get API key |
| `GET` | `/admin/tenants` | List all tenants |
| `PATCH` | `/admin/tenants/:id/suspend` | Suspend tenant |
| `PATCH` | `/admin/tenants/:id/activate` | Activate tenant |
| `GET` | `/admin/tenants/:id/usage` | Tenant usage stats |

### Gateway Endpoints (🔐 Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| `ANY` | `/v1/:provider/*` | Forward request to provider |
| `GET` | `/v1/_/providers` | List all providers |
| `GET` | `/v1/_/providers/:name` | Provider detail |
| `GET` | `/v1/_/providers/:name/tools` | MCP-style tool definitions |
| `GET` | `/v1/_/usage` | My usage stats |
| `GET` | `/v1/_/health` | Authenticated health check |

---

## 🧪 Step-by-Step Testing

### Step 1 — Create a Tenant

```bash
curl -X POST http://localhost:3000/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "email": "dev@acme.com", "plan": "pro"}'
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Tenant created. SAVE YOUR API KEY NOW — it cannot be retrieved again.",
  "data": {
    "tenantId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Acme Corp",
    "plan": "pro",
    "apiKey": "god_test_a8Kx9mPqR2nL5vTw7yBcDf3gH...",
    "keyPrefix": "god_test_a8Kx9m...",
    "createdAt": "2026-03-23T16:49:00.000Z"
  }
}
```

> ⚠️ **Save the `apiKey`** — it's shown exactly once and cannot be retrieved again.

### Step 2 — Discover Providers

```bash
curl http://localhost:3000/v1/_/providers \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

### Step 3 — Explore Tools (MCP-style)

```bash
curl http://localhost:3000/v1/_/providers/openai/tools \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

### Step 4 — Call OpenAI via GOD API

```bash
curl -X POST http://localhost:3000/v1/openai/v1/chat/completions \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello from GOD API!"}]
  }'
```

### Step 5 — List Stripe Charges

```bash
curl http://localhost:3000/v1/stripe/v1/charges?limit=5 \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

### Step 6 — Get GitHub User

```bash
curl http://localhost:3000/v1/github/user \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

### Step 7 — Geocode an Address

```bash
curl "http://localhost:3000/v1/google-maps/maps/api/geocode/json?address=Eiffel+Tower" \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

### Step 8 — Check Your Usage

```bash
curl "http://localhost:3000/v1/_/usage?days=7" \
  -H "Authorization: Bearer god_test_YOUR_KEY_HERE"
```

---

## 🔒 Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Key Format** | `god_{live\|test\|dev}_{base62_43chars}` — 256-bit entropy |
| **Key Storage** | SHA-256 hash only — plaintext key is never persisted |
| **Auth Speed** | SHA-256 is <1ms per request (bcrypt would be ~100ms) |
| **DB Lookup** | Indexed `apiKeyHash` field — O(1) lookup |
| **Rate Limiting** | Per-tenant (60 req/min default), configurable |
| **Headers** | Helmet security headers on all responses |
| **Error Safety** | No keys or tokens in logs or error messages |
| **Upstream Errors** | Normalized — internal stack traces never exposed |

---

## 🧩 Adding a New Provider

1. Create `src/providers/YourProvider.js`:

```javascript
const BaseProvider = require('./BaseProvider');

class YourProvider extends BaseProvider {
    constructor() {
        super('https://api.yourprovider.com', {
            Authorization: `Bearer ${process.env.YOUR_API_KEY}`,
        });
        this.name = 'yourprovider';
        this.displayName = 'Your Provider';
        this.description = 'Description of what it does';
        this.docsUrl = 'https://docs.yourprovider.com';
    }

    listTools() {
        return [/* your tools */];
    }
}

module.exports = YourProvider;
```

2. Register it in `src/providers/ProviderFactory.js`:

```javascript
const YourProvider = require('./YourProvider');

const REGISTRY = {
    // ... existing providers
    'yourprovider': () => new YourProvider(),
};
```

3. Add the API key to `.env.example`. That's it — routing and discovery are automatic.

---

## 🏗️ Architecture Flow

```
Client Request
    │  POST /v1/openai/v1/chat/completions
    │  Authorization: Bearer god_test_xxx
    ▼
Helmet + CORS + Morgan (global middleware)
    ▼
Auth Middleware
    │  SHA-256(god_test_xxx) → DB lookup → req.tenant
    ▼
Rate Limiter (per-tenant, 60/min)
    ▼
Gateway Controller
    │  provider = "openai"
    │  path = "/v1/chat/completions"
    │  tenant.canAccessProvider("openai") → true
    ▼
ProviderFactory.getProvider("openai")
    │  Returns cached OpenAIProvider instance
    ▼
BaseProvider.forwardRequest(...)
    │  Axios → https://api.openai.com/v1/chat/completions
    ▼
Response → res.json(result.data)
    ▼
AnalyticsService.logRequest(...)  ← async, non-blocking
    │  MongoDB UsageLog insert
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` / `production` |
| `OPENAI_API_KEY` | For OpenAI | `sk-...` |
| `STRIPE_SECRET_KEY` | For Stripe | `sk_test_...` or `sk_live_...` |
| `GITHUB_TOKEN` | For GitHub | `ghp_...` |
| `TWILIO_ACCOUNT_SID` | For Twilio | `AC...` |
| `TWILIO_AUTH_TOKEN` | For Twilio | Auth token |
| `GOOGLE_MAPS_API_KEY` | For Maps | GCP API key |
| `RATE_LIMIT_MAX_REQUESTS` | No | Req/min per tenant (default: 60) |

---

## 📊 Providers Summary

| Provider | Slug | Auth Method | Tools |
|----------|------|-------------|-------|
| OpenAI | `openai` | Bearer token | Chat, Models, Embeddings, DALL-E |
| Stripe | `stripe` | Basic Auth | Charges, Customers, PaymentIntents |
| GitHub | `github` | Bearer token | User, Repos, Issues, Search |
| Twilio | `twilio` | Basic Auth | Send SMS, List Messages |
| Google Maps | `google-maps` | Query param | Geocode, Directions, Places, Distance |
