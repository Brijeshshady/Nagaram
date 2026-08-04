import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to Nagaram!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-page__bg">
        <div className="auth-page__orb auth-page__orb--1"></div>
        <div className="auth-page__orb auth-page__orb--2"></div>
        <div className="auth-page__orb auth-page__orb--3"></div>
      </div>

      <div className="auth-container animate-scale-in">
        {/* Branding */}
        <div className="auth-header">
          <div className="auth-header__icon">🏙️</div>
          <h1 className="auth-header__title">NAGARAM</h1>
          <p className="auth-header__subtitle">AI-Powered Smart City Platform</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-form__title">Welcome Back</h2>
          <p className="auth-form__desc">Sign in to your account to continue</p>

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <div className="auth-input-wrapper">
              <HiMail className="auth-input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nagaram.city"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <HiLockClosed className="auth-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner"></span>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Quick Demo Login */}
          <div className="auth-demo-section">
            <p className="auth-demo-title">Quick Demo Logins</p>
            <div className="auth-demo-buttons">
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => {
                  setEmail('admin@nagaram.city');
                  setPassword('Admin@123');
                }}
              >
                Super Admin
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => {
                  setEmail('citizen@nagaram.city');
                  setPassword('Citizen@123');
                }}
              >
                Demo Citizen
              </button>
            </div>
          </div>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register as Citizen</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
