import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, ArrowRight, ShieldCheck, RefreshCw, Camera } from 'lucide-react';
import { SweetheartLogo, getSweetheartLogo } from '../common/SweetheartLogo';
import { signInWithGoogle } from '../../lib/firebase';
import { UserProfile } from '../../types';

export const DEFAULT_NEER_DP = '/neer-profile.jpg';

export function getNeerDp(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('sweetheart_neer_dp');
    if (custom) return custom;
  }
  return DEFAULT_NEER_DP;
}

export function updateNeerDp(dataUrl: string) {
  try {
    localStorage.setItem('sweetheart_neer_dp', dataUrl);
    window.dispatchEvent(new CustomEvent('sweetheart_neer_dp_updated', { detail: dataUrl }));
  } catch (e) {
    console.warn('Error saving Neer DP:', e);
  }
}

export const PROFILE_NEER: UserProfile = {
  id: 'user_neer',
  displayName: 'Neer ❤️',
  email: 'neergurjar36@gmail.com',
  photoUrl: getNeerDp(),
  connectionId: 'neer_annu_sweetheart',
  partnerId: 'user_annu',
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  isOnline: true,
};

export const PROFILE_ANNU: UserProfile = {
  id: 'user_annu',
  displayName: 'Annu ✨',
  email: 'annu@sweetheart.private',
  photoUrl: getSweetheartLogo(),
  connectionId: 'neer_annu_sweetheart',
  partnerId: 'user_neer',
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  isOnline: true,
};

interface AuthScreensProps {
  onAuthenticated: (user: UserProfile) => void;
  onSelectProfile: (profile: UserProfile) => void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({
  onAuthenticated,
  onSelectProfile,
}) => {
  const [screen, setScreen] = useState<'splash' | 'welcome'>('splash');
  const [loading, setLoading] = useState(false);
  const [neerDp, setNeerDp] = useState<string>(() => getNeerDp());
  const [annuDp, setAnnuDp] = useState<string>(() => getSweetheartLogo());

  // Listen for real-time photo updates
  useEffect(() => {
    const handleNeerUpdate = (e: any) => {
      setNeerDp(e.detail || getNeerDp());
    };
    const handleAnnuUpdate = (e: any) => {
      setAnnuDp(e.detail || getSweetheartLogo());
    };
    window.addEventListener('sweetheart_neer_dp_updated', handleNeerUpdate);
    window.addEventListener('sweetheart_logo_updated', handleAnnuUpdate);
    return () => {
      window.removeEventListener('sweetheart_neer_dp_updated', handleNeerUpdate);
      window.removeEventListener('sweetheart_logo_updated', handleAnnuUpdate);
    };
  }, []);

  // Transition from splash to welcome after 1.8s
  React.useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen('welcome');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const handleNeerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        updateNeerDp(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnnuFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        import('../common/SweetheartLogo').then(({ updateSweetheartLogo }) => {
          updateSweetheartLogo(dataUrl);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const res = await signInWithGoogle();
      if (res.user) {
        const profile: UserProfile = {
          id: res.user.uid,
          displayName: res.user.displayName || 'Neer',
          email: res.user.email || 'neergurjar36@gmail.com',
          photoUrl: neerDp,
          connectionId: 'neer_annu_sweetheart',
          partnerId: 'user_annu',
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isOnline: true,
        };
        onAuthenticated(profile);
      }
    } catch (err: any) {
      console.warn('Google sign-in fallback to direct profile:', err);
      onSelectProfile({ ...PROFILE_NEER, photoUrl: neerDp });
    } finally {
      setLoading(false);
    }
  };

  // 1. SPLASH SCREEN
  if (screen === 'splash') {
    return (
      <div
        onClick={() => setScreen('welcome')}
        className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 cursor-pointer select-none"
      >
        <SweetheartLogo variant="splash" size="xl" />
        <div className="mt-8 flex items-center gap-2 text-xs font-medium text-rose-300/70 tracking-wider">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-rose-400" />
          <span>Tap anywhere to open</span>
        </div>
      </div>
    );
  }

  // 2. WELCOME SCREEN WITH DIRECT LOGIN AS NEER / LOGIN AS ANNU
  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="pt-4 flex flex-col items-center">
        <SweetheartLogo variant="welcome" size="lg" allowUpload={true} />
      </div>

      <div className="space-y-3.5 my-auto text-center px-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-medium">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>Strictly for Neer & Annu</span>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed font-light">
          “The last Snap sent by the other person is the heart of the app.”
          <br />
          Private. Romantic. Minimal.
        </p>

        {/* Upload Buttons for Exact Photos */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="w-full py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-rose-300 font-medium text-xs flex items-center justify-center gap-2 border border-rose-500/20 cursor-pointer active:scale-98 transition">
            <Camera className="w-3.5 h-3.5 text-rose-400" />
            <span>Upload Exact Neer.jpg Profile Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleNeerFileUpload}
            />
          </label>

          <label className="w-full py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-pink-300 font-medium text-xs flex items-center justify-center gap-2 border border-pink-500/20 cursor-pointer active:scale-98 transition">
            <Camera className="w-3.5 h-3.5 text-pink-400" />
            <span>Upload Exact Annu.webp Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAnnuFileUpload}
            />
          </label>
        </div>
      </div>

      {/* LOGIN WITH NEER & LOGIN WITH ANNU BUTTONS */}
      <div className="space-y-3 pb-3">
        {/* Login as Neer */}
        <button
          type="button"
          onClick={() => onSelectProfile({ ...PROFILE_NEER, photoUrl: neerDp })}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 active:scale-[0.98] transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={neerDp}
              alt="Neer"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40 shadow-md"
            />
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">Log in as Neer</span>
              <span className="text-[11px] text-rose-200 font-normal">Enter your private space</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Login as Annu */}
        <button
          type="button"
          onClick={() => onSelectProfile({ ...PROFILE_ANNU, photoUrl: annuDp })}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold shadow-lg shadow-pink-500/25 active:scale-[0.98] transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={annuDp}
              alt="Annu"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40 shadow-md"
            />
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">Log in as Annu</span>
              <span className="text-[11px] text-pink-200 font-normal">Enter your sweetheart space</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Optional Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 active:scale-[0.98] transition"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google ({PROFILE_NEER.email})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
