/**
 * API Service for PneumAI Backend
 * Handles API calls to the FastAPI backend
 */

import { getCurrentSession } from '../utils/unifiedDataManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper to get auth headers
const getAuthHeaders = () => {
  const session = getCurrentSession();
  if (session && session.sessionToken) {
    return {
      'Authorization': `Bearer ${session.sessionToken}`
    };
  }
  return {};
};

// ============================================================================
// APPOINTMENT API
// ============================================================================

export const appointmentAPI = {
  // Create a new appointment
  create: async (appointmentData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create appointment');
    }

    return response.json();
  },

  // Get appointments for a patient
  getByPatient: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/patient/${patientId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    return response.json();
  },

  // Get appointments for a doctor
  getByDoctor: async (doctorId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/doctor/${doctorId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }

    return response.json();
  },

  // Get specific appointment
  getById: async (appointmentId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appointment');
    }

    return response.json();
  },

  // Update appointment
  update: async (appointmentId, updateData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update appointment');
    }

    return response.json();
  },

  // Cancel appointment
  cancel: async (appointmentId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/${appointmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to cancel appointment');
    }

    return response.json();
  },
};

// ============================================================================
// MESSAGING API
// ============================================================================

export const messageAPI = {
  // Send a message
  send: async (messageData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send message');
    }

    return response.json();
  },

  // Get all messages for a user
  getByUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/user/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  },

  // Get conversation between two users
  getConversation: async (user1Id, user2Id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/conversation/${user1Id}/${user2Id}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }

    return response.json();
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to mark message as read');
    }

    return response.json();
  },

  // Delete message
  delete: async (messageId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }

    return response.json();
  },
};

// ============================================================================
// PATIENT API
// ============================================================================

export const patientAPI = {
  // Create a new patient
  create: async (patientData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No auth headers needed for registration usually, but harmless if added
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create patient');
    }

    return response.json();
  },

  // Get all patients
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch patients');
    }

    return response.json();
  },

  // Get patient by ID
  getById: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch patient');
    }

    return response.json();
  },

  // Update patient
  update: async (patientId, updateData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update patient');
    }

    return response.json();
  },

  // Delete patient
  delete: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/patients/${patientId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete patient');
    }

    return response.json();
  },
};

// ============================================================================
// DOCTOR API
// ============================================================================

export const doctorAPI = {
  // Get all doctors
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch doctors');
    }

    return response.json();
  },

  // Get doctor by ID
  getById: async (doctorId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/doctors/${doctorId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch doctor');
    }

    return response.json();
  },

  // Create a new doctor
  create: async (doctorData) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/doctors/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(doctorData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create doctor');
    }

    return response.json();
  },

  // Delete doctor
  delete: async (doctorId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete doctor');
    }

    return true;
  },
};

// ============================================================================
// SCAN API
// ============================================================================

export const scanAPI = {
  // Get all scans (for doctor/admin)
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/scans`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scans');
    }

    return response.json();
  },

  // Get scans for a patient
  getByPatient: async (patientId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/scans/patient/${patientId}/scans`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch patient scans');
    }

    return response.json();
  },

  // Get scan by ID
  getById: async (scanId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scan');
    }

    return response.json();
  },

  // Delete scan
  delete: async (scanId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete scan');
    }

    return response.json();
  }
};

export default {
  appointments: appointmentAPI,
  messages: messageAPI,
  patients: patientAPI,
  doctors: doctorAPI,
  scans: scanAPI,
};
