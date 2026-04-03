import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gatewayAPI, discoveryAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { providerMeta } from '../components/ProviderCard';
import './PlaygroundPage.css';

export default function PlaygroundPage() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [smartRouting, setSmartRouting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchProviders();
    scrollToBottom();
  }, [history]);

  const fetchProviders = async () => {
    try {
      const res = await discoveryAPI.listProviders();
      setProviders(res.data.providers);
    } catch (err) {
      console.error('Failed to fetch providers');
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMsg = { role: 'user', content: message };
    setHistory(prev => [...prev, userMsg]);
    setMessage('');
    setIsLoading(true);

    try {
      const res = await gatewayAPI.chat(message, smartRouting ? null : selectedProvider);
      const assistantMsg = { 
        role: 'assistant', 
        content: res.data, 
        meta: res._god 
      };
      setHistory(prev => [...prev, assistantMsg]);
    } catch (err) {
      setHistory(prev => [...prev, { role: 'error', content: err.message || 'Failed to get response' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="main-content chat-layout">
        <div className="playground-sidebar glass-card">
          <h3>Settings</h3>
          
          <div className="settings-group">
            <label>Routing Mode</label>
            <div className="toggle-box">
              <button 
                className={`toggle-btn ${smartRouting ? 'active' : ''}`}
                onClick={() => setSmartRouting(true)}
              >
                Smart
              </button>
              <button 
                className={`toggle-btn ${!smartRouting ? 'active' : ''}`}
                onClick={() => setSmartRouting(false)}
              >
                Manual
              </button>
            </div>
          </div>

          {!smartRouting && (
            <div className="settings-group animate-fade-in">
              <label>Select Provider</label>
              <select 
                className="input-field" 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <option value="">Select a provider...</option>
                {providers.map(p => (
                  <option key={p.name} value={p.name}>{providerMeta[p.name]?.label || p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="playground-info">
            <p className="info-text">
              {smartRouting 
                ? "Smart Routing uses GOD API's logic to pick the cheapest/fastest provider for your query."
                : "Manual mode routes directly to your chosen AI provider."}
            </p>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-history">
            {history.length === 0 && (
              <div className="chat-empty">
                <div className="empty-icon">🧠</div>
                <h2>AI Playground</h2>
                <p>Test the gateway. Send a message to get started.</p>
              </div>
            )}
            
            <AnimatePresence>
              {history.map((msg, i) => (
                <motion.div 
                  key={i}
                  className={`chat-message ${msg.role}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="message-bubble">
                    {msg.role === 'error' ? (
                      <div className="error-content">⚠️ {msg.content}</div>
                    ) : (
                      <>
                        <div className="message-content">{msg.content}</div>
                        {msg.meta && (
                          <div className="message-meta">
                            <span className="meta-badge">
                              {providerMeta[msg.meta.provider]?.emoji} {msg.meta.provider}
                            </span>
                            <span className="meta-time">{msg.meta.responseTimeMs}ms</span>
                            <span className="meta-tokens">{msg.meta.tokens.total} tokens</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <div className="chat-message assistant loading">
                <div className="message-bubble">
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <textarea 
              className="chat-input"
              placeholder="Type your message here..."
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
            />
            <button className="btn btn-primary send-btn" disabled={!message.trim() || isLoading}>
              Send →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
