import * as Clipboard from 'expo-clipboard';

import { readClipboardText } from '../clipboard';

jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn() }));
const getString = Clipboard.getStringAsync as jest.Mock;

describe('readClipboardText', () => {
  it('returns the clipboard text, trimmed', async () => {
    getString.mockResolvedValue('  https://example.com \n');
    await expect(readClipboardText()).resolves.toBe('https://example.com');
  });

  it('returns an empty string when the clipboard is empty or paste was denied', async () => {
    getString.mockResolvedValue('');
    await expect(readClipboardText()).resolves.toBe('');
  });

  it('returns an empty string instead of throwing', async () => {
    getString.mockRejectedValue(new Error('not allowed'));
    await expect(readClipboardText()).resolves.toBe('');
  });
});
