const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- START CORS FIX: Dynamic Origin Configuration ---

// Get the deployed frontend URL from the environment (e.g., from Render settings)
// Use FRONTEND_URL as the key to be set on Render
const DEPLOYED_CLIENT_URL = process.env.FRONTEND_URL; 

// The actual Vercel Production URL (Mandatory fix)
const VERCEL_PRODUCTION_URL = 'https://projects-eight-gules.vercel.app'; 

// List of allowed origins for production and development
let allowedOrigins = [];

if (process.env.NODE_ENV === 'production') {
    // In production, only allow the Vercel Production URL and the variable
    allowedOrigins = [
        VERCEL_PRODUCTION_URL, 
        DEPLOYED_CLIENT_URL
    ].filter(Boolean);
    
} else {
    // --- DEVELOPMENT LOGIC (as you had it) ---
    const START_PORT = 5173;
    const END_PORT = 5192; 

    const DEVELOPMENT_PORTS = [];
    for (let port = START_PORT; port <= END_PORT; port++) {
        DEVELOPMENT_PORTS.push(port.toString());
    }

    const devOrigins = DEVELOPMENT_PORTS.map(port => `http://localhost:${port}`);

    // In development, allow Vercel URL, localhost ports, and the deployed client variable
    allowedOrigins = [
        VERCEL_PRODUCTION_URL,
        ...devOrigins,
        DEPLOYED_CLIENT_URL
    ].filter(Boolean); 
}

const uniqueAllowedOrigins = Array.from(new Set(allowedOrigins));


const corsOptions = {
    // This function checks the origin sent by the browser
    origin: (origin, callback) => {
        // 1. Allow requests with no origin (e.g., Postman, server-to-server)
        if (!origin) return callback(null, true); 

        // 2. Check if the requested origin is in our allowed list
        if (uniqueAllowedOrigins.includes(origin)) {
            console.log(`[CORS SUCCESS] Access granted for requested origin: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`[CORS DENIED] Access DENIED for requested origin: ${origin}. Allowed list size: ${uniqueAllowedOrigins.length}`);
            callback(new Error('Not allowed by CORS'), false); 
        }
    },
    credentials: true,
    exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions)); 

// --- END CORS FIX ---

// Test route
app.get('/', (req, res) => {
    res.json({ 
      message: 'Anime E-commerce API is running!',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        products: '/api/products',
        cart: '/api/cart',
        orders: '/api/orders',
        admin: '/api/admin'
      }
    });
});

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/admin', require('./src/routes/admin'));

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});