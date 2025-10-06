const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  incrementView
} = require('../controllers/postsController');

const { protect } = require('../middleware/auth');

// Re-route into other resource routers
const commentRouter = require('./comments');
router.use('/:postId/comments', commentRouter);

// Public routes
router.get('/', getPosts);
router.get('/:id', getPost);
router.put('/:id/view', incrementView);

// Protected routes
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, likePost);

module.exports = router;
