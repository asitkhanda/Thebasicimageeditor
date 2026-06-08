export type ImageExportFormat = {
  mime: string;
  ext: string;
  label: string;
  lossless: boolean;
  qualitySupported: boolean;
};

/** Formats the browser canvas API can encode for export/compression. */
export const EXPORT_FORMATS: ImageExportFormat[] = [
  { mime: 'image/png', ext: 'png', label: 'PNG', lossless: true, qualitySupported: false },
  { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG', lossless: false, qualitySupported: true },
  { mime: 'image/webp', ext: 'webp', label: 'WebP', lossless: false, qualitySupported: true },
  { mime: 'image/avif', ext: 'avif', label: 'AVIF', lossless: false, qualitySupported: true },
  { mime: 'image/bmp', ext: 'bmp', label: 'BMP', lossless: true, qualitySupported: false },
];

/** File input accept string — broadest browser-native image filter. */
export const IMAGE_INPUT_ACCEPT = 'image/*';

/** Extensions used when MIME type is missing or unreliable (e.g. HEIC from iOS). */
export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'jpe', 'jfif', 'pjpeg', 'pjp',
  'png', 'apng',
  'gif',
  'webp',
  'bmp', 'dib',
  'tif', 'tiff',
  'svg', 'svgz',
  'ico', 'cur',
  'avif', 'avifs',
  'heic', 'heif', 'heics', 'heifs', 'hif',
  'jxl',
  'jp2', 'j2k', 'jpf', 'jpx', 'jpm', 'mj2',
  'ppm', 'pgm', 'pbm', 'pnm',
  'xbm', 'xpm',
  'wbmp',
  'qoi',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  pjp: 'image/jpeg',
  png: 'image/png',
  apng: 'image/apng',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  dib: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
  svgz: 'image/svg+xml',
  ico: 'image/x-icon',
  cur: 'image/x-icon',
  avif: 'image/avif',
  avifs: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  heics: 'image/heic',
  heifs: 'image/heif',
  hif: 'image/heif',
  jxl: 'image/jxl',
  jp2: 'image/jp2',
  j2k: 'image/jp2',
  jpf: 'image/jp2',
  jpx: 'image/jp2',
  jpm: 'image/jp2',
  mj2: 'image/jp2',
  ppm: 'image/x-portable-pixmap',
  pgm: 'image/x-portable-graymap',
  pbm: 'image/x-portable-bitmap',
  pnm: 'image/x-portable-anymap',
  xbm: 'image/x-xbitmap',
  xpm: 'image/x-xpixmap',
  wbmp: 'image/vnd.wap.wbmp',
  qoi: 'image/qoi',
};

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function guessMimeType(file: File): string | null {
  if (file.type.startsWith('image/')) return file.type;
  const ext = getFileExtension(file.name);
  return EXTENSION_TO_MIME[ext] ?? null;
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

export function getFormatByMime(mime: string): ImageExportFormat | undefined {
  return EXPORT_FORMATS.find((f) => f.mime === mime);
}

export function getFormatLabel(mime: string): string {
  return getFormatByMime(mime)?.label ?? mime.split('/')[1]?.toUpperCase() ?? mime;
}

export function getDownloadExtension(mime: string): string {
  return getFormatByMime(mime)?.ext ?? mime.split('/')[1] ?? 'img';
}
