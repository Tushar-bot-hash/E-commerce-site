const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ product: req.params.productId });

    res.json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's reviews
router.get('/user', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ user: req.user.id });

    res.json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a review
router.post('/', auth, async (req, res) => {
  try {
    const { product, rating, comment, images } = req.body;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user.id,
      product
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Check if user has purchased the product (optional verification)
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': product,
      status: 'delivered'
    });

    const review = new Review({
      user: req.user.id,
      product,
      rating,
      comment,
      images: images || [],
      isVerifiedPurchase: !!hasPurchased
    });

    await review.save();
    await review.populate('user', 'name email');

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

// Update a review
router.put('/:id', auth, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.rating = rating;
    review.comment = comment;
    review.images = images || review.images;

    await review.save();
    await review.populate('user', 'name email');

    res.json({ 
      review,
      message: 'Review updated successfully!'
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a review
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark review as helpful
router.post('/:id/helpful', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    ).populate('user', 'name email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ 
      helpfulCount: review.helpfulCount,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user can review a product
router.get('/can-review/:productId', auth, async (req, res) => {
  try {
    // Check if user already reviewed
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: req.params.productId
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
      'items.product': req.params.productId,
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

// Get review statistics for a product
router.get('/stats/:productId', async (req, res) => {
  try {
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(req.params.productId) } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats[0].ratingDistribution.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    res.json({
      averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
      totalReviews: stats[0].totalReviews,
      ratingDistribution
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;