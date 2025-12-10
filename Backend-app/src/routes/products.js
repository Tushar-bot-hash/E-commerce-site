const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory
} = require('../controllers/productController');

// Import review controller or directly use Review model
const Review = require('../models/Review');
const Order = require('../models/Order');

// Public routes
router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProductById);



// Get reviews for a specific product
router.get('/:id/reviews', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ product: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ product: req.params.id });

    res.json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasMore: page < Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user can review this product
router.get('/:id/can-review', protect, async (req, res) => {
  try {
    // Check if user already reviewed
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: req.params.id
    });

    if (existingReview) {
      return res.json({ 
        canReview: false, 
        message: 'You have already reviewed this product',
        existingReview 
      });
    }

    // Check if user has purchased the product
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': req.params.id,
      status: 'delivered'
    });

    res.json({ 
      canReview: true,
      hasPurchased: !!hasPurchased,
      message: hasPurchased ? 'You can review this product' : 'Review allowed (not verified purchase)'
    });
  } catch (error) {
    console.error('Check can review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create review for a product
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: req.params.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if user has purchased the product
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': req.params.id,
      status: 'delivered'
    });

    const review = new Review({
      user: req.user.id,
      product: req.params.id,
      rating,
      comment,
      images: images || [],
      isVerifiedPurchase: !!hasPurchased
    });

    await review.save();
    await review.populate('user', 'name');

    // Update product rating (you'll need to implement this in Product model)
    // await Product.updateProductRating(req.params.id);

    res.status(201).json({ 
      review,
      message: 'Review submitted successfully!'
    });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get review statistics for a product
router.get('/:id/reviews/stats', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id });
    
    if (reviews.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    reviews.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
    });

    res.json({
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews: reviews.length,
      ratingDistribution
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes (require authentication + admin role)
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;
