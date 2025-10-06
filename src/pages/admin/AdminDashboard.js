import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  PostAdd as PostAddIcon,
  People as PeopleIcon,
  ArrowForwardIos as ArrowForwardIosIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
};

// Mock data
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', joinDate: '2023-01-15', lastLogin: '2023-10-04' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active', joinDate: '2023-02-20', lastLogin: '2023-10-03' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'banned', joinDate: '2023-03-10', lastLogin: '2023-09-28' },
];

const mockContent = [
  { id: 1, title: 'Amazing Sunset', type: 'image', author: 'John Doe', status: 'active', uploadDate: '2023-09-20' },
  { id: 2, title: 'Cute Cat Video', type: 'video', author: 'Jane Smith', status: 'reported', uploadDate: '2023-09-15' },
  { id: 3, title: 'Mountain View', type: 'image', author: 'Bob Johnson', status: 'pending', uploadDate: '2023-09-10' },
];

const AdminDashboard = ({ defaultTab = 'dashboard' }) => {
  const { currentUser, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  
  // Debug logging
  console.log('Current User:', currentUser);
  console.log('Current Path:', location.pathname);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!currentUser || !currentUser.isAdmin) {
      console.log('Unauthorized access - redirecting to home');
      console.log('Current user admin status:', currentUser?.isAdmin);
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  // State for tabs and data
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFromAPI, setIsFetchingFromAPI] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [content, setContent] = useState([]);
  const [contentTotal, setContentTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [contentPage, setContentPage] = useState(0);
  const [contentRowsPerPage, setContentRowsPerPage] = useState(10);
  const [contentSearchTerm, setContentSearchTerm] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Update active tab when location changes
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (['dashboard', 'users', 'content', 'reports', 'settings'].includes(path)) {
      setActiveTab(path);
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);

  // This useEffect is removed - see the consolidated version after function definitions

  // Track loading state for dashboard stats
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Create a ref to store the fetch function
  const fetchContentRef = useRef(() => {
    console.warn('fetchContent not yet initialized');
  });
  
  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    console.log('[ADMIN_DASHBOARD] Force refreshing content...');
    setForceRefresh(true);
    fetchContentRef.current();
  }, []);

  // Debounce function to prevent rapid API calls
  const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // Enhanced fetchDashboardStats with better error handling and local storage fallback
  const fetchDashboardStats = useCallback(debounce(async (force = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30000; // 30 seconds cache
    
    // Skip if already loading or recently fetched (unless forced)
    if ((isLoadingStats || (now - lastFetchTime < CACHE_DURATION)) && !force) {
      console.log('[FETCH_DASHBOARD_STATS] Using cached data or already loading');
      return;
    }

    setIsLoadingStats(true);
    console.log('[FETCH_DASHBOARD_STATS] Starting stats fetch...');
    
    // Fetch stats from API only
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FETCH_DASHBOARD_STATS] No auth token found, using localStorage only');
        return null;
      }

      // Try to fetch users
      let userCount = 0;
      try {
        const usersResponse = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 1000 }
        });
        
        if (usersResponse.data) {
          const users = Array.isArray(usersResponse.data) ? usersResponse.data : 
                       (usersResponse.data.users || usersResponse.data.data || []);
          userCount = users.length;
          console.log('[FETCH_DASHBOARD_STATS] Fetched users count:', userCount);
        }
      } catch (error) {
        console.warn('[FETCH_DASHBOARD_STATS] Failed to fetch users:', error.message);
        // Keep the initial count from localStorage
        userCount = usersTotal;
      }

      // Try to fetch content from multiple possible endpoints
      let contentCount = 0;
      try {
        let contentResponse;
        
        // Try the admin endpoint first
        try {
          contentResponse = await axios.get('http://localhost:5000/api/admin/posts', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { limit: 1000 }
          });
        } catch (e) {
          console.log('[FETCH_DASHBOARD_STATS] Admin posts endpoint failed, trying regular posts endpoint...');
          contentResponse = await axios.get('http://localhost:5000/api/posts', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { limit: 1000 }
          });
        }
        
        if (contentResponse?.data) {
          const posts = Array.isArray(contentResponse.data) ? contentResponse.data : 
                       (contentResponse.data.posts || contentResponse.data.data || []);
          contentCount = posts.length;
          console.log('[FETCH_DASHBOARD_STATS] Fetched posts count:', contentCount);
        }
      } catch (error) {
        console.warn('[FETCH_DASHBOARD_STATS] Failed to fetch posts:', error.message);
        contentCount = 0;
      }

      // Update state with fresh data
      setUsersTotal(prev => userCount || prev);
      setContentTotal(prev => contentCount || prev);
      setLastFetchTime(now);
      
      return { totalUsers: userCount, totalContent: contentCount };
    } catch (error) {
      console.error('[FETCH_DASHBOARD_STATS] Unexpected error:', error);
      // We've already set initial values from localStorage, so just log the error
    } finally {
      setIsLoadingStats(false);
    }
  }, 500), [lastFetchTime, isLoadingStats]);

  // This useEffect is removed - see the consolidated version after function definitions

  // Content management handlers
  const handleViewContent = (contentItem) => {
    console.log('View content:', contentItem);
    // You might want to open a dialog or navigate to a detail page
  };

  const handleEditContent = (contentItem) => {
    console.log('Edit content:', contentItem);
    // You might want to open an edit dialog
  };

  const handleDeleteContent = async (contentItem) => {
    if (!window.confirm(`Are you sure you want to delete "${contentItem.title || 'this item'}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const itemId = contentItem.id || contentItem._id;
      let deletedFromAPI = false;

      // Try to delete from API (may fail if post only exists in localStorage)
      if (token) {
        try {
          await axios.delete(`http://localhost:5000/api/admin/posts/${itemId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          deletedFromAPI = true;
          console.log('[DELETE] Post deleted from database');
        } catch (apiError) {
          // If 404 or 500, the post might only exist in localStorage
          console.warn('[DELETE] Could not delete from API, removing from localStorage only:', apiError.response?.status);
        }
      }

      // Remove from local state and update total
      setContent(prev => prev.filter(item => 
        (item.id || item._id) !== itemId
      ));
      setContentTotal(prev => Math.max(0, prev - 1));

      // Show success message
      setError('Content deleted successfully');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error deleting content:', error);
      setError('Error deleting content. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const renderStats = () => {
    if (isLoadingStats) {
      return (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h5" component="h2">
                {usersTotal.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Content
              </Typography>
              <Typography variant="h5" component="h2">
                {contentTotal.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderUsers = () => (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          User Management
        </Typography>
        <Box>
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250, mr: 2 }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => fetchUsers()}
            startIcon={<SyncIcon />}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow hover key={user.id || user._id}>
                    <TableCell>{user.name || user.displayName || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role || 'user'} 
                        color={user.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status || 'active'} 
                        color={user.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View user details">
                        <IconButton size="small" color="primary">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {isLoading ? 'Loading users...' : 'No users found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={usersTotal}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );

  // Define fetchContent first
  const fetchContent = useCallback(async () => {
    if (isFetchingFromAPI) return;
    
    console.log('[FETCH_CONTENT] Starting to fetch posts...');
    setIsFetchingFromAPI(true);
    setIsLoading(true);
    setError('');
    
    // Admin can view all posts, no user ID filtering needed
    console.log('[FETCH_CONTENT] Admin viewing all posts');
    
    // Helper function to format posts
    const formatPosts = (posts) => {
      if (!Array.isArray(posts)) return [];
      return posts.map(post => {
        // Extract user information from various possible locations
        const userInfo = post.user || {};
        const userName = post.userName || 
                        userInfo.name || 
                        userInfo.displayName || 
                        post.author || 
                        (typeof post.author === 'object' ? post.author.name : null) || 
                        post.userId?.username || 
                        'Unknown';
        
        // Get user ID from various possible locations
        const userId = post.userId || 
                      (typeof post.userId === 'object' ? post.userId._id || post.userId.id : null) ||
                      userInfo.id || 
                      userInfo._id || 
                      post.user?._id || 
                      post.author?._id || 
                      'unknown';
        
        // Get user avatar if available
        const userAvatar = post.userAvatar || 
                          userInfo.avatar || 
                          userInfo.photoURL || 
                          (typeof post.author === 'object' ? post.author.avatar : null) ||
                          '';
        
        // Format the post with consistent structure
        return {
          // Post identification
          id: post.id || post._id || `post-${Math.random().toString(36).substr(2, 9)}`,
          _id: post._id || post.id, // Ensure _id is always set for MongoDB compatibility
          
          // Content
          title: post.title || post.postTitle || 'Untitled Post',
          description: post.description || '',
          type: post.mediaType || (post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') : 'unknown'),
          url: post.url || post.mediaUrl || '',
          thumbnail: post.thumbnail || post.thumbnailUrl || (post.mediaUrl && !post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? post.mediaUrl : null),
          
          // User information (duplicated at top level for backward compatibility)
          userId: userId,
          userName: userName,
          userEmail: post.userEmail || userInfo.email || '',
          userAvatar: userAvatar,
          
          // Author display (for admin dashboard) - this is what the table will display
          author: userName, // Simplified for the table view
          
          // Engagement
          likes: Array.isArray(post.likes) ? post.likes : [],
          likesCount: post.likesCount || (Array.isArray(post.likes) ? post.likes.length : 0) || 0,
          comments: Array.isArray(post.comments) ? post.comments : [],
          commentsCount: post.commentsCount || (Array.isArray(post.comments) ? post.comments.length : 0) || 0,
          views: post.views || 0,
          isLiked: Boolean(post.isLiked),
          isSaved: Boolean(post.isSaved),
          
          // Status
          status: post.isPublic === false ? 'draft' : 'published',
          
          // Timestamps
          createdAt: post.createdAt || post.createdOn || post.timestamp || new Date().toISOString(),
          updatedAt: post.updatedAt || post.createdAt || post.timestamp || new Date().toISOString(),
          
          // Additional metadata
          tags: Array.isArray(post.tags) ? post.tags : [],
          isPublic: post.isPublic !== false, // Default to true if not set
          
          // For display in admin table (computed properties)
          _displayType: (post.mediaType || (post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') : 'unknown')).charAt(0).toUpperCase() + 
                       (post.mediaType || (post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') : 'unknown')).slice(1),
          _displayDate: new Date(post.createdAt || post.createdOn || post.timestamp || new Date()).toLocaleDateString()
        };
      });
    };
    
    let posts = [];
    let total = 0;
    
    // Fetch directly from database API
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FETCH_CONTENT] No auth token');
        setError('Please log in to view content');
        setIsLoading(false);
        return;
      }
      
      // Set flag to indicate we're fetching from API
      setIsFetchingFromAPI(true);
      
      try {
        console.log('[FETCH_CONTENT] Fetching from API...');
        // Try the admin endpoint first
        let response;
        try {
          // Admin fetches ALL posts, not filtered by user
        const params = {
          page: contentPage + 1,
          limit: contentRowsPerPage,
          ...(contentSearchTerm && { search: contentSearchTerm })
        };
        
        console.log('[FETCH_CONTENT] Fetching posts with params:', params);
        
        response = await axios.get('http://localhost:5000/api/admin/posts', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          params,
          withCredentials: true,
          timeout: 5000 // 5 second timeout
        });
        } catch (adminError) {
          console.log('[FETCH_CONTENT] Admin endpoint failed, trying regular posts endpoint...', adminError);
          // Fall back to regular posts endpoint
          response = await axios.get('http://localhost:5000/api/posts', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            params: {
              page: contentPage + 1,
              limit: contentRowsPerPage,
              ...(contentSearchTerm && { search: contentSearchTerm })
            },
            withCredentials: true,
            timeout: 5000 // 5 second timeout
          });
        }
      
        console.log('[FETCH_CONTENT] API Response:', response);
        
        if (response?.data) {
          const responseData = response.data;
          console.log('[FETCH_CONTENT] Response data:', responseData);
          
          // Handle different response formats
          if (Array.isArray(responseData)) {
            // Case 1: Direct array response
            posts = responseData;
            total = responseData.length;
            console.log('[FETCH_CONTENT] Case 1: Direct array response');
          } 
          // Handle paginated response
          else if (responseData.data && Array.isArray(responseData.data)) {
            // Case 2: { data: [...] }
            posts = responseData.data;
            total = responseData.total || responseData.count || posts.length;
            console.log('[FETCH_CONTENT] Case 2: { data: [...] }');
          } 
          else if (responseData.data?.posts && Array.isArray(responseData.data.posts)) {
            // Case 3: { data: { posts: [...], total: X } }
            posts = responseData.data.posts;
            total = responseData.data.total || responseData.data.count || posts.length;
            console.log('[FETCH_CONTENT] Case 3: { data: { posts: [...] } }');
          }
          else if (responseData.success && responseData.data) {
            // Case 4: { success: true, data: [...] }
            posts = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
            total = responseData.total || responseData.count || posts.length;
            console.log('[FETCH_CONTENT] Case 4: { success: true, data: [...] }');
          } else {
            // Default case - empty results
            posts = [];
            total = 0;
            console.log('[FETCH_CONTENT] Unknown response format, using empty array');
          }
        }
        
          // Posts are now stored in database only
          console.log(`[FETCH_CONTENT] Fetched ${posts.length} posts from database`);
        
        console.log(`[FETCH_CONTENT] Extracted ${posts.length} posts, total: ${total}`);
        
        // If no posts found but we have a search term, try a different approach
        if (posts.length === 0 && contentSearchTerm) {
          console.log('[FETCH_CONTENT] No posts found with search, trying without search...');
          try {
            const newResponse = await axios.get('http://localhost:5000/api/admin/posts', {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              params: {
                page: contentPage + 1,
                limit: contentRowsPerPage
              },
              withCredentials: true,
              timeout: 5000 // 5 second timeout
            });
          
            if (newResponse?.data) {
              console.log('[FETCH_CONTENT] New response without search:', newResponse.data);
              // Try to extract posts again from the new response
              if (Array.isArray(newResponse.data)) {
                posts = newResponse.data;
                total = posts.length;
              } else if (newResponse.data.data) {
                if (Array.isArray(newResponse.data.data)) {
                  posts = newResponse.data.data;
                  total = newResponse.data.total || newResponse.data.count || posts.length;
                } else if (newResponse.data.data.posts) {
                  posts = Array.isArray(newResponse.data.data.posts) ? newResponse.data.data.posts : [];
                  total = newResponse.data.data.total || newResponse.data.data.count || posts.length;
                }
              }
              console.log(`[FETCH_CONTENT] Found ${posts.length} posts without search`);
            }
          } catch (searchError) {
            console.error('[FETCH_CONTENT] Error in search fallback:', searchError);
            // Continue with empty posts if search fallback fails
          }
        }
        
        console.log('[FETCH_CONTENT] Extracted posts:', posts);
        
        // Handle different response formats
        let formattedContent = [];
        let responseData = response.data;
        
        // Extract posts array from response based on different possible structures
        if (Array.isArray(responseData)) {
          formattedContent = responseData.map(formatPost);
        } else if (responseData.data && Array.isArray(responseData.data)) {
          formattedContent = responseData.data.map(formatPost);
        } else if (responseData.posts && Array.isArray(responseData.posts)) {
          formattedContent = responseData.posts.map(formatPost);
        } else if (responseData.data?.posts && Array.isArray(responseData.data.posts)) {
          formattedContent = responseData.data.posts.map(formatPost);
        } else {
          console.warn('Unexpected API response format:', responseData);
          throw new Error('Unexpected API response format');
        }
        
        // If we got an empty array but have a search term, try without the search
        if (formattedContent.length === 0 && contentSearchTerm) {
          console.log('[FETCH_CONTENT] No posts found with search, trying without search...');
          try {
            const newResponse = await axios.get('http://localhost:5000/api/admin/posts', {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              params: {
                page: contentPage + 1,
                limit: contentRowsPerPage
              },
              withCredentials: true,
              timeout: 5000
            });
            
            const newData = newResponse.data;
            if (Array.isArray(newData)) {
              formattedContent = newData.map(formatPost);
            } else if (newData.data && Array.isArray(newData.data)) {
              formattedContent = newData.data.map(formatPost);
            } else if (newData.posts && Array.isArray(newData.posts)) {
              formattedContent = newData.posts.map(formatPost);
            }
          } catch (retryError) {
            console.warn('Error retrying without search:', retryError);
          }
        }
        
        // Helper function to format a single post
        function formatPost(post) {
          return {
            id: post._id || `post-${Math.random().toString(36).substr(2, 9)}`,
            title: post.title || 'Untitled Post',
            type: post.mediaType || (post.mediaUrl ? (post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') : 'unknown'),
            author: post.userId?.name || post.userId?.username || post.author?.name || 'Unknown',
            status: post.isPublic !== false ? 'published' : 'draft',
            views: post.views || 0,
            likes: post.likes?.length || 0,
            comments: post.comments?.length || 0,
            createdAt: post.createdAt || post.timestamp || new Date().toISOString(),
            thumbnail: post.thumbnail || post.thumbnailUrl || null,
            url: post.url || post.mediaUrl || ''
          };
        }
        
        // Format the posts
        const finalFormattedContent = posts.map(formatPost);
        console.log('[FETCH_CONTENT] Formatted posts:', finalFormattedContent);
        
        setContent(finalFormattedContent);
        setContentTotal(total);
        console.log('[FETCH_CONTENT] State updated - content length:', finalFormattedContent.length, 'total:', total);
      } catch (apiError) {
        console.error('[FETCH_CONTENT] API Error:', apiError);
        setError('Failed to load posts. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
        setIsFetchingFromAPI(false);
        setForceRefresh(false);
      }
  }, [contentPage, contentRowsPerPage, contentSearchTerm, forceRefresh]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      console.log('[FETCH_USERS] Starting to fetch users...');
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        const errorMsg = 'No authentication token found in localStorage';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const params = {
        page: page + 1, // API is 1-based, MUI is 0-based
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm })
      };
      
      console.log('[FETCH_USERS] Request params:', params);
      
      let response;
      try {
        response = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          params,
          withCredentials: true
        });
        
        console.log('[FETCH_USERS] Raw API Response:', response);
        
        if (!response || !response.data) {
          throw new Error('No data received from server');
        }
        
        const responseData = response.data;
        let usersData = [];
        let total = 0;
        
        // Handle different response structures
        if (Array.isArray(responseData)) {
          // Direct array response
          usersData = responseData;
          total = responseData.length;
        }
        else if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            // Response with { data: [...] }
            usersData = responseData.data;
            total = responseData.total || responseData.count || usersData.length;
          } 
          else if (responseData.data.users && Array.isArray(responseData.data.users)) {
            // Response with { data: { users: [...], total: X } }
            usersData = responseData.data.users;
            total = responseData.data.total || responseData.data.count || usersData.length;
          }
        } 
        else if (responseData.users && Array.isArray(responseData.users)) {
          // Response with { users: [...], total: X }
          usersData = responseData.users;
          total = responseData.total || responseData.count || usersData.length;
        }
        
        console.log(`[FETCH_USERS] Found ${usersData.length} users, total: ${total}`);
        
        // Format user data
        const formattedUsers = usersData.map(user => ({
          _id: user._id || user.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
          username: user.username || user.name || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email || 'No email',
          role: user.role || (user.isAdmin ? 'admin' : 'user'),
          status: user.isActive ? 'active' : 'inactive',
          avatar: user.avatar || user.image || '',
          joinDate: user.createdAt || user.created_at || new Date().toISOString()
        }));
        
        // Update state
        setUsers(formattedUsers);
        setUsersTotal(Number(total) || 0);
        
        // Save to localStorage for offline use
        try {
          localStorage.setItem('users', JSON.stringify({
            data: formattedUsers,
            total: total,
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.warn('Failed to save users to localStorage:', e);
        }
        
        return formattedUsers;
        
      } catch (error) {
        console.error('[FETCH_USERS] API Error:', error);
        
        // Try to load from localStorage as fallback
        try {
          const savedUsers = JSON.parse(localStorage.getItem('users') || '{}');
          if (savedUsers.data && savedUsers.data.length > 0) {
            console.log('[FETCH_USERS] Using fallback data from localStorage');
            setUsers(savedUsers.data);
            setUsersTotal(savedUsers.total || savedUsers.data.length);
            return savedUsers.data;
          }
        } catch (localError) {
          console.error('[FETCH_USERS] Error with localStorage fallback:', localError);
        }
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to load users. ' + (error.message || 'Please check your connection and try again.'));
        }
        
        return [];
      }
      
    } catch (error) {
      console.error('[FETCH_USERS] Unexpected error:', error);
      setError('An unexpected error occurred while loading users');
      return [];
    } finally {
      console.log('[FETCH_USERS] Fetch completed');
      setIsLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, navigate]);

  // Update fetchContentRef when fetchContent changes
  useEffect(() => {
    fetchContentRef.current = fetchContent;
  });

  // Fetch data when tab changes or pagination/search changes
  useEffect(() => {
    if (!currentUser?.isAdmin) {
      return;
    }

    const fetchData = async () => {
      if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'content') {
        await fetchContentRef.current();
      } else if (activeTab === 'dashboard') {
        await fetchDashboardStats();
      }
    };
    
    fetchData();
  }, [activeTab, page, rowsPerPage, searchTerm, contentPage, contentRowsPerPage, contentSearchTerm, currentUser?.isAdmin]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    navigate(`/admin/${newValue}`);
  };
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    onConfirm: null,
    data: null
  });

  // Handle delete post confirmation
  const confirmDeletePost = useCallback((post) => {
    if (!post) return;
    
    // Admin can delete any post
    setConfirmDialog({
      open: true,
      title: 'Delete Post',
      content: `Are you sure you want to delete "${post.title || 'this post'}"? This action cannot be undone.`,
      data: post,
      onConfirm: () => handleDeletePost(post)
    });
  }, []);

  // Sync posts with the database
  const syncPostsWithDatabase = useCallback(async (posts) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      console.log('[SYNC_POSTS] Admin syncing all posts with database');
      
      // Admin syncs ALL posts, no filtering
      // Sync each post with the database
      for (const post of posts) {
        try {
          const postId = post.id || post._id;
          const postData = {
            ...post,
            lastSynced: new Date().toISOString()
          };

          // Check if post exists in the database
          const response = await axios.get(`http://localhost:5000/api/posts/${postId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.data) {
            // Update existing post
            await axios.put(`http://localhost:5000/api/posts/${postId}`, postData, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } else {
            // Create new post
            await axios.post('http://localhost:5000/api/posts', postData, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            // Post doesn't exist in the database, create it
            await axios.post('http://localhost:5000/api/posts', {
              ...post,
              lastSynced: new Date().toISOString()
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } else {
            console.error('Error syncing post:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing posts with database:', error);
    }
  }, []);

  // Handle actual post deletion
  const handleDeletePost = useCallback(async (post) => {
    if (!post) return;
    
    try {
      const token = localStorage.getItem('token');
      const postId = post.id || post._id;
      
      // Delete from database
      if (token && postId) {
        await axios.delete(`http://localhost:5000/api/admin/posts/${postId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[DELETE] Post deleted from database');
      } else {
        throw new Error('No token or post ID available');
      }
      
      // Update state
      setContent(prevContent => prevContent.filter(p => (p.id || p._id) !== postId));
      setContentTotal(prev => Math.max(0, prev - 1));
      
      // Close the dialog and show success message
      setConfirmDialog(prev => ({ ...prev, open: false }));
      setError('');
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post. Please try again.');
    }
  }, []);

  // Render the appropriate content based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PeopleIcon color="primary" sx={{ mr: 1 }} />
                      <Typography color="textSecondary" variant="subtitle1">Total Users</Typography>
                    </Box>
                    <Typography variant="h4">{usersTotal || 0}</Typography>
                    <Box mt={1}>
                      <Button 
                        size="small" 
                        onClick={() => setActiveTab('users')}
                        endIcon={<ArrowForwardIosIcon fontSize="small" />}
                      >
                        View All
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <PostAddIcon color="primary" sx={{ mr: 1 }} />
                      <Typography color="textSecondary" variant="subtitle1">Total Content</Typography>
                    </Box>
                    <Typography variant="h4">{contentTotal || 0}</Typography>
                    <Box mt={1}>
                      <Button 
                        size="small" 
                        onClick={() => setActiveTab('content')}
                        endIcon={<ArrowForwardIosIcon fontSize="small" />}
                      >
                        View All
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      case 'users':
        return (
          <Box>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="h5">User Management</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <TextField
                  size="small"
                  placeholder="Search users..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0); // Reset to first page when searching
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        {error || 'No users found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user._id || user.id}>
                        <TableCell>{user.username || user.name || 'N/A'}</TableCell>
                        <TableCell>{user.email || 'No email'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role || 'user'}
                            color={user.role === 'admin' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={usersTotal}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </TableContainer>
          </Box>
        );
      case 'content':
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" gutterBottom>Content Management</Typography>
              <Box display="flex" gap={2}>
                <TextField
                  size="small"
                  placeholder="Search posts..."
                  variant="outlined"
                  value={contentSearchTerm}
                  onChange={(e) => {
                    setContentSearchTerm(e.target.value);
                    setContentPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  startIcon={<RefreshIcon />}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Box py={4}><CircularProgress /></Box>
                      </TableCell>
                    </TableRow>
                  ) : content.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">
                          {contentSearchTerm ? 'No matching posts found' : 'No posts available'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    content.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {item.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.type?.charAt(0)?.toUpperCase() + item.type?.slice(1) || 'N/A'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.author || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={item.status || 'draft'}
                            color={
                              item.status === 'published' ? 'success' : 
                              item.status === 'draft' ? 'default' : 
                              item.status === 'reported' ? 'error' : 'warning'
                            }
                            size="small"
                            variant={item.status === 'draft' ? 'outlined' : 'filled'}
                          />
                        </TableCell>
                        <TableCell>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</TableCell>
                      </TableRow>
                    )))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={contentTotal}
                rowsPerPage={contentRowsPerPage}
                page={contentPage}
                onPageChange={(e, newPage) => setContentPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setContentRowsPerPage(parseInt(e.target.value, 10));
                  setContentPage(0);
                }}
              />
            </TableContainer>
          </Box>
        );
      default:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</Typography>
            <Typography>This section is under construction.</Typography>
          </Box>
        );
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab}
          onChange={handleTabChange}
          aria-label="admin dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Users" value="users" />
          <Tab label="Content" value="content" />
          <Tab label="Reports" value="reports" />
          <Tab label="Settings" value="settings" />
        </Tabs>
      </Box>
      
      <TabPanel value={activeTab} index="dashboard">
        {renderStats()}
      </TabPanel>
      
      <TabPanel value={activeTab} index="users">
        {renderUsers()}
      </TabPanel>
      
      <TabPanel value={activeTab} index="content">
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search content..."
            value={contentSearchTerm}
            onChange={(e) => setContentSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={isLoading}
            startIcon={<RefreshIcon />}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : content.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              No content found. {contentSearchTerm ? 'Try a different search term.' : 'Upload some content to get started.'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {content.map((item) => (
                    <TableRow key={item.id || item._id}>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {item.title || 'Untitled'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.type || 'unknown'}
                          size="small"
                          color={item.type === 'video' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status || 'draft'}
                          size="small"
                          color={
                            item.status === 'published'
                              ? 'success'
                              : item.status === 'pending'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt || item.date || new Date()).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteContent(item)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={contentTotal}
              rowsPerPage={contentRowsPerPage}
              page={contentPage}
              onPageChange={(e, newPage) => setContentPage(newPage)}
              onRowsPerPageChange={(e) => {
                setContentRowsPerPage(parseInt(e.target.value, 10));
                setContentPage(0);
              }}
            />
          </>
        )}
      </TabPanel>
      
      <TabPanel value={activeTab} index="reports">
        <Typography variant="h6" gutterBottom>Reports</Typography>
        <Typography>Reports functionality coming soon.</Typography>
      </TabPanel>
      
      <TabPanel value={activeTab} index="settings">
        <Typography variant="h6" gutterBottom>Settings</Typography>
        <Typography>Settings functionality coming soon.</Typography>
      </TabPanel>
    </Container>
  );
}

// Add prop types validation
AdminDashboard.propTypes = {
  defaultTab: PropTypes.string
};

export default AdminDashboard;
