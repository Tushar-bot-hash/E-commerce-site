import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    addToCart({
      productId: product._id,
      quantity: 1,
      size: product.sizes?.[0] || null,
      color: product.colors?.[0] || null
    });
  };

  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <Link to={`/products/${product._id}`} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer block">
      {/* Image */}
      <div className="relative overflow-hidden h-64 bg-gray-100">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="w-full h-64 object-cover hover:scale-110 transition-transform duration-500"
        />
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
            SALE
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category & Series */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="uppercase">{product.category}</span>
          <span>{product.animeSeries}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 h-12">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 ml-2">
            ({product.numReviews})
          </span>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900">
              ₹{displayPrice}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through ml-2">
                ₹{product.price}
              </span>
            )}
          </div>
          
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="btn btn-primary p-2 disabled:opacity-50"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;