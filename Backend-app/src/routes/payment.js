const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");
const mongoose = require('mongoose');

console.log("💰 PAYMENT ROUTES LOADED");

// ======================
// 🧪 TEST ROUTES (NO AUTH)
// ======================

router.get("/test", (req, res) => {
    console.log("✅ /api/payment/test called");
    res.json({ 
        success: true, 
        message: "Payment API is working",
        timestamp: new Date().toISOString()
    });
});

router.get("/test-verify/:sessionId", (req, res) => {
    console.log("🧪 Test verify called:", req.params.sessionId);
    res.json({
        success: true,
        message: "Test verify endpoint works",
        sessionId: req.params.sessionId
    });
});

// ======================
// 🩺 HEALTH CHECK
// ======================

router.get("/health", (req, res) => {
    console.log("🩺 Health check called");
    res.json({ 
        success: true, 
        message: "Payment endpoint is working",
        timestamp: new Date().toISOString()
    });
});

// ======================
// 💳 VERIFY PAYMENT (WITH AUTH)
// ======================

router.get("/verify/:sessionId", protect, async (req, res) => {
    console.log("\n" + "=".repeat(80));
    console.log("💰 PAYMENT VERIFICATION");
    console.log("=".repeat(80));
    
    try {
        const { sessionId } = req.params;
        console.log("Session ID:", sessionId);
        console.log("User ID:", req.user._id);
        console.log("User Email:", req.user.email);
        
        // 1. Get Stripe session
        console.log("🔗 Retrieving Stripe session...");
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        console.log("✅ Stripe session retrieved");
        console.log("Payment Status:", session.payment_status);
        console.log("Amount: ₹", session.amount_total / 100);
        
        if (session.payment_status !== 'paid') {
            console.log("❌ Payment not complete");
            return res.status(400).json({ 
                success: false, 
                message: `Payment is ${session.payment_status}. Please complete payment first.`
            });
        }
        
        // 2. Check for existing order
        console.log("📦 Checking for existing order...");
        const existingOrder = await Order.findOne({ 
            "paymentResult.id": sessionId 
        });
        
        if (existingOrder) {
            console.log("✅ Order already exists:", existingOrder._id);
            return res.json({ 
                success: true, 
                message: 'Payment already verified',
                order: existingOrder
            });
        }
        
        // 3. Create order
        console.log("🛒 Creating new order...");
        const meta = session.metadata || {};
        
        const order = new Order({
            user: req.user._id,
            orderItems: [{
                product: new mongoose.Types.ObjectId(), // Valid ObjectId
                name: meta.productName || "Online Purchase",
                image: meta.productImage || '/images/default-product.jpg',
                price: session.amount_total / 100,
                quantity: 1,
                size: "",
                color: ""
            }],
            shippingAddress: {
                street: meta.shippingAddress || "123 Main Street",
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
        });
        
        console.log("💾 Saving order to database...");
        await order.save();
        
        console.log("✅ ORDER CREATED:", order._id);
        console.log("=".repeat(80));
        console.log("🎉 VERIFICATION COMPLETE");
        console.log("=".repeat(80));
        
        res.json({
            success: true,
            message: 'Payment verified and order created',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                totalPrice: order.totalPrice,
                isPaid: order.isPaid,
                paidAt: order.paidAt,
                orderStatus: order.orderStatus
            }
        });
        
    } catch (error) {
        console.error("\n❌ VERIFICATION ERROR:", error.message);
        console.error("Error type:", error.type || error.name);
        
        let statusCode = 500;
        let errorMessage = 'Payment verification failed';
        
        if (error.type === 'StripeInvalidRequestError') {
            if (error.message.includes('No such session')) {
                statusCode = 404;
                errorMessage = 'Payment session not found or expired';
            }
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// ======================
// 🛒 CREATE CHECKOUT SESSION
// ======================

router.post("/create-checkout-session", protect, async (req, res) => {
    console.log("\n💳 CREATE CHECKOUT SESSION");
    
    try {
        const { items, shippingInfo } = req.body;
        
        // Validate
        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No items in cart" 
            });
        }
        
        console.log("Creating session for", items.length, "items");
        console.log("User:", req.user.email);
        
        // For now, return a simple response
        // Add your Stripe session creation logic here
        res.json({
            success: true,
            message: 'Checkout session endpoint - add Stripe logic here',
            items: items.length,
            user: req.user.email
        });
        
    } catch (error) {
        console.error("Create session error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Checkout session creation failed',
            error: error.message
        });
    }
});

// ======================
// 📤 EXPORT
// ======================

module.exports = router;