import config from '../config/api';

/**
 * Wrapper around fetch with better error handling and logging
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${config.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Merge default options with provided options
  const fetchOptions = {
    ...config.getFetchOptions(),
    ...options,
    headers: {
      ...config.getFetchOptions().headers,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // For DELETE requests that don't return content
    if (response.status === 204) {
      return {};
    }

    return await response.json();
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
  post: (endpoint, data) => apiRequest(endpoint, { 
    method: 'POST',
    body: JSON.stringify(data) 
  }),
  put: (endpoint, data) => apiRequest(endpoint, { 
    method: 'PUT',
    body: JSON.stringify(data) 
  }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};
