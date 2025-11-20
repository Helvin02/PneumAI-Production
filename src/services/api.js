/**
 * PneumAI Backend API Service
 * Handles authentication and user management
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Helper to handle API responses
 */
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        const errorMessage = typeof error.detail === 'object'
            ? JSON.stringify(error.detail)
            : (error.detail || error.message || 'Request failed');
        throw new Error(errorMessage);
    }
    return response.json();
};

export const api = {
    // Authentication
    login: async (email, password, role) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role }),
        });
        return handleResponse(response);
    },

    logout: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return handleResponse(response);
    },

    getCurrentUser: async (token) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return handleResponse(response);
    },

    // Patient Management
    registerPatient: async (patientData) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData),
        });
        return handleResponse(response);
    },

    getPatient: async (id, token) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/patients/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return handleResponse(response);
    },

    // Doctor Management
    registerDoctor: async (doctorData) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doctorData),
        });
        return handleResponse(response);
    },

    getDoctor: async (id, token) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/doctors/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return handleResponse(response);
    },
};

export default api;
