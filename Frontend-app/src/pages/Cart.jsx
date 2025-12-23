import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';
import Loading from '../components/common/Loading';

const Cart = () => {
  const { cart, loading, fetchCart, updateCartItem, removeFromCart, clearCart, getCartDetails } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Pulling synchronized data from the store
  const { subtotal, shipping, tax, total, amountToFreeShipping } = getCartDetails();

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Clear all items from cart?')) {
      await clearCart();
    }
  };

  if (loading) return <Loading fullScreen />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some awesome anime merchandise!</p>
          <Link to="/products" className="btn btn-primary">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Shopping Cart</h1>
          <button onClick={handleClearCart} className="text-red-600 hover:underline">Clear Cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div key={item._id} className="card p-4 bg-white rounded-xl shadow-sm border">
                <div className="flex gap-4">
                  <Link to={`/products/${item.product?._id}`} className="w-24 h-24 flex-shrink-0">
                    <img
                      src={item.image || 'https://via.placeholder.com/200'}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <Link to={`/products/${item.product?._id}`} className="font-semibold text-lg hover:text-primary-600">
                          {item.name}
                        </Link>
                        <div className="text-sm text-gray-600">
                          {item.size && <span className="mr-3">Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemove(item._id)} className="text-red-600"><Trash2 size={20} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleQuantityChange(item._id, item.quantity - 1)} className="p-1 border rounded"><Minus size={16} /></button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <button onClick={() => handleQuantityChange(item._id, item.quantity + 1)} className="p-1 border rounded"><Plus size={16} /></button>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">₹{(item.price * item.quantity).toFixed(2)}</div>
                        <div className="text-sm text-gray-500">₹{item.price} each</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="card bg-white p-6 rounded-xl shadow-sm border sticky top-20">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-green-600">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (GST 18%)</span>
                  <span className="font-semibold">₹{tax.toFixed(2)}</span>
                </div>
              </div>

              {shipping > 0 && (
                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                  Add ₹{amountToFreeShipping.toFixed(2)} more for FREE shipping!
                </div>
              )}

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary-600">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={() => navigate('/checkout')} className="w-full btn btn-primary py-3 mb-3 bg-black text-white rounded-lg">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;