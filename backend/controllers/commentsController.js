const Comment = require('../models/Comment');
const Post = require('../models/Post');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
exports.getComments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const comments = await Comment.find({ post: req.params.postId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  
  const count = await Comment.countDocuments({ post: req.params.postId });
  
  res.status(200).json({
    success: true,
    data: comments,
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit)
  });
});

// @desc    Add comment to post
// @route   POST /api/posts/:postId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  
  // Check if post exists
  const post = await Post.findById(req.params.postId);
  if (!post) {
    return next(new ErrorResponse(`Post not found with id of ${req.params.postId}`, 404));
  }
  
  const comment = await Comment.create({
    content,
    user: req.user.id,
    post: req.params.postId
  });
  
  // Add comment to post's comments array
  post.comments.push(comment._id);
  await post.save();
  
  // Populate user data before sending response
  await comment.populate('user', 'name avatar');
  
  res.status(201).json({
    success: true,
    data: comment
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is comment owner
  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this comment`, 401));
  }
  
  comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('user', 'name avatar');
  
  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is comment owner or admin
  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this comment`, 401));
  }
  
  // Remove comment from post's comments array
  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: comment._id }
  });
  
  await comment.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Like/Unlike comment
// @route   PUT /api/comments/:id/like
// @access  Private
exports.likeComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  
  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404));
  }
  
  const userId = req.user.id;
  const likeIndex = comment.likes.indexOf(userId);
  
  if (likeIndex === -1) {
    // Like the comment
    comment.likes.push(userId);
  } else {
    // Unlike the comment
    comment.likes.splice(likeIndex, 1);
  }
  
  await comment.save();
  
  res.status(200).json({
    success: true,
    data: comment
  });
});
