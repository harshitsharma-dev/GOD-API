import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const providers = [
  { name: 'Gemini', emoji: '💎', color: '#4285f4' },
  { name: 'OpenAI', emoji: '🤖', color: '#10a37f' },
  { name: 'Claude', emoji: '🧠', color: '#d97706' },
  { name: 'Groq', emoji: '⚡', color: '#f97316' },
  { name: 'Mistral', emoji: '🌀', color: '#6366f1' },
  { name: 'DeepSeek', emoji: '🔬', color: '#3b82f6' },
  { name: 'Together', emoji: '🤝', color: '#8b5cf6' },
  { name: 'HuggingFace', emoji: '🤗', color: '#fbbf24' },
  { name: 'OpenRouter', emoji: '🔀', color: '#06b6d4' },
  { name: 'Replicate', emoji: '🔄', color: '#ec4899' },
  { name: 'Perplexity', emoji: '🔍', color: '#22d3ee' },
];

const features = [
  {
    icon: '🔑',
    title: 'One Key, Every API',
    desc: 'Single API key to access 11+ top AI providers. No more managing dozens of credentials.',
  },
  {
    icon: '🧠',
    title: 'Smart Routing',
    desc: 'AI-powered request routing automatically selects the best provider for each query.',
  },
  {
    icon: '📊',
    title: 'Usage Analytics',
    desc: 'Real-time dashboards showing request counts, token usage, and provider performance.',
  },
  {
    icon: '🛡️',
    title: 'Enterprise Security',
    desc: 'JWT auth, API key rotation with grace periods, rate limiting, and tenant isolation.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Sub-100ms gateway overhead. Your requests reach providers at maximum speed.',
  },
  {
    icon: '🔄',
    title: 'Zero Friction',
    desc: 'Drop-in replacement for any AI API. Switch providers without changing a single line of code.',
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="landing">
      {/* Animated Background */}
      <div className="landing-bg">
        <div
          className="bg-orb bg-orb-1"
          style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)` }}
        />
        <div
          className="bg-orb bg-orb-2"
          style={{ transform: `translate(${-mousePos.x * 20}px, ${-mousePos.y * 20}px)` }}
        />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-grid" />
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="nav-logo-icon">G</div>
          <span className="nav-logo-text">GOD API</span>
        </div>
        <div className="landing-nav-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">Dashboard →</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Log In</Link>
              <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>Powering 11+ AI Providers</span>
          </div>

          <h1 className="hero-title">
            One Key.<br />
            <span className="gradient-text">Every AI API.</span><br />
            Zero Friction.
          </h1>

          <p className="hero-subtitle">
            The Universal AI Gateway that gives you a single API key to access
            OpenAI, Gemini, Claude, Mistral, and 7 more providers.
            Smart routing. Usage analytics. Enterprise security.
          </p>

          <div className="hero-cta">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Start Free — No Credit Card →
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">11+</span>
              <span className="hero-stat-label">AI Providers</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">1</span>
              <span className="hero-stat-label">API Key</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">0</span>
              <span className="hero-stat-label">Friction</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Provider Marquee */}
      <section className="providers-section">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Access Every Major AI Provider
        </motion.h2>
        <div className="provider-marquee">
          <div className="marquee-track">
            {[...providers, ...providers].map((p, i) => (
              <div key={i} className="marquee-item" style={{ '--pc': p.color }}>
                <span className="marquee-emoji">{p.emoji}</span>
                <span className="marquee-name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Why <span className="gradient-text">GOD API</span>?
        </motion.h2>
        <p className="features-subtitle">Everything you need to build with AI, nothing you don't.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="feature-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Code Example */}
      <section className="code-section">
        <motion.div
          className="code-showcase glass-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Simple Integration</h2>
          <p className="code-desc">Just one API call. That's all you need.</p>
          <div className="code-block-lg">
            <div className="code-header">
              <span className="code-dot code-dot-red" />
              <span className="code-dot code-dot-yellow" />
              <span className="code-dot code-dot-green" />
              <span className="code-filename">request.js</span>
            </div>
            <pre className="code-pre">{`const response = await fetch('https://api.god-api.com/v1/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-god-api-key'
  },
  body: JSON.stringify({
    message: 'Explain quantum computing',
    provider: 'gemini'  // optional — smart routing picks the best!
  })
});

const data = await response.json();
console.log(data);`}</pre>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2>Ready to simplify your AI stack?</h2>
          <p>Start building with 11+ AI providers through a single, powerful gateway.</p>
          {!user && (
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Your GOD API Key — Free →
            </Link>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-logo">
          <div className="nav-logo-icon">G</div>
          <span>GOD API</span>
        </div>
        <p>One Key. Every API. Zero Friction.</p>
        <p className="footer-copy">© 2026 GOD API. All rights reserved.</p>
      </footer>
    </div>
  );
}
