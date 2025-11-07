const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const path = require('path'); // Required for path manipulation

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// --- CORS Configuration (Kept for Local Development) ---
const allowedOrigins = [
    // 1. Production/Explicitly set URL (from .env)
    process.env.CLIENT_URL, 
    // ... all localhost origins
].filter(Boolean);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); 
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`CORS Policy blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Test route and API Routes
app.get('/', (req, res) => {
    res.json({ message: 'Anime E-commerce API is running!' });
});

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));


// =======================================================
// 🚀 RENDER DEPLOYMENT CONFIGURATION (Serve Frontend)
// =======================================================
if (process.env.NODE_ENV === 'production') {
    
    // 1. Serve static assets (the built React files from the 'dist' folder)
    app.use(express.static(path.join(__dirname, '..', 'frontend-app', 'dist')));
    
    // 2. Handle client-side routing, returning all non-API requests to index.html
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..', 'frontend-app', 'dist', 'index.html'));
    });
}
// =======================================================


// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Handle 404 (Only in development, handled by app.get('*') in production)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res) => {
        res.status(404).json({ message: 'Route not found' });
    });
}


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});