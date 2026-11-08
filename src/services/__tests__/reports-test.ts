import {
  createReport,
  deleteReport,
  getReport,
  listMapReports,
  listReports,
  MAP_LIMIT,
  REPORTS_PAGE_SIZE,
  updateReport,
} from '../reports';

const mockRemoveFiles = jest.fn(async (_paths: string[]) => {});
jest.mock('../evidence', () => ({
  listEvidencePaths: async () => ['u/r1-a.jpg'],
  removeEvidenceFiles: (paths: string[]) => mockRemoveFiles(paths),
}));

let mockResult: { data: unknown; error: unknown } | Error = { data: null, error: null };
const mockCalls: [string, unknown[]][] = [];

jest.mock('../supabase', () => ({
  requireSupabase: () => ({
    from: (table: string) => {
      mockCalls.push(['from', [table]]);
      const settle = () => (mockResult instanceof Error ? Promise.reject(mockResult) : Promise.resolve(mockResult));
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => settle().then(resolve, reject),
      };
      for (const m of ['insert', 'update', 'delete', 'select', 'order', 'range', 'eq', 'neq', 'not', 'limit']) {
        builder[m] = (...args: unknown[]) => (mockCalls.push([m, args]), builder);
      }
      for (const m of ['single', 'maybeSingle']) builder[m] = () => (mockCalls.push([m, []]), settle());
      return builder;
    },
  }),
}));

const input = {
  schemeType: 'investment_ponzi' as const,
  platform: 'facebook' as const,
  description: 'Promised to double kina in 7 days.',
  location: { latitude: -9.44, longitude: 147.18 },
};

const row = (n: number, name: string | null = 'Kila') => ({
  id: `r${n}`,
  status: 'approved',
  profiles: name ? { display_name: name } : null,
});

beforeEach(() => {
  mockCalls.length = 0;
  mockRemoveFiles.mockClear();
  mockResult = { data: null, error: null };
});

describe('listReports', () => {
  it('community: approved only, newest first, with the reporter name', async () => {
    mockResult = { data: [row(1), row(2, null)], error: null };
    const page = await listReports('community', 'me', 0);
    expect(mockCalls).toContainEqual(['eq', ['status', 'approved']]);
    expect(mockCalls).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(mockCalls).toContainEqual(['range', [0, REPORTS_PAGE_SIZE]]);
    expect(page).toEqual({
      reports: [
        { id: 'r1', status: 'approved', reporter: 'Kila' },
        { id: 'r2', status: 'approved', reporter: null },
      ],
      nextPage: null,
    });
  });

  it('mine: filters by the user, any status, and pages', async () => {
    mockResult = { data: Array.from({ length: REPORTS_PAGE_SIZE + 1 }, (_, i) => row(i)), error: null };
    const page = await listReports('mine', 'user-1', 1);
    expect(mockCalls).toContainEqual(['eq', ['user_id', 'user-1']]);
    expect(mockCalls).not.toContainEqual(['eq', ['status', 'approved']]);
    expect(mockCalls).toContainEqual(['range', [REPORTS_PAGE_SIZE, 2 * REPORTS_PAGE_SIZE]]);
    expect(page.reports).toHaveLength(REPORTS_PAGE_SIZE);
    expect(page.nextPage).toBe(2);
  });

  it('review: other people’s pending reports, oldest first', async () => {
    mockResult = { data: [], error: null };
    await listReports('review', 'mod-1', 0);
    expect(mockCalls).toContainEqual(['eq', ['status', 'pending']]);
    expect(mockCalls).toContainEqual(['neq', ['user_id', 'mod-1']]);
    expect(mockCalls).toContainEqual(['order', ['created_at', { ascending: true }]]);
  });

  it('includes the moderator’s note so the reporter can read it', async () => {
    mockResult = { data: [], error: null };
    await listReports('mine', 'me', 0);
    const select = mockCalls.find((c) => c[0] === 'select')?.[1][0] as string;
    expect(select).toContain('review_note');
  });

  it('asks for the reporter display name from profiles', async () => {
    mockResult = { data: [], error: null };
    await listReports('community', 'me', 0);
    const select = mockCalls.find((c) => c[0] === 'select')?.[1][0] as string;
    expect(select).toContain('profiles(display_name)');
  });
});

describe('getReport', () => {
  it('returns the report with reporter, or null', async () => {
    mockResult = { data: row(5), error: null };
    await expect(getReport('r5')).resolves.toEqual({ id: 'r5', status: 'approved', reporter: 'Kila' });
    mockResult = { data: null, error: null };
    await expect(getReport('missing')).resolves.toBeNull();
  });
});

describe('createReport', () => {
  it('maps the form to columns and never sends user_id or status', async () => {
    mockResult = { data: { id: 'new' }, error: null };
    await createReport(input);
    const inserted = mockCalls.find((c) => c[0] === 'insert')?.[1][0];
    expect(inserted).toEqual({
      scheme_type: 'investment_ponzi',
      platform: 'facebook',
      description: 'Promised to double kina in 7 days.',
      latitude: -9.44,
      longitude: 147.18,
    });
  });

  it('sends null coordinates when there is no location', async () => {
    mockResult = { data: { id: 'new' }, error: null };
    await createReport({ ...input, location: null });
    expect(mockCalls.find((c) => c[0] === 'insert')?.[1][0]).toMatchObject({ latitude: null, longitude: null });
  });

  it('explains database errors', async () => {
    mockResult = { data: null, error: { code: '23514', message: 'violates check constraint' } };
    await expect(createReport(input)).rejects.toThrow(/not valid/);
  });
});

describe('updateReport / deleteReport', () => {
  it('updates by id', async () => {
    mockResult = { data: [{ id: 'r1', status: 'pending' }], error: null };
    await expect(updateReport('r1', input)).resolves.toEqual({ id: 'r1', status: 'pending' });
    expect(mockCalls).toContainEqual(['eq', ['id', 'r1']]);
    expect(mockCalls.find((c) => c[0] === 'update')?.[1][0]).not.toHaveProperty('status');
  });

  it('explains when the report is gone or not yours', async () => {
    mockResult = { data: [], error: null };
    await expect(updateReport('r1', input)).rejects.toThrow('That item no longer exists.');
    await expect(deleteReport('r1')).rejects.toThrow('That item no longer exists.');
  });

  it('deletes by id', async () => {
    mockResult = { data: [{ id: 'r1' }], error: null };
    await expect(deleteReport('r1')).resolves.toBeUndefined();
    expect(mockCalls.map((c) => c[0])).toEqual(['from', 'delete', 'eq', 'select']);
  });

  it('removes the report’s screenshot files after deleting it', async () => {
    mockResult = { data: [{ id: 'r1' }], error: null };
    await deleteReport('r1');
    expect(mockRemoveFiles).toHaveBeenCalledWith(['u/r1-a.jpg']);
  });

  it('keeps the files if the report could not be deleted', async () => {
    mockResult = { data: [], error: null };
    await expect(deleteReport('r1')).rejects.toThrow();
    expect(mockRemoveFiles).not.toHaveBeenCalled();
  });
});

describe('listMapReports', () => {
  it('asks for approved reports with a location, newest first, capped', async () => {
    mockResult = {
      data: [
        { id: 'a', latitude: -9.44, longitude: 147.18 },
        { id: 'b', latitude: null, longitude: null },
      ],
      error: null,
    };
    await expect(listMapReports()).resolves.toEqual([{ id: 'a', latitude: -9.44, longitude: 147.18 }]);
    expect(mockCalls).toContainEqual(['eq', ['status', 'approved']]);
    expect(mockCalls).toContainEqual(['not', ['latitude', 'is', null]]);
    expect(mockCalls).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(mockCalls).toContainEqual(['limit', [MAP_LIMIT]]);
    const select = mockCalls.find((c) => c[0] === 'select')?.[1][0] as string;
    expect(select).not.toContain('description');
    expect(select).not.toContain('user_id');
  });
});
