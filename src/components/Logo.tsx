import { useConfig } from '../hooks/useStore';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  rounded?: 'full' | 'xl' | '2xl' | '3xl';
  shadow?: boolean;
}

const sizeMap = {
  xs: { container: 'w-7 h-7', emoji: 'text-lg', img: 'w-7 h-7' },
  sm: { container: 'w-9 h-9', emoji: 'text-xl', img: 'w-9 h-9' },
  md: { container: 'w-10 h-10', emoji: 'text-2xl', img: 'w-10 h-10' },
  lg: { container: 'w-14 h-14', emoji: 'text-3xl', img: 'w-14 h-14' },
  xl: { container: 'w-20 h-20', emoji: 'text-5xl', img: 'w-20 h-20' },
  hero: { container: '', emoji: 'text-7xl sm:text-8xl md:text-9xl', img: 'w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40' },
};

const roundedMap = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

export default function Logo({ size = 'md', className = '', rounded = '2xl', shadow = false }: LogoProps) {
  const config = useConfig();
  const s = sizeMap[size];
  const r = roundedMap[rounded];
  const sh = shadow ? 'shadow-xl shadow-primary/20' : '';
  const hasImage = !!config.logoImage;

  if (hasImage) {
    return (
      <img
        src={config.logoImage}
        alt={config.storeName}
        className={`${s.img} ${r} object-cover ${sh} ${className}`}
      />
    );
  }

  // Emoji mode — hero size is a floating emoji without a container box
  if (size === 'hero') {
    return (
      <span className={`${s.emoji} block drop-shadow-2xl ${className}`}>
        {config.logoEmoji}
      </span>
    );
  }

  return (
    <div className={`${s.container} bg-gradient-to-br from-primary to-secondary ${r} flex items-center justify-center ${sh} ${className}`}>
      <span className={s.emoji}>{config.logoEmoji}</span>
    </div>
  );
}
