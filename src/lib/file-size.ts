export const MOC_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function isOverUploadLimit(bytes: number) {
  return bytes > MOC_UPLOAD_LIMIT_BYTES;
}
