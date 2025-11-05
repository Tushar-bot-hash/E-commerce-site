import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { productAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import Loading from '../components/common/Loading';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    animeSeries: searchParams.get('animeSeries') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    page: searchParams.get('page') || '1'
  });

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(searchParams);
      const response = await productAPI.getAllProducts(params);
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: '1' };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k]) params.set(k, newFilters[k]);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      animeSeries: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      page: '1'
    });
    setSearchParams({});
  };

  const categories = ['clothing', 'figures', 'posters', 'accessories', 'manga', 'other'];
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' }
  ];

  const popularSeries = ['Naruto', 'One Piece', 'Attack on Titan', 'Demon Slayer', 'My Hero Academia', 'Jujutsu Kaisen'];

  return (
    <div className="bg-grid-pattern min-h-screen py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-4">All Products</h1>
          
          {/* Search & Sort Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search products..."
                className="input pl-10 w-full"
              />
            </div>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="input md:w-48"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline md:hidden"
            >
              <Filter size={20} className="mr-2" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className={`md:w-64 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="card sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Filters</h3>
                <button onClick={clearFilters} className="text-primary-600 text-sm hover:underline">
                  Clear All
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={cat}
                        checked={filters.category === cat}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="mr-2"
                      />
                      <span className="capitalize">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Anime Series Filter */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Anime Series</h4>
                <div className="space-y-2">
                  {popularSeries.map(series => (
                    <label key={series} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="animeSeries"
                        value={series}
                        checked={filters.animeSeries === series}
                        onChange={(e) => handleFilterChange('animeSeries', e.target.value)}
                        className="mr-2"
                      />
                      <span>{series}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="font-medium mb-3">Price Range</h4>
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="input w-full"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <Loading />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handleFilterChange('page', String(i + 1))}
                        className={`px-4 py-2 rounded-lg ${
                          filters.page === String(i + 1)
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No products found</p>
                <button onClick={clearFilters} className="mt-4 btn btn-primary">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;