import { motion } from 'framer-motion';
import './ProviderCard.css';

const providerMeta = {
  gemini: { emoji: '💎', color: '#4285f4', label: 'Google Gemini' },
  openai: { emoji: '🤖', color: '#10a37f', label: 'OpenAI GPT' },
  claude: { emoji: '🧠', color: '#d97706', label: 'Anthropic Claude' },
  groq: { emoji: '⚡', color: '#f97316', label: 'Groq' },
  mistral: { emoji: '🌀', color: '#6366f1', label: 'Mistral AI' },
  deepseek: { emoji: '🔬', color: '#3b82f6', label: 'DeepSeek' },
  together: { emoji: '🤝', color: '#8b5cf6', label: 'Together AI' },
  huggingface: { emoji: '🤗', color: '#fbbf24', label: 'Hugging Face' },
  openrouter: { emoji: '🔀', color: '#06b6d4', label: 'OpenRouter' },
  replicate: { emoji: '🔄', color: '#ec4899', label: 'Replicate' },
  perplexity: { emoji: '🔍', color: '#22d3ee', label: 'Perplexity' },
};

export default function ProviderCard({ provider, delay = 0, onClick }) {
  const meta = providerMeta[provider.name] || { emoji: '🔌', color: '#94a3b8', label: provider.name };
  const { usage } = provider;

  return (
    <motion.div
      className="provider-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onClick?.(provider)}
      style={{ '--provider-color': meta.color }}
    >
      <div className="provider-header">
        <div className="provider-icon">{meta.emoji}</div>
        <div className="provider-status">
          <span className={`badge ${usage?.requests > 0 ? 'badge-success' : 'badge-ghost'}`}>
            {usage?.requests > 0 ? 'Active' : 'Standby'}
          </span>
        </div>
      </div>

      <div className="provider-body">
        <h4 className="provider-name">{meta.label}</h4>
        <p className="provider-desc">{provider.description || `${meta.label} AI provider`}</p>
      </div>

      <div className="provider-metrics">
        <div className="metric">
          <span className="metric-label">Reqs</span>
          <span className="metric-value">{usage?.requests || 0}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Tokens</span>
          <span className="metric-value">{usage?.totalTokens || 0}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Err</span>
          <span className={`metric-value ${parseFloat(usage?.errorRate) > 5 ? 'text-danger' : parseFloat(usage?.errorRate) > 0 ? 'text-warning' : ''}`}>
            {usage?.errorRate || '0%'}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Lat</span>
          <span className="metric-value">{usage?.avgResponseMs ? `${usage.avgResponseMs}ms` : '---'}</span>
        </div>
      </div>
    </motion.div>
  );
}

export { providerMeta };
