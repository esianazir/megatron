const Post = require('../models/Post');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
exports.getPosts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, userId } = req.query;
  
  let query = {};
  
  // Add user filter if provided
  if (userId) {
    query.userId = userId;
  }
  
  // Add search filter if provided
  if (search) {
    query.$text = { $search: search };
  }
  
  const posts = await Post.find(query)
    .populate('userId', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  
  const count = await Post.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: posts,
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit)
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate('userId', 'name email avatar')
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: 'name avatar'
      },
      options: { sort: { createdAt: -1 }, limit: 5 }
    });
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Increment post view count
// @route   PUT /api/posts/:id/view
// @access  Public
exports.incrementView = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }
  
  // Get user ID from token if available, otherwise use IP or session
  let userId = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (error) {
      // If token is invalid, treat as anonymous user
      userId = null;
    }
  }
  
  // Check if this user has already viewed this post
  const hasViewed = userId ? post.viewedBy.includes(userId) : false;
  
  if (!hasViewed) {
    // Increment view count
    post.views = (post.views || 0) + 1;
    
    // Add user to viewedBy array if authenticated
    if (userId) {
      post.viewedBy.push(userId);
    }
    
    await post.save();
  }
  
  res.status(200).json({
    success: true,
    data: { 
      views: post.views,
      hasViewed: hasViewed
    }
  });
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.userId = req.user.id;
  
  const post = await Post.create(req.body);
  
  res.status(201).json({
    success: true,
    data: post
  });
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is post owner or admin
  if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this post`, 401));
  }
  
  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is post owner or admin
  if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this post`, 401));
  }
  
  await post.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Like/Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.id}`, 404));
  }
  
  const userId = req.user.id;
  const likeIndex = post.likes.indexOf(userId);
  
  if (likeIndex === -1) {
    // Like the post
    post.likes.push(userId);
  } else {
    // Unlike the post
    post.likes.splice(likeIndex, 1);
  }
  
  await post.save();
  
  res.status(200).json({
    success: true,
    data: post
  });
});
