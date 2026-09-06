import React from 'react';

export type SocialPlatform = 'snapchat' | 'tiktok' | 'instagram' | 'twitter' | 'x' | 'whatsapp' | 'facebook' | 'youtube';

interface SocialIconProps {
  platform: SocialPlatform;
  className?: string;
  size?: number; // size in pixels for the icon inside
}

export const SOCIAL_PLATFORM_META: Record<string, {
  name: string;
  nameAr: string;
  bgColor: string;
  hoverBg: string;
  hoverBorder: string;
  hoverShadow: string;
  svgUrl: string;
}> = {
  snapchat: {
    name: 'Snapchat',
    nameAr: 'سناب شات',
    bgColor: 'bg-[#FFFC00]',
    hoverBg: 'hover:bg-[#FFF800]',
    hoverBorder: 'hover:border-[#FFFC00]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,252,0,0.4)]',
    svgUrl: '/social/snapchat.svg',
  },
  tiktok: {
    name: 'TikTok',
    nameAr: 'تيك توك',
    bgColor: 'bg-[#010101]',
    hoverBg: 'hover:bg-black',
    hoverBorder: 'hover:border-cyan-400/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(37,244,238,0.35)]',
    svgUrl: '/social/tiktok.svg',
  },
  instagram: {
    name: 'Instagram',
    nameAr: 'إنستغرام',
    bgColor: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
    hoverBg: 'hover:opacity-95',
    hoverBorder: 'hover:border-pink-500/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(220,39,67,0.4)]',
    svgUrl: '/social/instagram.svg',
  },
  twitter: {
    name: 'X (Twitter)',
    nameAr: 'إكس (تويتر)',
    bgColor: 'bg-[#000000]',
    hoverBg: 'hover:bg-neutral-900',
    hoverBorder: 'hover:border-white/40',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]',
    svgUrl: '/social/twitter.svg',
  },
  x: {
    name: 'X',
    nameAr: 'منصة إكس',
    bgColor: 'bg-[#000000]',
    hoverBg: 'hover:bg-neutral-900',
    hoverBorder: 'hover:border-white/40',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]',
    svgUrl: '/social/twitter.svg',
  },
  whatsapp: {
    name: 'WhatsApp',
    nameAr: 'واتساب',
    bgColor: 'bg-[#25D366]',
    hoverBg: 'hover:bg-[#20bd5a]',
    hoverBorder: 'hover:border-[#25D366]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(37,211,102,0.4)]',
    svgUrl: '/social/whatsapp.svg',
  },
  facebook: {
    name: 'Facebook',
    nameAr: 'فيسبوك',
    bgColor: 'bg-[#1877F2]',
    hoverBg: 'hover:bg-[#166fe5]',
    hoverBorder: 'hover:border-[#1877F2]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(24,119,242,0.4)]',
    svgUrl: '/social/facebook.svg',
  },
  youtube: {
    name: 'YouTube',
    nameAr: 'يوتيوب',
    bgColor: 'bg-[#FF0000]',
    hoverBg: 'hover:bg-[#e60000]',
    hoverBorder: 'hover:border-[#FF0000]/60',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]',
    svgUrl: '/social/youtube.svg',
  },
};

export const SocialIcon: React.FC<SocialIconProps> = ({
  platform,
  className = 'w-full h-full',
}) => {
  const normPlatform = (platform === 'x' ? 'twitter' : platform).toLowerCase();
  const meta = SOCIAL_PLATFORM_META[normPlatform] || SOCIAL_PLATFORM_META.instagram;

  return (
    <img
      src={meta.svgUrl}
      alt={meta.name}
      className={`object-contain select-none pointer-events-none rounded-[22%] ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
};

export default SocialIcon;
