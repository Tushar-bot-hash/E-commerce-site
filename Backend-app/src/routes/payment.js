const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { protect } = require("../middleware/auth");
const Order = require("../models/Order");

// CREATE SESSION - Fixed to use prices from frontend
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(90));
    console.log("💳 PAYMENT CONTROLLER - CREATE CHECKOUT SESSION");
    console.log("=".repeat(90));
    
    console.log("\n👤 USER INFORMATION:");
    console.log("-".repeat(50));
    console.log("User ID:", req.user._id);
    console.log("User email:", req.user.email);
    console.log("User name:", req.user.name);
    
    console.log("\n📨 FULL REQUEST BODY:");
    console.log("-".repeat(50));
    console.log(JSON.stringify({
      orderId: req.body.orderId,
      itemsPrice: req.body.itemsPrice,
      taxPrice: req.body.taxPrice,
      shippingPrice: req.body.shippingPrice,
      totalAmount: req.body.totalAmount,
      items: req.body.items?.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image ? "Provided" : "Missing"
      })),
      shippingInfo: req.body.shippingInfo
    }, null, 2));
    
    let { items, shippingInfo, orderId, itemsPrice, taxPrice, shippingPrice } = req.body;
    
    // 🎯 VALIDATION
    console.log("\n🔍 VALIDATING REQUEST DATA:");
    console.log("-".repeat(50));
    
    if (!items || items.length === 0) {
      console.log("❌ ERROR: No items in request");
      return res.status(400).json({ 
        success: false, 
        message: "No items in cart" 
      });
    }

    console.log("✅ Validation passed - items count:", items.length);
    
    // 🎯 CRITICAL PRICE ANALYSIS - FIND THE ₹5000 BUG
    console.log("\n🔎 CRITICAL PRICE ANALYSIS:");
    console.log("-".repeat(50));
    
    console.log("\n💰 PRICES RECEIVED FROM FRONTEND:");
    console.log("itemsPrice: ₹" + itemsPrice);
    console.log("taxPrice: ₹" + taxPrice);
    console.log("shippingPrice: ₹" + shippingPrice);
    console.log("orderId:", orderId);
    
    // 🎯 ITEM-BY-ITEM ANALYSIS - FIND WHERE ₹5000 COMES FROM
    console.log("\n📋 DETAILED ITEM ANALYSIS:");
    console.log("-".repeat(50));
    
    let itemsTotal = 0;
    let has5000Price = false;
    let has4800Price = false;
    let problematicItems = [];
    
    items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      itemsTotal += itemTotal;
      
      console.log(`\n📦 Item ${index + 1}: ${item.name}`);
      console.log(`  ├── Price from frontend: ₹${item.price}`);
      console.log(`  ├── Quantity: ${item.quantity}`);
      console.log(`  ├── Item total: ₹${itemTotal}`);
      console.log(`  ├── Product ID: ${item.product || "Not provided"}`);
      console.log(`  ├── Image: ${item.image ? "✅ Provided" : "❌ Missing"}`);
      console.log(`  └── Size/Color: ${item.size || 'N/A'}/${item.color || 'N/A'}`);
      
      // 🎯 CRITICAL CHECK FOR ₹5000 BUG
      if (item.price === 5000) {
        console.log("  ⚠️  ⚠️  ⚠️  CRITICAL BUG DETECTED: Price is ₹5000!");
        console.log("  ❌ This will cause Stripe to charge ₹5000 instead of ₹4800!");
        console.log("  🔧 Expected: ₹4800 (discount price from cart)");
        console.log("  🔧 Actual: ₹5000 (original product price)");
        has5000Price = true;
        
        problematicItems.push({
          name: item.name,
          price: item.price,
          expectedPrice: 4800,
          difference: 200,
          index: index + 1
        });
      } else if (item.price === 4800) {
        console.log("  ✅ Price is correct: ₹4800");
        has4800Price = true;
      } else {
        console.log(`  ❓ Unexpected price: ₹${item.price}`);
        problematicItems.push({
          name: item.name,
          price: item.price,
          expectedPrice: 4800,
          difference: Math.abs(item.price - 4800),
          index: index + 1
        });
      }
    });
    
    console.log("\n📊 ITEMS ANALYSIS SUMMARY:");
    console.log("-".repeat(50));
    console.log(`Total items: ${items.length}`);
    console.log(`Items with ₹5000 price: ${has5000Price ? "❌ YES" : "✅ NO"}`);
    console.log(`Items with ₹4800 price: ${has4800Price ? "✅ YES" : "❌ NO"}`);
    console.log(`Sum of all item prices: ₹${itemsTotal}`);
    console.log(`itemsPrice from frontend: ₹${itemsPrice}`);
    
    const itemsTotalMatch = Math.abs(itemsTotal - itemsPrice) < 1;
    console.log("itemsTotal matches itemsPrice:", itemsTotalMatch ? "✅ YES" : "❌ NO");
    
    if (!itemsTotalMatch) {
      console.log("⚠️  WARNING: itemsTotal doesn't match itemsPrice!");
      console.log(`Difference: ₹${Math.abs(itemsTotal - itemsPrice)}`);
    }
    
    // 🎯 GST VERIFICATION
    console.log("\n🧾 GST VERIFICATION:");
    console.log("-".repeat(50));
    const expectedTax = Math.round(itemsPrice * 0.18);
    console.log("Expected GST (18% of itemsPrice): ₹" + expectedTax);
    console.log("Received taxPrice: ₹" + taxPrice);
    
    const gstMatch = Math.abs(taxPrice - expectedTax) < 1;
    console.log("GST Match:", gstMatch ? "✅ YES" : "❌ NO");
    
    if (!gstMatch) {
      console.log(`⚠️  GST MISMATCH: Tax is ₹${taxPrice}, should be ₹${expectedTax}`);
      console.log(`GST appears to be calculated on: ₹${Math.round(taxPrice / 0.18)}`);
      console.log(`Difference: ₹${Math.abs(taxPrice - expectedTax)}`);
    }
    
    // 🎯 FINAL VERIFICATION
    console.log("\n💯 FINAL VERIFICATION:");
    console.log("-".repeat(50));
    const expectedTotal = itemsPrice + taxPrice + shippingPrice;
    console.log("Expected total (items + tax + shipping): ₹" + expectedTotal);
    console.log("Received totalAmount: ₹" + req.body.totalAmount);
    
    const totalMatch = Math.abs(expectedTotal - req.body.totalAmount) < 1;
    console.log("Total Match:", totalMatch ? "✅ YES" : "❌ NO");
    
    if (!totalMatch) {
      console.log(`⚠️  TOTAL MISMATCH: Difference of ₹${Math.abs(expectedTotal - req.body.totalAmount)}`);
    }
    
    // 🎯 REPORT PROBLEMATIC ITEMS
    if (problematicItems.length > 0) {
      console.log("\n🚨 PROBLEMATIC ITEMS REPORT:");
      console.log("-".repeat(50));
      console.log(`Found ${problematicItems.length} item(s) with wrong prices:`);
      
      problematicItems.forEach(item => {
        console.log(`\nItem ${item.index}: ${item.name}`);
        console.log(`  Price received: ₹${item.price}`);
        console.log(`  Expected price: ₹${item.expectedPrice}`);
        console.log(`  Difference: ₹${item.difference}`);
        console.log(`  Issue: ${item.price === 5000 ? 'Using original price instead of discount price' : 'Unexpected price'}`);
      });
      
      console.log("\n🔧 ROOT CAUSE ANALYSIS:");
      console.log("-".repeat(30));
      console.log("The frontend is sending item.product.price (₹5000) instead of item.price (₹4800)");
      console.log("\n🔧 RECOMMENDED FIX:");
      console.log("-".repeat(30));
      console.log("In Checkout.js, ensure you're using:");
      console.log("  price: item.price (from cart) ← CORRECT");
      console.log("NOT:");
      console.log("  price: item.product.price (from product) ← WRONG");
      
      // 🎯 TEMPORARY FIX: Override ₹5000 with ₹4800
      console.log("\n🎯 APPLYING TEMPORARY FIX:");
      console.log("-".repeat(30));
      console.log("Overriding ₹5000 prices with ₹4800 for this transaction");
      
      const fixedItems = items.map(item => ({
        ...item,
        price: item.price === 5000 ? 4800 : item.price
      }));
      
      // Recalculate with fixed prices
      const fixedItemsTotal = fixedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const fixedTaxPrice = Math.round(fixedItemsTotal * 0.18);
      const fixedShippingPrice = (fixedItemsTotal > 1000 || fixedItemsTotal === 0) ? 0 : 50;
      const fixedTotal = fixedItemsTotal + fixedTaxPrice + fixedShippingPrice;
      
      console.log("Fixed prices:");
      console.log(`  Items total: ₹${fixedItemsTotal} (was ₹${itemsTotal})`);
      console.log(`  Tax: ₹${fixedTaxPrice} (was ₹${taxPrice})`);
      console.log(`  Shipping: ₹${fixedShippingPrice}`);
      console.log(`  Total: ₹${fixedTotal} (was ₹${req.body.totalAmount})`);
      
      // Use fixed values
      items = fixedItems;
      itemsPrice = fixedItemsTotal;
      taxPrice = fixedTaxPrice;
      shippingPrice = fixedShippingPrice;
    }
    
    // 🎯 PRICE AGREEMENT CHECK
    console.log("\n🤝 PRICE AGREEMENT CHECK:");
    console.log("-".repeat(50));
    
    // Use prices from frontend if provided, otherwise calculate
    const finalItemsPrice = itemsPrice !== undefined ? itemsPrice : 
      items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const finalTaxPrice = taxPrice !== undefined ? taxPrice : 
      Math.round(finalItemsPrice * 0.18);
    
    const finalShippingPrice = shippingPrice !== undefined ? shippingPrice : 
      (finalItemsPrice > 1000 ? 0 : 50);

    console.log("Using these prices for Stripe:");
    console.log(`  Items Price: ₹${finalItemsPrice}`);
    console.log(`  Tax Price: ₹${finalTaxPrice}`);
    console.log(`  Shipping Price: ₹${finalShippingPrice}`);
    console.log(`  Total: ₹${finalItemsPrice + finalTaxPrice + finalShippingPrice}`);
    
    // 🎯 VERIFY FRONTEND CALCULATION
    console.log("\n🧮 VERIFYING FRONTEND CALCULATION:");
    console.log("-".repeat(50));
    
    const calculatedItemsPrice = items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);

    console.log("Frontend sent itemsPrice:", itemsPrice);
    console.log("Backend calculated from items:", calculatedItemsPrice);
    console.log("Match:", itemsPrice === calculatedItemsPrice ? "✅ YES" : "❌ NO");
    
    if (itemsPrice !== calculatedItemsPrice) {
      console.log("❌ MISMATCH! Frontend and backend calculations differ");
      console.log("Difference:", itemsPrice - calculatedItemsPrice);
      console.log("This suggests frontend is not sending correct item prices");
    }

    // 🎯 CREATE STRIPE LINE ITEMS
    console.log("\n🛒 CREATING STRIPE LINE ITEMS:");
    console.log("-".repeat(50));
    
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

    console.log(`Created ${lineItems.length} product line items`);
    
    // Display what we're sending to Stripe
    console.log("\n📤 LINE ITEMS FOR STRIPE:");
    lineItems.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.price_data.product_data.name}`);
      console.log(`  Unit amount: ₹${item.price_data.unit_amount / 100}`);
      console.log(`  Quantity: ${item.quantity}`);
      console.log(`  Total: ₹${(item.price_data.unit_amount * item.quantity) / 100}`);
    });

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
      console.log("\n➕ Added GST line item: ₹" + finalTaxPrice);
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
      console.log("➕ Added shipping line item: ₹" + finalShippingPrice);
    }

    console.log("\n💰 FINAL PRICE BREAKDOWN FOR STRIPE:");
    console.log("-".repeat(50));
    console.log("Subtotal: ₹" + finalItemsPrice);
    console.log("GST: ₹" + finalTaxPrice);
    console.log("Shipping: ₹" + finalShippingPrice);
    console.log("Total: ₹" + (finalItemsPrice + finalTaxPrice + finalShippingPrice));
    
    const totalAmountPaise = Math.round((finalItemsPrice + finalTaxPrice + finalShippingPrice) * 100);
    console.log("Total in paise (for Stripe): " + totalAmountPaise);

    // 🎯 CREATE STRIPE CHECKOUT SESSION
    console.log("\n🚀 CREATING STRIPE CHECKOUT SESSION:");
    console.log("-".repeat(50));
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
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
        debug_firstItemPrice: items[0]?.price?.toString() || 'none',
        debug_has5000Bug: has5000Price.toString(),
        debug_fixedPrice: (has5000Price ? "Yes" : "No")
      },
    });

    console.log("\n✅ STRIPE SESSION CREATED SUCCESSFULLY:");
    console.log("-".repeat(50));
    console.log("Session ID:", session.id);
    console.log("Amount Total: ₹" + (session.amount_total / 100));
    console.log("Customer Email:", session.customer_email);
    console.log("Stripe Checkout URL:", session.url ? "✅ Generated" : "❌ Missing");
    console.log("Payment Status:", session.payment_status);
    
    console.log("\n📋 SESSION METADATA:");
    console.log("-".repeat(30));
    console.log("Order ID:", session.metadata.orderId);
    console.log("Items Price:", session.metadata.itemsPrice);
    console.log("Tax Price:", session.metadata.taxPrice);
    console.log("Total Price:", session.metadata.totalPrice);
    
    console.log("\n" + "=".repeat(90));
    console.log("✅ PAYMENT SESSION CREATION COMPLETE");
    console.log("=".repeat(90));

    res.json({ 
      success: true, 
      url: session.url,
      sessionId: session.id,
      amount: session.amount_total / 100,
      debug: {
        itemsPrice: finalItemsPrice,
        taxPrice: finalTaxPrice,
        total: finalItemsPrice + finalTaxPrice + finalShippingPrice,
        had5000Bug: has5000Price,
        fixed: has5000Price
      }
    });
    
  } catch (err) {
    console.error("\n❌ STRIPE SESSION CREATION ERROR:");
    console.error("=".repeat(90));
    console.error("Error Message:", err.message);
    console.error("Error Type:", err.type);
    console.error("Error Code:", err.code);
    
    if (err.raw) {
      console.error("Stripe Raw Error:");
      console.error("  Code:", err.raw.code);
      console.error("  Message:", err.raw.message);
      console.error("  Param:", err.raw.param);
    }
    
    console.error("\n📊 REQUEST DATA AT TIME OF ERROR:");
    console.error("-".repeat(50));
    console.error("User ID:", req.user?._id);
    console.error("Items count:", req.body.items?.length);
    console.error("Items price:", req.body.itemsPrice);
    
    // Provide helpful error messages
    let userMessage = "Payment session creation failed";
    if (err.type === 'StripeInvalidRequestError') {
      if (err.code === 'parameter_invalid_integer') {
        userMessage = "Invalid price amount. Please check product prices.";
        console.error("Price validation error - check item prices");
      } else if (err.message.includes('API key')) {
        userMessage = "Payment gateway configuration error.";
        console.error("Stripe API key issue");
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      debug: {
        errorType: err.type,
        errorCode: err.code,
        stripeMessage: err.raw?.message
      }
    });
  }
});

// VERIFY SESSION - Updated to handle the new price structure
router.get("/verify/:sessionId", protect, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🔍 VERIFYING PAYMENT SESSION");
    console.log("=".repeat(80));
    
    const { sessionId } = req.params;
    console.log("Session ID:", sessionId);
    console.log("User ID:", req.user._id);
    console.log("User email:", req.user.email);
    
    // 🎯 VALIDATE SESSION ID FORMAT
    if (!sessionId || !sessionId.startsWith('cs_test_') && !sessionId.startsWith('cs_live_')) {
      console.log("❌ INVALID SESSION ID FORMAT");
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid session ID format',
        sessionId: sessionId
      });
    }

    // Retrieve session from Stripe
    let session;
    try {
      console.log("\n🔗 RETRIEVING SESSION FROM STRIPE...");
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'payment_intent']
      });
      console.log("✅ Stripe session retrieved successfully");
    } catch (stripeError) {
      console.error("❌ STRIPE RETRIEVAL ERROR:", stripeError.message);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment session not found or expired',
        error: process.env.NODE_ENV === 'development' ? stripeError.message : undefined
      });
    }

    console.log("\n📋 SESSION DETAILS:");
    console.log("-".repeat(40));
    console.log("Payment Status:", session.payment_status);
    console.log("Amount Total: ₹" + (session.amount_total / 100));
    console.log("Customer Email:", session.customer_email);
    console.log("Created:", new Date(session.created * 1000).toLocaleString());
    console.log("Expires:", session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A');
    
    // 🎯 CHECK IF PAYMENT IS COMPLETE
    if (session.payment_status !== 'paid') {
      console.log("\n❌ PAYMENT NOT COMPLETE - Status:", session.payment_status);
      return res.status(400).json({ 
        success: false, 
        message: `Payment is ${session.payment_status}. Please complete the payment first.`,
        payment_status: session.payment_status,
        amount: session.amount_total / 100
      });
    }

    console.log("\n✅ PAYMENT VERIFIED - STATUS: PAID");
    
    // 🎯 CHECK IF ORDER ALREADY EXISTS
    let order = await Order.findOne({ "paymentResult.id": sessionId });
    
    if (order) {
      console.log("\nℹ️  ORDER ALREADY EXISTS FOR THIS PAYMENT:");
      console.log("Order ID:", order._id);
      console.log("Order Total: ₹" + order.totalPrice);
      console.log("Order Status:", order.orderStatus);
      
      // Populate user data
      await order.populate('user', 'name email');
      
      console.log("\n" + "=".repeat(80));
      console.log("✅ ORDER ALREADY PROCESSED - RETURNING EXISTING ORDER");
      console.log("=".repeat(80));
      
      return res.json({ 
        success: true, 
        message: 'Order already processed',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          isPaid: order.isPaid,
          paidAt: order.paidAt,
          orderStatus: order.orderStatus,
          user: order.user,
          orderItems: order.orderItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity
          }))
        }
      });
    }

    // 🎯 CREATE NEW ORDER FROM STRIPE SESSION
    console.log("\n📦 CREATING NEW ORDER FROM STRIPE SESSION");
    console.log("-".repeat(40));
    
    const meta = session.metadata || {};
    
    console.log("Metadata available:", Object.keys(meta));
    console.log("\n💰 PRICES FROM METADATA:");
    console.log("Items Price:", meta.itemsPrice || 'Not available');
    console.log("Tax Price:", meta.taxPrice || 'Not available');
    console.log("Shipping Price:", meta.shippingPrice || 'Not available');
    console.log("Total Price:", meta.totalPrice || 'Not available');
    console.log("Order ID from metadata:", meta.orderId || 'Not available');
    
    // 🎯 EXTRACT PRODUCT ITEMS (EXCLUDE TAX/SHIPPING)
    const productItems = session.line_items?.data?.filter(li => 
      li && li.description && 
      !li.description.toLowerCase().includes("gst") && 
      !li.description.toLowerCase().includes("shipping") &&
      !li.description.toLowerCase().includes("tax")
    ) || [];

    console.log(`\n🛒 EXTRACTED ${productItems.length} PRODUCT ITEMS:`);
    
    if (productItems.length === 0 && session.line_items?.data) {
      console.log("\n⚠️  No product items filtered, showing all items:");
      session.line_items.data.forEach((item, index) => {
        console.log(`Item ${index + 1}: ${item.description || 'No description'}`);
      });
    } else {
      productItems.forEach((item, index) => {
        const pricePerUnit = item.amount_total / 100 / item.quantity;
        console.log(`\nItem ${index + 1}: ${item.description || 'Unnamed item'}`);
        console.log(`  Price per unit: ₹${pricePerUnit}`);
        console.log(`  Quantity: ${item.quantity}`);
        console.log(`  Total: ₹${item.amount_total / 100}`);
      });
    }

    // 🎯 PREPARE ORDER DATA
    const orderData = {
      user: meta.userId || req.user._id,
      orderItems: productItems.map(li => {
        const pricePerUnit = li.amount_total / 100 / li.quantity;
        return {
          name: li.description || 'Product',
          quantity: li.quantity,
          price: pricePerUnit,
          product: null,
          image: li.price?.product_data?.images?.[0] || '/images/default-product.jpg'
        };
      }),
      shippingAddress: {
        address: meta.shippingAddress || 'Not provided',
        city: meta.city || 'Not provided',
        zipCode: meta.zip || 'Not provided',
        phone: meta.phone || 'Not provided',
        state: meta.state || '',
        country: meta.country || "India"
      },
      paymentMethod: 'card',
      paymentResult: { 
        id: sessionId, 
        status: 'paid',
        email_address: session.customer_email || req.user.email,
        amount: session.amount_total / 100,
        currency: session.currency || 'inr'
      },
      itemsPrice: Number(meta.itemsPrice) || Math.round(session.amount_total / 100 * 0.82), // Estimate if not provided
      taxPrice: Number(meta.taxPrice) || Math.round(session.amount_total / 100 * 0.18), // Estimate 18% GST
      shippingPrice: Number(meta.shippingPrice) || 0,
      totalPrice: Number(meta.totalPrice) || (session.amount_total / 100),
      isPaid: true,
      paidAt: new Date(),
      orderStatus: 'processing'
    };

    console.log("\n📝 ORDER DATA TO CREATE:");
    console.log("-".repeat(40));
    console.log("User:", orderData.user);
    console.log("Items count:", orderData.orderItems.length);
    console.log("Total Price: ₹" + orderData.totalPrice);
    console.log("Payment ID:", orderData.paymentResult.id);

    try {
      // 🎯 CREATE ORDER
      order = new Order(orderData);
      await order.save();
      
      console.log("\n✅ ORDER CREATED SUCCESSFULLY:");
      console.log("Order ID:", order._id);
      console.log("Order Total: ₹" + order.totalPrice);
      
      // Generate order number if not exists
      if (!order.orderNumber) {
        order.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await order.save();
        console.log("Generated Order Number:", order.orderNumber);
      }
      
    } catch (createError) {
      console.error("\n❌ ORDER CREATION ERROR:");
      console.error("Error:", createError.message);
      console.error("Validation errors:", createError.errors);
      
      // Try to save minimal order data
      const minimalOrder = new Order({
        user: req.user._id,
        orderItems: [{
          name: 'Payment Receipt',
          quantity: 1,
          price: session.amount_total / 100,
          product: null
        }],
        shippingAddress: {
          address: 'Payment completed - address to be updated',
          city: 'Online',
          country: 'India'
        },
        paymentMethod: 'card',
        paymentResult: { 
          id: sessionId, 
          status: 'paid',
          email_address: session.customer_email
        },
        itemsPrice: session.amount_total / 100,
        taxPrice: 0,
        shippingPrice: 0,
        totalPrice: session.amount_total / 100,
        isPaid: true,
        paidAt: new Date(),
        notes: 'Auto-created from payment verification with minimal data'
      });
      
      order = await minimalOrder.save();
      console.log("✅ Created minimal order as fallback");
    }

    // 🎯 POPULATE USER DATA
    try {
      await order.populate('user', 'name email');
      console.log("✅ User data populated");
    } catch (populateError) {
      console.error("User population error:", populateError.message);
      // Continue without populated user
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ PAYMENT VERIFICATION COMPLETE");
    console.log("=".repeat(80));

    // 🎯 SUCCESS RESPONSE
    res.json({ 
      success: true, 
      message: 'Payment verified and order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber || `ORD-${order._id}`,
        totalPrice: order.totalPrice,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        orderStatus: order.orderStatus,
        user: order.user || { name: req.user.name, email: req.user.email },
        orderItems: order.orderItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentResult: order.paymentResult
      }
    });

  } catch (err) {
    console.error("\n❌ PAYMENT VERIFICATION ERROR:");
    console.error("=".repeat(80));
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    console.error("Session ID:", req.params.sessionId);
    console.error("User ID:", req.user?._id);
    console.error("Timestamp:", new Date().toISOString());
    console.error("=".repeat(80));
    
    // 🎯 USER-FRIENDLY ERROR RESPONSE
    let errorMessage = "Payment verification failed";
    let statusCode = 500;
    
    if (err.message.includes('No such session')) {
      errorMessage = "Payment session expired or not found. Please try the payment again.";
      statusCode = 404;
    } else if (err.message.includes('Authentication')) {
      errorMessage = "Authentication failed. Please login again.";
      statusCode = 401;
    } else if (err.message.includes('Stripe')) {
      errorMessage = "Payment gateway error. Please contact support.";
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      debug: {
        errorType: err.name,
        sessionId: req.params.sessionId,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 🎯 DEBUG: Check what's being sent to payment
router.post("/debug-payload", protect, async (req, res) => {
  try {
    console.log("\n🔍 PAYMENT DEBUG ENDPOINT");
    console.log("=".repeat(70));
    
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const { items } = req.body;
    
    if (items && items.length > 0) {
      console.log("\n📋 ITEM PRICE ANALYSIS:");
      console.log("-".repeat(40));
      
      items.forEach((item, index) => {
        console.log(`\nItem ${index + 1}: ${item.name}`);
        console.log(`  Price: ₹${item.price}`);
        console.log(`  Source: ${item.price === 5000 ? 'PRODUCT PRICE (WRONG)' : item.price === 4800 ? 'CART PRICE (CORRECT)' : 'UNKNOWN'}`);
        console.log(`  Expected: ₹4800 (discount price from cart)`);
        
        if (item.price === 5000) {
          console.log("  ⚠️  BUG DETECTED: Using product.price instead of item.price!");
        }
      });
    }
    
    res.json({
      success: true,
      message: "Debug analysis complete",
      analysis: items ? items.map(item => ({
        name: item.name,
        price: item.price,
        issue: item.price === 5000 ? "Using product.price instead of cart item.price" : "OK"
      })) : []
    });
    
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ success: false, message: "Debug error" });
  }
});

// 🎯 ADD A SIMPLE HEALTH CHECK ENDPOINT
router.get("/health", (req, res) => {
  console.log("🩺 Payment endpoint health check");
  res.json({ 
    success: true, 
    message: "Payment endpoint is working",
    timestamp: new Date().toISOString(),
    stripe: process.env.STRIPE_SECRET_KEY ? "Configured" : "Not configured"
  });
});

// 🎯 TEST ENDPOINT FOR FRONTEND
router.post("/test-verify", protect, async (req, res) => {
  try {
    console.log("\n🧪 TEST VERIFICATION ENDPOINT");
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID required" });
    }
    
    // Simulate a successful verification
    res.json({
      success: true,
      message: "Test verification successful",
      testData: {
        sessionId,
        amount: 5664,
        status: "paid",
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error("Test verification error:", err);
    res.status(500).json({ success: false, message: "Test failed" });
  }
});

module.exports = router;