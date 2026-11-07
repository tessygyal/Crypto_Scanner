import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { buildMapHtml, focusMessage, parseMapMessage } from '@/utils/map';

import type { ReportMapProps } from './report-map';

/** Web version: the same Leaflet page in an iframe. */
export function ReportMap({ places, dark, focus, onSelect }: ReportMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => buildMapHtml(places, dark), [places, dark]);
  // Which page reported "ready" — a new page (new html) is not ready until it says so.
  const [readyHtml, setReadyHtml] = useState<string | null>(null);
  const ready = readyHtml === html;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Only listen to our own iframe.
      if (event.source !== frame.current?.contentWindow) return;
      const message = parseMapMessage(event.data);
      if (message?.type === 'ready') setReadyHtml(html);
      if (message?.type === 'select') onSelect(message.key);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [html, onSelect]);

  useEffect(() => {
    if (ready && focus) {
      frame.current?.contentWindow?.postMessage(focusMessage(focus.latitude, focus.longitude, focus.zoom), '*');
    }
  }, [ready, focus]);

  return (
    <View className="flex-1 overflow-hidden" accessibilityLabel="Map of approved scam reports. The same places are listed below the map.">
      <iframe
        ref={frame}
        title="Map of approved scam reports"
        srcDoc={html}
        // The load event fires after the page's scripts (including Leaflet) have run.
        // The page's own "ready" message can arrive before our listener is attached
        // when Leaflet is cached, so don't rely on it alone.
        onLoad={() => setReadyHtml(html)}
        // Scripts for Leaflet; same-origin so tile requests carry a Referer; popups for the credit links.
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}
