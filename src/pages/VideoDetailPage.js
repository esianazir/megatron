import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Avatar,
  TextField,
  Divider,
  IconButton,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ThumbUp, ThumbUpOutlined, Reply, Share, PlaylistAdd } from '@mui/icons-material';
import { toggleLike, isPostLiked } from '../utils/likeUtils';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/video/VideoCard';

const VideoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        // Fetch video details
        const videoResponse = await axios.get(`/api/videos/${id}`);
        setVideo(videoResponse.data);
        
        // Set initial like status
  useEffect(() => {
    if (currentUser && video) {
      setIsLiked(isPostLiked(video, currentUser));
      setLikeCount(video.likes || 0);
    }
  }, [currentUser, video]);
        
        // Fetch comments
        const commentsResponse = await axios.get(`/api/videos/${id}/comments`);
        setComments(commentsResponse.data);
        
        // Fetch related videos
        const relatedResponse = await axios.get(`/api/videos/related/${id}`);
        setRelatedVideos(relatedResponse.data);
        
      } catch (err) {
        console.error('Error fetching video data:', err);
        setError('Failed to load video. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id, currentUser]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: `/video/${id}` } });
      return;
    }

    try {
      const { success, data: updatedPost } = toggleLike(id, currentUser);
      if (success && updatedPost) {
        setLikeCount(updatedPost.likes || 0);
        setIsLiked(updatedPost.likedBy && updatedPost.likedBy.includes(currentUser.uid));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    if (!currentUser) {
      navigate('/login', { state: { from: `/video/${id}` } });
      return;
    }

    try {
      const response = await axios.post(
        `/api/videos/${id}/comments`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      setComments([response.data, ...comments]);
      setCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment');
    }
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !video) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          {error || 'Video not found'}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, maxWidth: '1600px' }}>
      <Grid container spacing={3}>
        {/* Main Video Content */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: 1, overflow: 'hidden', bgcolor: 'black' }}>
            <iframe
              title={video.title}
              src={`${getYoutubeEmbedUrl(video.url)}?autoplay=1`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </Box>

          {/* Video Info */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              {video.title}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {video.views} views • {formatDistanceToNow(new Date(video.createdAt))} ago
              </Typography>
              {video.tags?.map((tag, index) => (
                <Chip key={index} label={`#${tag}`} size="small" clickable />
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <IconButton 
                onClick={handleLike}
                color={isLiked ? 'primary' : 'default'}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                {isLiked ? <ThumbUp /> : <ThumbUpOutlined />}
                <Box component="span" sx={{ ml: 1 }}>{likeCount}</Box>
              </IconButton>
              
              <IconButton aria-label="Share">
                <Share />
              </IconButton>
              
              <IconButton aria-label="Save to playlist">
                <PlaylistAdd />
              </IconButton>
              
              <Box sx={{ flexGrow: 1 }} />
              
              {video.user?._id === currentUser?._id && (
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => navigate(`/video/${id}/edit`)}
                >
                  Edit Video
                </Button>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Channel Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar 
                alt={video.user?.username} 
                src={video.user?.avatar} 
                sx={{ width: 56, height: 56 }}
                component={RouterLink}
                to={`/user/${video.user?._id}`}
              />
              <Box>
                <Typography variant="subtitle1" component={RouterLink} to={`/user/${video.user?._id}`} sx={{ fontWeight: 'medium', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                  {video.user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {video.user?.subscribers || 0} subscribers
                </Typography>
              </Box>
              <Button variant="contained" color="primary" sx={{ ml: 'auto' }}>
                Subscribe
              </Button>
            </Box>
            
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2" whiteSpace="pre-line">
                {video.description || 'No description provided.'}
              </Typography>
            </Paper>
          </Box>
          
          {/* Comments Section */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              {comments.length} Comments
            </Typography>
            
            {/* Add Comment */}
            <Box component="form" onSubmit={handleCommentSubmit} sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar 
                alt={currentUser?.username || 'Anonymous'} 
                src={currentUser?.avatar} 
                sx={{ width: 40, height: 40 }}
              />
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                InputProps={{
                  sx: { borderRadius: 20, bgcolor: 'background.paper' },
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={!commentText.trim()}
                sx={{ borderRadius: 2 }}
              >
                Comment
              </Button>
            </Box>
            
            {/* Comments List */}
            {comments.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {comments.map((comment) => (
                  <Box key={comment._id} sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Avatar 
                      alt={comment.user?.username} 
                      src={comment.user?.avatar} 
                      component={RouterLink}
                      to={`/user/${comment.user?._id}`}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography 
                          variant="subtitle2" 
                          component={RouterLink} 
                          to={`/user/${comment.user?._id}`}
                          sx={{ fontWeight: 'medium', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {comment.user?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {comment.text}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Button size="small" startIcon={<ThumbUpOutlined fontSize="small" />}>
                          {comment.likes || 0}
                        </Button>
                        <Button size="small" startIcon={<Reply fontSize="small" />}>
                          Reply
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No comments yet. Be the first to comment!
              </Typography>
            )}
          </Box>
        </Grid>
        
        {/* Sidebar with Related Videos */}
        <Grid item xs={12} lg={4}>
          <Typography variant="h6" gutterBottom>
            Up next
          </Typography>
          
          {relatedVideos.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {relatedVideos.map((relatedVideo) => (
                <VideoCard key={relatedVideo._id} video={relatedVideo} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No related videos found.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoDetailPage;
