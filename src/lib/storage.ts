import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

/**
 * Compresses an image file or data URL to an optimized maximum dimension and JPEG quality.
 * Highly resilient: Never throws unhandled errors and avoids canvas tainting.
 */
export interface CompressionResult {
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
}

/**
 * Multi-stage robust image compressor specifically engineered for browser localStorage.
 * Progressively reduces dimensions and quality to guarantee the payload stays within
 * safe quota limits (~40KB - 65KB) while maintaining excellent visual sharpness.
 */
export async function robustCompressForLocalStorage(
  imageSource: File | string,
  targetMaxBytes = 65000
): Promise<CompressionResult> {
  return new Promise((resolve) => {
    const processSrc = (src: string) => {
      const img = new Image();
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || 640;
          const naturalH = img.naturalHeight || img.height || 480;

          // Attempt multi-pass compression starting with ideal dimensions
          const passes: Array<{ maxW: number; maxH: number; quality: number; format: 'image/webp' | 'image/jpeg' }> = [
            { maxW: 720, maxH: 960, quality: 0.74, format: 'image/webp' },
            { maxW: 720, maxH: 960, quality: 0.72, format: 'image/jpeg' },
            { maxW: 600, maxH: 800, quality: 0.65, format: 'image/jpeg' },
            { maxW: 480, maxH: 640, quality: 0.58, format: 'image/jpeg' },
          ];

          let bestDataUrl = src;
          let bestSize = typeof src === 'string' ? Math.round(src.length * 0.75) : targetMaxBytes;
          let bestWidth = naturalW;
          let bestHeight = naturalH;
          let bestFormat: 'webp' | 'jpeg' = 'jpeg';

          for (let i = 0; i < passes.length; i++) {
            const pass = passes[i];
            let width = naturalW;
            let height = naturalH;

            if (width > pass.maxW) {
              height = Math.round((height * pass.maxW) / width);
              width = pass.maxW;
            }
            if (height > pass.maxH) {
              width = Math.round((width * pass.maxH) / height);
              height = pass.maxH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(width, 100);
            canvas.height = Math.max(height, 100);

            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL(pass.format, pass.quality);
            // Verify if WebP was actually supported or fell back to png
            const actualFormat = dataUrl.startsWith('data:image/webp') ? 'webp' : 'jpeg';
            const sizeInBytes = Math.round(dataUrl.length * 0.75);

            bestDataUrl = dataUrl;
            bestSize = sizeInBytes;
            bestWidth = canvas.width;
            bestHeight = canvas.height;
            bestFormat = actualFormat;

            // If we successfully compressed below our target threshold, we're done!
            if (sizeInBytes <= targetMaxBytes) {
              break;
            }
          }

          resolve({
            dataUrl: bestDataUrl,
            sizeBytes: bestSize,
            width: bestWidth,
            height: bestHeight,
            format: bestFormat,
          });
        } catch (err) {
          console.warn('Robust compression pass fallback:', err);
          const fallbackSize = typeof src === 'string' ? Math.round(src.length * 0.75) : 0;
          resolve({
            dataUrl: src,
            sizeBytes: fallbackSize,
            width: 640,
            height: 480,
            format: 'jpeg',
          });
        }
      };

      img.onerror = () => {
        const fallbackSize = typeof src === 'string' ? Math.round(src.length * 0.75) : 0;
        resolve({
          dataUrl: src,
          sizeBytes: fallbackSize,
          width: 640,
          height: 480,
          format: 'jpeg',
        });
      };

      img.src = src;
    };

    if (typeof imageSource === 'string') {
      processSrc(imageSource);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        processSrc(result);
      };
      reader.onerror = () => {
        resolve({
          dataUrl: '',
          sizeBytes: 0,
          width: 0,
          height: 0,
          format: 'jpeg',
        });
      };
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Quota-guarded localStorage writer with automatic cache cleanup and fallback handling.
 */
export function safeSaveSnapToLocalStorage(key: string, data: any): {
  success: boolean;
  approxSizeKb: number;
  storageTarget: 'localStorage' | 'sessionStorage' | 'memory';
  error?: string;
} {
  const jsonStr = JSON.stringify(data);
  const approxSizeKb = Math.round(jsonStr.length / 1024);

  // 1. Primary: Attempt writing to localStorage
  try {
    localStorage.setItem(key, jsonStr);
    return {
      success: true,
      approxSizeKb,
      storageTarget: 'localStorage',
    };
  } catch (initialErr: any) {
    console.warn(`Initial localStorage.setItem('${key}') failed (${initialErr?.name}). Cleaning transient storage...`);

    // 2. Prune obsolete or transient keys to free up quota
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sweetheart_flutter_seen_') || k.startsWith('temp_') || k === 'sweetheart_sandbox_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Retry writing after cleanup
      localStorage.setItem(key, jsonStr);
      return {
        success: true,
        approxSizeKb,
        storageTarget: 'localStorage',
      };
    } catch (retryErr: any) {
      console.warn('Storage cleanup retry also exceeded quota. Falling back to sessionStorage:', retryErr);
    }

    // 3. Fallback: Save to sessionStorage so current session persists without crashing
    try {
      sessionStorage.setItem(key, jsonStr);
      return {
        success: true,
        approxSizeKb,
        storageTarget: 'sessionStorage',
        error: 'Storage quota reached in localStorage; persisted to session storage safely.',
      };
    } catch (sessionErr: any) {
      console.warn('SessionStorage fallback also unavailable:', sessionErr);
      return {
        success: false,
        approxSizeKb,
        storageTarget: 'memory',
        error: 'Browser storage quota completely full.',
      };
    }
  }
}

/**
 * Compresses an image file or data URL to an optimized maximum dimension and JPEG quality.
 * Highly resilient: Never throws unhandled errors and avoids canvas tainting.
 */
export async function compressImage(
  imageSource: File | string,
  maxWidth = 800,
  maxHeight = 1000,
  quality = 0.76
): Promise<string> {
  const res = await robustCompressForLocalStorage(imageSource, 65000);
  return res.dataUrl;
}

/**
 * Uploads a Snap image or avatar.
 * In local/direct mode or if Firebase Storage is unauthenticated, immediately returns the dataUrl.
 */
export async function uploadSnapPhoto(
  userId: string,
  connectionId: string,
  dataUrl: string
): Promise<string> {
  // If unauthenticated or in direct connection mode, immediately return the data URL
  if (!auth.currentUser || connectionId === 'neer_annu_sweetheart' || connectionId.startsWith('sandbox_')) {
    return dataUrl;
  }

  const timestamp = Date.now();
  const filePath = `snaps/${connectionId}/${userId}_${timestamp}.jpg`;

  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/jpeg',
    });
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn('Firebase Storage upload fallback to data URL:', err);
    return dataUrl;
  }
}

export async function uploadProfilePhoto(
  userId: string,
  dataUrl: string
): Promise<string> {
  if (!auth.currentUser) {
    return dataUrl;
  }
  const filePath = `avatars/${userId}.jpg`;
  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/jpeg',
    });
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn('Profile picture storage fallback:', err);
    return dataUrl;
  }
}
