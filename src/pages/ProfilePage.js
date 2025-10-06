import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  TextField, 
  CircularProgress, 
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Edit,
  Delete as DeleteIcon, 
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/video/VideoCard';
import { API_BASE_URL } from '../config/api';

// InputLabel is already imported from @mui/material
// Format join date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

function ProfilePage() {
  // State for post menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [displayUser, setDisplayUser] = useState({
    name: '',
    email: '',
    avatar: '',
    bio: '',
    joinDate: new Date().toISOString(),
    stats: {
      posts: 0,
      followers: 0,
      following: 0
    }
  });

  // Initialize form data
  const [formData, setFormData] = useState({
    email: ''
  });

  // State for dialogs
  const [openUpload, setOpenUpload] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadType, setUploadType] = useState('image');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null,
    url: ''
  });
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success', 'error', 'warning', 'info'
  });
  const [likedPosts, setLikedPosts] = useState({});
  
  // Admin email constant - moved to the top of the component to avoid redeclaration

  // Load user data, posts, and liked posts
  const loadUserData = async () => {
      console.log('Loading user data for:', currentUser);
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      // Reset error state
      setError('');

      try {
        // Get current user ID
        const currentUserId = currentUser?._id || currentUser?.id;
        if (!currentUserId) {
          console.error('Could not determine user ID. Current user:', currentUser);
          throw new Error('Could not determine user ID');
        }
        
        console.log('Current user ID for filtering:', currentUserId);
        
        // Fetch user's posts from database
        const token = localStorage.getItem('token');
        console.log('Token found:', !!token);
        
        if (!token) {
          console.warn('No authentication token found, user may need to log in');
          // For now, just show empty posts instead of throwing error
          setPosts([]);
          setDisplayUser({
            name: currentUser?.name || 'User',
            email: currentUser?.email || '',
            avatar: currentUser?.avatar || '',
            stats: {
              posts: 0,
              followers: 0,
              following: 0
            }
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/posts?userId=${currentUserId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user posts');
        }

        const result = await response.json();
        const posts = result.data || [];
        
        console.log('Fetched user posts from database:', posts.length);
        
        // Format posts for display (same as HomePage)
        const userPosts = posts.map(post => ({
          id: post._id || post.id,
          title: post.title,
          description: post.description,
          thumbnail: post.thumbnailUrl || 'https://via.placeholder.com/400x225?text=No+Thumbnail',
          views: post.views || '0',
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0,
          timestamp: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date',
          user: {
            id: post.userId?._id || post.userId,
            name: post.userId?.name || 'Anonymous',
            avatar: post.userId?.avatar || 'https://via.placeholder.com/40x40?text=U',
          },
          url: post.mediaUrl,
          mediaType: post.mediaType || 'video'
        }));
          
        console.log(`Found ${userPosts.length} posts for user ${currentUserId}`);

        // Update state
        setPosts(userPosts);
        setDisplayUser({
          name: currentUser?.displayName || 'User',
          email: currentUser?.email || '',
          bio: currentUser?.bio || '',
          avatar: currentUser?.photoURL || '',
          joinDate: currentUser?.createdAt || new Date().toISOString(),
          stats: {
            posts: userPosts.length,
            followers: 0,
            following: 0
          }
        });
        
        setFormData({
          email: currentUser?.email || ''
        });
        
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadUserData();
  }, [currentUser]);

  const handleEditProfile = () => {
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    try {
      // Update the display user with just the email
      setDisplayUser(prev => ({
        ...prev,
        email: formData.email
      }));

      setEditMode(false);
      
      // Show success message
      setError('Profile updated successfully');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to update profile. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Handle opening the upload dialog
  const handleOpenUpload = (type) => {
    if (!currentUser) {
      if (window.confirm('You need to sign in to upload content. Would you like to sign in now?')) {
        navigate('/login', { state: { from: window.location.pathname } });
      }
      return;
    }
    setUploadType(type);
    setOpenUpload(true);
  };

  // Handle closing the upload dialog
  // Handle post menu open
  const handleMenuOpen = (event, post) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(post);
  };

  // Keep this function for any other menu functionality
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPost(null);
  };

  // Admin email and ID constants
  const ADMIN_EMAIL = 'naziresia@gmail.com';
  const ADMIN_USER_ID = 'admin_user_id_123'; // Universal admin ID

  // Handle post deletion
  const handleDeleteClick = (post) => {
    setSelectedPost(post);
    setDeleteConfirmOpen(true);
  };

  // Toggle like for a post
  const toggleLike = async (postId) => {
    if (!currentUser) {
      setError('Please log in to like posts');
      return;
    }

    try {
      const userId = currentUser._id || currentUser.id;
      const savedPosts = JSON.parse(localStorage.getItem('posts')) || [];
      const updatedPosts = savedPosts.map(post => {
        if (post.id === postId) {
          // Check if user already liked the post
          const isLiked = post.likedBy && post.likedBy.includes(userId);
          
          // Update likes count and likedBy array
          return {
            ...post,
            likes: isLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
            likedBy: isLiked 
              ? (post.likedBy || []).filter(id => id !== userId)
              : [...(post.likedBy || []), userId]
          };
        }
        return post;
      });

      // Update localStorage
      localStorage.setItem('posts', JSON.stringify(updatedPosts));
      
      // Update liked posts state
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !prev[postId]
      }));
      
      // Update UI
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: likedPosts[postId] ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
                likedBy: likedPosts[postId]
                  ? (post.likedBy || []).filter(id => id !== userId)
                  : [...(post.likedBy || []), userId]
              } 
            : post
        )
      );
      
    } catch (error) {
      console.error('Error toggling like:', error);
      setError('Failed to update like. Please try again.');
    }
  };

  // Check if current user has liked a post
  const hasLikedPost = (post) => {
    if (!currentUser) return false;
    const userId = currentUser._id || currentUser.id;
    return post.likedBy && post.likedBy.includes(userId);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPost) {
      console.error('No post selected');
      setError('No post selected');
      return;
    }
    
    // Get current user ID for comparison
    const currentUserId = currentUser?.uid || currentUser?._id || currentUser?.id;
    if (!currentUserId) {
      setError('User not authenticated');
      return;
    }
    
    // Check if user is admin or the post owner
    const isAdmin = currentUser?.email === ADMIN_EMAIL || 
                   currentUser?.role === 'admin' || 
                   currentUser?.uid === ADMIN_USER_ID ||
                   currentUser?._id === ADMIN_USER_ID;
    
    const postOwnerId = selectedPost.userId || (selectedPost.user ? (selectedPost.user.id || selectedPost.user._id) : null);
    const isOwner = postOwnerId === currentUserId;
    
    if (!isOwner && !isAdmin) {
      setError('You are not authorized to delete this post');
      return;
    }
    
    try {
      console.log('Deleting post:', selectedPost);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('You must be logged in to delete posts');
      }

      const postId = selectedPost.id || selectedPost._id;
      if (!postId) {
        throw new Error('Post ID not found');
      }

      // Delete from database
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post from server');
      }

      console.log('Post deleted from database successfully');
      
      // Update local state by removing the deleted post
      setPosts(prevPosts => prevPosts.filter(post => 
        (post.id || post._id) !== postId
      ));
      
      // Close the confirmation dialog and clear selection
      setDeleteConfirmOpen(false);
      setSelectedPost(null);
      
      // Show success message
      setAlert({
        open: true,
        message: 'Post deleted successfully',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const handleCloseUpload = () => {
    setOpenUpload(false);
    setUploadData({
      title: '',
      description: '',
      file: null,
      url: ''
    });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSelectedPost(null);
  };

  // Handle the upload action
  const handleUpload = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Handle file upload or URL
      let mediaUrl = uploadData.url;
      let thumbnail = '';
      let imageData = '';
      
      if (uploadType === 'video') {
        // For videos, we expect a YouTube URL
        thumbnail = getYoutubeThumbnail(uploadData.url);
        console.log('Generated thumbnail for video:', thumbnail);
      } else {
        // For images, handle both file and URL cases
        if (uploadData.file) {
          // Convert file to base64
          const file = uploadData.file;
          
          // Create a promise to handle the file reading
          const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
          
          // Get base64 string
          imageData = await fileToBase64(file);
          mediaUrl = imageData;
          thumbnail = imageData;
        } else if (uploadData.url) {
          // If a URL was provided, use it directly
          mediaUrl = uploadData.url;
          thumbnail = uploadData.url;
        }
      }
      
      // Create post object for API
      const postData = {
        title: uploadData.title || 'Untitled',
        description: uploadData.description || '',
        mediaType: uploadType,
        mediaUrl: mediaUrl,
        thumbnailUrl: thumbnail,
        isPublic: true,
        tags: []
      };

      // Save to database
      const token = localStorage.getItem('token');
      console.log('Upload - Token found:', !!token);
      
      if (!token) {
        throw new Error('You must be logged in to upload content');
      }

      console.log('Uploading post data:', postData);

      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Failed to create post: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Post created successfully:', result);

      // Reload user posts
      await loadUserData();
      
      // Update the display user's post count
      setDisplayUser(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          posts: (prev.stats?.posts || 0) + 1
        }
      }));
      
      handleCloseUpload();
      
      // Show success message
      setError('');
      
    } catch (error) {
      console.error('Error uploading content:', error);
      setError('Failed to upload content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract YouTube video ID
  const getYoutubeId = (url) => {
    if (!url) return '';
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#&?]*)/,
      /youtube\.com\/watch\?.*v=([^#&?]*)/,
      /youtu\.be\/([^#&?]*)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    
    return '';
  };

  // Helper function to get YouTube thumbnail with fallbacks
  const getYoutubeThumbnail = (url) => {
    const videoId = getYoutubeId(url);
    if (!videoId) return 'https://via.placeholder.com/480x360?text=Video+Thumbnail';
    
    // Try different thumbnail qualities as fallbacks
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  // Upload Dialog component
  const renderUploadDialog = () => (
    <Dialog open={openUpload} onClose={handleCloseUpload} maxWidth="sm" fullWidth>
      <DialogTitle>Upload {uploadType === 'image' ? 'Image' : 'Video'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Content Type</InputLabel>
            <Select
              value={uploadType}
              label="Content Type"
              onChange={(e) => {
                setUploadType(e.target.value);
                setUploadData(prev => ({
                  ...prev,
                  file: null,
                  url: ''
                }));
              }}
            >
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="video">Video (YouTube Link)</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Title"
            value={uploadData.title}
            onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
            margin="normal"
            required
          />
          
          {uploadType === 'image' ? (
            <Box>
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadData({
                        ...uploadData,
                        file: e.target.files[0],
                        url: ''
                      });
                    }
                  }}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<ImageIcon />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    {uploadData.file ? uploadData.file.name : 'Choose Image File'}
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                  OR
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Image URL"
                placeholder="Paste image URL here"
                value={uploadData.url}
                onChange={(e) => setUploadData({
                  ...uploadData,
                  url: e.target.value,
                  file: null
                })}
                margin="normal"
              />
            </Box>
          ) : (
            <TextField
              fullWidth
              label="YouTube Video URL"
              placeholder="Paste YouTube video URL here"
              value={uploadData.url}
              onChange={(e) => setUploadData({...uploadData, url: e.target.value})}
              margin="normal"
              required
            />
          )}
          
          <TextField
            fullWidth
            label="Description (Optional)"
            value={uploadData.description}
            onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
            margin="normal"
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseUpload}>Cancel</Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          color="primary"
          disabled={
            !uploadData.title || 
            (uploadType === 'image' ? (!uploadData.file && !uploadData.url) : !uploadData.url)
          }
        >
          {loading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Early return if no user is logged in
  if (!currentUser) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Please log in to view your profile
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/login')}
          startIcon={<PersonIcon />}
        >
          Go to Login
        </Button>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {renderUploadDialog()}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Delete Post</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this post?</Typography>
          <Typography color="error" variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Profile Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Box 
              sx={{ 
                width: 120, 
                height: 120, 
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: theme => theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 40,
                fontWeight: 'bold',
                border: '4px solid',
                borderColor: 'background.paper',
                boxShadow: 3
              }}
            >
              {displayUser.avatar && displayUser.avatar.trim() !== '' ? (
                <img 
                  src={displayUser.avatar} 
                  alt={displayUser.email || 'User'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.avatar-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : (
                <div 
                  className="avatar-fallback"
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {displayUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h1">
                {displayUser.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenUpload('image')}
                >
                  Upload Content
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Email
                </Button>
              </Box>
            </Box>

            {editMode && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  name="email"
                  type="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  variant="outlined"
                  fullWidth
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={!formData.email}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
              </Box>
            )}

            {/* Post count is now shown in the posts section header */}
          </Box>
        </Box>
      </Paper>

      {/* Posts Section */}
      {/* Posts Grid */}
      <Paper sx={{ width: '100%', mb: 3, p: 2 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          My Posts
          <Chip 
            label={posts.length} 
            size="small" 
            sx={{ 
              ml: 1, 
              height: 24, 
              fontSize: '0.8rem',
              backgroundColor: 'primary.main',
              color: 'white'
            }} 
          />
        </Typography>
      </Paper>
      
      {posts.length > 0 ? (
        <Grid container spacing={3}>
        {posts.map((post) => (
          <Grid item xs={12} sm={6} md={4} key={post.id}>
            <Box sx={{ position: 'relative' }}>
              {/* Show delete button for admin or post owner */}
              {(currentUser && (currentUser.email === ADMIN_EMAIL || 
                              currentUser.role === 'admin' || 
                              post.userId === (currentUser.uid || currentUser._id || currentUser.id) ||
                              post.userId === ADMIN_USER_ID)) && (
                <IconButton 
                  aria-label="delete post"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(post);
                  }}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    zIndex: 10,
                    color: '#ff4444',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 0, 0, 0.1)',
                      color: '#cc0000'
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
              
              {/* Use the same VideoCard component as HomePage */}
              <VideoCard 
                video={post} 
                onClick={(videoId) => {
                  // Handle video click if needed
                  console.log('Video clicked:', videoId);
                }}
              />
            </Box>
          </Grid>
        ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Share your first post to get started
          </Typography>
        </Box>
      )}

      {/* Logout Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleLogout}
          sx={{ mt: 2 }}
        >
          Logout
        </Button>
      </Box>
    </Container>
  );
}

export default ProfilePage;