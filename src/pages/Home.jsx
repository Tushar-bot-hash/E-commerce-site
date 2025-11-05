import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Truck, Shield, HeadphonesIcon } from 'lucide-react';
import { productAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import Loading from '../components/common/Loading';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await productAPI.getFeatured();
      setFeaturedProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Clothing', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', link: '/products?category=clothing' },
    { name: 'Figures', image: 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=400', link: '/products?category=figures' },
    { name: 'Posters', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400', link: '/products?category=posters' },
    { name: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', link: '/products?category=accessories' },
  ];

  const features = [
    { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₹1000' },
    { icon: Shield, title: 'Secure Payment', desc: '100% secure transactions' },
    { icon: HeadphonesIcon, title: '24/7 Support', desc: 'Dedicated customer support' },
    { icon: TrendingUp, title: 'Best Quality', desc: 'Authentic merchandise' },
  ];

  return (
    <div className="bg-dots-pattern">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-purple-600 text-white overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920')",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-purple-600/90"></div>
        
        <div className="container-custom py-20 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 animate-fade-in">
              Your Favorite Anime Merchandise
            </h1>
            <p className="text-xl mb-8 text-gray-100 animate-slide-up">
              Discover authentic collectibles, clothing, and accessories from your favorite anime series.
            </p>
            <Link to="/products" className="inline-flex items-center btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
              Shop Now
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <feature.icon className="mx-auto mb-4 text-primary-600" size={40} />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={category.link}
                className="relative group overflow-hidden rounded-xl h-48 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                  <h3 className="text-white text-2xl font-bold">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-display font-bold">Featured Products</h2>
            <Link to="/products" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              View All
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-display font-bold mb-4">
            Join Our Anime Community
          </h2>
          <p className="text-xl mb-8 text-gray-100">
            Get exclusive deals, new arrivals, and anime news delivered to your inbox!
          </p>
          <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;