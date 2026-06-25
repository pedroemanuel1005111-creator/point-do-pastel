import { ChevronDown, Star, MapPin, Zap } from 'lucide-react';
import { useParallax, useMouse3D } from '../hooks/useScrollAnimation';
import { useConfig } from '../hooks/useStore';
import Logo from './Logo';

interface HeroProps {
  onNavigate: (section: string) => void;
}

const floatingEmojis = ['🥟', '🔥', '⭐', '🧀', '🍖', '🌶️', '💛', '✨'];

export default function Hero({ onNavigate }: HeroProps) {
  const parallaxOffset = useParallax();
  const { ref: mouse3dRef, transform } = useMouse3D();
  const config = useConfig();

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax */}
      <div 
        className="absolute inset-0 scale-110"
        style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
      >
        <img
          src={config.heroImage || '/images/hero-bg.jpg'}
          alt="Pastéis"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark/70 via-dark/40 to-dark/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-morph" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] animate-morph" style={{ animationDelay: '-4s' }} />

      {/* Floating Emojis */}
      {floatingEmojis.map((emoji, i) => (
        <div
          key={i}
          className="absolute text-2xl sm:text-3xl opacity-30 animate-float pointer-events-none select-none"
          style={{
            left: `${10 + i * 12}%`,
            top: `${15 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${5 + i * 0.5}s`,
          }}
        >
          {emoji}
        </div>
      ))}

      {/* Content with 3D mouse tracking */}
      <div
        ref={mouse3dRef}
        className="relative z-10 text-center px-4 max-w-5xl mx-auto preserve-3d"
        style={{
          transform: `perspective(1200px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div className="animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-white/80 text-xs sm:text-sm font-medium">Aberto agora · Pedidos online</span>
          </div>

          {/* Logo 3D */}
          <div className="perspective-1000 mb-4">
            <div
              className="animate-float-slow"
              style={{ transform: `translateZ(60px)` }}
            >
              <Logo size="hero" rounded="3xl" shadow className="mx-auto" />
            </div>
          </div>

          {/* Title with glow */}
          <h1 className="font-fredoka text-5xl sm:text-6xl md:text-8xl text-white mb-2 text-glow tracking-tight">
            {config.storeName}
          </h1>
          
          <p className="text-white/70 text-lg sm:text-xl md:text-2xl font-light mb-8 max-w-lg mx-auto">
            {config.slogan} — 
            agora com pedidos <span className="text-primary-light font-medium">100% online!</span>
          </p>

          {/* Rating & Info */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
            <div className="glass flex items-center gap-2 px-4 py-2.5 rounded-full transition-transform hover:scale-105">
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => (
                  <Star key={i} size={14} className="text-secondary fill-secondary" />
                ))}
                <Star size={14} className="text-secondary/50 fill-secondary/30" />
              </div>
              <span className="text-white font-bold text-sm">4,1</span>
              <span className="text-white/50 text-xs">(8)</span>
            </div>
            <div className="glass flex items-center gap-1.5 px-4 py-2.5 rounded-full transition-transform hover:scale-105">
              <MapPin size={14} className="text-primary-light" />
              <span className="text-white/80 text-sm">Rio Largo, AL</span>
            </div>
            <div className="glass flex items-center gap-1.5 px-4 py-2.5 rounded-full transition-transform hover:scale-105">
              <Zap size={14} className="text-secondary" />
              <span className="text-white/80 text-sm">R$ 3 – R$ 35</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
            <button
              onClick={() => onNavigate('menu')}
              className="w-full sm:w-auto btn-magnetic bg-gradient-to-r from-primary via-primary-dark to-primary text-white font-bold px-10 py-4 rounded-full text-lg transition-all duration-500 hover:scale-105 shadow-2xl shadow-primary/40 hover:shadow-primary/60 animate-gradient"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                📋 Fazer Pedido Online
              </span>
            </button>
            <a
              href={`tel:+${config.whatsapp}`}
              className="w-full sm:w-auto glass hover:bg-white/15 text-white font-semibold px-10 py-4 rounded-full text-lg transition-all duration-300 text-center"
            >
              📞 Ligar Agora
            </a>
          </div>

          {/* Service Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['✅ Refeição no local', '🛵 Delivery', '📱 100% Online', '💳 PIX / Cartão'].map((tag, i) => (
              <span
                key={i}
                className="glass text-white/70 text-xs px-3 py-1.5 rounded-full transition-all hover:text-white hover:bg-white/10"
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => onNavigate('menu')}
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/80 transition-colors animate-bounce z-10"
      >
        <ChevronDown size={28} />
      </button>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark to-transparent" />
    </section>
  );
}
