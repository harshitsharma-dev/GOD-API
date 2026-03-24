import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signup(form.name, form.email, form.password);
      const { token, user, apiKey: key } = res.data.data;
      localStorage.setItem('god_jwt', token);
      localStorage.setItem('god_user', JSON.stringify(user));
      setApiKey(key); // Show the key once before navigating
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show "save your key" screen before proceeding to dashboard
  if (apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-lg animate-fade-in">
          <div className="card" style={{ borderColor: 'rgba(63,185,80,0.4)', background: 'rgba(63,185,80,0.05)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎉</span>
              <h2 className="text-lg font-bold" style={{ color: 'var(--success)' }}>Account Created!</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Your GOD API key is shown below. <strong style={{ color: 'var(--warning)' }}>Copy it now — it will never be shown again.</strong>
            </p>
            <div className="relative">
              <div className="code-block text-xs break-all">{apiKey}</div>
              <button
                onClick={copyKey}
                className="btn btn-secondary absolute top-2 right-2"
                style={{ padding: '4px 10px', fontSize: '12px' }}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary w-full justify-center mt-5">
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%)' }}>
            <span className="text-2xl font-black text-white">G</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            One key. Every API. Zero friction.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--danger)', border: '1px solid rgba(248,81,73,0.3)' }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full justify-center" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
