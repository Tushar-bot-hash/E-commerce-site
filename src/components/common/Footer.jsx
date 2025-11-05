import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display font-bold text-white mb-4">
              AnimeStore
            </h3>
            <p className="text-sm mb-4">
              Your one-stop shop for authentic anime merchandise, collectibles, and clothing.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary-400 transition">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-primary-400 transition">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-primary-400 transition">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-primary-400 transition">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-primary-400 transition">Shop All</Link></li>
              <li><Link to="/products?category=clothing" className="hover:text-primary-400 transition">Clothing</Link></li>
              <li><Link to="/products?category=figures" className="hover:text-primary-400 transition">Figures</Link></li>
              <li><Link to="/products?category=posters" className="hover:text-primary-400 transition">Posters</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-400 transition">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">Shipping Info</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">Returns</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">FAQ</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Newsletter</h4>
            <p className="text-sm mb-4">Subscribe to get special offers and updates!</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="px-4 py-2 rounded-l-lg flex-1 text-gray-900 focus:outline-none"
              />
              <button className="bg-primary-600 px-4 py-2 rounded-r-lg hover:bg-primary-700 transition">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} AnimeStore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;