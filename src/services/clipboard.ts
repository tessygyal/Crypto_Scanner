import * as Clipboard from 'expo-clipboard';

/**
 * Read text from the clipboard, trimmed. Returns '' when the clipboard is empty,
 * when the user denied paste permission (iOS and web ask first), or on any error.
 * The text stays on the phone.
 */
export async function readClipboardText(): Promise<string> {
  try {
    return (await Clipboard.getStringAsync()).trim();
  } catch {
    return '';
  }
}
