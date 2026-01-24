const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("📦 ORDER CONTROLLER - CREATE ORDER");
    console.log("=".repeat(80));
    
    console.log("\n👤 USER INFORMATION:");
    console.log("-".repeat(40));
    console.log("User ID:", req.user._id);
    console.log("User email:", req.user.email);
    console.log("User name:", req.user.name);
    
    console.log("\n📨 REQUEST BODY RECEIVED:");
    console.log("-".repeat(40));
    console.log("Request body keys:", Object.keys(req.body));
    console.log("\nFull request body:");
    console.log(JSON.stringify({
      orderItems: req.body.orderItems?.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        product: item.product
      })),
      itemsPrice: req.body.itemsPrice,
      taxPrice: req.body.taxPrice,
      shippingPrice: req.body.shippingPrice,
      totalPrice: req.body.totalPrice,
      shippingAddress: req.body.shippingAddress
    }, null, 2));
    
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    } = req.body;

    // 🎯 VALIDATION
    console.log("\n🔍 VALIDATING REQUEST DATA:");
    console.log("-".repeat(40));
    
    if (!orderItems || orderItems.length === 0) {
      console.log("❌ ERROR: No order items in request");
      return res.status(400).json({ 
        success: false,
        message: 'No order items' 
      });
    }

    if (!shippingAddress) {
      console.log("❌ ERROR: No shipping address in request");
      return res.status(400).json({ 
        success: false,
        message: 'Please provide shipping address' 
      });
    }

    // 🎯 DETAILED PRICE ANALYSIS
    console.log("\n💰 DETAILED PRICE ANALYSIS:");
    console.log("-".repeat(40));
    
    console.log("\n📊 PRICE SUMMARY FROM FRONTEND:");
    console.log("itemsPrice: ₹" + itemsPrice);
    console.log("taxPrice: ₹" + taxPrice);
    console.log("shippingPrice: ₹" + shippingPrice);
    console.log("totalPrice: ₹" + totalPrice);
    
    // 🎯 ANALYZE ORDER ITEMS
    console.log("\n📋 ORDER ITEMS ANALYSIS:");
    console.log("-".repeat(40));
    
    let orderItemsTotal = 0;
    let problematicItems = [];
    let correctItems = [];
    
    orderItems.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      orderItemsTotal += itemTotal;
      
      console.log(`\n📦 Item ${index + 1}: ${item.name}`);
      console.log(`  ├── Price: ₹${item.price}`);
      console.log(`  ├── Quantity: ${item.quantity}`);
      console.log(`  ├── Item total: ₹${itemTotal}`);
      console.log(`  ├── Product ID: ${item.product}`);
      console.log(`  ├── Image: ${item.image ? "✅ Provided" : "❌ Missing"}`);
      console.log(`  └── Size/Color: ${item.size || 'N/A'}/${item.color || 'N/A'}`);
      
      if (item.price === 5000) {
        console.log("  ⚠️  ⚠️  ⚠️  CRITICAL ISSUE: Price is ₹5000!");
        console.log("  This should be ₹4800 (discount price from cart)");
        problematicItems.push({
          name: item.name,
          receivedPrice: item.price,
          expectedPrice: 4800,
          index: index + 1
        });
      } else if (item.price === 4800) {
        console.log("  ✅ Price is correct: ₹4800");
        correctItems.push({
          name: item.name,
          price: item.price,
          index: index + 1
        });
      } else {
        console.log(`  ❓ Unexpected price: ₹${item.price}`);
        problematicItems.push({
          name: item.name,
          receivedPrice: item.price,
          expectedPrice: 4800,
          index: index + 1
        });
      }
    });
    
    console.log("\n🧮 CALCULATION VERIFICATION:");
    console.log("-".repeat(40));
    console.log("Sum of all orderItems prices: ₹" + orderItemsTotal);
    console.log("itemsPrice from request: ₹" + itemsPrice);
    
    const itemsPriceMatch = Math.abs(orderItemsTotal - itemsPrice) < 1;
    console.log("Match: " + (itemsPriceMatch ? "✅ YES" : "❌ NO"));
    
    if (!itemsPriceMatch) {
      console.log("⚠️  WARNING: orderItems total doesn't match itemsPrice!");
      console.log(`Difference: ₹${Math.abs(orderItemsTotal - itemsPrice)}`);
      console.log(`orderItemsTotal: ₹${orderItemsTotal}`);
      console.log(`itemsPrice: ₹${itemsPrice}`);
    }
    
    // 🎯 GST VERIFICATION
    console.log("\n🧾 GST VERIFICATION:");
    console.log("-".repeat(40));
    const expectedTax = Math.round(itemsPrice * 0.18);
    console.log("Expected GST (18% of itemsPrice): ₹" + expectedTax);
    console.log("Received taxPrice: ₹" + taxPrice);
    
    const gstMatch = Math.abs(taxPrice - expectedTax) < 1;
    console.log("GST Match: " + (gstMatch ? "✅ YES" : "❌ NO"));
    
    if (!gstMatch) {
      console.log(`⚠️  GST MISMATCH: Tax is ₹${taxPrice}, should be ₹${expectedTax}`);
      console.log(`GST appears to be calculated on: ₹${Math.round(taxPrice / 0.18)}`);
      console.log(`Difference: ₹${Math.abs(taxPrice - expectedTax)}`);
    }
    
    // 🎯 TOTAL VERIFICATION
    console.log("\n💯 TOTAL VERIFICATION:");
    console.log("-".repeat(40));
    const expectedTotal = itemsPrice + taxPrice + shippingPrice;
    console.log("Expected total (items + tax + shipping): ₹" + expectedTotal);
    console.log("Received totalPrice: ₹" + totalPrice);
    
    const totalMatch = Math.abs(expectedTotal - totalPrice) < 1;
    console.log("Total Match: " + (totalMatch ? "✅ YES" : "❌ NO"));
    
    if (!totalMatch) {
      console.log(`⚠️  TOTAL MISMATCH: Difference of ₹${Math.abs(expectedTotal - totalPrice)}`);
      console.log(`Expected: ₹${expectedTotal}, Received: ₹${totalPrice}`);
    }
    
    // 🎯 SUMMARY REPORT
    console.log("\n📈 SUMMARY REPORT:");
    console.log("-".repeat(40));
    console.log(`Total items: ${orderItems.length}`);
    console.log(`Correct prices (₹4800): ${correctItems.length}`);
    console.log(`Problematic prices (₹5000 or other): ${problematicItems.length}`);
    
    if (problematicItems.length > 0) {
      console.log("\n🚨 PROBLEMATIC ITEMS FOUND:");
      console.log("-".repeat(40));
      problematicItems.forEach(item => {
        console.log(`- Item ${item.index}: ${item.name}`);
        console.log(`  Received: ₹${item.receivedPrice}, Expected: ₹${item.expectedPrice}`);
        console.log(`  Difference: ₹${Math.abs(item.receivedPrice - item.expectedPrice)}`);
      });
      
      console.log("\n🔧 RECOMMENDED FIX:");
      console.log("-".repeat(40));
      console.log("The frontend is sending ₹5000 instead of ₹4800.");
      console.log("Check your Checkout.js - ensure you're using item.price (from cart) not item.product.price");
    }

    // 🎯 VERIFY STOCK AND PRODUCTS
    console.log("\n🔍 VERIFYING STOCK AND PRODUCTS:");
    console.log("-".repeat(40));
    
    for (let item of orderItems) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        console.log(`❌ ERROR: Product ${item.name} (ID: ${item.product}) not found in database`);
        return res.status(404).json({ 
          success: false,
          message: `Product ${item.name} not found` 
        });
      }

      console.log(`\n📦 Product: ${product.name} (ID: ${product._id})`);
      console.log(`  ├── Product price in DB: ₹${product.price}`);
      console.log(`  ├── Discount price in DB: ₹${product.discountPrice || 'None'}`);
      console.log(`  ├── Sale price in DB: ₹${product.salePrice || 'None'}`);
      console.log(`  ├── Order item price: ₹${item.price}`);
      console.log(`  ├── Stock available: ${product.stock}`);
      console.log(`  └── Quantity ordered: ${item.quantity}`);
      
      // 🎯 PRICE CONSISTENCY CHECK
      if (product.discountPrice && item.price !== product.discountPrice) {
        console.log(`  ⚠️  PRICE INCONSISTENCY: Order has ₹${item.price}, but product discountPrice is ₹${product.discountPrice}`);
      }
      
      if (product.stock < item.quantity) {
        console.log(`❌ INSUFFICIENT STOCK: Available ${product.stock}, Ordered ${item.quantity}`);
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      // Update product stock
      const oldStock = product.stock;
      const oldSold = product.sold || 0;
      
      product.stock -= item.quantity;
      product.sold = (product.sold || 0) + item.quantity;
      
      await product.save();
      
      console.log(`  ✅ Stock updated successfully:`);
      console.log(`     Old stock: ${oldStock}, New stock: ${product.stock}`);
      console.log(`     Old sold: ${oldSold}, New sold: ${product.sold}`);
    }

    // 🎯 CREATE ORDER
    console.log("\n📝 CREATING ORDER IN DATABASE:");
    console.log("-".repeat(40));
    
    console.log("Order data being saved:");
    console.log("- User:", req.user._id);
    console.log("- Number of items:", orderItems.length);
    console.log("- itemsPrice:", itemsPrice);
    console.log("- taxPrice:", taxPrice);
    console.log("- shippingPrice:", shippingPrice);
    console.log("- totalPrice:", totalPrice);
    
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'card',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    });

    console.log("\n✅ ORDER CREATED SUCCESSFULLY:");
    console.log("-".repeat(40));
    console.log("Order ID:", order._id);
    console.log("Order number:", order.orderNumber || "N/A");
    console.log("Order total: ₹" + order.totalPrice);
    console.log("Created at:", order.createdAt);
    
    // 🎯 CLEAR CART
    console.log("\n🛒 CLEARING USER'S CART:");
    console.log("-".repeat(40));
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      console.log("Cart found for user:");
      console.log("- Cart items before clear:", cart.items.length);
      console.log("- Cart total before clear: ₹" + cart.totalPrice);
      
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { items: [], totalPrice: 0 }
      );
      
      console.log("✅ Cart cleared successfully");
    } else {
      console.log("ℹ️  No cart found for user");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ ORDER CREATION PROCESS COMPLETE");
    console.log("=".repeat(80));
    
    console.log("\n📊 FINAL SUMMARY:");
    console.log("-".repeat(40));
    console.log("Order ID:", order._id);
    console.log("Total charged: ₹" + order.totalPrice);
    console.log("Items: " + order.orderItems.length);
    console.log("User:", req.user.email);
    console.log("Shipping to:", shippingAddress.city + ", " + shippingAddress.state);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderItems: order.orderItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        itemsPrice: order.itemsPrice,
        taxPrice: order.taxPrice,
        shippingPrice: order.shippingPrice,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt
      }
    });
    
  } catch (error) {
    console.error('\n❌ CREATE ORDER ERROR:');
    console.error("=".repeat(80));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    
    console.error("=".repeat(80));
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    console.log("\n📋 GETTING ORDERS FOR USER:", req.user._id);
    
    const orders = await Order.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('orderItems.product', 'name images price discountPrice');

    console.log(`Found ${orders.length} orders for user ${req.user.email}`);
    
    // Debug order prices
    orders.forEach((order, index) => {
      console.log(`\nOrder ${index + 1} (${order._id}):`);
      console.log(`- Total: ₹${order.totalPrice}`);
      console.log(`- Items: ${order.orderItems.length}`);
      order.orderItems.forEach(item => {
        console.log(`  - ${item.name}: ₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}`);
      });
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('❌ Get my orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    console.log("\n🔍 GETTING ORDER BY ID:", req.params.id);
    
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images price discountPrice');

    if (!order) {
      console.log("❌ Order not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    console.log("Order found:", order._id);
    console.log("Order total: ₹" + order.totalPrice);
    console.log("Order items:", order.orderItems.length);
    
    // Debug price details
    console.log("\n💰 ORDER PRICE DETAILS:");
    order.orderItems.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.name}`);
      console.log(`  - Order price: ₹${item.price}`);
      if (item.product) {
        console.log(`  - Product price: ₹${item.product.price}`);
        console.log(`  - Product discountPrice: ₹${item.product.discountPrice || 'N/A'}`);
      }
    });

    // SAFETY CHECK: Handle null users
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log("❌ Unauthorized access attempt by user:", req.user._id);
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view this order' 
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('❌ Get order error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
exports.updateOrderToPaid = async (req, res) => {
  try {
    console.log("\n💳 UPDATING ORDER TO PAID:", req.params.id);
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log("❌ Order not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    console.log("Order current status:", {
      isPaid: order.isPaid,
      total: order.totalPrice,
      items: order.orderItems.length
    });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address
    };

    const updatedOrder = await order.save();
    
    console.log("✅ Order marked as paid:", updatedOrder._id);
    console.log("Payment details:", {
      id: req.body.id,
      status: req.body.status,
      email: req.body.email_address
    });

    res.status(200).json({ 
      success: true, 
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Update order to paid error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    console.log("\n❌ CANCELLING ORDER:", req.params.id);
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log("Order not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // SAFETY CHECK: Optional chaining for user check
    if (order.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log("Unauthorized cancel attempt by user:", req.user._id);
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    console.log("Order status before cancel:", order.orderStatus);
    console.log("Order total: ₹" + order.totalPrice);

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      console.log("Cannot cancel shipped/delivered order");
      return res.status(400).json({ 
        success: false,
        message: 'Cannot cancel shipped/delivered order' 
      });
    }

    // Restore stock logic
    console.log("\n📦 RESTORING STOCK:");
    for (let item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        console.log(`Product: ${product.name}`);
        console.log(`  Old stock: ${product.stock}, Quantity to restore: ${item.quantity}`);
        
        product.stock += item.quantity;
        product.sold = Math.max(0, (product.sold || 0) - item.quantity);
        
        await product.save();
        
        console.log(`  New stock: ${product.stock}, New sold: ${product.sold}`);
      } else {
        console.log(`Product not found: ${item.product}`);
      }
    }

    order.orderStatus = 'cancelled';
    const updatedOrder = await order.save();
    
    console.log("✅ Order cancelled successfully:", updatedOrder._id);

    res.status(200).json({ 
      success: true, 
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
exports.deleteOrder = async (req, res) => {
  try {
    console.log("\n🗑️  DELETING ORDER:", req.params.id);
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.log("Order not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // SAFETY CHECK: Handle null user
    const isOwner = order.user && order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log("Unauthorized delete attempt by user:", req.user._id);
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    
    console.log("✅ Order deleted successfully:", req.params.id);

    res.status(200).json({ 
      success: true, 
      message: 'Order deleted' 
    });
  } catch (error) {
    console.error('❌ Delete order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ADMIN: Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    console.log("\n📊 ADMIN: GETTING ALL ORDERS");
    
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images')
      .sort('-createdAt');

    console.log(`Found ${orders.length} total orders`);

    const ordersWithImages = orders.map(order => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        // Fallback for deleted users so frontend doesn't crash
        user: orderObj.user || { name: 'Customer Not Found', email: 'N/A' },
        orderItems: (orderObj.orderItems || []).map(item => ({
          ...item,
          image: item.product?.images?.[0] || item.image || '/images/placeholder.jpg',
          name: item.name || item.product?.name || 'Unknown Product'
        }))
      };
    });

    res.status(200).json({ 
      success: true, 
      count: orders.length, 
      orders: ordersWithImages 
    });
  } catch (error) {
    console.error('❌ Get all orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ADMIN: Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    console.log("\n🔄 ADMIN: UPDATING ORDER STATUS:", req.params.id);
    
    const { orderStatus, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log("Order not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    console.log("Current status:", order.orderStatus);
    console.log("New status:", orderStatus);
    console.log("Tracking number:", trackingNumber);

    order.orderStatus = orderStatus || order.orderStatus;
    order.trackingNumber = trackingNumber || order.trackingNumber;

    if (orderStatus === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      console.log("Marking order as delivered");
    }

    const updatedOrder = await order.save();
    
    console.log("✅ Order status updated:", updatedOrder._id);
    console.log("New status:", updatedOrder.orderStatus);

    res.status(200).json({ 
      success: true, 
      order: updatedOrder 
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Debug endpoint to check order prices
// @route   GET /api/orders/debug/:orderId
// @access  Private
exports.debugOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('orderItems.product', 'name price discountPrice salePrice');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    console.log("\n🔍 DEBUG ORDER:", order._id);
    console.log("Total price: ₹" + order.totalPrice);
    
    const debugInfo = {
      orderId: order._id,
      totalPrice: order.totalPrice,
      itemsPrice: order.itemsPrice,
      taxPrice: order.taxPrice,
      shippingPrice: order.shippingPrice,
      items: order.orderItems.map(item => ({
        name: item.name,
        orderPrice: item.price,
        productPrice: item.product?.price || 'N/A',
        discountPrice: item.product?.discountPrice || 'N/A',
        salePrice: item.product?.salePrice || 'N/A',
        quantity: item.quantity,
        total: item.price * item.quantity,
        matches: item.product ? item.price === item.product.discountPrice || item.price === item.product.price : 'N/A'
      }))
    };
    
    res.status(200).json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('Debug order error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Debug error', 
      error: error.message 
    });
  }
};