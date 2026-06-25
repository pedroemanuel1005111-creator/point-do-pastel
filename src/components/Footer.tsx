import { Heart, Settings } from 'lucide-react';
import { useConfig } from '../hooks/useStore';
import Logo from './Logo';

interface FooterProps {
  onAdminClick: () => void;
}

export default function Footer({ onAdminClick }: FooterProps) {
  const config = useConfig();

  return (
    <footer className="relative bg-[#060610] border-t border-white/5 py-8 sm:py-10 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 group">
            <div className="group-hover:animate-wave">
              <Logo size="sm" rounded="xl" />
            </div>
            <div>
              <h3 className="font-fredoka text-white text-lg">{config.storeName}</h3>
              <p className="text-gray-600 text-xs">Pastelaria Brasileira · Rio Largo, AL</p>
            </div>
          </div>

          {/* Center */}
          <p className="text-gray-600 text-sm flex items-center gap-1.5">
            Feito com <Heart size={13} className="text-danger fill-danger animate-pulse" /> em Rio Largo
          </p>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-right">
              <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Point do Pastel</p>
              <p className="text-gray-700 text-[10px] mt-0.5">Todos os direitos reservados</p>
            </div>
            {/* Admin access button */}
            <button
              onClick={onAdminClick}
              className="p-2.5 rounded-xl glass text-gray-500 hover:text-primary hover:bg-primary/10 transition-all group"
              title="Área do Restaurante"
            >
              <Settings size={16} className="group-hover:animate-spin" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
