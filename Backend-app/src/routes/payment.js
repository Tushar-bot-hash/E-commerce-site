const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");
const mongoose = require('mongoose');

console.log("💰 PAYMENT ROUTES LOADED");

// TEST ROUTE
router.get("/test", (req, res) => {
    res.json({ 
        success: true, 
        message: "Payment API is working",
        timestamp: new Date().toISOString()
    });
});

// VERIFY PAYMENT
router.get("/verify/:sessionId", protect, async (req, res) => {
    console.log("\n💰 VERIFY PAYMENT:", req.params.sessionId);
    
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ 
                success: false, 
                message: `Payment is ${session.payment_status}` 
            });
        }
        
        // Create simple order
        const order = new Order({
            user: req.user._id,
            orderItems: [{
                product: new mongoose.Types.ObjectId(),
                name: "Payment Receipt",
                image: "/images/default-product.jpg",
                price: session.amount_total / 100,
                quantity: 1
            }],
            shippingAddress: {
                street: "Payment Completed",
                city: "Online",
                state: "Online",
                zipCode: "000000",
                country: "Online",
                phone: req.user.phone || "Not provided"
            },
            paymentMethod: 'card',
            paymentResult: {
                id: req.params.sessionId,
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
            orderStatus: 'processing'
        });
        
        await order.save();
        
        res.json({
            success: true,
            message: 'Payment verified and order created',
            order: {
                _id: order._id,
                totalPrice: order.totalPrice,
                isPaid: order.isPaid
            }
        });
        
    } catch (error) {
        console.error("Verify error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// 🛒 CREATE CHECKOUT SESSION - FIXED VERSION
router.post("/create-checkout-session", protect, async (req, res) => {
    console.log("\n💳 CREATE CHECKOUT SESSION");
    
    try {
        const { items, orderId, itemsPrice, taxPrice, shippingPrice, totalAmount } = req.body;
        
        // Validate
        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No items in cart" 
            });
        }
        
        // Create line items
        const lineItems = items.map(item => ({
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
        
        // Add tax and shipping
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
                    product_data: { name: "Shipping" },
                    unit_amount: Math.round(shippingPrice * 100),
                },
                quantity: 1,
            });
        }
        
        // Create Stripe session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: lineItems,
            success_url: `https://anime-ecommerce-site.vercel.app/payment-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
            cancel_url: `https://anime-ecommerce-site.vercel.app/checkout`,
            customer_email: req.user.email,
            metadata: {
                userId: req.user._id.toString(),
                orderId: orderId,
                userEmail: req.user.email
            }
        });
        
        console.log("Stripe session created:", session.id);
        console.log("Payment URL:", session.url);
        
        if (!session.url) {
            throw new Error("Stripe did not return a payment URL");
        }
        
        res.json({
            success: true,
            url: session.url, // 🎯 CRITICAL: MUST RETURN URL
            sessionId: session.id,
            amount: session.amount_total / 100
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

module.exports = router;