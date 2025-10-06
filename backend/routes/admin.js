const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  deleteUser,
  getPosts,
  togglePostVisibility,
  deletePost
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// All routes are protected and only accessible by admins
router.use(protect);
router.use(authorize('admin'));

// Dashboard routes
router.get('/stats', getDashboardStats);

// User management routes
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Post management routes
router.get('/posts', getPosts);
router.put('/posts/:id/visibility', togglePostVisibility);
router.delete('/posts/:id', deletePost);

module.exports = router;
