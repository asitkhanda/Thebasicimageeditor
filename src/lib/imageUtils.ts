
// Helper functions for image processing

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  return canvas.toDataURL('image/jpeg');
};

export const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const applyFilter = (
    canvas: HTMLCanvasElement, 
    filter: string
) => {
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    // We need to draw the canvas onto itself with the filter
    // This is tricky because context.filter applies to *drawing* calls, not existing pixels immediately without a redraw.
    // A better approach for "bake" is to draw the image with the filter.
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if(!tempCtx) return;
    
    tempCtx.drawImage(canvas, 0, 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = filter;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
};

// Simple spot heal (blur)
export const applySpotHeal = (
    canvas: HTMLCanvasElement, 
    x: number, 
    y: number, 
    radius: number
) => {
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Extract the area
    const size = radius * 2;
    const startX = x - radius;
    const startY = y - radius;

    // Simple average blur or box blur simulation by drawing smaller and scaling up
    // Or using the filter property if supported
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // Apply a strong blur to this region
    ctx.filter = 'blur(5px)';
    ctx.drawImage(canvas, 0, 0); // Re-draw self? No, that draws the WHOLE image.
    
    // Better approach for spot heal:
    // Get data, average it, put it back?
    // Or simply draw a blurred version of the area on top.
    
    // Let's try the clone stamp approach (copy from nearby) or just blur.
    // Since we can't easily re-draw the specific region with a filter from the *same* canvas context state effectively in one go:
    
    // 1. Copy the region to a temp canvas
    const tempC = document.createElement('canvas');
    tempC.width = size;
    tempC.height = size;
    const tCtx = tempC.getContext('2d');
    if(tCtx) {
        tCtx.drawImage(canvas, startX, startY, size, size, 0, 0, size, size);
        
        // 2. Blur the temp canvas
        // We can do a manual pixel blur or use ctx.filter on the temp canvas
        // But to make it effective, we need to draw it back.
        
        // 3. Draw temp canvas back to main canvas
        ctx.filter = 'blur(4px)';
        ctx.drawImage(tempC, 0, 0, size, size, startX, startY, size, size);
    }
    
    ctx.restore();
};

export const removeColorRange = (
    canvas: HTMLCanvasElement,
    targetColor: { r: number, g: number, b: number },
    tolerance: number
) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const dist = Math.sqrt(
            Math.pow(r - targetColor.r, 2) +
            Math.pow(g - targetColor.g, 2) +
            Math.pow(b - targetColor.b, 2)
        );

        if (dist < tolerance) {
            data[i + 3] = 0; // Transparent
        }
    }

    ctx.putImageData(imgData, 0, 0);
};
