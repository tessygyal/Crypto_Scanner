import { isModerator, moderateReport } from '../moderation';

let mockResult: { data: unknown; error: unknown } = { data: null, error: null };
const mockRpc = jest.fn((..._args: unknown[]) => Promise.resolve(mockResult));

jest.mock('../supabase', () => ({ requireSupabase: () => ({ rpc: mockRpc }) }));

beforeEach(() => {
  mockRpc.mockClear();
  mockResult = { data: null, error: null };
});

describe('isModerator', () => {
  it('is true only when the database says true', async () => {
    mockResult = { data: true, error: null };
    await expect(isModerator()).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('is_moderator');
    mockResult = { data: false, error: null };
    await expect(isModerator()).resolves.toBe(false);
    mockResult = { data: null, error: null };
    await expect(isModerator()).resolves.toBe(false);
  });

  it('explains errors', async () => {
    mockResult = { data: null, error: { message: 'Failed to fetch' } };
    await expect(isModerator()).rejects.toThrow(/connect/i);
  });
});

describe('moderateReport', () => {
  it('sends the decision and a trimmed note', async () => {
    await moderateReport('r1', 'rejected', '  Remove the name.  ');
    expect(mockRpc).toHaveBeenCalledWith('moderate_report', { report_id: 'r1', decision: 'rejected', note: 'Remove the name.' });
  });

  it('sends no note when it is blank', async () => {
    await moderateReport('r1', 'approved', '   ');
    expect(mockRpc).toHaveBeenCalledWith('moderate_report', { report_id: 'r1', decision: 'approved', note: null });
  });

  it('explains permission errors and missing reports', async () => {
    mockResult = { data: null, error: { code: '42501', message: 'only moderators can review reports' } };
    await expect(moderateReport('r1', 'approved', '')).rejects.toThrow("You don't have permission to do that.");
    mockResult = { data: null, error: { code: 'P0002', message: 'report not found' } };
    await expect(moderateReport('r1', 'approved', '')).rejects.toThrow('That item no longer exists.');
  });
});
