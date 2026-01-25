const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");
const mongoose = require('mongoose');

console.log("💰 PAYMENT ROUTES LOADED");
console.log("Stripe key configured:", process.env.STRIPE_SECRET_KEY ? "Yes" : "No");

// 🎯 CREATE CHECKOUT SESSION (Keep your existing, just adding better metadata)
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(90));
    console.log("💳 CREATE CHECKOUT SESSION");
    console.log("=".repeat(90));
    
    const { items, shippingInfo, orderId } = req.body;
    
    // Format line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { 
          name: item.name,
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Calculate totals
    const itemsPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxPrice = Math.round(itemsPrice * 0.18);
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;
    const totalAmount = itemsPrice + taxPrice + shippingPrice;

    // Add tax and shipping as separate line items if needed
    if (taxPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "GST (18%)" },
          unit_amount: Math.round(taxPrice * 100),
        },
        quantity: 1,
      });
    }

    if (shippingPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Shipping Charges" },
          unit_amount: Math.round(shippingPrice * 100),
        },
        quantity: 1,
      });
    }

    // 🎯 CRITICAL: Store ALL necessary data in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: req.user.email,
      metadata: {
        // User info
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        
        // Product info (store first product's details)
        productId: items[0]?.product || new mongoose.Types.ObjectId().toString(),
        productName: items[0]?.name || "Product",
        productImage: items[0]?.image || "/images/default-product.jpg",
        
        // Shipping info
        shippingStreet: shippingInfo?.address || "Not provided",
        shippingCity: shippingInfo?.city || "Not provided",
        shippingState: shippingInfo?.state || "",
        shippingZipCode: shippingInfo?.zipCode || "000000",
        shippingCountry: shippingInfo?.country || "India",
        shippingPhone: shippingInfo?.phone || req.user.phone || "Not provided",
        
        // Price info
        itemsPrice: itemsPrice.toString(),
        taxPrice: taxPrice.toString(),
        shippingPrice: shippingPrice.toString(),
        totalPrice: totalAmount.toString(),
        
        // Additional product details if available
        productSize: items[0]?.size || "",
        productColor: items[0]?.color || ""
      }
    });

    console.log("✅ Session created:", session.id);
    
    res.json({ 
      success: true, 
      url: session.url,
      sessionId: session.id
    });
    
  } catch (err) {
    console.error("❌ Session creation error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Payment session creation failed",
      error: err.message
    });
  }
});

// 🎯 VERIFY PAYMENT - FIXED FOR YOUR ORDER SCHEMA
router.get("/verify/:sessionId", protect, async (req, res) => {
  console.log("\n" + "=".repeat(100));
  console.log("💰 PAYMENT VERIFICATION - FIXED VERSION");
  console.log("=".repeat(100));
  
  try {
    const { sessionId } = req.params;
    
    console.log("📋 REQUEST DETAILS:");
    console.log("  Session ID:", sessionId);
    console.log("  User ID:", req.user._id);
    console.log("  User Email:", req.user.email);
    
    // 🎯 1. RETRIEVE STRIPE SESSION
    console.log("\n🔗 STEP 1: RETRIEVING STRIPE SESSION");
    console.log("-".repeat(40));
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    
    console.log("✅ Stripe session retrieved");
    console.log("  Payment Status:", session.payment_status);
    console.log("  Amount: ₹", session.amount_total / 100);
    console.log("  Customer Email:", session.customer_email);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment is ${session.payment_status}. Please complete payment first.`
      });
    }
    
    // 🎯 2. CHECK FOR EXISTING ORDER
    console.log("\n📦 STEP 2: CHECKING EXISTING ORDER");
    console.log("-".repeat(40));
    
    const existingOrder = await Order.findOne({ 
      $or: [
        { "paymentResult.id": sessionId },
        { stripeSessionId: sessionId }
      ] 
    });
    
    if (existingOrder) {
      console.log("✅ Order already exists:", existingOrder._id);
      return res.json({ 
        success: true, 
        message: 'Payment already verified',
        order: existingOrder
      });
    }
    
    // 🎯 3. PREPARE ORDER DATA FROM METADATA
    console.log("\n🛒 STEP 3: PREPARING ORDER DATA");
    console.log("-".repeat(40));
    
    const meta = session.metadata || {};
    console.log("Metadata:", JSON.stringify(meta, null, 2));
    
    // 🎯 CRITICAL: Create order items matching your schema
    const orderItems = [];
    
    // Extract product items from line items
    if (session.line_items?.data) {
      session.line_items.data.forEach((item, index) => {
        const desc = item.description?.toLowerCase() || '';
        
        // Skip tax and shipping line items
        if (desc.includes('gst') || desc.includes('tax') || desc.includes('shipping')) {
          return;
        }
        
        const pricePerUnit = item.amount_total / 100 / item.quantity;
        
        orderItems.push({
          product: meta.productId ? new mongoose.Types.ObjectId(meta.productId) : new mongoose.Types.ObjectId(),
          name: item.description || `Product ${index + 1}`,
          image: item.price?.product_data?.images?.[0] || meta.productImage || '/images/default-product.jpg',
          price: pricePerUnit,
          quantity: item.quantity,
          size: meta.productSize || '',
          color: meta.productColor || ''
        });
      });
    }
    
    // If no items were extracted (shouldn't happen), create a default item
    if (orderItems.length === 0) {
      console.log("⚠️ No product items found, creating default");
      orderItems.push({
        product: meta.productId ? new mongoose.Types.ObjectId(meta.productId) : new mongoose.Types.ObjectId(),
        name: meta.productName || "Online Purchase",
        image: meta.productImage || '/images/default-product.jpg',
        price: session.amount_total / 100,
        quantity: 1,
        size: meta.productSize || '',
        color: meta.productColor || ''
      });
    }
    
    console.log(`Created ${orderItems.length} order item(s)`);
    
    // 🎯 4. CREATE COMPLETE ORDER DATA MATCHING YOUR SCHEMA
    console.log("\n📝 STEP 4: CREATING ORDER DATA");
    console.log("-".repeat(40));
    
    const orderData = {
      user: req.user._id, // Already ObjectId from middleware
      orderItems: orderItems,
      shippingAddress: {
        // 🎯 FIX: Using correct field names from your schema
        street: meta.shippingStreet || "123 Main Street",
        city: meta.shippingCity || "Mumbai",
        state: meta.shippingState || "Maharashtra",
        zipCode: meta.shippingZipCode || "400001",
        country: meta.shippingCountry || "India",
        phone: meta.shippingPhone || "9876543210"
      },
      paymentMethod: 'card',
      paymentResult: {
        id: sessionId,
        status: 'paid',
        update_time: new Date().toISOString(),
        email_address: session.customer_email || meta.userEmail
      },
      itemsPrice: Number(meta.itemsPrice) || (session.amount_total / 100),
      taxPrice: Number(meta.taxPrice) || 0,
      shippingPrice: Number(meta.shippingPrice) || 0,
      totalPrice: session.amount_total / 100,
      isPaid: true,
      paidAt: new Date(),
      isDelivered: false,
      orderStatus: 'processing',
      stripeSessionId: sessionId
    };
    
    console.log("📋 Order data prepared:");
    console.log("  User:", orderData.user.toString());
    console.log("  Items:", orderData.orderItems.length);
    console.log("  Street:", orderData.shippingAddress.street);
    console.log("  Phone:", orderData.shippingAddress.phone);
    console.log("  Total: ₹", orderData.totalPrice);
    
    // 🎯 5. VALIDATE REQUIRED FIELDS
    console.log("\n🔍 STEP 5: VALIDATING REQUIRED FIELDS");
    console.log("-".repeat(40));
    
    const requiredChecks = [
      { field: 'user', value: orderData.user, ok: !!orderData.user },
      { field: 'orderItems[0].product', value: orderData.orderItems[0]?.product, ok: !!orderData.orderItems[0]?.product },
      { field: 'orderItems[0].name', value: orderData.orderItems[0]?.name, ok: !!orderData.orderItems[0]?.name },
      { field: 'orderItems[0].image', value: orderData.orderItems[0]?.image, ok: !!orderData.orderItems[0]?.image },
      { field: 'orderItems[0].price', value: orderData.orderItems[0]?.price, ok: orderData.orderItems[0]?.price !== undefined },
      { field: 'orderItems[0].quantity', value: orderData.orderItems[0]?.quantity, ok: orderData.orderItems[0]?.quantity !== undefined },
      { field: 'shippingAddress.street', value: orderData.shippingAddress.street, ok: !!orderData.shippingAddress.street },
      { field: 'shippingAddress.city', value: orderData.shippingAddress.city, ok: !!orderData.shippingAddress.city },
      { field: 'shippingAddress.state', value: orderData.shippingAddress.state, ok: !!orderData.shippingAddress.state },
      { field: 'shippingAddress.zipCode', value: orderData.shippingAddress.zipCode, ok: !!orderData.shippingAddress.zipCode },
      { field: 'shippingAddress.country', value: orderData.shippingAddress.country, ok: !!orderData.shippingAddress.country },
      { field: 'shippingAddress.phone', value: orderData.shippingAddress.phone, ok: !!orderData.shippingAddress.phone },
      { field: 'itemsPrice', value: orderData.itemsPrice, ok: orderData.itemsPrice !== undefined },
      { field: 'taxPrice', value: orderData.taxPrice, ok: orderData.taxPrice !== undefined },
      { field: 'shippingPrice', value: orderData.shippingPrice, ok: orderData.shippingPrice !== undefined },
      { field: 'totalPrice', value: orderData.totalPrice, ok: orderData.totalPrice !== undefined }
    ];
    
    let allValid = true;
    requiredChecks.forEach(check => {
      if (!check.ok) {
        console.log(`❌ Missing/invalid: ${check.field}`);
        allValid = false;
      } else {
        console.log(`✅ ${check.field}: ${check.value}`);
      }
    });
    
    if (!allValid) {
      throw new Error('Order validation failed - missing required fields');
    }
    
    // 🎯 6. CREATE AND SAVE ORDER
    console.log("\n💾 STEP 6: SAVING ORDER TO DATABASE");
    console.log("-".repeat(40));
    
    const order = new Order(orderData);
    await order.save();
    
    console.log("✅ ORDER CREATED SUCCESSFULLY!");
    console.log("  Order ID:", order._id);
    console.log("  Order Number:", order.orderNumber || 'N/A');
    console.log("  Total: ₹", order.totalPrice);
    
    // 🎯 7. SUCCESS RESPONSE
    console.log("\n" + "=".repeat(100));
    console.log("🎉 PAYMENT VERIFICATION COMPLETE!");
    console.log("=".repeat(100));
    
    res.json({ 
      success: true, 
      message: 'Payment verified and order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        orderStatus: order.orderStatus,
        orderItems: order.orderItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        }))
      }
    });
    
  } catch (error) {
    console.error("\n" + "=".repeat(100));
    console.error("💥 PAYMENT VERIFICATION ERROR");
    console.error("=".repeat(100));
    console.error("Error:", error.message);
    console.error("Session ID:", sessionId);
    console.error("Timestamp:", new Date().toISOString());
    
    let statusCode = 500;
    let errorMessage = 'Payment verification failed';
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('No such session')) {
        statusCode = 404;
        errorMessage = 'Payment session not found or expired';
      }
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Order data validation failed';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: error.message
    });
  }
});

// 🎯 TEST ENDPOINTS (Keep for debugging)
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
      metadata: session.metadata || {}
    });
    
  } catch (error) {
    console.error("Test endpoint error:", error.message);
    res.status(404).json({
      success: false,
      message: "Stripe session not found",
      error: error.message
    });
  }
});

// 🎯 DEBUG ENDPOINT
router.get("/debug-verify/:sessionId", async (req, res) => {
  console.log("\n🔧 DEBUG VERIFICATION (NO AUTH)");
  
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    
    res.json({
      success: true,
      debug: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total / 100,
        customer_email: session.customer_email,
        metadata: session.metadata || {},
        line_items: session.line_items ? {
          count: session.line_items.data.length,
          items: session.line_items.data.map(item => ({
            description: item.description,
            amount_total: item.amount_total / 100,
            quantity: item.quantity
          }))
        } : null
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      debug: true,
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
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router;