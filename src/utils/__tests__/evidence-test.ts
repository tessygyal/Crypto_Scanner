import {
  base64ToBytes,
  checkEvidenceImage,
  detectImageType,
  EVIDENCE_BAD_TYPE_MESSAGE,
  EVIDENCE_TOO_BIG_MESSAGE,
  evidencePath,
  MAX_EVIDENCE_BYTES,
  uniqueSuffix,
} from '../evidence';

const toBase64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes));
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBPVP8 '].map((c) => c.charCodeAt(0)));

describe('base64ToBytes', () => {
  it('decodes plain base64 and data URLs', () => {
    expect([...base64ToBytes(toBase64([1, 2, 255]))]).toEqual([1, 2, 255]);
    expect([...base64ToBytes(`data:image/png;base64,${toBase64([7, 8])}`)]).toEqual([7, 8]);
  });

  it('ignores line breaks in the base64 text', () => {
    const b64 = toBase64([1, 2, 3, 4, 5, 6]);
    expect([...base64ToBytes(`${b64.slice(0, 4)}\n${b64.slice(4)}`)]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP from the first bytes', () => {
    expect(detectImageType(new Uint8Array(JPEG))).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(detectImageType(new Uint8Array(PNG))).toEqual({ mime: 'image/png', ext: 'png' });
    expect(detectImageType(new Uint8Array(WEBP))).toEqual({ mime: 'image/webp', ext: 'webp' });
  });

  it('rejects anything else, including GIFs, PDFs and empty files', () => {
    const gif = [...'GIF89a'].map((c) => c.charCodeAt(0));
    const pdf = [...'%PDF-1.7'].map((c) => c.charCodeAt(0));
    for (const bytes of [gif, pdf, [], [0xff, 0xd8]]) expect(detectImageType(new Uint8Array(bytes))).toBeNull();
  });
});

describe('checkEvidenceImage', () => {
  it('accepts a small JPEG', () => {
    const checked = checkEvidenceImage(toBase64(JPEG));
    expect(checked.ok && checked.type.mime).toBe('image/jpeg');
  });

  it('rejects images over 5 MB', () => {
    const big = new Uint8Array(MAX_EVIDENCE_BYTES + 1);
    big.set(JPEG);
    let binary = '';
    for (let i = 0; i < big.length; i += 0x8000) binary += String.fromCharCode(...big.subarray(i, i + 0x8000));
    expect(checkEvidenceImage(btoa(binary))).toEqual({ ok: false, error: EVIDENCE_TOO_BIG_MESSAGE });
  });

  it('rejects other file types and invalid base64', () => {
    expect(checkEvidenceImage(toBase64([1, 2, 3, 4]))).toEqual({ ok: false, error: EVIDENCE_BAD_TYPE_MESSAGE });
    expect(checkEvidenceImage('***not base64***')).toEqual({ ok: false, error: EVIDENCE_BAD_TYPE_MESSAGE });
  });
});

describe('evidencePath', () => {
  it('puts the file in the user folder, named after the report (as the database requires)', () => {
    const user = '00000000-0000-4000-8000-00000000000a';
    const report = '11111111-1111-4111-8111-111111111111';
    const path = evidencePath(user, report, 'png', 'abc');
    expect(path).toBe(`${user}/${report}-abc.png`);
    // Same pattern as the evidence.storage_path check constraint.
    expect(path).toMatch(/^[0-9a-f-]{36}\/[^/]+$/);
  });
});

describe('uniqueSuffix', () => {
  it('is file-name safe and differs for different times or random values', () => {
    const a = uniqueSuffix(1_700_000_000_000, () => 0.1);
    expect(a).toMatch(/^[a-z0-9]+$/);
    expect(uniqueSuffix(1_700_000_000_000, () => 0.2)).not.toBe(a);
    expect(uniqueSuffix(1_700_000_000_001, () => 0.1)).not.toBe(a);
  });
});
