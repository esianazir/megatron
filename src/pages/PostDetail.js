import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Divider,
  Chip,
  Avatar,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, Favorite, FavoriteBorder, Comment as CommentIcon, Share, Bookmark } from '@mui/icons-material';
import { toggleLike, isPostLiked } from '../utils/likeUtils';
import { useAuth } from '../context/AuthContext';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // In a real app, fetch the post from your API
    const fetchPost = () => {
      try {
        const posts = JSON.parse(localStorage.getItem('posts')) || [];
        const foundPost = posts.find(p => p.id === id);
        if (foundPost) {
          setPost(foundPost);
          setSaved(foundPost.isSaved || false);
          // Simulate fetching comments
          setComments(foundPost.comments || []);
        } else {
          navigate('/'); // Redirect if post not found
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, navigate]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const { success, data: updatedPost } = toggleLike(id, currentUser);
    if (success && updatedPost) {
      setPost(updatedPost);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    
    // In a real app, update the saved status in your database
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const updatedPosts = posts.map(p => 
      p.id === id ? { ...p, isSaved: !saved } : p
    );
    localStorage.setItem('posts', JSON.stringify(updatedPosts));
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newComment = {
      id: Date.now().toString(),
      text: comment,
      user: 'Current User', // In a real app, use the logged-in user
      timestamp: new Date().toISOString(),
    };

    setComments([...comments, newComment]);
    setComment('');

    // In a real app, save the comment to your database
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const updatedPosts = posts.map(p => 
      p.id === id 
        ? { 
            ...p, 
            comments: [...(p.comments || []), newComment],
            commentsCount: (p.comments?.length || 0) + 1
          } 
        : p
    );
    localStorage.setItem('posts', JSON.stringify(updatedPosts));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5">Post not found</Typography>
        <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back
      </Button>

      <Paper elevation={3} sx={{ mb: 4, overflow: 'hidden' }}>
        {/* Post Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              src={post.userAvatar} 
              alt={post.userName}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {post.userName?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {post.userName || 'Anonymous'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(post.timestamp).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <Typography variant="h5" gutterBottom>
            {post.title}
          </Typography>
          <Typography variant="body1" paragraph>
            {post.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {post.tags?.map((tag, index) => (
              <Chip key={index} label={`#${tag}`} size="small" />
            ))}
          </Box>
        </Box>

        {/* Media Content */}
        <Box sx={{ position: 'relative', bgcolor: 'black' }}>
          {post.mediaType === 'video' ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(post.url)}`}
                title={post.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={post.url}
              alt={post.title}
            />
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <IconButton 
            onClick={handleLike} 
            color={isPostLiked(post, currentUser) ? 'error' : 'default'}
          >
            {isPostLiked(post, currentUser) ? <Favorite /> : <FavoriteBorder />}
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {post.likes || 0}
            </Typography>
          </IconButton>
          
          <IconButton>
            <CommentIcon />
            <Typography sx={{ ml: 0.5 }}>{post.comments?.length || 0}</Typography>
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <IconButton onClick={handleSave} color={saved ? 'primary' : 'default'}>
            <Bookmark color={saved ? 'primary' : 'inherit'} />
          </IconButton>
          
          <IconButton>
            <Share />
          </IconButton>
        </Box>

        {/* Comments Section */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Comments ({comments.length})
          </Typography>
          
          <form onSubmit={handleCommentSubmit} style={{ marginBottom: '16px' }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="small"
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={!comment.trim()}
              >
                Post
              </Button>
            </Box>
          </form>

          {comments.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              {comments.map((comment) => (
                <Box key={comment.id} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {comment.user?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {comment.user}
                      </Typography>
                      <Typography variant="body2">{comment.text}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {new Date(comment.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No comments yet. Be the first to comment!
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

// Helper function to extract YouTube video ID
function getYoutubeId(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

export default PostDetail;
