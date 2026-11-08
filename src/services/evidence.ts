import * as ImagePicker from 'expo-image-picker';

import type { EvidenceRow } from '@/types/database';
import { FriendlyDbError } from '@/utils/db-errors';
import { checkEvidenceImage, EVIDENCE_LIMIT_MESSAGE, evidencePath, MAX_EVIDENCE, uniqueSuffix } from '@/utils/evidence';

import { db, run } from './db';

/**
 * Screenshot evidence on reports. Files live in the private "evidence" bucket;
 * rows in the evidence table link them to a report. Only the report's owner
 * (and moderators) can see them. Every function throws an Error whose message
 * is safe to show.
 */

const BUCKET = 'evidence';
/** Signed links to private files last an hour. */
const SIGNED_URL_SECONDS = 60 * 60;

export type Evidence = Pick<EvidenceRow, 'id' | 'report_id' | 'storage_path' | 'created_at'> & {
  /** A temporary link to show the image, or null if one couldn't be made. */
  url: string | null;
};

/** An Error whose message is already safe to show to the user. */
export class EvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceError';
  }
}

/** The report's screenshots, oldest first, each with a temporary link. */
export async function listEvidence(reportId: string): Promise<Evidence[]> {
  const rows = await run(
    db()
      .from('evidence')
      .select('id, report_id, storage_path, created_at')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })
  );
  if (rows.length === 0) return [];

  const signed = await run(
    db()
      .storage.from(BUCKET)
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        SIGNED_URL_SECONDS
      )
  );
  const urls = new Map(signed.map((s) => [s.path, s.error ? null : s.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

export type PickedImage = { status: 'cancelled' } | { status: 'picked'; base64: string };

/** Let the user choose a screenshot from the phone. */
export async function pickEvidenceImage(): Promise<PickedImage> {
  let picked: ImagePicker.ImagePickerResult;
  try {
    // quality < 1 re-saves the image, which keeps uploads small.
    picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, exif: false });
  } catch {
    throw new EvidenceError("Couldn't open your photos. Please try again.");
  }
  const asset = picked.canceled ? undefined : picked.assets?.[0];
  if (!asset) return { status: 'cancelled' };
  if (!asset.base64) throw new EvidenceError("Couldn't read that image. Please choose another.");
  return { status: 'picked', base64: asset.base64 };
}

/**
 * Upload a screenshot and attach it to the user's report. If attaching fails,
 * the uploaded file is removed again so nothing is left behind.
 */
export async function uploadEvidence(params: {
  userId: string;
  reportId: string;
  base64: string;
  existingCount: number;
}): Promise<void> {
  if (params.existingCount >= MAX_EVIDENCE) throw new EvidenceError(EVIDENCE_LIMIT_MESSAGE);
  const image = checkEvidenceImage(params.base64);
  if (!image.ok) throw new EvidenceError(image.error);

  const path = evidencePath(params.userId, params.reportId, image.type.ext, uniqueSuffix());
  await run(
    db().storage.from(BUCKET).upload(path, image.bytes, { contentType: image.type.mime, upsert: false })
  );

  try {
    await run(db().from('evidence').insert({ report_id: params.reportId, storage_path: path }));
  } catch (e) {
    await removeEvidenceFiles([path]);
    // The database's 3-screenshot limit (e.g. added from another phone meanwhile).
    const cause = e instanceof FriendlyDbError ? (e.cause as { message?: string } | undefined) : undefined;
    if (cause?.message && /at most 3 screenshots/.test(cause.message)) throw new EvidenceError(EVIDENCE_LIMIT_MESSAGE);
    throw e;
  }
}

/** Remove one screenshot: the row first (so it disappears), then the file. */
export async function deleteEvidence(item: Pick<Evidence, 'id' | 'storage_path'>): Promise<void> {
  const rows = await run(db().from('evidence').delete().eq('id', item.id).select('id'));
  if (rows.length === 0) throw new FriendlyDbError({ code: '23503', message: 'evidence not found' });
  await removeEvidenceFiles([item.storage_path]);
}

/** File paths of a report's screenshots (used before deleting the report). */
export async function listEvidencePaths(reportId: string): Promise<string[]> {
  const rows = await run(db().from('evidence').select('storage_path').eq('report_id', reportId));
  return rows.map((r) => r.storage_path);
}

/**
 * Best-effort file clean-up. A file left behind is invisible (it has no row
 * and is in the user's private folder), so a failure here is not shown.
 */
export async function removeEvidenceFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await db().storage.from(BUCKET).remove(paths);
  } catch {
    // Ignore: see above.
  }
}
