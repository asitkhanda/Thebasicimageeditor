import { EXPORT_FORMATS, getDownloadExtension, type ImageExportFormat } from './image-formats';

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): string {
  const format = EXPORT_FORMATS.find((f) => f.mime === mime);
  if (format?.qualitySupported && quality !== undefined) {
    return canvas.toDataURL(mime, quality);
  }
  return canvas.toDataURL(mime);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const format = EXPORT_FORMATS.find((f) => f.mime === mime);
    if (format?.qualitySupported && quality !== undefined) {
      canvas.toBlob(resolve, mime, quality);
    } else {
      canvas.toBlob(resolve, mime);
    }
  });
}

export function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.click();
}

export function downloadFromCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
  prefix = 'edited-image',
): void {
  const ext = getDownloadExtension(mime);
  const href = canvasToDataUrl(canvas, mime, quality);
  triggerDownload(href, `${prefix}.${ext}`);
}

export { EXPORT_FORMATS, type ImageExportFormat };
