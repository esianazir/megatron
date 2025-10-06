import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  IconButton,
  Container,
  CircularProgress,
  Divider
} from '@mui/material';
import { Person as PersonIcon, ThumbUp, Share, Save, ArrowBack } from '@mui/icons-material';

// Helper function to extract YouTube video ID
const getYoutubeId = (url) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
};

// Get video data from localStorage
const getVideoById = (id) => {
  try {
    console.log('Looking for video with ID:', id);
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    console.log('All posts in localStorage:', posts);
    
    // Try to find the post by ID
    const post = posts.find(p => p.id === id);
    
    if (!post) {
      console.log('No post found with ID:', id);
      return null;
    }
    
    console.log('Found post:', post);
    
    return {
      id: post.id,
      title: post.title,
      description: post.description,
      views: '0',
      likes: post.likes || 0,
      timestamp: new Date(post.timestamp).toLocaleDateString(),
      user: {
        name: post.userName || post.user?.name || 'Anonymous',
        avatar: post.userAvatar || post.user?.avatar || 'https://via.placeholder.com/40x40?text=U',
        subscribers: '0'
      },
      url: post.url,
      mediaType: post.mediaType,
      thumbnail: post.thumbnail,
      comments: post.comments || []
    };
  } catch (error) {
    console.error('Error loading video:', error);
    return null;
  }
};

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  
  console.log('VideoDetail - ID from URL params:', id);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Video ID from params:', id);
        console.log('Type of ID:', typeof id);
        
        if (!id) {
          throw new Error('No video ID provided in URL');
        }
        
        // Ensure id is a string and not an object
        const videoId = id && typeof id === 'object' ? id.id || '' : String(id).trim();
        
        console.log('Processing video ID:', videoId);
        
        if (!videoId) {
          throw new Error('Invalid video ID');
        }
        
        const foundVideo = getVideoById(videoId);
        
        if (!foundVideo) {
          console.error('Video not found with ID:', videoId);
          throw new Error(`Video with ID "${videoId}" not found`);
        }
        
        console.log('Found video:', foundVideo);
        setVideo(foundVideo);
        setComments(foundVideo.comments || []);
      } catch (error) {
        console.error('Error in fetchVideo:', error);
        setError(error.message || 'Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchVideo();
    } else {
      setError('No content ID provided');
      setLoading(false);
    }
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    const newComment = {
      id: Date.now().toString(),
      text: comment,
      user: video.user.name,
      avatar: video.user.avatar,
      timestamp: new Date().toISOString()
    };
    
    setComments([...comments, newComment]);
    setComment('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!video) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Content not found</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <IconButton onClick={handleBack} sx={{ mb: 2 }}>
        <ArrowBack />
      </IconButton>
      
      {/* Media Player */}
      <Box sx={{ 
        width: '100%', 
        aspectRatio: video.mediaType === 'image' ? 'auto' : '16/9',
        mb: 4, 
        borderRadius: 2, 
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)'
      }}>
        {video.mediaType === 'video' ? (
          <Box sx={{ width: '100%', height: '100%' }}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${getYoutubeId(video.url)}`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            ></iframe>
          </Box>
        ) : (
          <img
            src={video.url}
            alt={video.title}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh',
              objectFit: 'contain'
            }}
          />
        )}
      </Box>
      
      {/* Video/Image Info */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {video.title}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {video.user?.avatar ? (
                <img 
                  src={video.user.avatar} 
                  alt={video.user?.name || 'User'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentNode.querySelector('.avatar-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <Box 
                className="avatar-fallback"
                sx={{
                  display: video.user?.avatar ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PersonIcon />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={500}>
                {video.user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {video.views} views • {video.timestamp}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<ThumbUp />} variant="outlined" size="small">
              Like
            </Button>
            <Button startIcon={<Share />} variant="outlined" size="small">
              Share
            </Button>
            <Button startIcon={<Save />} variant="outlined" size="small">
              Save
            </Button>
          </Box>
        </Box>
        
        {/* Description */}
        <Box sx={{ 
          backgroundColor: 'background.paper', 
          p: 2, 
          borderRadius: 2,
          mb: 3
        }}>
          <Typography variant="body2">
            {video.description || 'No description available.'}
          </Typography>
        </Box>
      </Box>
      
      {/* Comments Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Comments ({comments.length})
        </Typography>
        
        <Box component="form" onSubmit={handleCommentSubmit} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 40, height: 40 }}>
              <PersonIcon />
            </Avatar>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              size="small"
              disabled={!comment.trim()}
            >
              Comment
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {comments.map((comment) => (
            <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
              <Avatar sx={{ width: 40, height: 40 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={500}>
                    {comment.user}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • {new Date(comment.timestamp).toLocaleDateString()}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {comment.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default VideoDetail;
