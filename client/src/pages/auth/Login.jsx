import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

const DEMO_PROFILES = [
  { group: 'Core Platform', items: [
    { label: 'Super Admin — admin@nagaram.city', email: 'admin@nagaram.city', pass: 'Admin@123' },
    { label: 'Citizen — citizen@nagaram.city', email: 'citizen@nagaram.city', pass: 'Citizen@123' },
  ]},
  { group: 'Waste Management Department', items: [
    { label: 'Karan Malhotra (Manager)', email: 'waste.manager@nagaram.city', pass: 'Manager@123' },
    { label: 'Rajesh Kumar (Supervisor)', email: 'waste.supervisor@nagaram.city', pass: 'Supervisor@123' },
    { label: 'Madan Lal (Field Worker)', email: 'waste.worker@nagaram.city', pass: 'Worker@123' },
  ]},
  { group: 'Roads Department', items: [
    { label: 'Sunita Rao (Manager)', email: 'roads.manager@nagaram.city', pass: 'Manager@123' },
    { label: 'Vikram Singh (Supervisor)', email: 'roads.supervisor@nagaram.city', pass: 'Supervisor@123' },
    { label: 'Gopal Dutt (Field Worker)', email: 'roads.worker@nagaram.city', pass: 'Worker@123' },
  ]},
  { group: 'Water Supply Department', items: [
    { label: 'Alok Gupta (Manager)', email: 'water.manager@nagaram.city', pass: 'Manager@123' },
    { label: 'Sanjay Dutt (Supervisor)', email: 'water.supervisor@nagaram.city', pass: 'Supervisor@123' },
    { label: 'Ramesh Pal (Field Worker)', email: 'water.worker@nagaram.city', pass: 'Worker@123' },
  ]},
  { group: 'Electrical Department', items: [
    { label: 'Neha Joshi (Manager)', email: 'power.manager@nagaram.city', pass: 'Manager@123' },
    { label: 'Anil Sharma (Supervisor)', email: 'power.supervisor@nagaram.city', pass: 'Supervisor@123' },
    { label: 'Vijay Ram (Field Worker)', email: 'power.worker@nagaram.city', pass: 'Worker@123' },
  ]},
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (emailToUse, passwordToUse) => {
    const targetEmail = (emailToUse || email).trim();
    const targetPass = passwordToUse || password;

    if (!targetEmail || !targetPass) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login(targetEmail, targetPass);
      toast.success('Welcome to Nagaram!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLoginSubmit();
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLoginSubmit(demoEmail, demoPass);
  };

  const handleDropdownSelect = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [demoEmail, demoPass] = val.split('|');
    setEmail(demoEmail);
    setPassword(demoPass);
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
        <form className="auth-form" onSubmit={handleFormSubmit}>
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
                aria-label={showPassword ? "Hide password" : "Show password"}
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

          {/* Quick Demo Login Section */}
          <div className="auth-demo-section">
            <p className="auth-demo-title" id="demo-profiles-label">
              <HiLightningBolt style={{ color: 'var(--accent-primary)', verticalAlign: 'middle', marginRight: 4 }} />
              Quick demo login (1-Click)
            </p>

            {/* 1-Click Fast Action Chips */}
            <div className="auth-quick-chips" role="group" aria-labelledby="demo-profiles-label">
              <button
                type="button"
                className="auth-chip"
                disabled={loading}
                onClick={() => handleQuickDemo('admin@nagaram.city', 'Admin@123')}
                title="Login as Super Admin"
              >
                Super Admin
              </button>
              <button
                type="button"
                className="auth-chip"
                disabled={loading}
                onClick={() => handleQuickDemo('citizen@nagaram.city', 'Citizen@123')}
                title="Login as Citizen"
              >
                Citizen
              </button>
              <button
                type="button"
                className="auth-chip"
                disabled={loading}
                onClick={() => handleQuickDemo('waste.manager@nagaram.city', 'Manager@123')}
                title="Login as Waste Dept Manager"
              >
                Dept Manager
              </button>
            </div>

            {/* Full Role Dropdown for all municipal personas */}
            <div className="auth-demo-selector-group" style={{ marginTop: '8px' }}>
              <select
                className="auth-demo-select"
                onChange={handleDropdownSelect}
                value={email && password ? `${email}|${password}` : ""}
                aria-label="Select Demo Profile to Fill"
              >
                <option value="" disabled>Or select any municipal role...</option>
                {DEMO_PROFILES.map((group, gIdx) => (
                  <optgroup key={gIdx} label={group.group}>
                    {group.items.map((item, iIdx) => (
                      <option key={iIdx} value={`${item.email}|${item.pass}`}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
