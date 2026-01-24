const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");

// CREATE SESSION - Fixed to use prices from frontend
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    // 🎯 EXTENSIVE DEBUGGING
    console.log("=".repeat(50));
    console.log("🔍 PAYMENT REQUEST DEBUG START");
    console.log("=".repeat(50));
    
    console.log("📦 FULL REQUEST BODY:", JSON.stringify(req.body, null, 2));
    
    const { items, shippingInfo, orderId, itemsPrice, taxPrice, shippingPrice } = req.body;

    // 🎯 DEBUG 1: Check what frontend sent
    console.log("\n🎯 DEBUG 1: Frontend Data Received");
    console.log("-".repeat(30));
    console.log("itemsPrice (from frontend):", itemsPrice);
    console.log("taxPrice (from frontend):", taxPrice);
    console.log("shippingPrice (from frontend):", shippingPrice);
    
    if (items && items.length > 0) {
      console.log("\n📋 Items received:");
      items.forEach((item, index) => {
        console.log(`  [${index}] ${item.name}`);
        console.log(`     Price: ₹${item.price}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Total: ₹${item.price * item.quantity}`);
        
        // 🎯 CRITICAL: Check if price matches what we expect
        if (item.price === 5000) {
          console.log("     ⚠️  WARNING: Item price is ₹5000! Should be ₹4800!");
        }
      });
    }

    // Validate required data
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No items in cart" 
      });
    }

    // 🛠️ FIX: Use prices from frontend if provided, otherwise calculate
    const finalItemsPrice = itemsPrice !== undefined ? itemsPrice : 
      items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const finalTaxPrice = taxPrice !== undefined ? taxPrice : 
      Math.round(finalItemsPrice * 0.18);
    
    const finalShippingPrice = shippingPrice !== undefined ? shippingPrice : 
      (finalItemsPrice > 1000 ? 0 : 50);

    // 🎯 DEBUG 2: Price calculations
    console.log("\n🎯 DEBUG 2: Price Calculations");
    console.log("-".repeat(30));
    console.log("Final Items Price:", finalItemsPrice);
    console.log("Final Tax Price:", finalTaxPrice);
    console.log("Final Shipping Price:", finalShippingPrice);
    console.log("Final Total:", finalItemsPrice + finalTaxPrice + finalShippingPrice);
    
    // 🎯 DEBUG 3: Verify calculations
    console.log("\n🎯 DEBUG 3: Verification Checks");
    console.log("-".repeat(30));
    
    const calculatedItemsPrice = items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);
    
    console.log("Sum of item prices:", calculatedItemsPrice);
    console.log("Frontend sent itemsPrice:", itemsPrice);
    console.log("Match?", itemsPrice === calculatedItemsPrice);
    
    if (itemsPrice !== calculatedItemsPrice) {
      console.log("❌ MISMATCH DETECTED!");
      console.log("Difference:", itemsPrice - calculatedItemsPrice);
    }

    // 🎯 Check GST calculation
    const expectedGST = Math.round(calculatedItemsPrice * 0.18);
    console.log("Expected GST (18% of items):", expectedGST);
    console.log("Received GST:", taxPrice);
    console.log("GST Match?", taxPrice === expectedGST);
    
    if (taxPrice !== expectedGST) {
      console.log("❌ GST MISMATCH!");
      console.log("GST calculated on:", taxPrice / 0.18, "(should be", calculatedItemsPrice, ")");
    }

    // Create line items for Stripe
    console.log("\n🎯 DEBUG 4: Creating Stripe Line Items");
    console.log("-".repeat(30));
    
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { 
          name: item.name,
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100), // Convert to paise
      },
      quantity: item.quantity,
    }));

    console.log("Product line items created:", lineItems.length);
    
    // Add tax using the exact amount from frontend
    if (finalTaxPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "GST (18%)" },
          unit_amount: Math.round(finalTaxPrice * 100),
        },
        quantity: 1,
      });
      console.log("Added GST line item: ₹" + finalTaxPrice);
    }

    // Add shipping using the exact amount from frontend
    if (finalShippingPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "inr",
          product_data: { name: "Shipping Charges" },
          unit_amount: Math.round(finalShippingPrice * 100),
        },
        quantity: 1,
      });
      console.log("Added shipping line item: ₹" + finalShippingPrice);
    }

    console.log("\n💰 Final Price Breakdown:");
    console.log("-".repeat(30));
    console.log("Subtotal: ₹" + finalItemsPrice);
    console.log("GST: ₹" + finalTaxPrice);
    console.log("Shipping: ₹" + finalShippingPrice);
    console.log("Total: ₹" + (finalItemsPrice + finalTaxPrice + finalShippingPrice));

    // Create Stripe checkout session
    console.log("\n🎯 DEBUG 5: Creating Stripe Session");
    console.log("-".repeat(30));
    
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
        shippingAddress: shippingInfo?.address || 'Not provided',
        city: shippingInfo?.city || 'Not provided',
        phone: shippingInfo?.phone || 'Not provided',
        zip: shippingInfo?.zipCode || 'Not provided',
        state: shippingInfo?.state || 'Not provided',
        country: shippingInfo?.country || 'India',
        // Store exact prices for verification
        itemsPrice: finalItemsPrice.toString(),
        taxPrice: finalTaxPrice.toString(),
        shippingPrice: finalShippingPrice.toString(),
        totalPrice: (finalItemsPrice + finalTaxPrice + finalShippingPrice).toString(),
        // Debug info
        debug_itemCount: items.length.toString(),
        debug_firstItemPrice: items[0]?.price?.toString() || 'none'
      },
    });

    console.log("\n✅ Stripe Session Created Successfully");
    console.log("-".repeat(30));
    console.log("Session ID:", session.id);
    console.log("Amount Total: ₹" + (session.amount_total / 100));
    console.log("Stripe URL:", session.url ? "Generated" : "Missing");
    console.log("=".repeat(50));
    console.log("🔍 PAYMENT REQUEST DEBUG END");
    console.log("=".repeat(50));

    res.json({ 
      success: true, 
      url: session.url,
      sessionId: session.id,
      amount: session.amount_total / 100
    });
    
  } catch (err) {
    console.error("\n❌ STRIPE SESSION CREATION ERROR");
    console.error("=".repeat(50));
    console.error("Error Message:", err.message);
    console.error("Error Type:", err.type);
    console.error("Error Code:", err.code);
    
    if (err.raw) {
      console.error("Stripe Raw Error:");
      console.error("  Code:", err.raw.code);
      console.error("  Message:", err.raw.message);
      console.error("  Param:", err.raw.param);
    }
    
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
    console.log("\n🔍 VERIFYING PAYMENT SESSION:", req.params.sessionId);
    
    const { sessionId } = req.params;
    
    // Retrieve session and expand line_items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    console.log("Session Status:", session.payment_status);
    console.log("Amount Paid: ₹" + (session.amount_total / 100));
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment incomplete' 
      });
    }

    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (!order) {
      const meta = session.metadata;
      
      console.log("\n📦 Creating Order from Stripe Metadata:");
      console.log("Items Price from metadata:", meta.itemsPrice);
      console.log("Tax Price from metadata:", meta.taxPrice);
      console.log("Shipping Price from metadata:", meta.shippingPrice);
      console.log("Total Price from metadata:", meta.totalPrice);

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
        itemsPrice: Number(meta.itemsPrice) || 0,
        taxPrice: Number(meta.taxPrice) || 0,
        shippingPrice: Number(meta.shippingPrice) || 0,
        totalPrice: Number(meta.totalPrice) || (session.amount_total / 100),
        isPaid: true,
        paidAt: new Date(),
      });

      await order.save();
      console.log("✅ Order created successfully");
    }

    await order.populate('user', 'name email');
    res.json({ success: true, order });

  } catch (err) {
    console.error("\n❌ VERIFY ERROR:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Payment verification failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;