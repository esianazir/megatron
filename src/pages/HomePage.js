import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import api from '../config/api';
import { 
  Person as PersonIcon, 
  Add as AddIcon, 
  Image as ImageIcon 
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Avatar,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel as MuiInputLabel,
  Select,
  MenuItem
} from '@mui/material';

// Create a styled InputLabel to ensure proper theming
const InputLabel = (props) => <MuiInputLabel {...props} />;

const HomePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUpload, setOpenUpload] = useState(false);
  const [uploadType, setUploadType] = useState('image');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null,
    url: ''
  });

  // Function to get videos from localStorage
  const getVideos = () => {
    try {
      const savedData = JSON.parse(localStorage.getItem('posts')) || [];
      console.log('All posts from localStorage in HomePage:', savedData);
      
      // Handle both array and object formats
      const posts = Array.isArray(savedData) ? savedData : (savedData.data || []);
      
      return posts.map(post => {
        // Use the nested user object if available, otherwise fall back to top-level properties
        const user = post.user || {
          id: post.userId,
          name: post.userName,
          avatar: post.userAvatar
        };
        
        return {
          id: post.id,
          title: post.title,
          description: post.description,
          thumbnail: post.thumbnail || 'https://via.placeholder.com/400x225?text=No+Thumbnail',
          views: post.views || '0',
          timestamp: post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'Unknown date',
          user: {
            id: user.id || user._id || user.uid || 'unknown',
            name: user.name || 'Anonymous',
            avatar: user.avatar || user.photoURL || 'https://via.placeholder.com/40x40?text=U',
          },
          url: post.url,
          mediaType: post.mediaType || (post.url?.includes('youtube') ? 'video' : 'image')
        };
      });
    } catch (error) {
      console.error('Error loading videos:', error);
      return [];
    }
  };

  // Load videos on component mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        console.log('Loading videos...');
        setLoading(true);
        
        // Use the API utility to fetch posts
        console.log('Fetching posts from API...');
        const result = await api.get('/posts');
        console.log('API Response:', result);
        
        // Handle different response formats
        let posts = [];
        if (Array.isArray(result)) {
          posts = result;
        } else if (result && Array.isArray(result.data)) {
          posts = result.data; // Handle case where data is in a data property
        }
        
        console.log(`Found ${posts.length} posts`);
        
        // Format posts for display
        const formattedVideos = posts.map(post => ({
          id: post._id || post.id,
          title: post.title || 'Untitled',
          description: post.description || '',
          thumbnail: post.thumbnailUrl || 'https://via.placeholder.com/400x225?text=No+Thumbnail',
          views: post.views || '0',
          timestamp: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date',
          user: {
            id: post.userId?._id || post.userId || 'unknown',
            name: post.userId?.name || 'Anonymous',
            avatar: post.userId?.avatar || 'https://via.placeholder.com/40x40?text=U',
          },
          url: post.mediaUrl,
          mediaType: post.mediaType || 'video'
        }));
        
        setVideos(formattedVideos);
        setError('');
      } catch (err) {
        console.error('Error loading videos:', err);
        setError('Failed to load videos. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  const handleVideoClick = (videoId) => {
    console.log('Navigating to content with ID:', videoId);
    navigate(`/content/${videoId}`);
  };

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

  const handleCloseUpload = () => {
    setOpenUpload(false);
    setUploadData({
      title: '',
      description: '',
      file: null,
      url: ''
    });
  };

  const handleUpload = async () => {
    try {
      setLoading(true);
      
      // Handle file upload or URL
      let mediaUrl = uploadData.url;
      let thumbnail = '';
      let imageBase64 = '';
      
      if (uploadType === 'video') {
        // For videos, we expect a YouTube URL
        thumbnail = `https://img.youtube.com/vi/${getYoutubeId(uploadData.url)}/maxresdefault.jpg`;
      } else {
        // For images, handle both file and URL cases
        if (uploadData.file) {
          // Convert file to base64
          const reader = new FileReader();
          const file = uploadData.file;
          
          // Create a promise to handle the file reading
          const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
          
          // Get base64 string
          imageBase64 = await fileToBase64(file);
          mediaUrl = imageBase64;
        } else if (uploadData.url) {
          // If a URL was provided, use it directly
          mediaUrl = uploadData.url;
          thumbnail = uploadData.url;
        }
      }

      // Create post object
      const postData = {
        title: uploadData.title,
        description: uploadData.description,
        mediaType: uploadType,
        mediaUrl: mediaUrl,
        thumbnailUrl: thumbnail,
        isPublic: true,
        tags: []
      };

      // Save to database
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to upload content');
        return;
      }

      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const result = await response.json();
      console.log('Post created successfully:', result);

      // Reload videos from database
      const refreshResponse = await fetch('http://localhost:5000/api/posts');
      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json();
        const posts = refreshResult.data || [];
        
        const formattedVideos = posts.map(post => ({
          id: post._id || post.id,
          title: post.title,
          description: post.description,
          thumbnail: post.thumbnailUrl || 'https://via.placeholder.com/400x225?text=No+Thumbnail',
          views: post.views || '0',
          timestamp: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date',
          user: {
            id: post.userId?._id || post.userId || 'unknown',
            name: post.userId?.name || 'Anonymous',
            avatar: post.userId?.avatar || 'https://via.placeholder.com/40x40?text=U',
          },
          url: post.mediaUrl,
          mediaType: post.mediaType || 'video'
        }));
        
        setVideos(formattedVideos);
      }
      
      handleCloseUpload();
      
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
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const VideoCard = ({ video }) => {
    const imageSource = video.mediaType === 'image' && video.url
      ? (video.url.startsWith('data:image') ? video.url : video.thumbnail)
      : video.thumbnail;

    const handleCardClick = () => {
      console.log('HomePage VideoCard clicked:', video.id, video.title);
      navigate(`/content/${video.id}`);
    };

    return (
      <Card 
        onClick={handleCardClick}
        sx={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1,
          overflow: 'hidden',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: 3
          }
        }}
      >
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9 aspect ratio
          backgroundColor: '#f5f5f5'
        }}>
            {video.mediaType === 'image' ? (
              <Box
                component="img"
                src={imageSource}
                alt={video.title}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400x225?text=Image+Not+Found';
                }}
              />
            ) : (
              <CardMedia
                component="img"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
                image={video.thumbnail}
                alt={video.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400x225?text=Video+Thumbnail+Not+Found';
                }}
              />
            )}
          </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h6" component="div" noWrap>
            {video.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {video.description}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Simple Header */}
      <Box sx={{ bgcolor: 'background.paper', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Video Gallery
          </Typography>
        </Container>
      </Box>

      {/* Video Grid */}
      <Container maxWidth="xl" sx={{ py: 3, width: '100%', maxWidth: '100%', margin: 0, px: { xs: 2, sm: 3 } }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
            xl: 'repeat(5, 1fr)'
          },
          gap: 2,
          width: '100%',
          padding: 1
        }}>
          {videos.map((video) => (
            <Box key={video.id} sx={{ width: '100%' }}>
              <VideoCard video={video} />
            </Box>
          ))}
        </Box>
      </Container>

      {/* Upload Dialog */}
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
                    id="home-image-upload"
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
                  <label htmlFor="home-image-upload">
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
    </Box>
  );
};
export default HomePage;