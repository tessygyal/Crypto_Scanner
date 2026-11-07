import { scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export type QrImageResult =
  | { status: 'cancelled' }
  | { status: 'found'; data: string }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Let the user pick a screenshot or photo and read the first QR code in it.
 * Scam QR codes often arrive as images in chats, so this works without the camera.
 * The image stays on the phone.
 */
export async function scanQrFromImage(): Promise<QrImageResult> {
  try {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets?.length) return { status: 'cancelled' };

    const codes = await scanFromURLAsync(picked.assets[0].uri, ['qr']);
    const data = codes.find((c) => c.data)?.data;
    return data ? { status: 'found', data } : { status: 'not_found' };
  } catch {
    return { status: 'error' };
  }
}
