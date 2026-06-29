/**
 * Read a File/Blob into a base64 JPEG, cropped to a centred square
 * and resized to `maxSize` × `maxSize`. Quality compressed to 0.7
 * to match existing app's storage approach.
 */
export function processPhotoFile(file, maxSize = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          // Background fill (in case of transparency)
          ctx.fillStyle = '#f0ebe3';
          ctx.fillRect(0, 0, maxSize, maxSize);
          ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
