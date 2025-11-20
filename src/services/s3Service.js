/**
 * AWS S3 Service for Secure Image Storage
 * Handles image uploads, thumbnail generation, and secure storage
 */

import CryptoJS from 'crypto-js';
import { getCurrentSession } from '../utils/unifiedDataManager';

const S3_BUCKET = process.env.REACT_APP_S3_BUCKET || 'pneumai-scans';
const S3_REGION = process.env.REACT_APP_S3_REGION || 'us-east-1';
const API_ENDPOINT = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Helper to get auth headers
 */
const getAuthHeaders = () => {
  const session = getCurrentSession();
  if (session && session.sessionToken) {
    return {
      'Authorization': `Bearer ${session.sessionToken}`
    };
  }
  return {};
};

/**
 * Generate SHA-256 hash of an image file
 * @param {File} file - The image file
 * @returns {Promise<string>} - Hexadecimal hash string
 */
export const hashImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file for hashing'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generate a thumbnail from an image file
 * @param {File} file - The image file
 * @param {number} maxWidth - Maximum width of thumbnail (default: 200)
 * @param {number} maxHeight - Maximum height of thumbnail (default: 200)
 * @returns {Promise<Blob>} - Thumbnail image blob
 */
export const generateThumbnail = async (file, maxWidth = 200, maxHeight = 200) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail generation'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file for thumbnail'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Get presigned URL for S3 upload
 * @param {string} fileName - Name of the file
 * @param {string} fileType - MIME type of the file
 * @param {string} fileHash - SHA-256 hash of the file
 * @returns {Promise<Object>} - Presigned URL and metadata
 */
export const getPresignedUploadUrl = async (fileName, fileType, fileHash) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/api/v1/storage/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        fileName,
        fileType,
        fileHash,
        bucket: S3_BUCKET,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get presigned URL');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
};

/**
 * Upload image to S3 using presigned URL
 * @param {string} presignedUrl - Presigned S3 URL
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - S3 object key
 */
export const uploadToS3 = (presignedUrl, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Extract S3 key from URL
        const url = new URL(presignedUrl);
        const s3Key = url.pathname.substring(1); // Remove leading slash
        resolve(s3Key);
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('S3 upload cancelled'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
};

/**
 * Complete upload workflow: hash, thumbnail, upload to S3
 * @param {File} file - The image file
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} - Upload metadata including hash, S3 keys, and URLs
 */
export const uploadImageComplete = async (file, onProgress) => {
  try {
    // Step 1: Hash the image (10% progress)
    if (onProgress) onProgress(10);
    const fileHash = await hashImage(file);

    // Step 2: Generate thumbnail (20% progress)
    if (onProgress) onProgress(20);
    const thumbnailBlob = await generateThumbnail(file);

    // Step 3: Get presigned URLs for both original and thumbnail (30% progress)
    if (onProgress) onProgress(30);
    const [originalUrl, thumbnailUrl] = await Promise.all([
      getPresignedUploadUrl(file.name, file.type, fileHash),
      getPresignedUploadUrl(`thumb_${file.name}`, 'image/jpeg', fileHash),
    ]);

    // Step 4: Upload original image (30-70% progress)
    const originalKey = await uploadToS3(
      originalUrl.uploadUrl,
      file,
      (progress) => {
        if (onProgress) onProgress(30 + (progress * 0.4)); // 30% + 40% range
      }
    );

    // Step 5: Upload thumbnail (70-100% progress)
    const thumbnailKey = await uploadToS3(
      thumbnailUrl.uploadUrl,
      new File([thumbnailBlob], `thumb_${file.name}`, { type: 'image/jpeg' }),
      (progress) => {
        if (onProgress) onProgress(70 + (progress * 0.3)); // 70% + 30% range
      }
    );

    if (onProgress) onProgress(100);

    return {
      fileHash,
      originalKey,
      thumbnailKey,
      originalUrl: originalUrl.accessUrl,
      thumbnailUrl: thumbnailUrl.accessUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Complete upload failed:', error);
    throw error;
  }
};

/**
 * Check if an image with this hash already exists
 * @param {string} fileHash - SHA-256 hash of the file
 * @returns {Promise<Object|null>} - Existing image metadata or null
 */
export const checkDuplicateImage = async (fileHash) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/api/v1/storage/check-duplicate/${fileHash}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
    });

    if (response.status === 404) {
      return null; // No duplicate found
    }

    if (!response.ok) {
      throw new Error('Failed to check for duplicates');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return null; // Assume no duplicate on error
  }
};

/**
 * Get image from S3 by key
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} - Signed URL to access the image
 */
export const getImageUrl = async (s3Key) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/api/v1/storage/signed-url/${encodeURIComponent(s3Key)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
};

export default {
  hashImage,
  generateThumbnail,
  getPresignedUploadUrl,
  uploadToS3,
  uploadImageComplete,
  checkDuplicateImage,
  getImageUrl,
};
