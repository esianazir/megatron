require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

// Initialize express
const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://megatron.kisohub.com',
  'https://www.megatron.kisohub.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.warn(`CORS blocked: ${origin} is not in allowed origins`);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 600 // 10 minutes
};

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  next();
});

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight across all routes

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Add response formatter middleware
app.use((req, res, next) => {
  res.apiSuccess = (data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
    });
  };
  next();
});

// Connect to MongoDB with retry logic
const connectDB = async () => {
  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/megatron';
      console.log(`Connecting to MongoDB (Attempt ${retryCount + 1}/${maxRetries})...`);
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      console.log('MongoDB Connected...');
      return;
    } catch (err) {
      console.error(`MongoDB connection error (Attempt ${retryCount + 1}):`, err.message);
      retryCount++;
      
      if (retryCount === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 3000 * retryCount));
    }
  }
};

// Connect to database
connectDB().catch(err => {
  console.error('Fatal error during database connection:', err);
  process.exit(1);
});

// Simple test endpoint at root
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Test endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CORS is working!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token'
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: messages.join('. ')
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Field',
      message: `${field} already exists`
    });
  }

  // Default error response
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Error handling for server startup
const server = app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  console.log('All routes:', 
    app._router.stack
      .filter(r => r.route)
      .map(r => Object.keys(r.route.methods)[0].toUpperCase().padEnd(7) + r.route.path)
      .join('\n')
  );
});

// Log all registered routes
console.log('Registered routes:');
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(
      Object.keys(r.route.methods)[0].toUpperCase().padEnd(7) + 
      r.route.path
    );
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection at: ${promise}, reason:`, err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle SIGTERM (for Docker/container orchestration)
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle process termination
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server stopped');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
