const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");
const jwt = require('jsonwebtoken'); // Add this for manual token verification

console.log("💰 PAYMENT ROUTES LOADED");
console.log("Stripe key configured:", process.env.STRIPE_SECRET_KEY ? "Yes" : "No");
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

// 🎯 DEBUG: Handle OPTIONS preflight requests
router.options("/verify/:sessionId", (req, res) => {
  console.log("🔄 OPTIONS preflight request for payment verification");
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// 🎯 DEBUG: Temporary verification endpoint with detailed logging
router.get("/verify/:sessionId", async (req, res) => {
  console.log("\n" + "=".repeat(100));
  console.log("💰 PAYMENT VERIFICATION - DEBUG MODE");
  console.log("=".repeat(100));
  
  try {
    const { sessionId } = req.params;
    
    console.log("📦 REQUEST DETAILS:");
    console.log("  Session ID:", sessionId);
    console.log("  Method:", req.method);
    console.log("  URL:", req.originalUrl);
    console.log("  Headers:", JSON.stringify(req.headers, null, 2));
    
    // 🎯 STEP 1: MANUAL TOKEN VERIFICATION (DEBUGGING)
    console.log("\n🔐 STEP 1: TOKEN VERIFICATION");
    console.log("-".repeat(40));
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log("❌ ERROR: No Authorization header");
      return res.status(401).json({ 
        success: false, 
        message: 'No Authorization header',
        headers: Object.keys(req.headers)
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log("❌ ERROR: Authorization header doesn't start with 'Bearer '");
      console.log("  Actual header:", authHeader);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid Authorization format. Should be: Bearer <token>',
        received: authHeader
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log("  Token extracted (first 50 chars):", token.substring(0, 50) + "...");
    console.log("  Token length:", token.length);
    console.log("  JWT_SECRET configured:", !!process.env.JWT_SECRET);
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ TOKEN VERIFICATION SUCCESS!");
      console.log("  Decoded token data:");
      console.log("    User ID:", decodedToken.id);
      console.log("    Email:", decodedToken.email);
      console.log("    Issued at:", new Date(decodedToken.iat * 1000).toISOString());
      console.log("    Expires at:", new Date(decodedToken.exp * 1000).toISOString());
    } catch (jwtError) {
      console.error("❌ JWT VERIFICATION FAILED!");
      console.error("  Error name:", jwtError.name);
      console.error("  Error message:", jwtError.message);
      
      return res.status(401).json({ 
        success: false, 
        message: 'Token verification failed',
        error: jwtError.message,
        errorType: jwtError.name,
        jwtSecretExists: !!process.env.JWT_SECRET
      });
    }
    
    // 🎯 STEP 2: STRIPE SESSION RETRIEVAL
    console.log("\n🔗 STEP 2: STRIPE SESSION RETRIEVAL");
    console.log("-".repeat(40));
    
    console.log("  Stripe key starts with:", process.env.STRIPE_SECRET_KEY?.substring(0, 10) + "...");
    
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent']
      });
      console.log("✅ STRIPE SESSION RETRIEVED!");
      console.log("  Session ID:", stripeSession.id);
      console.log("  Payment Status:", stripeSession.payment_status);
      console.log("  Amount Total: ₹" + (stripeSession.amount_total / 100));
      console.log("  Currency:", stripeSession.currency);
      console.log("  Customer Email:", stripeSession.customer_email);
      console.log("  Created:", new Date(stripeSession.created * 1000).toISOString());
      
      if (stripeSession.metadata) {
        console.log("  Metadata:", JSON.stringify(stripeSession.metadata, null, 2));
      }
      
    } catch (stripeError) {
      console.error("❌ STRIPE SESSION RETRIEVAL FAILED!");
      console.error("  Error name:", stripeError.type);
      console.error("  Error message:", stripeError.message);
      console.error("  Error code:", stripeError.code);
      
      return res.status(404).json({ 
        success: false, 
        message: 'Stripe session not found',
        error: stripeError.message,
        errorType: stripeError.type,
        errorCode: stripeError.code
      });
    }
    
    // 🎯 STEP 3: CHECK PAYMENT STATUS
    console.log("\n💰 STEP 3: PAYMENT STATUS CHECK");
    console.log("-".repeat(40));
    
    if (stripeSession.payment_status !== 'paid') {
      console.log("❌ PAYMENT NOT COMPLETE!");
      console.log("  Current status:", stripeSession.payment_status);
      
      return res.status(400).json({ 
        success: false, 
        message: `Payment is ${stripeSession.payment_status}. Please complete payment first.`,
        payment_status: stripeSession.payment_status,
        amount: stripeSession.amount_total / 100
      });
    }
    
    console.log("✅ PAYMENT IS PAID!");
    
    // 🎯 STEP 4: CHECK FOR EXISTING ORDER
    console.log("\n📦 STEP 4: DATABASE CHECK");
    console.log("-".repeat(40));
    
    let existingOrder;
    try {
      existingOrder = await Order.findOne({ 
        $or: [
          { "paymentResult.id": sessionId },
          { stripeSessionId: sessionId }
        ] 
      });
      
      if (existingOrder) {
        console.log("✅ ORDER ALREADY EXISTS!");
        console.log("  Order ID:", existingOrder._id);
        console.log("  Order Status:", existingOrder.orderStatus);
        console.log("  Total Price: ₹" + existingOrder.totalPrice);
        
        return res.json({ 
          success: true, 
          message: 'Payment already verified',
          order: {
            _id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            totalPrice: existingOrder.totalPrice,
            isPaid: existingOrder.isPaid,
            paidAt: existingOrder.paidAt,
            orderStatus: existingOrder.orderStatus
          }
        });
      }
      
      console.log("ℹ️  No existing order found - creating new one");
      
    } catch (dbError) {
      console.error("❌ DATABASE QUERY ERROR!");
      console.error("  Error:", dbError.message);
      // Continue to create order anyway
    }
    
    // 🎯 STEP 5: CREATE NEW ORDER
    console.log("\n🛒 STEP 5: CREATING NEW ORDER");
    console.log("-".repeat(40));
    
    const orderData = {
      user: decodedToken.id, // Use ID from token
      orderItems: [{
        name: stripeSession.metadata?.productName || 'Online Purchase',
        quantity: 1,
        price: stripeSession.amount_total / 100,
        image: stripeSession.metadata?.productImage || '/images/default-product.jpg',
        product: null
      }],
      shippingAddress: {
        address: stripeSession.metadata?.shippingAddress || 'To be confirmed',
        city: stripeSession.metadata?.city || 'To be confirmed',
        state: stripeSession.metadata?.state || '',
        country: stripeSession.metadata?.country || 'India',
        zipCode: stripeSession.metadata?.zipCode || '',
        phone: stripeSession.metadata?.phone || 'Not provided'
      },
      paymentMethod: 'card',
      paymentResult: {
        id: sessionId,
        status: 'paid',
        email_address: stripeSession.customer_email || decodedToken.email,
        amount: stripeSession.amount_total / 100,
        currency: stripeSession.currency || 'inr'
      },
      itemsPrice: stripeSession.amount_total / 100,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: stripeSession.amount_total / 100,
      isPaid: true,
      paidAt: new Date(),
      orderStatus: 'processing',
      stripeSessionId: sessionId
    };
    
    console.log("  Order data prepared");
    console.log("  User ID:", orderData.user);
    console.log("  Total Price: ₹" + orderData.totalPrice);
    
    let newOrder;
    try {
      newOrder = new Order(orderData);
      await newOrder.save();
      
      // Generate order number
      if (!newOrder.orderNumber) {
        newOrder.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await newOrder.save();
      }
      
      console.log("✅ ORDER CREATED SUCCESSFULLY!");
      console.log("  Order ID:", newOrder._id);
      console.log("  Order Number:", newOrder.orderNumber);
      console.log("  Total: ₹" + newOrder.totalPrice);
      
    } catch (orderError) {
      console.error("❌ ORDER CREATION FAILED!");
      console.error("  Error:", orderError.message);
      console.error("  Validation errors:", orderError.errors);
      
      // Try minimal order
      try {
        const minimalOrder = new Order({
          user: decodedToken.id,
          orderItems: [{
            name: 'Payment Receipt',
            quantity: 1,
            price: stripeSession.amount_total / 100
          }],
          shippingAddress: { address: 'Payment completed' },
          paymentResult: { id: sessionId, status: 'paid' },
          totalPrice: stripeSession.amount_total / 100,
          isPaid: true,
          paidAt: new Date(),
          orderStatus: 'processing'
        });
        
        newOrder = await minimalOrder.save();
        console.log("✅ Created minimal order as fallback");
        
      } catch (minimalError) {
        console.error("❌ Minimal order also failed!");
        throw minimalError;
      }
    }
    
    console.log("\n" + "=".repeat(100));
    console.log("🎉 PAYMENT VERIFICATION COMPLETE!");
    console.log("=".repeat(100));
    
    // 🎯 SUCCESS RESPONSE
    res.json({ 
      success: true, 
      message: 'Payment verified and order created successfully',
      debug: {
        tokenVerified: true,
        userId: decodedToken.id,
        stripeSession: stripeSession.payment_status,
        orderCreated: !!newOrder
      },
      order: {
        _id: newOrder._id,
        orderNumber: newOrder.orderNumber,
        totalPrice: newOrder.totalPrice,
        isPaid: newOrder.isPaid,
        paidAt: newOrder.paidAt,
        orderStatus: newOrder.orderStatus
      }
    });
    
  } catch (error) {
    console.error("\n" + "=".repeat(100));
    console.error("💥 UNEXPECTED ERROR IN PAYMENT VERIFICATION");
    console.error("=".repeat(100));
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Session ID:", req.params.sessionId);
    console.error("Timestamp:", new Date().toISOString());
    console.error("=".repeat(100));
    
    res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed due to server error',
      error: error.message,
      errorType: error.name
    });
  }
});

// 🎯 CREATE SESSION (keep your existing code, just add this debug at the top)
router.post("/create-checkout-session", protect, async (req, res) => {
  console.log("\n" + "=".repeat(90));
  console.log("💳 CREATE CHECKOUT SESSION - DEBUG MODE");
  console.log("=".repeat(90));
  
  // Log authentication info
  console.log("🔐 AUTHENTICATION INFO:");
  console.log("  User ID:", req.user?._id);
  console.log("  User Email:", req.user?.email);
  console.log("  Token verified:", !!req.user);
  
  // Your existing create-checkout-session code here...
  // Keep all your existing code for this endpoint
});

// 🎯 TEST ENDPOINTS (NO AUTH REQUIRED)
router.get("/test-verify/:sessionId", async (req, res) => {
  console.log("\n🧪 TEST VERIFICATION ENDPOINT");
  
  const { sessionId } = req.params;
  console.log("Session ID:", sessionId);
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.json({
      success: true,
      exists: true,
      payment_status: session.payment_status,
      amount_total: session.amount_total / 100,
      currency: session.currency,
      customer_email: session.customer_email,
      metadata: session.metadata || {}
    });
    
  } catch (error) {
    console.error("Test endpoint error:", error.message);
    res.status(404).json({
      success: false,
      message: "Stripe session not found",
      error: error.message,
      type: error.type
    });
  }
});

// 🎯 TEMPORARY DEBUG ENDPOINT (NO AUTH)
router.get("/debug-verify/:sessionId", async (req, res) => {
  console.log("\n🔧 DEBUG VERIFICATION (NO AUTH)");
  
  try {
    const { sessionId } = req.params;
    console.log("Session ID:", sessionId);
    
    // Just check if Stripe can retrieve it
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.json({
      success: true,
      debug: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total / 100,
        customer_email: session.customer_email,
        metadata: session.metadata || {}
      }
    });
    
  } catch (error) {
    console.error("Debug endpoint error:", error.message);
    res.status(500).json({
      success: false,
      debug: true,
      error: error.message,
      type: error.type
    });
  }
});

// 🎯 TOKEN TEST ENDPOINT
router.get("/test-token", async (req, res) => {
  console.log("\n🔑 TEST TOKEN ENDPOINT");
  
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No valid token provided',
      header: authHeader
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      success: true,
      message: 'Token is valid',
      tokenInfo: {
        userId: decoded.id,
        email: decoded.email,
        issuedAt: new Date(decoded.iat * 1000).toISOString(),
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        tokenLength: token.length
      },
      env: {
        jwtSecretExists: !!process.env.JWT_SECRET,
        stripeKeyExists: !!process.env.STRIPE_SECRET_KEY
      }
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is invalid',
      error: error.message,
      errorType: error.name
    });
  }
});

// 🎯 SIMPLE VERIFICATION (for testing)
router.get("/simple-verify/:sessionId", protect, async (req, res) => {
  console.log("\n🎯 SIMPLE VERIFICATION");
  console.log("User authenticated:", req.user._id);
  
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    res.json({
      success: true,
      simple: true,
      user: req.user._id,
      session: {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total / 100
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  console.log("🩺 Payment health check");
  res.json({ 
    success: true, 
    message: "Payment endpoint is working",
    timestamp: new Date().toISOString(),
    env: {
      stripe: process.env.STRIPE_SECRET_KEY ? "Configured" : "Not configured",
      jwt: process.env.JWT_SECRET ? "Configured" : "Not configured",
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

// 🎯 INFO ENDPOINT
router.get("/info", (req, res) => {
  res.json({
    success: true,
    endpoints: {
      "POST /create-checkout-session": "Create Stripe checkout",
      "GET /verify/:sessionId": "Verify payment (requires auth)",
      "GET /simple-verify/:sessionId": "Simple verify (requires auth)",
      "GET /test-verify/:sessionId": "Test verify (no auth)",
      "GET /debug-verify/:sessionId": "Debug verify (no auth)",
      "GET /test-token": "Test token (requires auth header)",
      "GET /health": "Health check",
      "GET /info": "This info"
    },
    middleware: {
      protect: "Used for: create-checkout-session, simple-verify",
      none: "Used for: test-verify, debug-verify, test-token, health, info"
    }
  });
});

module.exports = router;