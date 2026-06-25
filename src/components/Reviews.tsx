import { Star, Quote } from 'lucide-react';
import { reviews } from '../data/menu';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

export default function Reviews() {
  const { ref, isVisible } = useScrollAnimation(0.1);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={13} className={i < rating ? 'text-secondary fill-secondary' : 'text-gray-600'} />
    ));

  return (
    <section id="reviews" className="relative py-16 sm:py-24 bg-gradient-to-b from-dark via-[#0D0D1E] to-dark overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[150px] animate-morph" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[130px] animate-morph" style={{ animationDelay: '-4s' }} />

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-4">
            <Star size={14} className="text-secondary fill-secondary" />
            <span className="text-secondary text-xs sm:text-sm font-semibold uppercase tracking-wider">Avaliações</span>
          </div>
          <h2 className="font-fredoka text-3xl sm:text-4xl md:text-6xl text-white mb-4">
            O que dizem nossos clientes
          </h2>

          {/* Rating summary */}
          <div className="inline-flex items-center gap-4 glass px-6 py-3 rounded-2xl">
            <div className="text-center">
              <span className="text-3xl sm:text-4xl font-bold text-white">4,1</span>
              <div className="flex gap-0.5 mt-1 justify-center">
                {renderStars(4)}
              </div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-left">
              <span className="text-white/80 text-sm">8 avaliações</span>
              <p className="text-white/40 text-xs">Google Maps</p>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {reviews.map((review, index) => (
            <div
              key={index}
              className={`card-3d glass rounded-3xl p-5 sm:p-6 relative group transition-all duration-700 ${
                isVisible ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <Quote size={40} className="absolute top-4 right-4 text-white/5 group-hover:text-primary/10 transition-colors duration-500" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">{review.name}</h4>
                  <div className="flex items-center gap-2">
                    {review.badge && (
                      <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-medium">
                        {review.badge}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">{review.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-0.5 mb-3">
                {renderStars(review.rating)}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed italic">"{review.text}"</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center mt-10 transition-all duration-700 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
          <a
            href="https://www.google.com/maps/place/Point+do+Pastel/@-9.5110155,-35.8165484,16z/data=!4m10!1m2!2m1!1sPoint+do+Pastel!3m6!1s0x70137fe2d5b7e6d:0xac93c07894e10996!8m2!3d-9.5110155!4d-35.8115623!15sCg9Qb2ludCBkbyBQYXN0ZWxaESIPcG9pbnQgZG8gcGFzdGVskgEUYnJhemlsaWFuX3Bhc3RlbGFyaWGaASNDaFpEU1VoTk1HOW5TMFZRVTJwNE5WZFlhRWxNTkVwUkVBReABAPoBBAgeEBA!16s%2Fg%2F11sl8t6z07?entry=ttu&g_ep=EgoyMDI2MDYyMi4wIKXMDSoASAFQAw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 glass px-6 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            Ver todas no Google Maps
            <span className="text-lg">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
