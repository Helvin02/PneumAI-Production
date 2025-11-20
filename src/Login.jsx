import React, { useState } from 'react';
import { Layers, Shield, UserPlus, Users, CheckCircle, ArrowRight, Lock, Mail, User } from 'lucide-react';
import './Login.css';
import { authenticateUser, createSession } from './utils/unifiedDataManager';
import { api } from './services/api';

const Login = ({ onClose, onLogin, onRegister }) => {
  const [activeTab, setActiveTab] = useState('patient');
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user types
    if (error) setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);

    // Check if we're logging in as admin (for demo purposes)
    if (activeTab === 'doctor' && formData.email === 'admin@pneumai.com' && formData.password === 'admin123') {
      setTimeout(() => {
        setIsSubmitting(false);
        createSession({
          email: 'admin@pneumai.com',
          username: 'admin',
          userType: 'admin',
          firstName: 'Admin',
          lastName: 'User'
        });
        onLogin('admin', 'Admin');
      }, 1000);
      return;
    }

    try {
      // Authenticate using backend API
      const response = await api.login(formData.email, formData.password, activeTab);

      // Map response to unifiedDataManager format for compatibility
      const nameParts = response.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const user = {
        id: response.user_id,
        firstName: firstName,
        lastName: lastName,
        email: response.email,
        userType: response.role,
        username: response.name,
        sessionToken: response.session_token
      };

      setTimeout(() => {
        setIsSubmitting(false);

        // Create session (stores in localStorage for other components)
        createSession(user);

        // Login successful
        onLogin(user.userType, user.username);
      }, 500);

    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Invalid email or password for this account type');
      console.error('Login error:', err);
    }
  };

  // Prevent click propagation from modal content to overlay
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-container" onClick={handleModalContentClick}>
        {/* Left Side Information Panel */}
        <div className="login-info">
          <div className="login-info-overlay"></div>
          <div className="login-info-content">
            <div className="login-info-logo">
              <img src="/assets/logo-medic.jpg" alt="PneumAI" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.5)' }} />
              <h2 style={{ marginLeft: '10px', fontSize: '1.5rem' }}>PneumAI</h2>
            </div>

            <h1 className="login-info-title">Supporting Lung Cancer Detection and Care</h1>
            <p className="login-info-description">
              PneumAI combines AI-assisted analysis with comprehensive emotional support
              for patients and helpful clinical insights for healthcare professionals.
            </p>

            <div className="login-features">
              <div className="login-feature">
                <div className="login-feature-icon">
                  <Shield size={20} />
                </div>
                <div>AI-assisted CT scan analysis to support healthcare professionals</div>
              </div>

              <div className="login-feature">
                <div className="login-feature-icon">
                  <Users size={20} />
                </div>
                <div>Connect with support communities and resources</div>
              </div>

              <div className="login-feature">
                <div className="login-feature-icon">
                  <CheckCircle size={20} />
                </div>
                <div>Clinical decision support for healthcare professionals</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Login/Register Form */}
        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
              {activeTab === 'doctor' && <small>Healthcare Professional Portal</small>}
              {activeTab === 'patient' && <small>Patient Portal</small>}
            </h2>
            <p className="login-form-subtitle">
              {isLogin ? 'Enter your credentials below' : 'Fill in your information to get started'}
            </p>
          </div>

          {/* User Type Tabs */}
          <div className="login-tabs">
            <div
              className={`login-tab ${activeTab === 'patient' ? 'active' : ''}`}
              onClick={() => setActiveTab('patient')}
            >
              Patient
            </div>
            <div
              className={`login-tab ${activeTab === 'doctor' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctor')}
            >
              Healthcare Professional
            </div>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <form className="login-form" onSubmit={handleLoginSubmit}>
              {error && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="name@example.com"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
                <a href="#" className="form-forgot-password">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="form-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="form-register">
                Don't have an account?
                <a href="#" className="form-register-link" onClick={(e) => {
                  e.preventDefault();
                  onRegister();
                }}>
                  Create account
                </a>
              </div>

              {activeTab === 'doctor' && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#dbeafe',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#1e40af'
                }}>
                  <strong>Healthcare Professional Demo:</strong> Use admin@pneumai.com / admin123
                </div>
              )}
            </form>
          ) : (
            /* Registration Form */
            <form className="login-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '13px',
                      color: '#6b7280'
                    }}
                  />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              {activeTab === 'doctor' && (
                <div className="form-group">
                  <label className="form-label">Medical License Number</label>
                  <div style={{ position: 'relative' }}>
                    <Shield
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '13px',
                        color: '#6b7280'
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="License Number"
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-checkbox-group">
                <input type="checkbox" className="form-checkbox" id="terms" />
                <label htmlFor="terms" className="form-checkbox-label">
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </label>
              </div>

              <button
                type="button"
                className="form-button"
                onClick={(e) => {
                  e.preventDefault();
                  onRegister();
                }}
              >
                Create Account
              </button>

              <div className="form-register">
                Already have an account?
                <a href="#" className="form-register-link" onClick={(e) => {
                  e.preventDefault();
                  setIsLogin(true);
                }}>
                  Sign in
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
