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
}

// ========================
// CREATE CHECKOUT SESSION
// ========================
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    if (!stripeInstance) {
      return res.status(500).json({ message: "Stripe not configured" });
    }

    const { items, shippingInfo } = req.body;

    // 1. RECALCULATE PRICES (Matching Cart/Checkout frontend)
    const itemsPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const taxPrice = Math.round(itemsPrice * 0.18); // 18% GST
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // 2. BUILD LINE ITEMS (Products)
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.name,
          description: `Product ID: ${item.productId}`,
        },
        unit_amount: Math.round(item.price * 100), // INR to Paise
      },
      quantity: item.quantity,
    }));

    // 3. ADD TAX AS LINE ITEM (So Stripe shows ₹1888)
    if (taxPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: {
            name: "GST (18%)",
            description: "Goods and Services Tax",
          },
          unit_amount: Math.round(taxPrice * 100),
        },
        quantity: 1,
      });
    }

    // 4. ADD SHIPPING AS LINE ITEM
    if (shippingPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: {
            name: "Shipping Charges",
          },
          unit_amount: Math.round(shippingPrice * 100),
        },
        quantity: 1,
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        shippingInfo: JSON.stringify(shippingInfo),
        itemsPrice: itemsPrice.toString(),
        taxPrice: taxPrice.toString(),
        shippingPrice: shippingPrice.toString(),
        totalPrice: totalPrice.toString(),
        items: JSON.stringify(items.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })))
      },
    });

    res.json({ success: true, url: session.url, sessionId: session.id });

  } catch (err) {
    console.error("❌ Stripe Session Creation Error:", err);
    res.status(500).json({ message: "Payment session creation failed", error: err.message });
  }
});

// ========================
// VERIFY PAYMENT SESSION
// ========================
router.get("/verify/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    const metadata = session.metadata;
    const items = JSON.parse(metadata.items);
    const shippingInfo = JSON.parse(metadata.shippingInfo);

    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (!order) {
      order = new Order({
        user: metadata.userId,
        orderItems: items.map(item => ({
          product: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        shippingAddress: {
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          phone: shippingInfo.phone,
          country: shippingInfo.country || "India"
        },
        paymentMethod: 'Stripe',
        paymentResult: {
          id: sessionId,
          status: session.payment_status,
          update_time: new Date().toISOString(),
        },
        itemsPrice: parseFloat(metadata.itemsPrice),
        taxPrice: parseFloat(metadata.taxPrice),
        shippingPrice: parseFloat(metadata.shippingPrice),
        totalPrice: parseFloat(metadata.totalPrice),
        isPaid: true,
        paidAt: new Date(),
      });

      await order.save();
    }

    await order.populate('user', 'name email');
    res.json({ success: true, order });

  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ success: false, message: "Verification failed", error: err.message });
  }
});

module.exports = router;