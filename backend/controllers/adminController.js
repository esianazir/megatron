const User = require('../models/User');
const Post = require('../models/Post');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({
      joinDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Get post statistics
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ isPublished: true });
    const newPosts = await Post.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Get comment statistics
    const totalComments = await Post.aggregate([
      { $unwind: "$comments" },
      { $count: "totalComments" }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newLast30Days: newUsers
        },
        posts: {
          total: totalPosts,
          published: publishedPosts,
          newLast30Days: newPosts
        },
        comments: {
          total: totalComments[0]?.totalComments || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching dashboard statistics'
    });
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ joinDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
});

// @desc    Update user status (active/suspended)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: status === 'active' },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  // Delete all posts by this user
  await Post.deleteMany({ userId: req.params.id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all posts
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getPosts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, type = 'all' } = req.query;
  
  const query = {};
  if (type !== 'all') {
    query.mediaType = type;
  }

  const posts = await Post.find(query)
    .populate('userId', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Post.countDocuments(query);

  res.status(200).json({
    success: true,
    data: posts,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
});

// @desc    Toggle post visibility
// @route   PUT /api/admin/posts/:id/visibility
// @access  Private/Admin
exports.togglePostVisibility = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }

  post.isVisible = !post.isVisible;
  await post.save();

  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Delete a post
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
exports.deletePost = asyncHandler(async (req, res, next) => {
  const postId = req.params.id;
  
  // Try to find by MongoDB _id first, then by custom id field (for UUID posts)
  let post = await Post.findById(postId).catch(() => null);
  
  if (!post) {
    // If not found by _id, try finding by custom id field (UUID)
    post = await Post.findOne({ id: postId });
  }

  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${postId}`, 404));
  }

  // Delete the post
  await Post.deleteOne({ _id: post._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});
