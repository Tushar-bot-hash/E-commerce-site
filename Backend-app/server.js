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

// --- START CORS FIX: Dynamic Port Range for Local Development ---
// Dynamically generate a list of common development ports for flexibility.
const START_PORT = 5173;
const END_PORT = 5192; // Supports 20 simultaneous frontend terminals (5173 through 5192)

const DEVELOPMENT_PORTS = [];
for (let port = START_PORT; port <= END_PORT; port++) {
    DEVELOPMENT_PORTS.push(port.toString());
}

// Construct the list of allowed development origins
const devOrigins = DEVELOPMENT_PORTS.map(port => `http://localhost:${port}`);

// List of all allowed origins
const allowedOrigins = [
    process.env.CLIENT_URL, // From your .env file
    ...devOrigins
].filter(Boolean); // Filter out any falsy values (like undefined if CLIENT_URL is missing)

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
            callback(null, false);
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