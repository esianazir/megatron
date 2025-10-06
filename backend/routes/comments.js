const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  likeComment
} = require('../controllers/commentsController');

const { protect } = require('../middleware/auth');

// Routes for /api/posts/:postId/comments
router.route('/')
  .get(getComments)
  .post(protect, addComment);

// Routes for /api/comments/:id
router.route('/:id')
  .put(protect, updateComment)
  .delete(protect, deleteComment);

router.put('/:id/like', protect, likeComment);

module.exports = router;
