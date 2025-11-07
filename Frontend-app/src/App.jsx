import { Outlet } from 'react-router-dom'; // 👈 Renders the content of the current route
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Removed: BrowserRouter, Routes, Route, and all page/route protection imports.

function App() {
  return (
    // Note: The <Router> wrapper is no longer needed here.
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        
        <Outlet /> 
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;