import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiUser, HiMail, HiPhone, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './Auth.css';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success('Registration successful! Welcome to Nagaram.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__bg">
        <div className="auth-page__orb auth-page__orb--1"></div>
        <div className="auth-page__orb auth-page__orb--2"></div>
        <div className="auth-page__orb auth-page__orb--3"></div>
      </div>

      <div className="auth-container animate-scale-in">
        <div className="auth-header">
          <div className="auth-header__icon">🏙️</div>
          <h1 className="auth-header__title">NAGARAM</h1>
          <p className="auth-header__subtitle">Join as a Citizen</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-form__title">Create Account</h2>
          <p className="auth-form__desc">Report civic issues and help build a smarter city</p>

          <div className="auth-field">
            <label htmlFor="name">Full Name</label>
            <div className="auth-input-wrapper">
              <HiUser className="auth-input-icon" />
              <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email Address</label>
            <div className="auth-input-wrapper">
              <HiMail className="auth-input-icon" />
              <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" required />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Phone Number</label>
            <div className="auth-input-wrapper">
              <HiPhone className="auth-input-icon" />
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="9876543210" />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <div className="auth-input-wrapper">
              <HiLockClosed className="auth-input-icon" />
              <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
              <button type="button" className="auth-toggle-pwd" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <HiEyeOff /> : <HiEye />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="auth-input-wrapper">
              <HiLockClosed className="auth-input-icon" />
              <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="auth-spinner"></span> : 'Create Account'}
          </button>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
