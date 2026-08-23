/**
 * Utility for image optimization and CDN compression.
 */
export function getOptimizedImageUrl(url: string, width: number = 500, quality: number = 75): string {
  if (!url) return '';

  // If it is an Unsplash image, we optimize width, quality, and format to WebP for modern CDN compression.
  if (url.includes('images.unsplash.com')) {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set('w', width.toString());
      parsedUrl.searchParams.set('q', quality.toString());
      parsedUrl.searchParams.set('fm', 'webp'); // WebP format is compressed and faster to download
      parsedUrl.searchParams.set('fit', 'crop');
      return parsedUrl.toString();
    } catch (e) {
      // String split fallback if URL constructor fails
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}&fm=webp`;
    }
  }

  // If it's a Cloudinary URL, we can append f_auto,q_auto,w_500 format conversions
  if (url.includes('res.cloudinary.com')) {
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},q_${quality}/`);
    }
  }

  // Otherwise return url as is
  return url;
}
