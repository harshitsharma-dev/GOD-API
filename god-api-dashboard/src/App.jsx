import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import './index.css';

// Protected route: redirect to /login if no JWT
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('god_jwt');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// Public route: redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const token = localStorage.getItem('god_jwt');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        <Route path="/signup" element={
          <PublicRoute><SignupPage /></PublicRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
