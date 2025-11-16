// store/reviewStore.js
import { create } from 'zustand';
import { reviewAPI } from '../services/api';
import toast from 'react-hot-toast';

const useReviewStore = create((set, get) => ({
  reviews: [],
  userReviews: [],
  reviewStats: null,
  canReview: null,
  loading: false,
  submitting: false,
  hasMore: true,
  currentPage: 1,

  // Get reviews for a product
  fetchProductReviews: async (productId, page = 1, limit = 10) => {
    set({ loading: true });
    try {
      const response = await reviewAPI.getProductReviews(productId, page, limit);
      set(state => ({
        reviews: page === 1 ? response.reviews : [...state.reviews, ...response.reviews],
        hasMore: response.hasMore,
        currentPage: page,
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      toast.error('Failed to load reviews');
    }
  },

  // Get review statistics
  fetchReviewStats: async (productId) => {
    try {
      const response = await reviewAPI.getReviewStats(productId);
      set({ reviewStats: response.data });
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  },

  // Check if user can review
  checkCanReview: async (productId) => {
    try {
      const response = await reviewAPI.canReviewProduct(productId);
      set({ canReview: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to check review eligibility:', error);
      return { canReview: false };
    }
  },

  // Create a new review
  createReview: async (reviewData) => {
    set({ submitting: true });
    try {
      const response = await reviewAPI.createReview(reviewData);
      set(state => ({
        reviews: [response.data.review, ...state.reviews],
        submitting: false,
        canReview: { ...state.canReview, canReview: false }
      }));
      toast.success(response.data.message || 'Review submitted successfully!');
      return { success: true, review: response.data.review };
    } catch (error) {
      set({ submitting: false });
      const message = error.response?.data?.message || 'Failed to submit review';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Update a review
  updateReview: async (reviewId, reviewData) => {
    set({ submitting: true });
    try {
      const response = await reviewAPI.updateReview(reviewId, reviewData);
      set(state => ({
        reviews: state.reviews.map(review => 
          review._id === reviewId ? response.data.review : review
        ),
        submitting: false
      }));
      toast.success(response.data.message || 'Review updated successfully!');
      return { success: true };
    } catch (error) {
      set({ submitting: false });
      const message = error.response?.data?.message || 'Failed to update review';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Delete a review
  deleteReview: async (reviewId) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      set(state => ({
        reviews: state.reviews.filter(review => review._id !== reviewId),
        userReviews: state.userReviews.filter(review => review._id !== reviewId),
        canReview: { ...state.canReview, canReview: true }
      }));
      toast.success('Review deleted successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete review';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Mark review as helpful
  markHelpful: async (reviewId) => {
    try {
      const response = await reviewAPI.markHelpful(reviewId);
      set(state => ({
        reviews: state.reviews.map(review => 
          review._id === reviewId 
            ? { ...review, helpfulCount: response.data.helpfulCount }
            : review
        )
      }));
      toast.success(response.data.message || 'Thank you for your feedback!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to mark as helpful';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Clear reviews
  clearReviews: () => {
    set({ reviews: [], currentPage: 1, hasMore: true, reviewStats: null, canReview: null });
  }
}));

export default useReviewStore;