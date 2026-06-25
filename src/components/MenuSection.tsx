import { useState, useRef } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Check, Flame } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../types';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useProducts, useCategories } from '../hooks/useStore';

interface MenuSectionProps {
  onCartClick: () => void;
}

function MenuCard({ item, onAdd, isAdded }: { item: MenuItem; onAdd: (item: MenuItem) => void; isAdded: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`glass-card rounded-3xl overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
        isAdded ? 'ring-2 ring-success' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onAdd(item)}
    >
      {/* Image */}
      <div className="relative h-48 sm:h-52 overflow-hidden">
        <img
          src={item.image || '/images/pastel-carne.jpg'}
          alt={item.name}
          className={`w-full h-full object-cover transition-all duration-700 ${
            hovered ? 'scale-110 brightness-110' : 'scale-100'
          }`}
          onError={(e) => (e.target as HTMLImageElement).src = '/images/pastel-carne.jpg'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Popular badge */}
        {item.popular && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-gradient-to-r from-secondary to-amber-400 text-dark text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg glow-secondary animate-fade-in-down">
            <Flame size={12} className="fill-current" />
            Popular
          </div>
        )}

        {/* Price */}
        <div className="absolute bottom-3 right-3">
          <span className={`glass-light font-bold text-lg px-4 py-1.5 rounded-2xl shadow-lg transition-all duration-300 ${
            hovered ? 'text-primary scale-110' : 'text-gray-800'
          }`}>
            R$ {item.price.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Hover overlay with + */}
        <div className={`absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            hovered ? 'scale-100 rotate-0' : 'scale-50 rotate-90'
          }`}>
            {isAdded ? (
              <Check size={24} className="text-success" />
            ) : (
              <Plus size={24} className="text-primary" />
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5">
        <h3 className="font-semibold text-gray-800 text-base sm:text-lg leading-tight group-hover:text-primary transition-colors duration-300">
          {item.name}
        </h3>
        <p className="text-gray-400 text-xs sm:text-sm mt-1.5 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Add button */}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(item); }}
          className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
            isAdded
              ? 'bg-success text-white shadow-lg shadow-success/30'
              : 'bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/30'
          }`}
        >
          {isAdded ? (
            <><Check size={16} /> Adicionado!</>
          ) : (
            <><Plus size={16} /> Adicionar</>
          )}
        </button>
      </div>
    </div>
  );
}

export default function MenuSection({ onCartClick }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const menuItems = useProducts();
  const categories = useCategories();
  const { addItem, totalItems, totalPrice } = useCart();
  const categoryRef = useRef<HTMLDivElement>(null);
  const { ref: sectionRef, isVisible } = useScrollAnimation(0.05);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'todos' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (item: MenuItem) => {
    addItem(item);
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 800);
  };

  const scrollCategories = (dir: 'left' | 'right') => {
    categoryRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <section id="menu" className="relative py-16 sm:py-24 bg-gradient-to-b from-dark via-[#111122] to-dark noise overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[130px]" />

      <div ref={sectionRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-4">
            <Flame size={14} className="text-primary" />
            <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider">Cardápio</span>
          </div>
          <h2 className="font-fredoka text-3xl sm:text-4xl md:text-6xl text-white mb-3">
            Escolha seu Pastel <span className="inline-block animate-wave">🥟</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
            Faça seu pedido 100% online — sem ligação, sem fila. Monte, pague e receba!
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 glass-card rounded-2xl outline-none text-sm transition-all duration-300 focus:ring-2 focus:ring-primary/30 focus:shadow-lg focus:shadow-primary/10 placeholder:text-gray-400 text-gray-700"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="relative mb-10 sm:mb-12">
          <button
            onClick={() => scrollCategories('left')}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 glass-light shadow-lg rounded-full p-2 text-gray-500 hover:text-primary transition-all hover:scale-110"
          >
            <ChevronLeft size={18} />
          </button>
          <div ref={categoryRef} className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-0 sm:px-12 py-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all duration-300 shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-xl shadow-primary/30 scale-105 glow-primary'
                    : 'glass text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollCategories('right')}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 glass-light shadow-lg rounded-full p-2 text-gray-500 hover:text-primary transition-all hover:scale-110"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`transition-all duration-500 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${0.1 + index * 0.06}s` }}
            >
              <MenuCard
                item={item}
                onAdd={handleAddItem}
                isAdded={addedItemId === item.id}
              />
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 animate-fade-in-up">
            <span className="text-6xl block mb-4 animate-float">🔍</span>
            <p className="text-gray-400 text-lg font-medium">Nenhum item encontrado</p>
            <p className="text-gray-500 text-sm mt-1">Tente buscar por outro termo</p>
          </div>
        )}

        {/* Floating Cart (Mobile) */}
        {totalItems > 0 && (
          <div className="fixed bottom-6 left-4 right-4 z-40 sm:hidden animate-slide-up">
            <button
              onClick={onCartClick}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl font-bold text-base shadow-2xl shadow-primary/40 flex items-center justify-between px-6 transition-all btn-magnetic glow-primary"
            >
              <span className="flex items-center gap-2">
                🛒 Ver Pedido
              </span>
              <div className="flex items-center gap-3">
                <span className="text-white/70 text-sm">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full font-bold">
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
