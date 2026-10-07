import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  Heart,
  Calendar,
  Sparkles,
  Camera,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Clock,
  Images,
} from 'lucide-react';
import { LastSnap, UserProfile, AppTheme } from '../../types';

interface SnapGalleryModalProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  snaps: LastSnap[];
  theme: AppTheme;
  onClose: () => void;
  onOpenSnapCamera: () => void;
  onDeleteSnap?: (snapId: string) => void;
}

export const SnapGalleryModal: React.FC<SnapGalleryModalProps> = ({
  currentUser,
  partner,
  snaps,
  theme,
  onClose,
  onOpenSnapCamera,
  onDeleteSnap,
}) => {
  const [filter, setFilter] = useState<'all' | 'partner' | 'mine'>('all');
  const [selectedSnapIndex, setSelectedSnapIndex] = useState<number | null>(null);
  const [lightboxHeartAnim, setLightboxHeartAnim] = useState(false);

  const isDarkMode = theme === 'dark';
  const partnerName = partner?.displayName || 'Sweetheart';

  // Filtered snaps
  const filteredSnaps = snaps.filter((snap) => {
    if (filter === 'mine') return snap.senderId === currentUser.id;
    if (filter === 'partner') return snap.senderId !== currentUser.id;
    return true;
  });

  const countMine = snaps.filter((s) => s.senderId === currentUser.id).length;
  const countPartner = snaps.filter((s) => s.senderId !== currentUser.id).length;

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const selectedSnap = selectedSnapIndex !== null ? filteredSnaps[selectedSnapIndex] : null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSnapIndex !== null && selectedSnapIndex < filteredSnaps.length - 1) {
      setSelectedSnapIndex(selectedSnapIndex + 1);
    } else {
      setSelectedSnapIndex(0);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSnapIndex !== null && selectedSnapIndex > 0) {
      setSelectedSnapIndex(selectedSnapIndex - 1);
    } else {
      setSelectedSnapIndex(filteredSnaps.length - 1);
    }
  };

  const handleDownload = (e: React.MouseEvent, snap: LastSnap) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = snap.imageUrl;
      a.download = `sweetheart_snap_${snap.snapId || Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Download error:', err);
    }
  };

  const handleDoubleTap = () => {
    setLightboxHeartAnim(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {}
    }
    setTimeout(() => setLightboxHeartAnim(false), 900);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 animate-in fade-in duration-200 select-none ${
        isDarkMode ? 'bg-zinc-950 text-white' : 'bg-rose-50/50 text-zinc-900'
      }`}
    >
      {/* 1. TOP HEADER */}
      <header
        className={`px-4 pt-4 pb-3 flex items-center justify-between border-b shrink-0 z-10 transition-colors ${
          isDarkMode
            ? 'bg-zinc-900/80 border-zinc-800/80 backdrop-blur-md'
            : 'bg-white/90 border-rose-100 backdrop-blur-md shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition active:scale-95 cursor-pointer ${
              isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-rose-100 text-zinc-700'
            }`}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight">Snap Memories</h1>
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            </div>
            <p className="text-[11px] text-zinc-400">
              {snaps.length} {snaps.length === 1 ? 'moment' : 'moments'} saved forever
            </p>
          </div>
        </div>

        {/* Quick Camera Action */}
        <button
          onClick={() => {
            onClose();
            onOpenSnapCamera();
          }}
          className="p-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25 active:scale-95 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3.5"
          title="Take a New Snap"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">New Snap</span>
        </button>
      </header>

      {/* 2. FILTER PILLS */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none border-b border-rose-500/10">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap active:scale-95 ${
            filter === 'all'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : isDarkMode
              ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          All Snaps ({snaps.length})
        </button>

        <button
          onClick={() => setFilter('partner')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap active:scale-95 ${
            filter === 'partner'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : isDarkMode
              ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          From {partnerName} ({countPartner})
        </button>

        <button
          onClick={() => setFilter('mine')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap active:scale-95 ${
            filter === 'mine'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : isDarkMode
              ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          Sent by You ({countMine})
        </button>
      </div>

      {/* 3. GALLERY GRID VIEW */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSnaps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 animate-heart-pulse">
              <Images className="w-9 h-9" />
            </div>
            <div>
              <h3 className="font-semibold text-base">No Snaps Found</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                {filter === 'partner'
                  ? `${partnerName} hasn't sent any snaps yet.`
                  : filter === 'mine'
                  ? "You haven't sent any snaps yet."
                  : 'Start creating memories together by taking your first snap.'}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSnapCamera();
              }}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold text-xs shadow-lg shadow-rose-500/30 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture a Snap</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredSnaps.map((snap, index) => {
              const isFromPartner = snap.senderId !== currentUser.id;
              const senderDisplayName = isFromPartner ? partnerName : 'You';
              return (
                <div
                  key={snap.snapId || `${snap.createdAt}_${index}`}
                  onClick={() => setSelectedSnapIndex(index)}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] border transition-all duration-300 hover:scale-[1.02] shadow-md ${
                    isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 hover:border-rose-500/40'
                      : 'bg-white border-rose-100 hover:border-rose-300'
                  }`}
                >
                  {/* Photo thumbnail */}
                  <img
                    src={snap.imageUrl}
                    alt={snap.caption || 'Snap'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badge: Sender indicator */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-medium flex items-center gap-1 border border-white/10">
                      <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-500" />
                      <span>{senderDisplayName}</span>
                    </span>

                    <span className="p-1 rounded-full bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Bottom: Caption & Timestamp */}
                  <div className="absolute bottom-2 left-2 right-2 text-white pointer-events-none space-y-0.5">
                    {snap.caption && (
                      <p className="text-[11px] font-medium leading-tight truncate text-white/95">
                        {snap.caption}
                      </p>
                    )}
                    <p className="text-[9px] text-zinc-300 font-mono">
                      {formatTimestamp(snap.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. LIGHTBOX / FULL SCREEN VIEWER */}
      {selectedSnap && (
        <div
          onClick={() => setSelectedSnapIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between text-white animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="px-5 pt-4 pb-2 flex items-center justify-between z-20 shrink-0"
          >
            <button
              onClick={() => setSelectedSnapIndex(null)}
              className="p-2.5 rounded-full bg-zinc-900/80 text-white/90 hover:text-white border border-white/10 active:scale-95 transition cursor-pointer"
              title="Close view"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {selectedSnap.senderId === currentUser.id
                    ? 'Sent by You'
                    : `From ${partnerName}`}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                {selectedSnapIndex !== null ? selectedSnapIndex + 1 : 1} of {filteredSnaps.length}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => handleDownload(e, selectedSnap)}
                className="p-2.5 rounded-full bg-zinc-900/80 text-white/90 hover:text-white border border-white/10 active:scale-95 transition cursor-pointer"
                title="Save Snap"
                aria-label="Download Snap"
              >
                <Download className="w-5 h-5" />
              </button>
              {onDeleteSnap && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this memory from your gallery?')) {
                      onDeleteSnap(selectedSnap.snapId);
                      setSelectedSnapIndex(null);
                    }
                  }}
                  className="p-2.5 rounded-full bg-zinc-900/80 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 border border-white/10 active:scale-95 transition cursor-pointer"
                  title="Delete Snap"
                  aria-label="Delete Snap"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Photo Viewport */}
          <div
            onClick={handleDoubleTap}
            className="relative flex-1 mx-4 my-2 flex items-center justify-center overflow-hidden"
          >
            <img
              src={selectedSnap.imageUrl}
              alt={selectedSnap.caption || 'Snap memory'}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
            />

            {/* Double Tap Heart Animation */}
            {lightboxHeartAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <Heart className="w-28 h-28 text-rose-500 fill-rose-500 animate-heart-pulse drop-shadow-2xl" />
              </div>
            )}

            {/* Navigation Previous */}
            {filteredSnaps.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 active:scale-95 transition cursor-pointer z-20"
                title="Previous Snap"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Navigation Next */}
            {filteredSnaps.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 active:scale-95 transition cursor-pointer z-20"
                title="Next Snap"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Details */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="px-6 pb-6 pt-2 z-20 shrink-0 text-center space-y-1.5"
          >
            {selectedSnap.caption && (
              <p className="text-sm font-medium leading-snug text-white/95 max-w-sm mx-auto px-4 py-2 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10">
                {selectedSnap.caption}
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>{formatTimestamp(selectedSnap.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
