export type PhotoFilterId = 'normal' | 'romantic' | 'warm' | 'dreamy' | 'noir';

export interface PhotoFilter {
  id: PhotoFilterId;
  name: string;
  icon: string;
  description: string;
  cssFilter: string;
  overlayColor?: string;
  badgeText?: string;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  {
    id: 'normal',
    name: 'Original',
    icon: '✨',
    description: 'Natural unedited capture',
    cssFilter: 'none',
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: '❤️',
    description: 'Soft rose blush aura & vibrant romance',
    cssFilter: 'contrast(1.06) brightness(1.04) saturate(1.22)',
    overlayColor: 'rgba(244, 63, 94, 0.14)',
    badgeText: 'Romantic Preset ❤️',
  },
  {
    id: 'warm',
    name: 'Warm',
    icon: '🌅',
    description: 'Golden hour amber glow & cozy warmth',
    cssFilter: 'sepia(0.28) saturate(1.30) contrast(1.06) brightness(1.03)',
    overlayColor: 'rgba(245, 158, 11, 0.12)',
    badgeText: 'Warm Preset 🌅',
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    icon: '🌸',
    description: 'Soft pastel radiance & tender haze',
    cssFilter: 'contrast(0.96) brightness(1.06) saturate(1.15) sepia(0.12)',
    overlayColor: 'rgba(236, 72, 153, 0.12)',
    badgeText: 'Dreamy Preset 🌸',
  },
  {
    id: 'noir',
    name: 'Noir',
    icon: '🖤',
    description: 'Timeless romantic black & white',
    cssFilter: 'grayscale(1) contrast(1.15) brightness(1.02)',
    badgeText: 'Noir Preset 🖤',
  },
];

export function getPhotoFilter(id: PhotoFilterId): PhotoFilter {
  return PHOTO_FILTERS.find((f) => f.id === id) || PHOTO_FILTERS[0];
}

/**
 * Bakes the selected visual filter onto the image canvas so that the filtered
 * photo is permanently encoded into the image data URL before sending or storing.
 */
export async function bakeFilterToImage(
  imageSrc: string,
  filterId: PhotoFilterId
): Promise<string> {
  if (!imageSrc || filterId === 'normal') {
    return imageSrc;
  }

  const filter = getPhotoFilter(filterId);
  if (!filter || filter.cssFilter === 'none') {
    return imageSrc;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = img.naturalWidth || img.width || 640;
          const height = img.naturalHeight || img.height || 480;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imageSrc);
            return;
          }

          // Apply CSS filter property to canvas context if supported
          if ('filter' in ctx) {
            try {
              ctx.filter = filter.cssFilter;
            } catch {
              // Ignore if unsupported filter syntax
            }
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Apply color tint overlay for authentic atmospheric romance or warmth
          if (filter.overlayColor) {
            ctx.filter = 'none';
            ctx.fillStyle = filter.overlayColor;
            ctx.fillRect(0, 0, width, height);
          }

          const outputDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve(outputDataUrl);
        } catch (canvasErr) {
          console.warn('Canvas filter bake error, falling back to original:', canvasErr);
          resolve(imageSrc);
        }
      };

      img.onerror = () => {
        resolve(imageSrc);
      };

      img.src = imageSrc;
    } catch (err) {
      console.warn('bakeFilterToImage notice:', err);
      resolve(imageSrc);
    }
  });
}
