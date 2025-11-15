const express = require("express");
const router = express.Router();
const stripe = require("stripe");
const { protect } = require("../middleware/auth");

const Order = require("../models/Order");

// ========================
// STRIPE INIT
// ========================
let stripeInstance;
if (process.env.STRIPE_SECRET_KEY) {
  stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe initialized.");
} else {
  console.error("❌ STRIPE_SECRET_KEY missing!");
}

// ========================
// TEST ROUTE
// ========================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Payment API working",
    stripeConfigured: !!stripeInstance,
    timestamp: new Date().toISOString()
  });
});

// ========================
// CREATE CHECKOUT SESSION (Option 1 - No Stripe Shipping)
// ========================
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    if (!stripeInstance) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    const { items, shippingInfo, shippingMethod, totalAmount } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and cannot be empty" });
    }

    // Validate shipping info
    if (!shippingInfo || !shippingInfo.firstName || !shippingInfo.address) {
      return res.status(400).json({ message: "Shipping information is required" });
    }

    console.log("📦 Using form shipping info:", shippingInfo);

    // Calculate prices based on your Order model structure
    const itemsPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const taxPrice = itemsPrice * 0.1; // 10% tax
    const shippingPrice = shippingMethod === 'express' ? 10 : 5;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // Build Stripe line items
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          description: `Product ID: ${item.productId}`,
          // images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // INR → paise
      },
      quantity: item.quantity,
    }));

    console.log("🛒 Stripe Line Items:", lineItems);

    // Use proper URLs with http:// or https:// scheme
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const successUrl = `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/checkout`;

    console.log("🔗 Success URL:", successUrl);
    console.log("🔗 Cancel URL:", cancelUrl);

    // Create Stripe session - WITHOUT shipping collection
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        items: JSON.stringify(items),
        shippingInfo: JSON.stringify(shippingInfo), // Use form shipping data
        shippingMethod: shippingMethod || 'standard',
        itemsPrice: itemsPrice,
        taxPrice: taxPrice,
        shippingPrice: shippingPrice,
        totalPrice: totalPrice
      },
      // 🚨 REMOVED: shipping_address_collection
      // Customers will only see payment page, not shipping form
    });

    console.log("✅ Stripe Session Created:", session.id);

    res.json({
      success: true,
      id: session.id,
      url: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error("❌ Stripe Session Creation Error:", err);
    res.status(500).json({ 
      message: "Payment session creation failed", 
      error: err.message 
    });
  }
});

// ========================
// VERIFY PAYMENT SESSION (Updated for Option 1)
// ========================
router.get("/verify/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!stripeInstance) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    console.log("🔍 Verifying payment for session:", sessionId);

    // Retrieve session from Stripe
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer']
    });

    console.log("💰 Stripe Session Status:", session.payment_status);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed or still processing'
      });
    }

    // Parse metadata from Stripe session
    const metadata = session.metadata;
    const items = metadata.items ? JSON.parse(metadata.items) : [];
    const shippingInfo = metadata.shippingInfo ? JSON.parse(metadata.shippingInfo) : {};
    const userId = metadata.userId;

    console.log("📦 Creating order with form shipping info");

    // Check if order already exists to avoid duplicates
    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (!order) {
      // Format shipping address from FORM data (not Stripe)
      const formattedShippingAddress = {
        street: shippingInfo.address || '',
        city: shippingInfo.city || '',
        state: shippingInfo.state || '',
        zipCode: shippingInfo.zipCode || '',
        country: shippingInfo.country || 'India',
        phone: shippingInfo.phone || ''
      };

      // Format order items
      const orderItems = items.map(item => ({
        product: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || 'https://via.placeholder.com/150'
      }));

      // Create new order using FORM shipping data
      const orderData = {
        user: userId,
        orderItems: orderItems,
        shippingAddress: formattedShippingAddress,
        paymentMethod: 'card',
        paymentResult: {
          id: sessionId,
          status: session.payment_status,
          update_time: new Date().toISOString(),
          email_address: session.customer_details?.email || shippingInfo.email
        },
        itemsPrice: parseFloat(metadata.itemsPrice) || 0,
        taxPrice: parseFloat(metadata.taxPrice) || 0,
        shippingPrice: parseFloat(metadata.shippingPrice) || 0,
        totalPrice: parseFloat(metadata.totalPrice) || (session.amount_total / 100),
        isPaid: true,
        paidAt: new Date(),
        orderStatus: 'processing'
      };

      order = new Order(orderData);
      await order.save();
      console.log("✅ Order created with form shipping data:", order._id);
    } else {
      console.log("✅ Order already exists:", order._id);
    }

    // Populate the order for response
    await order.populate('user', 'name email');
    await order.populate('orderItems.product', 'name images');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: order
    });

  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.message
    });
  }
});

// ========================
// GET SESSION STATUS
// ========================
router.get("/session-status/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!stripeInstance) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency
    });

  } catch (err) {
    console.error("Session status error:", err);
    res.status(500).json({ 
      message: "Failed to get session status", 
      error: err.message 
    });
  }
});

module.exports = router;