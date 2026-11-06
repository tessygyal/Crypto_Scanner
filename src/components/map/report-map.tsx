import { useEffect, useMemo, useRef, useState, type ComponentType, type Ref } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { buildMapHtml, focusMessage, parseMapMessage, type MapPlace } from '@/utils/map';

export type MapFocus = { latitude: number; longitude: number; zoom: number; nonce: number };

export type ReportMapProps = {
  places: MapPlace[];
  dark: boolean;
  /** Move the map here; change `nonce` to move again to the same spot. */
  focus: MapFocus | null;
  onSelect: (key: string) => void;
};

/** The one ref method we use. */
type MapWebViewHandle = { postMessage: (message: string) => void };

// The shared typings declare WebView without a ref, but the Android/iOS
// components forward one (with postMessage), so describe that here.
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<MapWebViewHandle> }>;

/** Sent as the page origin so OpenStreetMap tile requests carry a Referer. */
const BASE_URL = 'https://scam-detector-png.app/';

/** Leaflet + OpenStreetMap in a WebView (Android / iOS). No API key needed. */
export function ReportMap({ places, dark, focus, onSelect }: ReportMapProps) {
  const ref = useRef<MapWebViewHandle>(null);
  const html = useMemo(() => buildMapHtml(places, dark), [places, dark]);
  // Which page reported "ready" — a new page (new html) is not ready until it says so.
  const [readyHtml, setReadyHtml] = useState<string | null>(null);
  const ready = readyHtml === html;

  useEffect(() => {
    if (ready && focus) ref.current?.postMessage(focusMessage(focus.latitude, focus.longitude, focus.zoom));
  }, [ready, focus]);

  const onMessage = (event: WebViewMessageEvent) => {
    const message = parseMapMessage(event.nativeEvent.data);
    if (message?.type === 'ready') setReadyHtml(html);
    if (message?.type === 'select') onSelect(message.key);
  };

  return (
    <View style={styles.container} accessibilityLabel="Map of approved scam reports. The same places are listed below the map.">
      <WebView
        ref={ref}
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        // Also mark ready when the page finishes loading, in case its "ready" message was missed.
        onLoadEnd={() => setReadyHtml(html)}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        nestedScrollEnabled
        // Keep the map page in place; open any link (e.g. OpenStreetMap credits) in the browser.
        onShouldStartLoadWithRequest={(request: ShouldStartLoadRequest) => {
          if (request.url === BASE_URL || request.url.startsWith('about:') || request.url.startsWith('data:')) return true;
          if (/^https?:/.test(request.url)) Linking.openURL(request.url);
          return false;
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
