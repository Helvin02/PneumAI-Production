import React, { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, X, Calendar } from 'lucide-react';
import './PatientRegistration.css';
import { api } from './services/api';

const PatientRegistration = ({ onClose, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Date of birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 1 || age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);

      try {
        // Create patient using backend API
        const newPatient = {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
          phone: '', // Optional
          dateOfBirth: formData.dateOfBirth,
          gender: 'prefer_not_to_say', // Default or add field to form
          medicalHistory: '' // Optional
        };

        await api.registerPatient(newPatient);

        // Success
        setIsSubmitting(false);
        setRegistrationSuccess(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          onBackToLogin();
        }, 2000);

      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ ...errors, submit: error.message || 'Registration failed. Please try again.' });
        setIsSubmitting(false);
      }
    }
  };

  // Prevent click propagation from modal content to overlay
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="registration-overlay" onClick={onClose}>
      <div className="registration-container" onClick={handleModalContentClick}>
        <div className="registration-header">
          <h2>Create Patient Account</h2>
          <button className="close-button" onClick={onClose} type="button">
            <X className="icon-sm" />
          </button>
        </div>

        {registrationSuccess ? (
          <div className="success-message">
            <h3>Registration Successful!</h3>
            <p>Your patient account has been created. Redirecting you to login...</p>
          </div>
        ) : (
          <>
            <p className="registration-intro">
              Join PneumAI to access your health information, connect with healthcare providers, and more.
            </p>

            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">
                    <User className="input-icon" />
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">
                    <User className="input-icon" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">
                  <Calendar className="input-icon" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
                {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail className="input-icon" />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock className="input-icon" />
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min 6 characters)"
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <Lock className="input-icon" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>

              {errors.submit && <div className="error-text" style={{ marginBottom: '1rem' }}>{errors.submit}</div>}

              <div className="privacy-notice">
                By creating an account, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </div>

              <button
                type="submit"
                className={`register-button ${isSubmitting ? 'submitting' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="back-to-login">
              <button className="back-button" onClick={onBackToLogin} type="button">
                <ArrowLeft className="icon-sm" /> Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientRegistration;
