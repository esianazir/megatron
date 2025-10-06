// API Configuration
const config = {
  // Use REACT_APP_API_URL from environment variables, fallback to Render URL
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://megatron-backend-1234.onrender.com/api',
  
  // Add browser detection
  isSafari: () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  
  // Common fetch options
  getFetchOptions: (method = 'GET', data = null) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include'  // Important for cookies/sessions
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return options;
  },
  
  // Helper function to get full API URL
  getApiUrl: (endpoint) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'https://megatron-backend.onrender.com/api';
    return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
};

export default config;
