import config from '../config/api';

/**
 * Wrapper around fetch with better error handling and logging
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${config.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Get auth token from localStorage if available
  const token = localStorage.getItem('token');
  
  // Merge default options with provided options
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {})
    },
    credentials: 'include',
    ...options
  };

  // For non-GET requests, ensure body is JSON stringified
  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle non-2xx responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // For DELETE requests that don't return content
    if (response.status === 204) {
      return {};
    }

    // Try to parse JSON, return text if not JSON
    try {
      return await response.json();
    } catch (e) {
      return await response.text();
    }
  } catch (error) {
    console.error('API Request Error:', {
      endpoint,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Helper methods for common HTTP methods
export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data, options = {}) => apiRequest(endpoint, { 
    ...options,
    method: 'POST',
    body: data
  }),
  put: (endpoint, data, options = {}) => apiRequest(endpoint, { 
    ...options,
    method: 'PUT',
    body: data
  }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { 
    ...options,
    method: 'DELETE' 
  })
};
