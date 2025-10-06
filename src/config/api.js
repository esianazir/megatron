// API Configuration
const config = {
  // Force using the production API URL
  API_BASE_URL: 'https://megatron-backend.onrender.com/api',
  
  // Add browser detection
  isSafari: () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  
  // Common fetch options with enhanced compatibility
  getFetchOptions: (method = 'GET', data = null) => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Accept', 'application/json');
    headers.append('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    const options = {
      method: method.toUpperCase(),
      headers: headers,
      credentials: 'include', // Send cookies with the request
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      referrerPolicy: 'no-referrer-when-downgrade',
      _t: timestamp // Cache buster
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return options;
  },
  
  // Enhanced API request handler
  request: async (endpoint, options = {}) => {
    const url = config.getApiUrl(endpoint);
    const fetchOptions = {
      ...config.getFetchOptions(options.method, options.data),
      ...options
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
  },
  
  // Helper function to get full API URL
  getApiUrl: (endpoint) => {
    const baseUrl = 'https://megatron-backend.onrender.com/api';
    const url = `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    console.log('API Request URL:', url); // Debug log
    return url;
  }
};

// Helper methods for common HTTP methods
const api = {
  get: (endpoint) => config.request(endpoint, { method: 'GET' }),
  post: (endpoint, data) => config.request(endpoint, { method: 'POST', data }),
  put: (endpoint, data) => config.request(endpoint, { method: 'PUT', data }),
  delete: (endpoint) => config.request(endpoint, { method: 'DELETE' })
};

export { api as default, config as apiConfig };
