import { motion } from 'framer-motion';
import './StatCard.css';

export default function StatCard({ icon, label, value, subtitle, color = 'purple', delay = 0 }) {
  return (
    <motion.div
      className={`stat-card stat-card-${color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="stat-icon-wrap">
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </motion.div>
  );
}
