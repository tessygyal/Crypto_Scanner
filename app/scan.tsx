import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Disclaimer } from '@/components/disclaimer';
import { FormMessage } from '@/components/form/form-message';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { scanQrFromImage } from '@/services/qr-image';
import { explainQr, parseQr, type QrContent } from '@/utils/qr';

type Found = Exclude<QrContent, { kind: 'link' }> & { raw: string };

export default function ScanScreen() {
  const theme = useTheme();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [found, setFound] = useState<Found | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  /** Links go straight to the normal link check; everything else is explained here. */
  const handle = (raw: string) => {
    const content = parseQr(raw);
    if (content.kind === 'link') {
      router.replace({ pathname: '/check-result', params: { type: 'url', input: content.url, source: 'qr' } });
      return;
    }
    setFound({ ...content, raw: raw.trim() });
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (found) return;
    handle(data);
  };

  const fromImage = async () => {
    setMessage(null);
    setPicking(true);
    const result = await scanQrFromImage();
    setPicking(false);
    if (result.status === 'found') handle(result.data);
    else if (result.status === 'not_found') setMessage('No QR code found in that image. Try a clearer, uncropped screenshot.');
    else if (result.status === 'error') setMessage('Couldn’t read that image. Try another one.');
  };

  if (found) {
    const { title, detail } = explainQr(found);
    return (
      <Screen hasHeader>
        <Card>
          <View className="flex-row items-center gap-sm">
            <Ionicons name="qr-code" size={22} color={theme.primary} />
            <ThemedText variant="heading" className="flex-1">
              {title}
            </ThemedText>
          </View>
          <ThemedText>{detail}</ThemedText>
          {found.raw ? (
            <View className="gap-xs rounded-md bg-surface-selected p-sm">
              <ThemedText variant="smallBold" color="textSecondary">
                What the QR code contains
              </ThemedText>
              <ThemedText variant="small" selectable numberOfLines={8}>
                {found.raw}
              </ThemedText>
            </View>
          ) : null}
        </Card>
        <Button label="Scan another QR code" onPress={() => setFound(null)} fullWidth />
        <Disclaimer />
      </Screen>
    );
  }

  const canUseCamera = permission?.granted;

  return (
    <Screen hasHeader>
      <ThemedText color="textSecondary">
        Point your camera at a QR code. If it holds a link, we check it for risk indicators before you open it.
        Nothing is opened or paid.
      </ThemedText>

      {permission === null ? null : canUseCamera ? (
        <View
          className="aspect-square w-full overflow-hidden rounded-lg bg-hero"
          accessibilityLabel="Camera view for scanning a QR code">
          {/* Only one camera preview may run at a time, so stop it when the screen isn't visible. */}
          {focused && (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={found ? undefined : onScanned}
            />
          )}
        </View>
      ) : (
        <Card>
          <ThemedText variant="bodyBold">Camera access needed</ThemedText>
          <ThemedText color="textSecondary">
            The camera is only used to read QR codes. No photos are saved or uploaded.
          </ThemedText>
          {permission.canAskAgain ? (
            <Button label="Allow camera" onPress={requestPermission} />
          ) : Platform.OS !== 'web' ? (
            <Button label="Open settings" variant="secondary" onPress={() => Linking.openSettings()} />
          ) : (
            <ThemedText variant="small" color="textSecondary">
              Allow camera access in your browser’s site settings, then reload.
            </ThemedText>
          )}
        </Card>
      )}

      <Button
        label="Scan from a screenshot"
        variant="secondary"
        onPress={fromImage}
        loading={picking}
        fullWidth
      />
      {message && <FormMessage tone="error" message={message} />}
    </Screen>
  );
}
