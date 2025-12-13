// Helper to configure ONNX Runtime globally to avoid multi-threading errors
// in environments without cross-origin isolation (COOP/COEP)
if (typeof window !== "undefined") {
  // @ts-ignore
  if (!window.ort) window.ort = {};
  // @ts-ignore
  if (!window.ort.env) window.ort.env = {};
  // @ts-ignore
  if (!window.ort.env.wasm) window.ort.env.wasm = {};
  // @ts-ignore
  window.ort.env.wasm.numThreads = 1;
  // @ts-ignore
  window.ort.env.wasm.proxy = false;
}

/**
 * Helper functions for image processing
 */

export const createImage = (
  url: string,
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(
  width: number,
  height: number,
  rotation: number,
) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) +
      Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) +
      Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Adapted from react-image-crop
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw the rotated image
  ctx.drawImage(image, 0, 0);

  // If no crop is provided, we just return the transformed image
  if (!pixelCrop) {
    return canvas.toDataURL("image/png");
  }

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // As Base64 string
  return canvas.toDataURL("image/png");
}

/**
 * Advanced Background Removal using @imgly/background-removal
 */
export async function removeImageBackground(
  imageSrc: string,
): Promise<string> {
  try {
    // Dynamic import to ensure configuration runs before library loads
    const { removeBackground } = await import("@imgly/background-removal");
    
    // We use the default configuration which automatically resolves assets
    // from unpkg/jsdelivr based on the installed version.
    // This avoids "Failed to fetch" errors caused by mismatched version URLs.
    const blob = await removeBackground(imageSrc, {
      progress: (key, current, total) => {
        console.log(
          `Downloading ${key}: ${Math.round((current / total) * 100)}%`,
        );
      },
    });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Background removal failed:", error);
    throw error;
  }
}

/**
 * Generates a small thumbnail for filter previews
 */
export async function generateThumbnail(
  imageSrc: string,
  size = 100,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return imageSrc;

  // Calculate scale to fit within size x size while maintaining aspect ratio
  const scale = Math.min(
    size / image.width,
    size / image.height,
  );
  const w = image.width * scale;
  const h = image.height * scale;

  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(image, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.7);
}

/**
 * Simple Spot Fix (Blur/Clone)
 */
export function spotFix(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius = 10,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = radius * 2;
  const startX = Math.max(0, x - radius);
  const startY = Math.max(0, y - radius);

  const imageData = ctx.getImageData(
    startX,
    startY,
    size,
    size,
  );
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  // Simple neighbor average (box blur)
  const copy = new Uint8ClampedArray(data);

  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const pos = (i * w + j) * 4;

      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      // neighbors
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = i + dy;
          const nx = j + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const nPos = (ny * w + nx) * 4;
            r += copy[nPos];
            g += copy[nPos + 1];
            b += copy[nPos + 2];
            count++;
          }
        }
      }

      if (count > 0) {
        data[pos] = r / count;
        data[pos + 1] = g / count;
        data[pos + 2] = b / count;
      }
    }
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, startX, startY);
    ctx.restore();
  }
}

/**
 * Red Eye Reduction (Simple)
 * Desaturates red pixels in radius
 */
export function removeRedEye(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius = 15,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = radius * 2;
  const startX = Math.max(0, x - radius);
  const startY = Math.max(0, y - radius);

  if (
    startX + size > canvas.width ||
    startY + size > canvas.height
  )
    return;

  const imageData = ctx.getImageData(
    startX,
    startY,
    size,
    size,
  );
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r > g + b && r > 50) {
      const avg = (g + b) / 2;
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d");
  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, startX, startY);
    ctx.restore();
  }
}