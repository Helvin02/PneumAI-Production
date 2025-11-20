import { getCurrentSession } from '../utils/unifiedDataManager';

const API_BASE_URL = process.env.REACT_APP_YOLO_API_URL || '';

/**
 * Helper function to ensure image URLs are absolute
 * @param {string} url - The image URL (may be relative)
 * @returns {string} - Absolute URL
 */
const ensureAbsoluteUrl = (url) => {
  if (!url) return url;
  // If URL is already absolute (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Helper to get auth token
 */
const getAuthToken = () => {
  const session = getCurrentSession();
  return session?.sessionToken;
};

/**
 * Upload CT scan image for analysis
 * @param {File} file - The CT scan image file (DICOM, NIFTI, JPEG, or PNG)
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @param {string} patientId - Optional patient ID
 * @returns {Promise<Object>} - Scan results with detection data
 */
export const uploadScanForAnalysis = async (file, onProgress, patientId = null) => {
  try {
    const formData = new FormData();
    formData.append('scan', file);
    if (patientId) {
      formData.append('patientId', patientId);
    }
    formData.append('timestamp', new Date().toISOString());

    const headers = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/scans/analyze`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze scan');
    }

    const result = await response.json();

    // Fix relative URLs to absolute URLs
    if (result.results) {
      if (result.results.imageUrl) {
        result.results.imageUrl = ensureAbsoluteUrl(result.results.imageUrl);
      }
      if (result.results.annotatedImageUrl) {
        result.results.annotatedImageUrl = ensureAbsoluteUrl(result.results.annotatedImageUrl);
      }
    }

    return result;
  } catch (error) {
    console.error('Error uploading scan:', error);
    throw error;
  }
};

/**
 * Upload CT scan with XMLHttpRequest for progress tracking
 * @param {File} file - The CT scan image file
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @param {string} patientId - Optional patient ID
 * @returns {Promise<Object>} - Scan results
 */
export const uploadScanWithProgress = (file, onProgress, patientId = null) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('scan', file);
    if (patientId) {
      formData.append('patientId', patientId);
    }
    formData.append('timestamp', new Date().toISOString());

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        if (onProgress) {
          onProgress(percentComplete);
        }
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);

          // Fix relative URLs to absolute URLs
          if (result.results) {
            if (result.results.imageUrl) {
              result.results.imageUrl = ensureAbsoluteUrl(result.results.imageUrl);
            }
            if (result.results.annotatedImageUrl) {
              result.results.annotatedImageUrl = ensureAbsoluteUrl(result.results.annotatedImageUrl);
            }
          }

          resolve(result);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Send request
    xhr.open('POST', `${API_BASE_URL}/api/v1/scans/analyze`);

    // Add auth header
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

/**
 * Get scan result by ID
 * @param {string} scanId - The scan ID
 * @returns {Promise<Object>} - Scan result details
 */
export const getScanResult = async (scanId) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scan result');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching scan result:', error);
    throw error;
  }
};

/**
 * Get all scans for a patient
 * @param {string} patientId - The patient ID
 * @returns {Promise<Array>} - List of scans
 */
export const getPatientScans = async (patientId) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/scans/patient/${patientId}/scans`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch patient scans');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching patient scans:', error);
    throw error;
  }
};

/**
 * Process batch of CT scan slices
 * @param {Array<File>} files - Array of CT scan slice files
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Batch analysis results
 */
export const uploadBatchScans = async (files, onProgress) => {
  try {
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append(`scans`, file);
    });

    formData.append('timestamp', new Date().toISOString());
    formData.append('batch', 'true');

    const headers = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/scans/batch-analyze`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze batch');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading batch scans:', error);
    throw error;
  }
};

/**
 * Get detection confidence threshold recommendations
 * @returns {Promise<Object>} - Threshold configuration
 */
export const getDetectionThresholds = async () => {
  try {
    const headers = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/config/thresholds`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch thresholds');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    // Return defaults if API fails
    return {
      highRisk: 0.8,
      mediumRisk: 0.5,
      lowRisk: 0.3,
    };
  }
};

/**
 * Check API health status
 * @returns {Promise<Object>} - API health status
 */
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('API is not healthy');
    }

    return await response.json();
  } catch (error) {
    console.error('API health check failed:', error);
    throw error;
  }
};

export default {
  uploadScanForAnalysis,
  uploadScanWithProgress,
  getScanResult,
  getPatientScans,
  uploadBatchScans,
  getDetectionThresholds,
  checkApiHealth,
};
