import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardMedia,
  Avatar,
  Button,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  ArrowBack,
  Send,
  Visibility,
  PlayArrow
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const ContentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Fetch post details
  useEffect(() => {
    const fetchPostDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch post details
        const postResponse = await fetch(`http://localhost:5000/api/posts/${id}`);
        if (!postResponse.ok) {
          throw new Error('Post not found');
        }
        
        const postResult = await postResponse.json();
        const postData = postResult.data;
        
        setPost(postData);
        setLiked(postData.likes?.includes(currentUser?._id));
        setLikeCount(postData.likes?.length || 0);
        
        // Fetch comments
        const commentsResponse = await fetch(`http://localhost:5000/api/posts/${id}/comments`);
        if (commentsResponse.ok) {
          const commentsResult = await commentsResponse.json();
          setComments(commentsResult.data || []);
        }
        
        // Increment view count (backend will handle duplicate prevention)
        try {
          const token = localStorage.getItem('token');
          const headers = {
            'Content-Type': 'application/json'
          };
          
          // Add auth header if user is logged in
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const viewResponse = await fetch(`http://localhost:5000/api/posts/${id}/view`, {
            method: 'PUT',
            headers
          });
          
          if (viewResponse.ok) {
            const viewResult = await viewResponse.json();
            // Update local state with the actual view count from server
            setPost(prev => prev ? { 
              ...prev, 
              views: viewResult.data.views 
            } : null);
          }
        } catch (viewError) {
          console.warn('Failed to increment view count:', viewError);
        }
        
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPostDetails();
    }
  }, [id, currentUser]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!currentUser) {
      alert('Please log in to like posts');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${id}/like`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to comment');
      return;
    }
    
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/posts/${id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        setComments(prev => [result.data, ...prev]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Get YouTube video ID for embedding
  const getYoutubeId = (url) => {
    if (!url) return '';
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

  // Render media content
  const renderMedia = () => {
    if (!post) return null;

    if (post.mediaType === 'video' && post.mediaUrl?.includes('youtube')) {
      const videoId = getYoutubeId(post.mediaUrl);
      if (videoId) {
        return (
          <Box sx={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={post.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
            />
          </Box>
        );
      }
    }

    // For images or other media
    return (
      <CardMedia
        component="img"
        image={post.mediaUrl || post.thumbnailUrl || 'https://via.placeholder.com/800x450?text=No+Image'}
        alt={post.title}
        sx={{
          width: '100%',
          maxHeight: 500,
          objectFit: 'contain',
          backgroundColor: '#f5f5f5'
        }}
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/800x450?text=Image+Not+Available';
        }}
      />
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !post) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Content not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        Back to Library
      </Button>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          {/* Media Display */}
          <Card sx={{ mb: 3 }}>
            {renderMedia()}
          </Card>

          {/* Post Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {post.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                label={post.mediaType?.toUpperCase() || 'CONTENT'}
                color="primary"
                size="small"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  {post.views || 0} views
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {new Date(post.createdAt).toLocaleDateString()}
              </Typography>
            </Box>

            {/* Author Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar 
                src={post.userId?.avatar} 
                sx={{ width: 40, height: 40 }}
              >
                {post.userId?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {post.userId?.name || 'Anonymous'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {post.userId?.email}
                </Typography>
              </Box>
            </Box>

            {/* Description */}
            {post.description && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {post.description}
              </Typography>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                startIcon={liked ? <Favorite /> : <FavoriteBorder />}
                onClick={handleLike}
                color={liked ? 'error' : 'inherit'}
                variant={liked ? 'contained' : 'outlined'}
              >
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </Button>
              <Button
                startIcon={<Share />}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
                variant="outlined"
              >
                Share
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Comments Section */}
        <Box sx={{ width: { xs: '100%', md: 400 } }}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom>
              Comments ({comments.length})
            </Typography>

            {/* Add Comment Form */}
            {currentUser ? (
              <Box component="form" onSubmit={handleSubmitComment} sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={!newComment.trim() || submittingComment}
                    startIcon={submittingComment ? <CircularProgress size={16} /> : <Send />}
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                Please log in to comment
              </Alert>
            )}

            {/* Comments List */}
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No comments yet. Be the first to comment!
                </Typography>
              ) : (
                comments.map((comment, index) => (
                  <React.Fragment key={comment._id || index}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar 
                          src={comment.user?.avatar}
                          sx={{ width: 32, height: 32 }}
                        >
                          {comment.user?.name?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight="bold">
                            {comment.user?.name || 'Anonymous'}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {comment.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default ContentDetailPage;
