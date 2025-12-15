const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// JWT SECRET CHECK
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
}

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// List of allowed origins
const allowedOrigins = [
    'https://projects-l2cf7s8oi-tusharv811-2882s-projects.vercel.app',
    'https://projects-lemon-eight.vercel.app',
    'https://anime-api-backend-u42d.onrender.com', 
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
];

// CORS configuration - SIMPLIFIED
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`🚫 Blocked by CORS: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

// Apply CORS middleware - THIS HANDLES PREFLIGHT AUTOMATICALLY
app.use(cors(corsOptions));



// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route with CORS test
app.get('/', (req, res) => {
    res.json({ 
        message: 'Anime E-commerce API is running!',
        version: '1.0.0',
        cors: 'Enabled',
        allowedOrigins: allowedOrigins,
        requestOrigin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// Enhanced CORS test endpoint
app.get('/api/cors-test', (req, res) => {
    res.json({
        message: 'CORS is working!',
        allowedOrigins: allowedOrigins,
        requestOrigin: req.headers.origin,
        isOriginAllowed: allowedOrigins.includes(req.headers.origin),
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
app.use('/api/reviews', require('./src/routes/review'));

// Enhanced error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle CORS errors specifically
    if (err.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            message: 'CORS Error: Origin not allowed',
            allowedOrigins: allowedOrigins,
            yourOrigin: req.headers.origin
        });
    }
    
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Route not found',
        path: req.path 
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`✅ CORS is configured for the following origins:`);
    allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
    console.log(`🌐 Test CORS: https://anime-api-backend-u42d.onrender.com/api/cors-test`);
});