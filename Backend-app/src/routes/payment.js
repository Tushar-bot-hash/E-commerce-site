const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");

// CREATE SESSION - Fixed to use prices from frontend
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    console.log("🔍 Received payment request:", {
      hasItems: !!req.body.items,
      itemCount: req.body.items?.length,
      hasShippingInfo: !!req.body.shippingInfo,
      hasPrices: {
        itemsPrice: req.body.itemsPrice,
        taxPrice: req.body.taxPrice,
        shippingPrice: req.body.shippingPrice
      }
    });

    const { items, shippingInfo, orderId, itemsPrice, taxPrice, shippingPrice } = req.body;

    // Validate required data
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No items in cart" 
      });
    }

    // 🛠️ FIX: Use prices from frontend if provided, otherwise calculate
    // This ensures Stripe matches exactly what user sees in cart
    const finalItemsPrice = itemsPrice !== undefined ? itemsPrice : 
      items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const finalTaxPrice = taxPrice !== undefined ? taxPrice : 
      Math.round(finalItemsPrice * 0.18);
    
    const finalShippingPrice = shippingPrice !== undefined ? shippingPrice : 
      (finalItemsPrice > 1000 ? 0 : 50);

    console.log("💰 Price Agreement Check:", {
      frontendSent: { itemsPrice, taxPrice, shippingPrice },
      backendUsing: { finalItemsPrice, finalTaxPrice, finalShippingPrice },
      total: finalItemsPrice + finalTaxPrice + finalShippingPrice
    });

    // 🛠️ FIX: Verify item prices match frontend calculation
    const calculatedItemsPrice = items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);

    console.log("📊 Item Price Verification:", {
      frontendItemsPrice: itemsPrice,
      backendCalculation: calculatedItemsPrice,
      match: itemsPrice === calculatedItemsPrice,
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        itemTotal: item.price * item.quantity
      }))
    });

    // Create line items for Stripe
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { 
          name: item.name,
          // Add image if available
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100), // Convert to paise
      },
      quantity: item.quantity,
    }));

    // 🛠️ FIX: Add tax using the exact amount from frontend
    if (finalTaxPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "GST (18%)" },
          unit_amount: Math.round(finalTaxPrice * 100), // Use finalTaxPrice
        },
        quantity: 1,
      });
    }

    // 🛠️ FIX: Add shipping using the exact amount from frontend
    if (finalShippingPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Shipping Charges" },
          unit_amount: Math.round(finalShippingPrice * 100), // Use finalShippingPrice
        },
        quantity: 1,
      });
    }

    console.log("🛒 Final Stripe Line Items:", {
      itemCount: lineItems.length,
      productItems: items.length,
      hasTax: finalTaxPrice > 0,
      hasShipping: finalShippingPrice > 0,
      totalAmount: (finalItemsPrice + finalTaxPrice + finalShippingPrice).toFixed(2)
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        orderId: orderId || 'unknown',
        // Store shipping info
        shippingAddress: shippingInfo?.address || 'Not provided',
        city: shippingInfo?.city || 'Not provided',
        phone: shippingInfo?.phone || 'Not provided',
        zip: shippingInfo?.zipCode || 'Not provided',
        state: shippingInfo?.state || 'Not provided',
        country: shippingInfo?.country || 'India',
        // 🛠️ FIX: Store the exact prices used
        itemsPrice: finalItemsPrice.toString(),
        taxPrice: finalTaxPrice.toString(),
        shippingPrice: finalShippingPrice.toString(),
        totalPrice: (finalItemsPrice + finalTaxPrice + finalShippingPrice).toString()
      },
    });

    console.log("✅ Stripe session created successfully:", {
      sessionId: session.id,
      amountTotal: session.amount_total / 100,
      url: session.url ? 'Yes' : 'No'
    });

    res.json({ 
      success: true, 
      url: session.url,
      sessionId: session.id,
      amount: session.amount_total / 100
    });
    
  } catch (err) {
    console.error("❌ STRIPE SESSION CREATION ERROR:", {
      message: err.message,
      type: err.type,
      code: err.code,
      stripeError: err.raw ? {
        code: err.raw.code,
        message: err.raw.message,
        param: err.raw.param
      } : null
    });
    
    // Provide helpful error messages
    let userMessage = "Session Creation Failed";
    if (err.type === 'StripeInvalidRequestError') {
      if (err.code === 'parameter_invalid_integer') {
        userMessage = "Invalid price amount. Please check product prices.";
      } else if (err.message.includes('API key')) {
        userMessage = "Payment gateway configuration error.";
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// VERIFY SESSION - Updated to handle the new price structure
router.get("/verify/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Retrieve session and expand line_items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment incomplete' 
      });
    }

    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (!order) {
      const meta = session.metadata;

      // 🛠️ FIX: Use prices from metadata (which now match frontend)
      order = new Order({
        user: meta.userId,
        orderItems: session.line_items.data
          .filter(li => !li.description.includes("GST") && 
                        !li.description.includes("Shipping"))
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
          state: meta.state || '',
          country: meta.country || "India"
        },
        paymentMethod: 'card',
        paymentResult: { 
          id: sessionId, 
          status: 'paid',
          email_address: session.customer_email 
        },
        // 🛠️ FIX: Use prices from metadata
        itemsPrice: Number(meta.itemsPrice) || 0,
        taxPrice: Number(meta.taxPrice) || 0,
        shippingPrice: Number(meta.shippingPrice) || 0,
        totalPrice: Number(meta.totalPrice) || (session.amount_total / 100),
        isPaid: true,
        paidAt: new Date(),
      });

      await order.save();
    }

    await order.populate('user', 'name email');
    res.json({ success: true, order });

  } catch (err) {
    console.error("VERIFY ERROR:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Payment verification failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;