// Utility functions for handling likes

export const toggleLike = (postId, currentUser) => {
  if (!currentUser) {
    return { success: false, error: 'User not logged in' };
  }

  try {
    const posts = JSON.parse(localStorage.getItem('posts')) || [];
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
        return {
          ...post,
          likes: isLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
          likedBy: isLiked 
            ? (post.likedBy || []).filter(id => id !== currentUser.uid)
            : [...(post.likedBy || []), currentUser.uid]
        };
      }
      return post;
    });

    localStorage.setItem('posts', JSON.stringify(updatedPosts));
    return { success: true, data: updatedPosts.find(p => p.id === postId) };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false, error: 'Failed to update like' };
  }
};

export const isPostLiked = (post, currentUser) => {
  if (!post || !currentUser) return false;
  return post.likedBy && post.likedBy.includes(currentUser.uid);
};
