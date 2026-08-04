import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/dataService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('nagaram_token');
      const savedUser = localStorage.getItem('nagaram_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify token is still valid
          const res = await authService.getMe();
          setUser(res.data.user);
          localStorage.setItem('nagaram_user', JSON.stringify(res.data.user));
        } catch {
          localStorage.removeItem('nagaram_token');
          localStorage.removeItem('nagaram_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const res = await authService.login(email, password);
      const { token, user: userData } = res.data;

      localStorage.setItem('nagaram_token', token);
      localStorage.setItem('nagaram_user', JSON.stringify(userData));
      setUser(userData);

      return userData;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      setError(null);
      const res = await authService.register(data);
      const { token, user: userData } = res.data;

      localStorage.setItem('nagaram_token', token);
      localStorage.setItem('nagaram_user', JSON.stringify(userData));
      setUser(userData);

      return userData;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nagaram_token');
    localStorage.removeItem('nagaram_user');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
