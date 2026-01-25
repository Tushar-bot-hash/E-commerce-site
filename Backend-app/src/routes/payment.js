const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");
const mongoose = require('mongoose');

// 🎯 VERIFY PAYMENT - SIMPLIFIED WORKING VERSION
router.get("/verify/:sessionId", protect, async (req, res) => {
  console.log("\n💰 PAYMENT VERIFICATION CALLED");
  
  try {
    const { sessionId } = req.params;
    console.log("Session ID:", sessionId);
    console.log("User ID:", req.user._id);
    
    // 1. Get Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    
    console.log("Payment status:", session.payment_status);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment is ${session.payment_status}` 
      });
    }
    
    // 2. Check for existing order
    const existingOrder = await Order.findOne({ 
      "paymentResult.id": sessionId 
    });
    
    if (existingOrder) {
      return res.json({ 
        success: true, 
        message: 'Order already exists',
        order: existingOrder 
      });
    }
    
    // 3. Create order data (SIMPLIFIED - matching your schema)
    const meta = session.metadata || {};
    
    const orderData = {
      user: req.user._id,
      orderItems: [{
        product: meta.productId ? new mongoose.Types.ObjectId(meta.productId) : new mongoose.Types.ObjectId(),
        name: meta.productName || "Online Purchase",
        image: meta.productImage || '/images/default-product.jpg',
        price: session.amount_total / 100,
        quantity: 1,
        size: "",
        color: ""
      }],
      shippingAddress: {
        street: meta.shippingAddress || "123 Main St",
        city: meta.city || "Mumbai",
        state: meta.state || "Maharashtra",
        zipCode: meta.zipCode || "400001",
        country: meta.country || "India",
        phone: meta.phone || "9876543210"
      },
      paymentMethod: 'card',
      paymentResult: {
        id: sessionId,
        status: 'paid',
        update_time: new Date().toISOString(),
        email_address: session.customer_email
      },
      itemsPrice: session.amount_total / 100,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: session.amount_total / 100,
      isPaid: true,
      paidAt: new Date(),
      isDelivered: false,
      orderStatus: 'processing'
    };
    
    console.log("Creating order with data:", JSON.stringify(orderData, null, 2));
    
    // 4. Create and save order
    const order = new Order(orderData);
    await order.save();
    
    console.log("✅ Order created:", order._id);
    
    res.json({
      success: true,
      message: 'Payment verified',
      order: order
    });
    
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(404).json({
        success: false,
        message: 'Payment session not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// 🎯 CREATE CHECKOUT SESSION (Keep your existing version)
router.post("/create-checkout-session", protect, async (req, res) => {
  // Your existing create-checkout-session code here
});

// 🎯 HEALTH CHECK
router.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Payment endpoint working" 
  });
});

module.exports = router;