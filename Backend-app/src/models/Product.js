const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide product description']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  category: {
    type: String,
    required: [true, 'Please select product category'],
    enum: {
      values: ['clothing', 'figures', 'posters', 'accessories', 'manga', 'other'],
      message: 'Please select correct category'
    }
  },
  subCategory: {
    type: String,
    trim: true,
    default: '' // Optional string field default
  },
  animeSeries: {
    type: String,
    required: [true, 'Please provide anime series name'],
    trim: true
  },
  characters: [{
    type: String,
    trim: true
  }],
  default: [], // FIX: Default to empty array
  images: [{
    type: String,
    required: true
  }],
  sizes: [{
    type: String,
    // FIX: Added 'X' to the enum to match the input error
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'X'] 
  }],
  colors: [{
    type: String,
    trim: true
  }],
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  sold: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  default: [], // FIX: Default to empty array
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0,
    min: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for search
productSchema.index({ name: 'text', description: 'text', animeSeries: 'text' });

module.exports = mongoose.model('Product', productSchema);