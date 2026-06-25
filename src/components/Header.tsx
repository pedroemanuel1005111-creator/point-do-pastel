import { useState, useEffect } from 'react';
import { ShoppingCart, Phone, Menu, X, MapPin, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useConfig } from '../hooks/useStore';
import { getCustomerPhone, getActiveOrderId } from '../services/customer';
import Logo from './Logo';

interface HeaderProps {
  onCartClick: () => void;
  onNavigate: (section: string) => void;
  onMyOrdersClick: () => void;
}

export default function Header({ onCartClick, onNavigate, onMyOrdersClick }: HeaderProps) {
  const { totalItems, totalPrice } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasCustomerPhone, setHasCustomerPhone] = useState(false);
  const config = useConfig();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if customer has placed an order
  useEffect(() => {
    const check = () => setHasCustomerPhone(!!getCustomerPhone() || !!getActiveOrderId());
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Início', section: 'hero' },
    { label: 'Cardápio', section: 'menu' },
    { label: 'Avaliações', section: 'reviews' },
    { label: 'Contato', section: 'contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass-light shadow-xl shadow-black/5 py-2'
          : 'bg-transparent py-3 sm:py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => onNavigate('hero')} className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-500 group-hover:animate-wave">
              <Logo size="sm" rounded="xl" className={scrolled ? '' : 'drop-shadow-lg'} />
            </div>
            <div>
              <h1 className={`font-fredoka text-lg sm:text-xl leading-tight transition-all duration-300 ${
                scrolled ? 'text-primary' : 'text-white drop-shadow-md'
              }`}>
                {config.storeName}
              </h1>
              <p className={`text-[10px] sm:text-xs leading-tight transition-all duration-300 ${
                scrolled ? 'text-gray-500' : 'text-white/70'
              }`}>
                {config.slogan} 🔥
              </p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.section}
                onClick={() => onNavigate(item.section)}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 group ${
                  scrolled ? 'text-gray-600 hover:text-primary hover:bg-primary/5' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-6" />
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`tel:+${config.whatsapp}`}
              className={`hidden lg:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all duration-300 ${
                scrolled ? 'text-gray-500 hover:text-primary hover:bg-primary/5' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Phone size={13} />
              {config.phone}
            </a>

            {/* My Orders button */}
            {hasCustomerPhone && (
              <button
                onClick={onMyOrdersClick}
                className={`relative p-2.5 rounded-full transition-all hover:scale-110 group ${
                  scrolled ? 'bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-md'
                }`}
                title="Meus Pedidos"
              >
                <Package size={18} className="group-hover:animate-wave" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              </button>
            )}

            <button
              onClick={onCartClick}
              className="relative btn-magnetic bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline text-sm font-medium">
                {totalItems > 0 ? `R$ ${totalPrice.toFixed(2).replace('.', ',')}` : 'Pedido'}
              </span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-dark text-[10px] font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center animate-pulse-badge shadow-lg">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-all duration-300 ${
                scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 glass-light rounded-2xl shadow-2xl p-3 animate-fade-in-up">
            {navItems.map((item, i) => (
              <button
                key={item.section}
                onClick={() => { onNavigate(item.section); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all font-medium"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {item.label}
              </button>
            ))}
            {hasCustomerPhone && (
              <button
                onClick={() => { onMyOrdersClick(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-primary hover:bg-primary/5 rounded-xl font-medium transition-all border-t border-gray-100 mt-1"
              >
                <Package size={16} /> Meus Pedidos
              </button>
            )}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 mt-1">
              <a href={`tel:+${config.whatsapp}`} className="flex items-center gap-1.5 text-primary font-medium text-sm">
                <Phone size={14} /> {config.phone}
              </a>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1 text-gray-400 text-sm">
                <MapPin size={13} /> Rio Largo, AL
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
