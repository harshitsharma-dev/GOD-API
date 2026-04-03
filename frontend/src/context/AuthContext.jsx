import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('god_token'));

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.user);
      setTenant(res.data.tenant);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('god_token', newToken);
    setToken(newToken);
    setUser(userData);
    return res;
  };

  const signup = async (name, email, password) => {
    const res = await authAPI.signup(name, email, password);
    const { token: newToken, user: userData, apiKey } = res.data;
    localStorage.setItem('god_token', newToken);
    if (apiKey) localStorage.setItem('god_api_key', apiKey);
    setToken(newToken);
    setUser(userData);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('god_token');
    localStorage.removeItem('god_api_key');
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, token, login, signup, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
