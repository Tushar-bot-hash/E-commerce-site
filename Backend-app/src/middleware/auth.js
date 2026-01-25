const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - check if user is authenticated
exports.protect = async (req, res, next) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔐 AUTH MIDDLEWARE - PROTECT ROUTE");
  console.log("=".repeat(60));
  
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log("📦 Token received (first 30 chars):", token.substring(0, 30) + "...");
      console.log("Full Authorization header:", req.headers.authorization);

      // Verify token
      console.log("🔍 Verifying token with JWT_SECRET...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified successfully");
      console.log("Decoded token data:", {
        id: decoded.id,
        email: decoded.email,
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'N/A',
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A'
      });

      // Get user from token (exclude password)
      console.log(`🔍 Looking for user with ID: ${decoded.id}`);
      console.log(`JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
      console.log(`JWT_SECRET length: ${process.env.JWT_SECRET?.length || 0}`);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      console.log("✅ User found:", req.user ? {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
      } : "NULL - USER NOT FOUND");

      if (!req.user) {
        console.error("❌ ERROR: User not found in database!");
        console.error("Token ID:", decoded.id);
        console.error("Token email:", decoded.email);
        return res.status(401).json({ 
          message: 'User not found',
          debug: { tokenId: decoded.id, tokenEmail: decoded.email }
        });
      }

      console.log("✅ Authentication SUCCESSFUL");
      console.log("=".repeat(60) + "\n");
      next();
    } catch (error) {
      console.error("\n❌ AUTH MIDDLEWARE ERROR:");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      if (error.name === 'JsonWebTokenError') {
        console.error("JWT Error - Invalid token or signature");
        console.error("JWT_SECRET used:", process.env.JWT_SECRET ? "Set" : "Not set");
      } else if (error.name === 'TokenExpiredError') {
        console.error("Token has expired");
      } else if (error.name === 'MongooseError' || error.name === 'MongoError') {
        console.error("Database error while finding user");
      }
      
      console.log("=".repeat(60) + "\n");
      return res.status(401).json({ 
        message: 'Not authorized, token failed',
        error: error.message,
        errorType: error.name 
      });
    }
  } else {
    console.error("\n❌ NO TOKEN PROVIDED");
    console.error("Headers received:", req.headers);
    console.error("Authorization header:", req.headers.authorization);
    console.log("=".repeat(60) + "\n");
    return res.status(401).json({ 
      message: 'Not authorized, no token',
      receivedHeaders: Object.keys(req.headers)
    });
  }

  if (!token) {
    console.error("\n❌ TOKEN IS NULL/UNDEFINED");
    console.log("=".repeat(60) + "\n");
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};