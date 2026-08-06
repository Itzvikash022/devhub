export function generateThumbnailAndDimensions(file: File): Promise<{
  thumbnail: string | null;
  width: number | null;
  height: number | null;
}> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ thumbnail: null, width: null, height: null });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // Target thumbnail width: 300px
        const targetWidth = 300;
        const targetHeight = Math.round((height / width) * targetWidth);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ thumbnail: null, width, height });
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        let thumbnail = "";
        try {
          thumbnail = canvas.toDataURL("image/webp", 0.7);
        } catch {
          try {
            thumbnail = canvas.toDataURL("image/jpeg", 0.7);
          } catch {
            thumbnail = "";
          }
        }

        resolve({ thumbnail: thumbnail || null, width, height });
      };
      img.onerror = () => {
        resolve({ thumbnail: null, width: null, height: null });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ thumbnail: null, width: null, height: null });
    };
    reader.readAsDataURL(file);
  });
}
