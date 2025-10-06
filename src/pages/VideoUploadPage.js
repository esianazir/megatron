import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { 
  CloudUpload, 
  Add, 
  Close, 
  Image as ImageIcon,
  Link as LinkIcon,
  ArrowBack,
  YouTube
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ContentUploadPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mediaType: 'image',
    file: null,
    url: '',
    thumbnail: '',
    isPublic: true,
  });
  
  // Helper function to extract YouTube video ID
  const getYoutubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          file,
          thumbnail: reader.result,
          mediaType: 'image'
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value;
    const videoId = getYoutubeId(url);
    setFormData(prev => ({
      ...prev,
      url,
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '',
      mediaType: 'video'
    }));
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFormData(prev => ({
      ...prev,
      mediaType: newValue === 0 ? 'image' : 'video',
      file: null,
      url: '',
      thumbnail: ''
    }));
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    if (tabValue === 0 && !formData.file && !formData.url) {
      setError('Please select an image or enter an image URL');
      return;
    }
    
    if (tabValue === 1 && !formData.url) {
      setError('Please enter a YouTube video URL');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const postId = uuidv4();
      // Get user information
      const userId = currentUser.id || currentUser._id || currentUser.uid || `user-${Date.now()}`;
      const userName = currentUser.name || currentUser.displayName || 'User';
      const userEmail = currentUser.email || '';
      const userAvatar = currentUser.photoURL || currentUser.avatar || 'https://via.placeholder.com/40x40?text=U';
      
      // Get the media URL or create a blob URL for the file
      let mediaUrl = formData.url;
      let thumbnailUrl = formData.url;
      
      if (tabValue === 0 && formData.file) {
        // For image uploads
        mediaUrl = URL.createObjectURL(formData.file);
        thumbnailUrl = mediaUrl;
      } else if (tabValue === 1 && formData.url) {
        // For YouTube videos
        const videoId = getYoutubeId(formData.url);
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      
      // Create the post object with a consistent structure
      const newPost = {
        // Post identification
        id: postId,
        _id: postId,
        
        // Content
        title: formData.title,
        description: formData.description,
        mediaType: tabValue === 0 ? 'image' : 'video',
        url: mediaUrl,
        thumbnail: thumbnailUrl,
        
        // User information (duplicated at top level for backward compatibility)
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        userAvatar: userAvatar,
        
        // Nested user object (preferred)
        user: {
          id: userId,
          _id: userId,
          uid: currentUser.uid || userId,
          name: userName,
          displayName: userName, // Added for consistency
          email: userEmail,
          avatar: userAvatar,
          photoURL: userAvatar
        },
        
        // Engagement
        likes: [],
        comments: [],
        views: 0,
        isLiked: false,
        isSaved: false,
        
        // Timestamps
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Additional metadata
        isPublic: formData.isPublic !== false, // Default to true if not set
        tags: tags,
        
        // Add type for easier filtering
        type: tabValue === 0 ? 'image' : 'video',
        
        // Add source information
        source: 'upload',
        
        // Add dimensions for media (can be updated later when media loads)
        width: null,
        height: null
      };
      
      console.log('Creating new post with structure:', JSON.stringify(newPost, null, 2));
      
      console.log('Creating new post:', newPost);

      // Get existing posts from localStorage
      const existingPosts = JSON.parse(localStorage.getItem('posts')) || [];
      
      // Add the new post
      const updatedPosts = [newPost, ...existingPosts];
      
      // Save back to localStorage
      localStorage.setItem('posts', JSON.stringify(updatedPosts));
      
      // Show success message
      setSuccess('Content uploaded successfully!');
      
      // Redirect to the new post's detail page after a short delay
      setTimeout(() => {
        navigate(`/post/${postId}`);
      }, 1000);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        mediaType: 'image',
        file: null,
        url: '',
        thumbnail: '',
        isPublic: true,
      });
      setTags([]);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to upload content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function for tab accessibility
  const a11yProps = (index) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });

  // Simple header for the upload page
  const UploadHeader = () => (
    <Box sx={{ mb: 3, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Share Your Content
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Upload images or share YouTube videos with the community
      </Typography>
    </Box>
  );
  
  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Please sign in to upload content
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/login', { state: { from: '/upload' } })}
          sx={{ mt: 2 }}
        >
          Sign In
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <UploadHeader />
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Upload Image" {...a11yProps(0)} />
          <Tab label="Share YouTube Video" {...a11yProps(1)} />
        </Tabs>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>
            
            {tabValue === 0 ? (
              <>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                    />
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                    OR
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Image URL"
                    name="url"
                    value={formData.url}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        url: e.target.value,
                        thumbnail: e.target.value
                      }));
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LinkIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="YouTube Video URL"
                  name="url"
                  value={formData.url}
                  onChange={handleYoutubeUrlChange}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <YouTube color="error" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}
            
            {formData.thumbnail && (
              <Grid item xs={12}>
                <Card>
                  <CardMedia
                    component={formData.mediaType === 'video' ? 'iframe' : 'img'}
                    height="240"
                    image={formData.thumbnail}
                    alt="Preview"
                  />
                  <CardContent>
                    <Typography variant="h6">{formData.title || 'No title'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formData.description || 'No description'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Add tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Add />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button onClick={handleAddTag}>Add</Button>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isPublic}
                    onChange={handleChange}
                    name="isPublic"
                    color="primary"
                  />
                }
                label={formData.isPublic ? 'Public' : 'Private'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {loading ? 'Uploading...' : 'Upload Content'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default ContentUploadPage;
