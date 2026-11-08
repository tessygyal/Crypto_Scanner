import { deleteEvidence, listEvidence, pickEvidenceImage, removeEvidenceFiles, uploadEvidence } from '../evidence';

type Result = { data: unknown; error: unknown };

// Each table call takes the next queued result.
const mockResults: Result[] = [];
const mockCalls: [string, unknown[]][] = [];
const mockStorage = {
  upload: jest.fn(async (..._args: unknown[]): Promise<Result> => ({ data: { path: 'p' }, error: null })),
  remove: jest.fn(async (..._args: unknown[]): Promise<Result> => ({ data: [], error: null })),
  createSignedUrls: jest.fn(async (..._args: unknown[]): Promise<Result> => ({ data: [], error: null })),
};

jest.mock('../supabase', () => ({
  requireSupabase: () => ({
    storage: { from: () => mockStorage },
    from: (table: string) => {
      mockCalls.push(['from', [table]]);
      const settle = () => Promise.resolve(mockResults.shift() ?? { data: null, error: null });
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => settle().then(resolve, reject),
      };
      for (const m of ['insert', 'delete', 'select', 'order', 'eq']) {
        builder[m] = (...args: unknown[]) => (mockCalls.push([m, args]), builder);
      }
      return builder;
    },
  }),
}));

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockLaunch(...a) }));

const USER = '00000000-0000-4000-8000-00000000000a';
const REPORT = '11111111-1111-4111-8111-111111111111';
const JPEG_B64 = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3));

beforeEach(() => {
  mockResults.length = 0;
  mockCalls.length = 0;
  jest.clearAllMocks();
});

describe('listEvidence', () => {
  it('returns nothing (and makes no links) for a report without screenshots', async () => {
    mockResults.push({ data: [], error: null });
    await expect(listEvidence(REPORT)).resolves.toEqual([]);
    expect(mockStorage.createSignedUrls).not.toHaveBeenCalled();
  });

  it('adds a temporary link to each screenshot, or null when one fails', async () => {
    mockResults.push({
      data: [
        { id: 'e1', report_id: REPORT, storage_path: 'a.jpg', created_at: 't1' },
        { id: 'e2', report_id: REPORT, storage_path: 'b.jpg', created_at: 't2' },
      ],
      error: null,
    });
    mockStorage.createSignedUrls.mockResolvedValueOnce({
      data: [
        { path: 'a.jpg', signedUrl: 'https://x/a', error: null },
        { path: 'b.jpg', signedUrl: null, error: 'not found' },
      ],
      error: null,
    });
    const list = await listEvidence(REPORT);
    expect(list.map((e) => e.url)).toEqual(['https://x/a', null]);
    expect(mockCalls).toContainEqual(['eq', ['report_id', REPORT]]);
    expect(mockStorage.createSignedUrls).toHaveBeenCalledWith(['a.jpg', 'b.jpg'], 3600);
  });
});

describe('uploadEvidence', () => {
  const params = { userId: USER, reportId: REPORT, base64: JPEG_B64, existingCount: 0 };

  it('uploads into the user folder with the right type, then links it to the report', async () => {
    await uploadEvidence(params);
    const [path, body, options] = mockStorage.upload.mock.calls[0] as [string, Uint8Array, object];
    expect(path).toMatch(new RegExp(`^${USER}/${REPORT}-[a-z0-9]+\\.jpg$`));
    expect(body).toBeInstanceOf(Uint8Array);
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect(mockCalls.find((c) => c[0] === 'insert')?.[1][0]).toEqual({ report_id: REPORT, storage_path: path });
  });

  it('refuses a fourth screenshot without uploading', async () => {
    await expect(uploadEvidence({ ...params, existingCount: 3 })).rejects.toThrow(/at most 3 screenshots/);
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  it('refuses files that are not images without uploading', async () => {
    await expect(uploadEvidence({ ...params, base64: btoa('%PDF-1.7') })).rejects.toThrow(/JPEG, PNG or WebP/);
    expect(mockStorage.upload).not.toHaveBeenCalled();
  });

  it('shows a friendly message when the upload fails', async () => {
    mockStorage.upload.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    await expect(uploadEvidence(params)).rejects.toThrow(/connect/i);
  });

  it('removes the uploaded file if it could not be linked to the report', async () => {
    mockResults.push({ data: null, error: { code: '42501', message: 'row-level security' } });
    await expect(uploadEvidence(params)).rejects.toThrow("You don't have permission to do that.");
    const uploaded = mockStorage.upload.mock.calls[0][0];
    expect(mockStorage.remove).toHaveBeenCalledWith([uploaded]);
  });

  it('explains the database limit when another upload got there first', async () => {
    mockResults.push({ data: null, error: { code: '23514', message: 'a report can have at most 3 screenshots' } });
    await expect(uploadEvidence(params)).rejects.toThrow(/at most 3 screenshots/);
  });
});

describe('deleteEvidence', () => {
  it('deletes the row, then the file', async () => {
    mockResults.push({ data: [{ id: 'e1' }], error: null });
    await deleteEvidence({ id: 'e1', storage_path: 'u/r-a.jpg' });
    expect(mockCalls).toContainEqual(['eq', ['id', 'e1']]);
    expect(mockStorage.remove).toHaveBeenCalledWith(['u/r-a.jpg']);
  });

  it('keeps the file when the row was not deleted', async () => {
    mockResults.push({ data: [], error: null });
    await expect(deleteEvidence({ id: 'e1', storage_path: 'u/r-a.jpg' })).rejects.toThrow('That item no longer exists.');
    expect(mockStorage.remove).not.toHaveBeenCalled();
  });
});

describe('removeEvidenceFiles', () => {
  it('does nothing for an empty list and never throws', async () => {
    await removeEvidenceFiles([]);
    expect(mockStorage.remove).not.toHaveBeenCalled();
    mockStorage.remove.mockRejectedValueOnce(new Error('offline'));
    await expect(removeEvidenceFiles(['a'])).resolves.toBeUndefined();
  });
});

describe('pickEvidenceImage', () => {
  it('asks for a re-saved image without location data', async () => {
    mockLaunch.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickEvidenceImage()).resolves.toEqual({ status: 'cancelled' });
    expect(mockLaunch).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], base64: true, exif: false }));
  });

  it('returns the picked image data', async () => {
    mockLaunch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://a', base64: JPEG_B64 }] });
    await expect(pickEvidenceImage()).resolves.toEqual({ status: 'picked', base64: JPEG_B64 });
  });

  it('explains when the picker fails or gives no data', async () => {
    mockLaunch.mockRejectedValueOnce(new Error('boom'));
    await expect(pickEvidenceImage()).rejects.toThrow(/photos/);
    mockLaunch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://a', base64: null }] });
    await expect(pickEvidenceImage()).rejects.toThrow(/read that image/);
  });
});
