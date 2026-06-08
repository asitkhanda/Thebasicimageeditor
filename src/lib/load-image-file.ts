import { getFileExtension, guessMimeType, isImageFile } from './image-formats';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

async function tryNativeHeicDecode(file: File): Promise<string | null> {
  const dataUrl = await fileToDataUrl(file);
  const works = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
  return works ? dataUrl : null;
}

async function decodeHeic(file: File): Promise<string> {
  // Safari decodes HEIC natively — skip WASM when the browser already supports it.
  const native = await tryNativeHeicDecode(file);
  if (native) return native;

  try {
    const { heicTo } = await import('heic-to');
    const blob = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.92,
    });
    return blobToDataUrl(blob);
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error(
      'Could not open this HEIC file. It may use a newer iPhone format — try exporting as JPEG from Photos and uploading again.',
    );
  }
}

async function decodeTiff(file: File): Promise<string> {
  const UTIF = await import('utif');
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (!ifds.length) throw new Error('Invalid TIFF file');

  UTIF.decodeImage(buffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width, height } = ifds[0];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

async function rasterizeViaImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('This image format is not supported by your browser'));
    img.src = dataUrl;
  });
}

/**
 * Load any supported image file into a data URL the editor can use.
 * Converts HEIC/HEIF and TIFF when the browser cannot decode them natively.
 */
export async function loadImageFile(file: File): Promise<string> {
  if (!isImageFile(file)) {
    throw new Error('Please select a supported image file');
  }

  const mime = guessMimeType(file);
  const ext = getFileExtension(file.name);

  if (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    ['heic', 'heif', 'heics', 'heifs', 'hif'].includes(ext)
  ) {
    return decodeHeic(file);
  }

  if (mime === 'image/tiff' || ext === 'tif' || ext === 'tiff') {
    return decodeTiff(file);
  }

  // SVG and other exotic types: rasterize so canvas editing works consistently.
  if (
    mime === 'image/svg+xml' ||
    ext === 'svg' ||
    ext === 'svgz' ||
    mime === 'image/x-icon' ||
    ext === 'ico' ||
    ext === 'cur'
  ) {
    return rasterizeViaImage(file);
  }

  // Native decode path — JPEG, PNG, GIF, WebP, AVIF, BMP, etc.
  const dataUrl = await fileToDataUrl(file);
  const canDecode = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });

  if (canDecode) return dataUrl;

  // Fallback: rasterize formats the browser can read but not render directly.
  return rasterizeViaImage(file);
}
