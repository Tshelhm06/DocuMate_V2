const MIME_BY_EXT = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function extensionOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

export function mimeFromName(name) {
  return MIME_BY_EXT[extensionOf(name)] || 'application/octet-stream';
}

/** 'pdf' | 'image' | 'other' */
export function detectFileType(name, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  const ext = extensionOf(name);
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'].includes(ext)) return 'image';
  return 'other';
}

export function fileTypeLabel(fileType) {
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'image') return 'Image';
  return 'File';
}

/** Safe file name for storing on disk (no slashes, spaces, or odd characters). */
export function sanitizeFileName(name) {
  const cleaned = String(name || 'document')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (cleaned || 'document').slice(-80);
}
