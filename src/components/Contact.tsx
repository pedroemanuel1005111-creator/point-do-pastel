import { MapPin, Phone, Navigation, Clock, MessageCircle } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useConfig } from '../hooks/useStore';

export default function Contact() {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const config = useConfig();

  const infoCards = [
    {
      icon: <MapPin size={22} className="text-primary" />,
      iconBg: 'bg-primary/20',
      title: 'Endereço',
      content: (
        <>
          <p className="text-gray-400 text-sm">{config.address}</p>
          <a
            href={config.addressLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary text-sm mt-2 hover:text-primary-light transition-colors"
          >
            <Navigation size={13} /> Abrir no Google Maps
          </a>
        </>
      ),
    },
    {
      icon: <Phone size={22} className="text-success" />,
      iconBg: 'bg-success/20',
      title: 'Telefone / WhatsApp',
      content: (
        <>
          <p className="text-gray-400 text-sm mb-2">{config.phone}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:+${config.whatsapp}`}
              className="inline-flex items-center gap-1.5 glass text-primary text-sm px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all">
              <Phone size={13} /> Ligar
            </a>
            <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 glass text-green-400 text-sm px-3 py-1.5 rounded-full hover:bg-success/10 transition-all">
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>
        </>
      ),
    },
    {
      icon: <Clock size={22} className="text-secondary" />,
      iconBg: 'bg-secondary/20',
      title: 'Entrega',
      content: (
        <>
          <p className="text-gray-400 text-sm">Taxa: R$ {config.deliveryFee.toFixed(2).replace('.', ',')}</p>
          <p className="text-gray-500 text-xs mt-1">~{config.deliveryTime}min delivery · ~{config.pickupTime}min retirada</p>
        </>
      ),
    },
  ];

  return (
    <section id="contact" className="relative py-16 sm:py-24 bg-gradient-to-b from-dark to-[#080812] overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px]" />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-4">
            <MapPin size={14} className="text-primary" />
            <span className="text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider">Localização</span>
          </div>
          <h2 className="font-fredoka text-3xl sm:text-4xl md:text-6xl text-white mb-3">
            Visite-nos! <span className="inline-block animate-wave">📍</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm sm:text-base">
            Venha conhecer o {config.storeName} ou faça seu pedido 100% online!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          {/* Info Cards */}
          <div className="space-y-4 sm:space-y-5">
            {infoCards.map((card, i) => (
              <div
                key={i}
                className={`card-3d glass rounded-2xl p-5 sm:p-6 transition-all duration-700 ${
                  isVisible ? 'animate-fade-in-left' : 'opacity-0'
                }`}
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base sm:text-lg mb-1">{card.title}</h3>
                    {card.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Service Tags */}
            <div className={`flex flex-wrap gap-2 transition-all duration-700 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
              {['🍽️ Refeição no local', '📦 Para viagem', '🛵 Delivery', '📱 Pedido Online'].map((tag, i) => (
                <span key={i} className="glass text-white/60 text-xs px-4 py-2.5 rounded-full hover:text-white hover:bg-white/10 transition-all cursor-default">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Map */}
          <div
            className={`card-3d rounded-3xl overflow-hidden h-[300px] sm:h-[400px] lg:h-full min-h-[300px] glass transition-all duration-700 ${
              isVisible ? 'animate-fade-in-right' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.3s' }}
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3934.5!2d-35.8165484!3d-9.5110155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x70137fe2d5b7e6d%3A0xac93c07894e10996!2sPoint%20do%20Pastel!5e0!3m2!1spt-BR!2sbr!4v1700000000000"
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'brightness(0.85) contrast(1.1) saturate(0.8)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
