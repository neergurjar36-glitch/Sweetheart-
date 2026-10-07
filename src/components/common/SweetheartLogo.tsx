import React, { useState, useEffect } from 'react';
import { Heart, Camera } from 'lucide-react';

/**
 * SWEETHEART LOGO
 * Configured with the user's exact uploaded logo image and "Designed for you with love" tagline.
 */
export const DEFAULT_SWEETHEART_LOGO_SRC = '/sweetheart-logo.jpg';

/**
 * Helper to update the logo across the entire application in real-time
 */
export function updateSweetheartLogo(newDataUrl: string) {
  try {
    localStorage.setItem('sweetheart_custom_logo', newDataUrl);
    window.dispatchEvent(new CustomEvent('sweetheart_logo_updated', { detail: newDataUrl }));
  } catch (e) {
    console.warn('Error saving custom logo:', e);
  }
}

export function getSweetheartLogo(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('sweetheart_custom_logo');
    if (custom) return custom;
  }
  return DEFAULT_SWEETHEART_LOGO_SRC;
}

interface LogoProps {
  variant?: 'splash' | 'welcome' | 'header' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  allowUpload?: boolean;
}

export const SweetheartLogo: React.FC<LogoProps> = ({
  variant = 'header',
  size = 'md',
  showText = true,
  className = '',
  allowUpload = false,
}) => {
  const [logoImageSrc, setLogoImageSrc] = useState<string>(() => getSweetheartLogo());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setLogoImageSrc(e.detail);
      } else {
        setLogoImageSrc(getSweetheartLogo());
      }
    };
    window.addEventListener('sweetheart_logo_updated', handleUpdate);
    return () => window.removeEventListener('sweetheart_logo_updated', handleUpdate);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        updateSweetheartLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  if (variant === 'splash') {
    return (
      <div className={`flex flex-col items-center justify-center gap-5 ${className}`}>
        {/* Circular Logo Image with subtle animated romantic ring */}
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full ring-4 ring-rose-500/50 p-1 shadow-2xl shadow-rose-500/25 animate-heart-pulse bg-zinc-900">
          <img
            src={logoImageSrc}
            alt="Sweetheart Logo"
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 rounded-full bg-rose-500/15 blur-xl -z-10" />
        </div>

        {showText && (
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-serif font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Sweetheart <span className="text-rose-500 text-2xl">❤️</span>
            </h1>
            <p className="text-xs tracking-wider text-rose-300 font-medium font-serif italic">
              Designed for you with love
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'welcome') {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="relative group">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full ring-4 ring-rose-500/40 p-1 shadow-xl shadow-rose-500/20 bg-zinc-900 overflow-hidden">
            <img
              src={logoImageSrc}
              alt="Sweetheart Logo"
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-lg -z-10" />
          </div>

          {allowUpload && (
            <label
              className="absolute bottom-0 right-0 p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition active:scale-90"
              title="Upload exact Annu.webp"
            >
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        {showText && (
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold font-serif tracking-tight text-white flex items-center justify-center gap-1.5">
              Sweetheart <span className="text-rose-500">❤️</span>
            </h2>
            <p className="text-xs text-rose-300 font-serif italic font-medium">
              Designed for you with love
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'icon') {
    const iconSizes = {
      sm: 'w-6 h-6',
      md: 'w-9 h-9',
      lg: 'w-14 h-14',
      xl: 'w-20 h-20',
    };
    return (
      <div className={`relative flex items-center justify-center rounded-full ring-2 ring-rose-500/40 p-0.5 overflow-hidden ${className}`}>
        <img
          src={logoImageSrc}
          alt="Sweetheart Icon"
          className={`${iconSizes[size]} object-cover rounded-full`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Header default variant
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative w-9 h-9 rounded-full ring-2 ring-rose-500/40 p-0.5 overflow-hidden bg-zinc-900 shrink-0">
        <img
          src={logoImageSrc}
          alt="Sweetheart Logo"
          className="w-full h-full object-cover rounded-full"
          referrerPolicy="no-referrer"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-zinc-100 font-serif leading-none flex items-center gap-1">
            Sweetheart <span className="text-rose-500">❤️</span>
          </span>
          <span className="text-[10px] text-rose-300/80 font-serif italic leading-tight">
            Designed for you with love
          </span>
        </div>
      )}
    </div>
  );
};
