const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");

// CREATE SESSION
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { items, shippingInfo } = req.body;

    const itemsPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const taxPrice = Math.round(itemsPrice * 0.18);
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Add Tax and Shipping to Stripe UI
    lineItems.push({
      price_data: {
        currency: "inr",
        product_data: { name: "GST (18%)" },
        unit_amount: Math.round(taxPrice * 100),
      },
      quantity: 1,
    });

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        // STRATEGY: Don't stringify everything. Just store essential info.
        shippingAddress: shippingInfo.address,
        city: shippingInfo.city,
        phone: shippingInfo.phone,
        zip: shippingInfo.zipCode,
        itemsPrice: itemsPrice.toString(),
        taxPrice: taxPrice.toString(),
        shippingPrice: shippingPrice.toString()
      },
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("SESSION ERROR:", err.message);
    res.status(500).json({ success: false, message: "Session Creation Failed" });
  }
});

// VERIFY SESSION
router.get("/verify/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Retrieve session and expand line_items to recreate order without metadata limits
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment incomplete' });
    }

    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (!order) {
      const meta = session.metadata;

      order = new Order({
        user: meta.userId,
        // We pull items directly from Stripe's official line_items instead of metadata
        orderItems: session.line_items.data
          .filter(li => li.description !== "GST (18%)" && li.description !== "Shipping Charges")
          .map(li => ({
            name: li.description,
            quantity: li.quantity,
            price: li.amount_total / 100 / li.quantity,
            product: null 
          })),
        shippingAddress: {
          address: meta.shippingAddress,
          city: meta.city,
          zipCode: meta.zip,
          phone: meta.phone,
          country: "India"
        },
        paymentMethod: 'Stripe',
        paymentResult: { id: sessionId, status: 'paid' },
        itemsPrice: Number(meta.itemsPrice),
        taxPrice: Number(meta.taxPrice),
        shippingPrice: Number(meta.shippingPrice),
        totalPrice: session.amount_total / 100,
        isPaid: true,
        paidAt: new Date(),
      });

      await order.save();
    }

    await order.populate('user', 'name email');
    res.json({ success: true, order });

  } catch (err) {
    console.error("VERIFY ERROR:", err.message);
    // Returning 500 but with a message so frontend doesn't just say "Verification failed"
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;