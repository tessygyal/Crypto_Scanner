/**
 * Rules for screenshot evidence on reports. The database enforces the same
 * limits (supabase/migrations/20261108000000_report_evidence.sql); checking
 * here first gives a clear message without a wasted upload.
 */

/** At most this many screenshots per report. */
export const MAX_EVIDENCE = 3;
/** The "evidence" bucket's size limit (5 MB). */
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

export const EVIDENCE_TOO_BIG_MESSAGE = 'That image is bigger than 5 MB. Crop it or choose a smaller screenshot.';
export const EVIDENCE_BAD_TYPE_MESSAGE = 'Only JPEG, PNG or WebP images can be added.';
export const EVIDENCE_LIMIT_MESSAGE = `A report can have at most ${MAX_EVIDENCE} screenshots. Remove one to add another.`;

export type ImageType = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

/** Decode base64 (as returned by the image picker) into bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Work out the image type from the file's first bytes rather than trusting a
 * file name or MIME type. Returns null for anything that isn't JPEG, PNG or WebP.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)) {
    return { mime: 'image/png', ext: 'png' };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export type CheckedImage = { ok: true; bytes: Uint8Array; type: ImageType } | { ok: false; error: string };

/** Decode and check a picked image before it is uploaded. */
export function checkEvidenceImage(base64: string): CheckedImage {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return { ok: false, error: EVIDENCE_BAD_TYPE_MESSAGE };
  }
  if (bytes.length > MAX_EVIDENCE_BYTES) return { ok: false, error: EVIDENCE_TOO_BIG_MESSAGE };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: EVIDENCE_BAD_TYPE_MESSAGE };
  return { ok: true, bytes, type };
}

/**
 * Where a screenshot is stored: "<user id>/<report id>-<unique part>.<ext>".
 * The database requires both the user's folder and the report id prefix.
 */
export function evidencePath(userId: string, reportId: string, ext: ImageType['ext'], unique: string): string {
  return `${userId}/${reportId}-${unique}.${ext}`;
}

/** A short random string for file names (not security-sensitive). */
export function uniqueSuffix(now = Date.now(), random = Math.random): string {
  return `${now.toString(36)}${Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')}`;
}
