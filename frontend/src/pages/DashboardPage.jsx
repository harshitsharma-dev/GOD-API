import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import UsageChart from '../components/UsageChart';
import './DashboardPage.css';

export default function DashboardPage() {
  const { tenant } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showFullKey, setShowFullKey] = useState(false);
  const [localKey, setLocalKey] = useState(() => localStorage.getItem('god_api_key'));

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardAPI.getData();
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKey = async () => {
    if (!window.confirm('Are you sure you want to rotate your API key? The current key will expire in 24 hours.')) return;
    
    setIsRotating(true);
    try {
      const res = await dashboardAPI.rotateKey();
      const k = res.data.newApiKey;
      setNewKey(k);
      setLocalKey(k);
      localStorage.setItem('god_api_key', k);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to rotate key');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    alert('API Key copied to clipboard!');
  };

  if (loading) {
    return <div className="page-loader"><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <header className="content-header">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1>Dashboard Overview</h1>
            <p>Welcome back to your GOD API command center.</p>
          </motion.div>
        </header>

        <section className="stats-grid grid-4">
          <StatCard 
            icon="🔌" 
            label="Total Requests" 
            value={data?.usage?.totalRequests || '0'} 
            subtitle="Last 7 days" 
            color="purple"
            delay={0.1}
          />
          <StatCard 
            icon="🪙" 
            label="Tokens Used" 
            value={`${data?.usage?.totalTokens || 0}`} 
            subtitle="Current billing cycle" 
            color="cyan"
            delay={0.2}
          />
          <StatCard 
            icon="⚡" 
            label="Avg Response" 
            value="182ms" 
            subtitle="System performance" 
            color="amber"
            delay={0.3}
          />
          <StatCard 
            icon="💎" 
            label="Current Plan" 
            value={tenant?.plan?.toUpperCase() || 'FREE'} 
            subtitle="Account tier" 
            color="pink"
            delay={0.4}
          />
        </section>

        <div className="dashboard-grid">
          <div className="dashboard-left">
            <UsageChart data={data?.usage?.dailyUsage} />
          </div>

          <div className="dashboard-right">
            <motion.div 
              className="api-key-card glass-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="card-header">
                <h3>Your API Key</h3>
                <span className={`badge ${newKey ? 'badge-warning' : 'badge-purple'}`}>
                  {newKey ? 'New Key Generated' : 'v' + (data?.tenant?.keyVersion || 1)}
                </span>
              </div>
              
              <div className="api-key-display">
                {newKey ? (
                  <div className="new-key-alert">
                    <p className="warning-text">⚠️ SAVE THIS KEY NOW. IT WILL NOT BE SHOWN AGAIN.</p>
                    <div className="code-block">{newKey}</div>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleCopy(newKey)}>Copy Key</button>
                  </div>
                ) : (
                  <div className="key-preview-container">
                    <div className="key-preview">
                      <span className="key-text">
                        {showFullKey && localKey 
                          ? localKey 
                          : `${data?.apiKey?.prefix || 'god_live'}••••••••••••••••`}
                      </span>
                    </div>
                    <div className="key-actions-row">
                      <button 
                        className="btn btn-xs btn-ghost" 
                        onClick={() => setShowFullKey(!showFullKey)}
                        disabled={!localKey}
                        title={!localKey ? "Key not cached. Rotate to see full key." : ""}
                      >
                        {showFullKey ? 'Hide' : 'Show'}
                      </button>
                      <button 
                        className="btn btn-xs btn-ghost" 
                        onClick={() => handleCopy(localKey)}
                        disabled={!localKey}
                      >
                        Copy
                      </button>
                    </div>
                    {!localKey && <p className="key-hint">Key not found in browser cache. Rotate to generate a new copy.</p>}
                  </div>
                )}
              </div>

              <div className="card-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleRotateKey}
                  disabled={isRotating}
                >
                  {isRotating ? 'Rotating...' : 'Rotate Key'}
                </button>
              </div>
            </motion.div>

            <motion.div 
              className="quick-info-card glass-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3>Account Limits</h3>
              <div className="limit-item">
                <span>Rate Limit</span>
                <span className="limit-value">{data?.tenant?.rateLimitPerMin || 60}/min</span>
              </div>
              <div className="limit-bar"><div className="limit-progress" style={{ width: '15%' }}></div></div>
              
              <div className="limit-item mt-4">
                <span>Monthly Tokens</span>
                <span className="limit-value">15.2k / 100k</span>
              </div>
              <div className="limit-bar"><div className="limit-progress" style={{ width: '15.2%', background: 'var(--accent-cyan)' }}></div></div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
