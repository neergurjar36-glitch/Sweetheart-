import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Image as ImageIcon,
  Send,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  FlipHorizontal,
} from 'lucide-react';
import {
  compressImage,
  robustCompressForLocalStorage,
  safeSaveSnapToLocalStorage,
  uploadSnapPhoto,
} from '../../lib/storage';
import { saveSnapToDb } from '../../lib/snapGalleryDb';
import {
  PhotoFilterId,
  PHOTO_FILTERS,
  getPhotoFilter,
  bakeFilterToImage,
} from '../../lib/photoFilters';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { notificationService } from '../../services/notificationService';
import { UserProfile, Connection, LastSnap } from '../../types';

interface CameraModalProps {
  currentUser: UserProfile;
  partner: UserProfile | null;
  connection: Connection;
  onClose: () => void;
  onSnapSent?: () => void;
  onCustomSaveSnap?: (snap: any) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  currentUser,
  partner,
  connection,
  onClose,
  onSnapSent,
  onCustomSaveSnap,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterId>('romantic');
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [shutterFlash, setShutterFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera stream
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access was not granted or is unavailable on this device. You can choose a photo from your gallery below.');
    }
  };

  useEffect(() => {
    if (!capturedPhoto) {
      startCamera(facingMode);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, capturedPhoto]);

  // Ensure video element plays the stream reliably
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play warning:', err);
      });
    }
  }, [stream]);

  // Flip camera between front and back
  const [compressionMetrics, setCompressionMetrics] = useState<{
    sizeKb: number;
    format: string;
    width: number;
    height: number;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Process and compress image for lightweight storage and fast previews
  const processAndSetImage = async (rawSource: string | File) => {
    try {
      setIsCompressing(true);
      const res = await robustCompressForLocalStorage(rawSource, 55000);
      setCapturedPhoto(res.dataUrl);
      setCompressionMetrics({
        sizeKb: Math.max(1, Math.round(res.sizeBytes / 1024)),
        format: res.format.toUpperCase(),
        width: res.width,
        height: res.height,
      });
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    } catch (e: any) {
      console.warn('Compression notice:', e);
      if (typeof rawSource === 'string') {
        setCapturedPhoto(rawSource);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  // Flip camera between front and back
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Shutter action
  const handleCapture = () => {
    if (!videoRef.current || !stream || videoRef.current.readyState < 2) {
      // If camera stream is not ready or unavailable, prompt gallery picker
      fileInputRef.current?.click();
      return;
    }

    try {
      // Flash animation
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 200);

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Mirror image if front facing camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL('image/jpeg', 0.85);
      processAndSetImage(photoData);
    } catch (err) {
      console.warn('Capture error, falling back to file picker:', err);
      fileInputRef.current?.click();
    }
  };

  // Gallery file pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        processAndSetImage(dataUrl);
      }
    };
    reader.onerror = () => {
      setSendError('Could not read image file. Please try another photo.');
    };
    reader.readAsDataURL(file);
  };

  // Quick romantic sample snap preset
  const handleSelectSampleSnap = (sampleUrl: string) => {
    processAndSetImage(sampleUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCaption('');
    setCompressionMetrics(null);
    setSendingState('idle');
    setSendError(null);
  };

  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendSnap = async () => {
    if (!capturedPhoto || !partner) {
      if (!partner) setSendError('No sweetheart partner connected.');
      return;
    }

    try {
      setSendingState('sending');
      setSendError(null);

      // 1. Permanently bake selected photo filter (e.g. romantic, warm) onto canvas
      const photoWithFilter = await bakeFilterToImage(capturedPhoto, selectedFilter);

      // 2. Multi-pass compression to guarantee the image stays < 55KB for browser localStorage
      const compressed = await robustCompressForLocalStorage(photoWithFilter, 55000);
      const imageUrl = compressed.dataUrl;

      const snapId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = new Date().toISOString();

      const lastSnapData: LastSnap = {
        connectionId: connection?.id || 'neer_annu_sweetheart',
        snapId,
        senderId: currentUser.id,
        receiverId: partner.id,
        imageUrl,
        caption: caption.trim() ? caption.trim() : '',
        createdAt,
      };

      // 2. Robust quota-managed write to browser localStorage before parent notification
      const storageResult = safeSaveSnapToLocalStorage('sweetheart_last_snap', lastSnapData);
      if (!storageResult.success) {
        console.warn('Storage quota notice:', storageResult.error);
      }

      // Also ensure past snap is preserved in local gallery storage
      try {
        const existingGalleryJson = localStorage.getItem('sweetheart_snap_gallery');
        let currentGallery: LastSnap[] = [];
        if (existingGalleryJson) {
          try {
            currentGallery = JSON.parse(existingGalleryJson);
          } catch {}
        }
        const filtered = currentGallery.filter((s) => s.snapId !== lastSnapData.snapId);
        const updatedGallery = [lastSnapData, ...filtered];
        safeSaveSnapToLocalStorage('sweetheart_snap_gallery', updatedGallery.slice(0, 50));
      } catch (galleryErr) {
        console.warn('Gallery save notice:', galleryErr);
      }

      // Permanently save to IndexedDB past snaps database
      saveSnapToDb(lastSnapData).catch((dbErr) => console.warn('IndexedDB save notice:', dbErr));

      // 3. Notify parent component to update centerpiece immediately
      if (onCustomSaveSnap) {
        onCustomSaveSnap(lastSnapData);
      }

      // 4. Real-time broadcast across tabs and browser windows
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sweetheart_last_snap_updated', { detail: lastSnapData })
          );
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('sweetheart_sync_channel');
            bc.postMessage({ type: 'SNAP_SENT', snap: lastSnapData });
            bc.close();
          }
        }
      } catch (broadcastErr) {
        console.warn('Tab broadcast notice:', broadcastErr);
      }

      // 5. Cloud Firestore mode (safely handled in background if signed in)
      if (auth.currentUser && db) {
        try {
          const snapDocRef = doc(db, 'snaps', snapId);
          await setDoc(snapDocRef, {
            ...lastSnapData,
            status: 'sent',
          });

          const lastSnapDocRef = doc(db, 'lastSnaps', connection?.id || 'neer_annu_sweetheart');
          await setDoc(lastSnapDocRef, lastSnapData);
        } catch (firestoreErr) {
          console.warn('Cloud Firestore background sync notice:', firestoreErr);
        }
      }

      // 6. In-app confirmation toast for the sender
      notificationService.notifyToast(
        'Snap Delivered! ❤️',
        `Your Snap was sent to ${partner.displayName} with love.`
      );

      setSendingState('sent');

      if (onSnapSent) onSnapSent();

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to send Snap:', err);
      setSendingState('idle');
      setSendError(err?.message || 'Could not send Snap. Please try again.');
    }
  };

  const currentFilter = getPhotoFilter(selectedFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between text-white animate-in fade-in duration-200">
      {/* Shutter flash effect */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* TOP BAR */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between z-20 shrink-0">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white border border-white/10 active:scale-95 transition cursor-pointer"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Snap for {partner?.displayName || 'Sweetheart'}</span>
        </div>

        {!capturedPhoto && stream && (
          <button
            onClick={handleFlipCamera}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white border border-white/10 active:scale-95 transition cursor-pointer"
            title="Switch camera"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        )}
        {capturedPhoto && <div className="w-10" />}
      </div>

      {/* CAMERA VIEWFINDER OR PHOTO PREVIEW */}
      <div className="relative flex-1 mx-3 my-2 rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
        {!capturedPhoto ? (
          <>
            {stream ? (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    filter: currentFilter.cssFilter,
                    transition: 'filter 0.3s ease',
                  }}
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* Live atmospheric overlay */}
                {currentFilter.overlayColor && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-colors duration-300"
                    style={{ backgroundColor: currentFilter.overlayColor }}
                  />
                )}

                {/* Viewfinder Filter Strip at bottom of camera lens */}
                <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center gap-1.5 overflow-x-auto py-1 px-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 scrollbar-none shadow-2xl justify-center">
                  <span className="text-[10px] text-zinc-300 font-semibold px-1.5 shrink-0 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    <span>Filter</span>
                  </span>
                  {PHOTO_FILTERS.map((f) => {
                    const isActive = selectedFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                          isActive
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-md shadow-rose-500/30 ring-1 ring-white/50'
                            : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/5'
                        }`}
                        title={f.description}
                      >
                        <span>{f.icon}</span>
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4 max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                  <Camera className="w-8 h-8" />
                </div>
                {cameraError ? (
                  <p className="text-xs text-zinc-400">{cameraError}</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Accessing camera...</span>
                  </div>
                )}
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 px-5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-center justify-center gap-2 mx-auto w-full cursor-pointer transition active:scale-98"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Choose from Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSampleSnap(currentUser.photoUrl || '/neer-profile.jpg')}
                    className="py-2.5 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 w-full cursor-pointer transition active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Send Romantic Photo Snap</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* PREVIEW MODE */
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <img
              src={capturedPhoto}
              alt="Snap Preview"
              style={{
                filter: currentFilter.cssFilter,
                transition: 'filter 0.3s ease',
              }}
              className="w-full h-full object-cover"
            />

            {/* Filter Color Tint Overlay */}
            {currentFilter.overlayColor && (
              <div
                className="absolute inset-0 pointer-events-none transition-colors duration-300"
                style={{ backgroundColor: currentFilter.overlayColor }}
              />
            )}

            {/* Storage Quota Protection & Compression Badge */}
            {compressionMetrics && !isCompressing && (
              <div className="absolute top-3.5 left-3.5 z-20 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-xl animate-in fade-in duration-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{compressionMetrics.sizeKb} KB • {compressionMetrics.format} Storage-Safe</span>
              </div>
            )}

            {/* Active Filter Preset Badge */}
            {selectedFilter !== 'normal' && (
              <div className="absolute top-3.5 right-3.5 z-20 px-3 py-1 rounded-full bg-rose-500/35 backdrop-blur-md border border-rose-400/40 text-[11px] font-semibold text-rose-100 flex items-center gap-1.5 shadow-xl animate-in fade-in duration-200">
                <span>{currentFilter.icon}</span>
                <span>{currentFilter.badgeText || currentFilter.name}</span>
              </div>
            )}

            {isCompressing && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
                <span className="text-xs text-rose-200 font-medium">Compressing photo for storage...</span>
              </div>
            )}

            {/* Photo Filter Layer Selector */}
            <div className="absolute bottom-[72px] left-3 right-3 z-20 flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 scrollbar-none shadow-2xl justify-center sm:justify-start">
              <span className="text-[10px] text-zinc-300 font-semibold px-2 shrink-0 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span>Preset:</span>
              </span>
              {PHOTO_FILTERS.map((f) => {
                const isActive = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-md shadow-rose-500/30 ring-1 ring-white/50'
                        : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/5'
                    }`}
                    title={f.description}
                  >
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Caption Input Overlay */}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a romantic note or caption... ❤️"
                maxLength={140}
                className="w-full py-3 px-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-rose-400 shadow-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="px-6 py-5 z-20 shrink-0">
        {!capturedPhoto ? (
          <div className="flex items-center justify-around">
            {/* Gallery select button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 active:scale-95 transition cursor-pointer"
              title="Gallery"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              className="relative p-1 rounded-full border-4 border-white active:scale-90 transition cursor-pointer"
              title="Take Photo"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-400 transition" />
            </button>

            {/* Quick Sample Snap Button */}
            <button
              onClick={() => handleSelectSampleSnap(currentUser.photoUrl || '/neer-profile.jpg')}
              className="p-3.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-95 transition cursor-pointer"
              title="Use Profile Photo as Snap"
            >
              <Sparkles className="w-6 h-6" />
            </button>
          </div>
        ) : (
          /* PREVIEW ACTIONS */
          <div className="space-y-3">
            {sendError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetake}
                disabled={sendingState === 'sending'}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium text-sm flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={handleSendSnap}
                disabled={sendingState !== 'idle'}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold text-sm shadow-xl shadow-rose-500/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {sendingState === 'sending' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Delivering Snap...</span>
                  </>
                ) : sendingState === 'sent' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Delivered! ❤️</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Snap</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
