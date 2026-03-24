import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, rotateKey } from '../api/dashboard';

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

function ApiKeyCard({ prefix, onRotate, rotating }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);

  const copyPrefix = () => {
    navigator.clipboard.writeText(prefix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    const result = await onRotate();
    if (result) setNewKey(result);
  };

  const copyNewKey = () => {
    navigator.clipboard.writeText(newKey);
    setNewKeyCopied(true);
    setTimeout(() => setNewKeyCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>🔑 Your GOD API Key</h3>
        <span className="badge badge-success">● Active</span>
      </div>

      {/* Key display */}
      <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: '#010409', border: '1px solid var(--border)' }}>
        <span className="font-mono text-sm flex-1" style={{ color: '#7ee787' }}>
          {visible ? prefix : prefix.replace(/[^.]/g, (c, i) => i < 10 ? c : '•')}
        </span>
        <button
          onClick={() => setVisible(!visible)}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px' }}>
          {visible ? '🙈 Hide' : '👁 Show'}
        </button>
        <button
          onClick={copyPrefix}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px' }}>
          {copied ? '✓' : '📋'}
        </button>
      </div>

      {/* New key after rotation */}
      {newKey && (
        <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.3)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--success)' }}>
            ⚠️ New key (save now — shown once!)
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs flex-1 break-all" style={{ color: '#7ee787' }}>{newKey}</span>
            <button
              onClick={copyNewKey}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}>
              {newKeyCopied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      )}

      {/* Rotate button */}
      <button
        onClick={handleRotate}
        className="btn btn-danger"
        disabled={rotating}>
        {rotating ? <span className="spinner" style={{ borderTopColor: 'var(--danger)' }} /> : '🔄'}
        {rotating ? 'Rotating…' : 'Rotate Key'}
      </button>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        Old key stays valid for 24h after rotation.
      </p>
    </div>
  );
}

function ProviderCard({ name }) {
  const icons = {
    openai: '🤖', stripe: '💳', github: '🐙', twilio: '📱', 'google-maps': '🗺️',
  };
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
      <div className="text-2xl mb-2">{icons[name] || '🔌'}</div>
      <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{name}</p>
      <span className="badge badge-success mt-2">Available</span>
    </div>
  );
}

function ExampleRequest({ apiKey }) {
  const cmd = `curl -X POST http://localhost:3000/v1/openai/chat \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_GOD_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello!"}]}'`;

  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>⚡ Example Request</h3>
        <button onClick={copy} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <div className="code-block text-xs">{cmd}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('god_user') || '{}');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getDashboard();
      setData(res.data.data);
    } catch {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRotate = async () => {
    setRotating(true);
    try {
      const res = await rotateKey();
      await fetchDashboard(); // Refresh to get new prefix
      return res.data.data.newApiKey;
    } catch {
      alert('Key rotation failed. Please try again.');
      return null;
    } finally {
      setRotating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('god_jwt');
    localStorage.removeItem('god_user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="card text-center">
          <p className="text-lg mb-4">⚠️ {error}</p>
          <button onClick={fetchDashboard} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const { tenant, apiKey, usage, providers } = data;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
              style={{ background: 'linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%)' }}>G</div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>GOD API</span>
            <span className="badge badge-info">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              👤 {user.name || 'User'}
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome back, {user.name?.split(' ')[0] || 'Developer'} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Plan: <span className="font-semibold capitalize" style={{ color: 'var(--accent)' }}>{tenant.plan}</span>
            &nbsp;·&nbsp;Status: <span className="font-semibold" style={{ color: 'var(--success)' }}>{tenant.status}</span>
            &nbsp;·&nbsp;Key v{tenant.keyVersion}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={usage.totalRequests} sub="Last 30 days" />
          <StatCard label="Success Rate" value={`${usage.successRate}%`} sub={`${usage.successRequests} successful`} />
          <StatCard label="Errors" value={usage.errorRequests} sub="Last 30 days" />
          <StatCard label="Rate Limit" value={`${tenant.rateLimitPerMin}/min`} sub="Current plan" />
        </div>

        {/* API Key + Example */}
        <div className="grid md:grid-cols-2 gap-6">
          <ApiKeyCard
            prefix={apiKey.prefix}
            onRotate={handleRotate}
            rotating={rotating}
          />
          <ExampleRequest apiKey={apiKey.prefix} />
        </div>

        {/* Providers */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            🔌 Available Providers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {providers.map(p => <ProviderCard key={p.name} name={p.name} />)}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs pb-6" style={{ color: 'var(--text-muted)' }}>
          GOD API v1.0.0 · One Key. Every API. Zero Friction.
        </div>
      </main>
    </div>
  );
}
