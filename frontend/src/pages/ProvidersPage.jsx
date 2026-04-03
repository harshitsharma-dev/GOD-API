import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { discoveryAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import ProviderCard from '../components/ProviderCard';

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [providersRes, usageRes] = await Promise.all([
        discoveryAPI.listProviders(),
        discoveryAPI.getUsage()
      ]);

      const providersList = providersRes.data.providers;
      const usageByProvider = usageRes.data.usage.byProvider || [];

      // Merge usage data into provider objects
      const mergedProviders = providersList.map(p => {
        const usage = usageByProvider.find(u => u.provider === p.name);
        return {
          ...p,
          usage: usage || { requests: 0, errors: 0, errorRate: '0%', avgResponseMs: 0, totalBytesOut: 0 }
        };
      });

      setProviders(mergedProviders);
    } catch (err) {
      console.error('Failed to fetch provider usage data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content">
        <header className="content-header">
          <h1>Discovery</h1>
          <p>Explore all 11+ AI providers accessible through your GOD API key.</p>
        </header>

        {loading ? (
          <div className="page-loader"><div className="spinner spinner-lg"></div></div>
        ) : (
          <div className="grid-3">
            {providers.map((p, i) => (
              <ProviderCard 
                key={p.name} 
                provider={p} 
                delay={i * 0.05} 
                onClick={(provider) => alert(`Information for ${provider.name} provider loaded from MCP metadata.`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
