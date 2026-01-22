const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ==========================================
// 🛡️ ENHANCED CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
    'https://anime-api-backend-u42d.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // 1. Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // 2. Allow any Vercel deployment and Localhost
        const isVercel = origin.includes('vercel.app');
        const isLocal = origin.includes('localhost');
        const isWhitelisted = allowedOrigins.includes(origin);
        
        if (isWhitelisted || isVercel || isLocal) {
            callback(null, true);
        } else {
            console.log(`🚫 CORS Blocked Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

// Apply CORS before any routes
app.use(cors(corsOptions));

// ==========================================
// ⚙️ MIDDLEWARE
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 🚀 API ROUTES
// ==========================================

/**
 * 🛠️ INSTRUCTION: Fixing Route Mismatch
 * We map both /api/auth and /api/users to the same logic.
 * This ensures Login, Signup, and Checkout (Profile) all work.
 */
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); 

app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/payment', require('./src/routes/payment'));
app.use('/api/reviews', require('./src/routes/review'));

// ==========================================
// ⚠️ ERROR HANDLING & HEALTH
// ==========================================

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'API Online', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server active on port ${PORT}`);
});