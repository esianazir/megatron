import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}
function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on initial load and on auth changes
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      // If no token, clear any existing user data
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        // First try to use the saved user data if it exists
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
        }
        
        // Then try to refresh the user data from the server
        try {
          const response = await api.get('/auth/me');
          console.log('Auth response:', response); // Debug log
          
          // The response is the data itself, not wrapped in a data property
          if (response) {
            const userData = response;
            
            // Prepare user data for storage
            const userDataToStore = {
              _id: userData._id,
              name: userData.name || userData.displayName || (userData.email ? userData.email.split('@')[0] : 'User'),
              email: userData.email || '',
              avatar: userData.avatar || userData.photoURL || '',
              isAdmin: userData.isAdmin || false
            };
            
            // Save to localStorage
            localStorage.setItem('user', JSON.stringify(userDataToStore));
            
            // Update state
            setCurrentUser(userDataToStore);
          }
        } catch (error) {
          console.warn('Could not refresh user data from server, using cached data:', error);
          // Continue with the cached user data if available
          if (!savedUser) throw error; // Only throw if we don't have cached data
        }
        
      } catch (error) {
        console.error('Error loading user:', error);
        
        // Clear invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    // Set up a listener for storage events to handle logout from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed (e.g., by logout in another tab)
        setCurrentUser(null);
      } else if (e.key === 'user' && e.newValue) {
        // User data was updated
        try {
          setCurrentUser(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Error parsing updated user data:', err);
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array means this effect runs once on mount
  
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      // Save token and user data to localStorage
      localStorage.setItem('token', token);
      
      // Prepare user data for storage
      const userDataToStore = {
        _id: user._id,
        name: user.name || user.displayName || email.split('@')[0],
        email: user.email,
        avatar: user.avatar || user.photoURL || '',
        isAdmin: user.isAdmin || false
      };
      
      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(userDataToStore));
      
      // Update current user in state
      setCurrentUser(userDataToStore);
      
      return { 
        success: true,
        user: userDataToStore
      };
      
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial data on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your credentials and try again.'
      };
    }
  };

  const register = async (userData) => {
    console.log('Attempting to register with data:', userData);
    try {
      // Map the username field to name for the backend
      const registrationData = {
        ...userData,
        name: userData.username, // Map username to name
      };
      delete registrationData.username; // Remove the username field
      
      const response = await api.post('/auth/register', registrationData);
      console.log('Registration response:', response);
      
      const { token, user } = response;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Prepare user data for storage
      const userDataToStore = {
        _id: user._id,
        name: user.name || userData.name || userData.email.split('@')[0],
        email: user.email,
        avatar: user.avatar || '',
        isAdmin: user.isAdmin || false
      };
      
      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(userDataToStore));
      
      // Update current user in state
      setCurrentUser(userDataToStore);
      
      return { 
        success: true,
        user: userDataToStore
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.'
      };
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed. Please check the console for more details.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    navigate('/login');
  };

  const updateProfile = async (userData) => {
    try {
      // Get the current token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Update the profile on the server
      const response = await api.put('/auth/me/profile', userData, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Update the current user in state
      const updatedUser = { ...currentUser, ...userData };
      setCurrentUser(updatedUser);

      // Update the token if the server returned a new one
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      // Also update the user data in localStorage for persistence
      const userDataToStore = {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin
      };
      localStorage.setItem('user', JSON.stringify(userDataToStore));

      return { 
        success: true, 
        user: updatedUser,
        message: 'Profile updated successfully' 
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false,
        message: error.response?.data?.message || 'Update failed. Please try again.' 
      };
    }
  }

  // Calculate isAdmin based on currentUser
  const isAdmin = currentUser?.isAdmin === true;
  
  console.log('AuthContext - currentUser:', currentUser);
  console.log('AuthContext - isAdmin:', isAdmin);

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      register,
      logout,
      updateProfile,
      isAdmin,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
export default AuthContext;
