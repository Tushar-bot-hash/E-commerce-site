const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// JWT SECRET CHECK
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1); // Exit if no JWT secret
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// =========================================================================
// 🚀 COMPREHENSIVE CORS FIX
// =========================================================================

// List of allowed origins
const allowedOrigins = [
    'https://projects-l2cf7s8oi-tusharv811-2882s-projects.vercel.app',
    'https://projects-lemon-eight.vercel.app', 
    'https://anime-api-backend-u42d.onrender.com', 
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // In production, you might want to be more strict
            if (process.env.NODE_ENV === 'production') {
                console.warn(`🚨 CORS blocked origin: ${origin}`);
                callback(new Error(`CORS not allowed for origin: ${origin}`));
            } else {
                // Allow in development
                console.log(`🔓 Allowing origin in development: ${origin}`);
                callback(null, true);
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// =========================================================================
// 🛠️ MANUAL CORS HEADERS AS FALLBACK
// =========================================================================

// Add manual CORS headers as a fallback
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Security middleware - Add helmet in production
if (process.env.NODE_ENV === 'production') {
    const helmet = require('helmet');
    app.use(helmet());
}

// Rate limiting - Add for production
if (process.env.NODE_ENV === 'production') {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    });
    app.use('/api/', limiter);
}

// Middleware
app.use(express.json({ limit: '10mb' })); // Increase payload limit for images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Test route to verify CORS is working
app.get('/', (req, res) => {
    res.json({ 
        message: 'Anime E-commerce API is running!',
        version: '1.0.0',
        cors: 'Enabled',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Test CORS-specific route
app.get('/api/cors-test', (req, res) => {
    res.json({
        message: 'CORS is working!',
        allowedOrigins: allowedOrigins,
        requestOrigin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/payment', require('./src/routes/payment'));
app.use('/api/reviews', require('./src/routes/review')); // ✅ FIXED: Changed from 'reviews' to 'review'

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Ensure CORS headers are set even on errors
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    
    const statusCode = err.statusCode || 500;
    
    // Don't leak error details in production
    const errorResponse = {
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    };
    
    res.status(statusCode).json(errorResponse);
});

// Handle 404 - with CORS headers
app.use('*', (req, res) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(404).json({ 
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`✅ CORS is configured for the following origins:`);
    allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
    console.log(`📝 Test CORS by visiting: http://localhost:${PORT}/api/cors-test`);
    console.log(`⭐ Review API available at: http://localhost:${PORT}/api/reviews`);
    console.log(`🏥 Health check at: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', err);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app; // For testing