import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    category: 'clothing',
    animeSeries: '',
    images: '',
    sizes: '',
    colors: '',
    stock: '',
    isFeatured: false
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAllProducts({ limit: 100 });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const productData = {
      ...formData,
      price: Number(formData.price),
      discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
      stock: Number(formData.stock),
      images: formData.images.split(',').map(img => img.trim()),
      sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()) : [],
      colors: formData.colors ? formData.colors.split(',').map(c => c.trim()) : []
    };

    try {
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct._id, productData);
        toast.success('Product updated successfully');
      } else {
        await productAPI.createProduct(productData);
        toast.success('Product created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice || '',
      category: product.category,
      animeSeries: product.animeSeries,
      images: product.images.join(', '),
      sizes: product.sizes?.join(', ') || '',
      colors: product.colors?.join(', ') || '',
      stock: product.stock,
      isFeatured: product.isFeatured
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await productAPI.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      discountPrice: '',
      category: 'clothing',
      animeSeries: '',
      images: '',
      sizes: '',
      colors: '',
      stock: '',
      isFeatured: false
    });
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container-custom py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-display font-bold">Product Management</h1>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Products Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.animeSeries}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 capitalize">{product.category}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">₹{product.price}</div>
                    {product.discountPrice && (
                      <div className="text-sm text-gray-600 line-through">
                        ₹{product.discountPrice}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${
                      product.stock === 0 ? 'badge-danger' :
                      product.stock < 10 ? 'badge-warning' : 'badge-success'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-700 mr-3"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input h-24"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Price *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount Price</label>
                    <input
                      type="number"
                      name="discountPrice"
                      value={formData.discountPrice}
                      onChange={handleInputChange}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input"
                      required
                    >
                      <option value="clothing">Clothing</option>
                      <option value="figures">Figures</option>
                      <option value="posters">Posters</option>
                      <option value="accessories">Accessories</option>
                      <option value="manga">Manga</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Stock *</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Anime Series *</label>
                  <input
                    type="text"
                    name="animeSeries"
                    value={formData.animeSeries}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="e.g., Naruto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Images (comma separated URLs) *</label>
                  <input
                    type="text"
                    name="images"
                    value={formData.images}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="https://image1.jpg, https://image2.jpg"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sizes (comma separated)</label>
                    <input
                      type="text"
                      name="sizes"
                      value={formData.sizes}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="S, M, L, XL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Colors (comma separated)</label>
                    <input
                      type="text"
                      name="colors"
                      value={formData.colors}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Black, White, Red"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Featured Product</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;