const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: 'Please provide shipping address' });
    }

    // Verify stock and prices
    for (let item of orderItems) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      product.stock -= item.quantity;
      product.sold += item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice
    });

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalPrice: 0 }
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('orderItems.product', 'name images');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // SAFETY CHECK: Handle null users
    // If user is null (deleted), only admins can proceed.
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update order to paid
exports.updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address
    };

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // SAFETY CHECK: Optional chaining for user check
    if (order.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel shipped/delivered order' });
    }

    // Restore stock logic
    for (let item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.sold = Math.max(0, product.sold - item.quantity);
        await product.save();
      }
    }

    order.orderStatus = 'cancelled';
    const updatedOrder = await order.save();
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // SAFETY CHECK: Handle null user
    const isOwner = order.user && order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN: Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images')
      .sort('-createdAt');

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

    res.status(200).json({ success: true, count: orders.length, orders: ordersWithImages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADMIN: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = orderStatus || order.orderStatus;
    order.trackingNumber = trackingNumber || order.trackingNumber;

    if (orderStatus === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};