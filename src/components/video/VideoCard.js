import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardMedia, 
  CardContent, 
  Typography, 
  Avatar, 
  Box,
  CardActionArea,
  IconButton,
  CardActions,
  Chip
} from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder, 
  Comment as CommentIcon, 
  Visibility 
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const VideoCard = ({ video, onClick, onLike, onComment }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(video.isLiked || false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);

  // Determine the source of the image
  const imageSource = video.mediaType === 'image' && video.url
    ? (video.url.startsWith('data:image') ? video.url : video.thumbnail)
    : video.thumbnail;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Please log in to like posts');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${video.id}/like`, {
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
        
        if (onLike) onLike(video.id, newLiked);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (e) => {
    e.stopPropagation();
    if (onComment) onComment(video.id);
  };

  const handleCardClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('VideoCard clicked:', video.id, video);
    alert(`Clicked video: ${video.title} (ID: ${video.id})`); // Temporary test
    
    if (onClick) {
      console.log('Using custom onClick handler');
      onClick(video.id);
    } else {
      console.log('Navigating to:', `/content/${video.id}`);
      // Default behavior - navigate to content detail page
      navigate(`/content/${video.id}`);
    }
  };

  return (
    <Card 
      onClick={handleCardClick}
      sx={{ 
        maxWidth: 345, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
    >
        <Box sx={{ 
          height: 140, 
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          position: 'relative'
        }}>
          <CardMedia
            component="img"
            image={imageSource}
            alt={video.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
          {video.mediaType === 'video' && (
            <Chip 
              label="VIDEO" 
              size="small" 
              color="primary"
              sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8,
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white'
              }} 
            />
          )}
        </Box>
        <CardContent sx={{ flexGrow: 1, p: 2, pb: 1 }}>
          <Typography variant="h6" component="h2" noWrap sx={{ mb: 1 }}>
            {video.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar 
              src={video.user?.avatar} 
              sx={{ width: 24, height: 24, mr: 1 }}
            >
              {video.user?.name?.charAt(0)}
            </Avatar>
            <Typography variant="body2" color="text.secondary" noWrap>
              {video.user?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {video.views || 0}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              • {video.timestamp}
            </Typography>
          </Box>
        </CardContent>
      
      <CardActions sx={{ pt: 0, px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleLike(e);
            }}
            color={liked ? 'error' : 'default'}
          >
            {liked ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {likeCount}
          </Typography>
          
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              handleComment(e);
            }}
          >
            <CommentIcon />
          </IconButton>
          <Typography variant="body2">
            {video.comments || 0}
          </Typography>
        </Box>
      </CardActions>
    </Card>
  );
};

export default VideoCard;
