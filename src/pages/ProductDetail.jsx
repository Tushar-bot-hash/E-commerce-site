import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Minus, Plus, Heart } from 'lucide-react';
import { productAPI } from '../services/api';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await productAPI.getProductById(id);
      const productData = response.data.product;
      setProduct(productData);
      
      // Set default selections
      if (productData.sizes?.length > 0) setSelectedSize(productData.sizes[0]);
      if (productData.colors?.length > 0) setSelectedColor(productData.colors[0]);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (product.sizes?.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    await addToCart({
      productId: product._id,
      quantity,
      size: selectedSize,
      color: selectedColor
    });
  };

  const displayPrice = product?.discountPrice || product?.price;
  const hasDiscount = product?.discountPrice && product.discountPrice < product.price;

  if (loading) return <Loading fullScreen />;
  if (!product) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container-custom">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Images */}
            <div>
              {/* Main Image */}
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={product.images[selectedImage] || 'https://via.placeholder.com/600'}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                />
              </div>

              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-primary-600' : 'border-gray-200'
                      }`}
                    >
                      <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              {/* Category & Series */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span className="badge badge-info">{product.category}</span>
                <span>•</span>
                <span>{product.animeSeries}</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-display font-bold mb-4">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">
                  ({product.numReviews} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ₹{displayPrice}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xl text-gray-500 line-through">
                        ₹{product.price}
                      </span>
                      <span className="badge bg-red-500 text-white">
                        Save {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.stock > 0 ? (
                  <span className="badge badge-success">In Stock ({product.stock} available)</span>
                ) : (
                  <span className="badge badge-danger">Out of Stock</span>
                )}
              </div>

              {/* Size Selection */}
              {product.sizes?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Select Size:</h3>
                  <div className="flex gap-2">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium ${
                          selectedSize === size
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {product.colors?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Select Color:</h3>
                  <div className="flex gap-2">
                    {product.colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium capitalize ${
                          selectedColor === color
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Quantity:</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
                <button className="btn btn-outline p-3">
                  <Heart size={20} />
                </button>
              </div>

              {/* Description */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-3">Product Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Characters */}
              {product.characters?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Featured Characters:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.characters.map((char, index) => (
                      <span key={index} className="badge bg-purple-100 text-purple-800">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;