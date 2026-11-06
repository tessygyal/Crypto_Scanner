/**
 * Pure helpers for the community map. The map itself is Leaflet with
 * OpenStreetMap tiles, running in a WebView (phones) or an iframe (web).
 * No API key is needed.
 */

/** Roughly the middle of Papua New Guinea, zoomed out to show the country. */
export const PNG_CENTER = { latitude: -6.5, longitude: 147.0 };
export const PNG_ZOOM = 5;

/** Leaflet 1.9.4 from unpkg, pinned with Subresource Integrity hashes. */
export const LEAFLET = {
  js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  jsIntegrity: 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH',
  css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  cssIntegrity: 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H',
};

export type MapReport = {
  id: string;
  latitude: number;
  longitude: number;
};

export type MapPlace<T extends MapReport = MapReport> = {
  /** Stable key for this location, e.g. "-9.44,147.18". */
  key: string;
  latitude: number;
  longitude: number;
  reports: T[];
};

/**
 * Group reports that share the same (rounded) location into one place, so
 * they show as one marker with a count. Most reports first.
 */
export function groupByLocation<T extends MapReport>(reports: T[]): MapPlace<T>[] {
  const places = new Map<string, MapPlace<T>>();
  for (const r of reports) {
    if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) continue;
    const key = `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`;
    const place = places.get(key) ?? { key, latitude: r.latitude, longitude: r.longitude, reports: [] };
    place.reports.push(r);
    places.set(key, place);
  }
  return [...places.values()].sort((a, b) => b.reports.length - a.reports.length || a.key.localeCompare(b.key));
}

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * JSON that is safe to place inside an HTML <script> element: escapes
 * characters that could close the script tag or break the JavaScript.
 */
export function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LINE_SEPARATOR)
    .join('\\u2028')
    .split(PARAGRAPH_SEPARATOR)
    .join('\\u2029');
}

/** Messages the map page sends to the app. */
export type MapMessage = { type: 'ready' } | { type: 'select'; key: string };

/** Validate a message from the map page; anything unexpected is ignored. */
export function parseMapMessage(data: unknown): MapMessage | null {
  let value = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (m.source !== 'scam-map') return null;
  if (m.type === 'ready') return { type: 'ready' };
  if (m.type === 'select' && typeof m.key === 'string' && m.key.length <= 40) return { type: 'select', key: m.key };
  return null;
}

/** A message the app sends to the map page to move the view. */
export function focusMessage(latitude: number, longitude: number, zoom: number): string {
  return JSON.stringify({ source: 'scam-app', type: 'focus', latitude, longitude, zoom });
}

/**
 * The whole map page. Only numbers and our own keys are injected (never
 * user-written text), and they go in as escaped JSON.
 */
export function buildMapHtml(places: Pick<MapPlace, 'key' | 'latitude' | 'longitude' | 'reports'>[], dark: boolean): string {
  const markers = places.map((p) => ({ key: p.key, lat: p.latitude, lng: p.longitude, count: p.reports.length }));
  const config = { markers, center: [PNG_CENTER.latitude, PNG_CENTER.longitude], zoom: PNG_ZOOM, dark };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="${LEAFLET.css}" integrity="${LEAFLET.cssIntegrity}" crossorigin="" />
<style>
  html, body, #map { height: 100%; margin: 0; background: ${dark ? '#1a1a19' : '#f4f5f7'}; }
  .count { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
    border-radius: 50%; background: #d03b3b; color: #fff; border: 2px solid #fff;
    font: 600 13px system-ui, sans-serif; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  .error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    padding: 24px; text-align: center; font: 15px system-ui, sans-serif; color: ${dark ? '#f0efec' : '#0b0b0b'}; }
</style>
</head>
<body>
<div id="map" role="application" aria-label="Map of approved scam reports"></div>
<script src="${LEAFLET.js}" integrity="${LEAFLET.jsIntegrity}" crossorigin=""></script>
<script>
(function () {
  var config = ${scriptSafeJson(config)};
  function send(msg) {
    msg.source = 'scam-map';
    var text = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent !== window) window.parent.postMessage(text, '*');
  }
  if (!window.L) {
    var div = document.createElement('div');
    div.className = 'error';
    div.textContent = "The map couldn't load. Check your internet connection.";
    document.body.appendChild(div);
    send({ type: 'ready' });
    return;
  }
  var map = L.map('map', { zoomControl: true }).setView(config.center, config.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var bounds = [];
  var userMoved = false;
  map.on('dragstart', function () { userMoved = true; });
  function fitToMarkers() {
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    else if (bounds.length === 1) map.setView(bounds[0], 9);
  }
  config.markers.forEach(function (m) {
    var size = m.count > 9 ? 36 : m.count > 1 ? 32 : 28;
    var icon = L.divIcon({ className: '', html: '<div class="count">' + Number(m.count) + '</div>',
      iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    L.marker([m.lat, m.lng], { icon: icon, keyboard: true, title: m.count + (m.count === 1 ? ' report' : ' reports') })
      .addTo(map)
      .on('click', function () { send({ type: 'select', key: m.key }); });
    bounds.push([m.lat, m.lng]);
  });
  fitToMarkers();

  // The page can start before its final size is known (e.g. while the app lays
  // out). Re-measure whenever the size changes, otherwise Leaflet only loads
  // tiles for the first, smaller area. Re-fit until the user moves the map.
  function onResize() {
    map.invalidateSize();
    if (!userMoved) fitToMarkers();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.getElementById('map'));
  else window.addEventListener('resize', onResize);

  function onMessage(event) {
    var data = event.data;
    try { data = typeof data === 'string' ? JSON.parse(data) : data; } catch (e) { return; }
    if (!data || data.source !== 'scam-app' || data.type !== 'focus') return;
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
    userMoved = true;
    map.setView([data.latitude, data.longitude], typeof data.zoom === 'number' ? data.zoom : 11);
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage); // Android WebView
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
