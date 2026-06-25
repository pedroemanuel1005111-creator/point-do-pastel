import { useState, useCallback, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import Particles from './components/Particles';
import Header from './components/Header';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import Reviews from './components/Reviews';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import MyOrders from './components/MyOrders';
import { importOrderFromURL } from './services/orderShare';
import { startListening, stopListening } from './services/cloudSync';

function AppContent() {
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [importedOrderId, setImportedOrderId] = useState<string | null>(null);

  // On page load:
  // 1. Check if URL contains an order to import
  // 2. Start cloud listener so ALL instances receive orders
  useEffect(() => {
    const order = importOrderFromURL();
    if (order) {
      setImportedOrderId(order.id);
      setAdminOpen(true);
    }

    // Start listening for orders from other devices
    startListening();
    return () => stopListening();
  }, []);

  const handleNavigate = useCallback((section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-dark relative">
      <Particles />
      <Header
        onCartClick={() => setCartOpen(true)}
        onNavigate={handleNavigate}
        onMyOrdersClick={() => setMyOrdersOpen(true)}
      />
      <Hero onNavigate={handleNavigate} />
      <MenuSection onCartClick={() => setCartOpen(true)} />
      <Reviews />
      <Contact />
      <Footer onAdminClick={() => setAdminOpen(true)} />
      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
      <MyOrders isOpen={myOrdersOpen} onClose={() => setMyOrdersOpen(false)} />

      {/* Imported order banner */}
      {importedOrderId && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] animate-fade-in-up">
          <div className="bg-success text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium">
            <span className="text-lg">✅</span>
            Pedido #{importedOrderId} importado!
            <button
              onClick={() => setImportedOrderId(null)}
              className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg text-xs transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
