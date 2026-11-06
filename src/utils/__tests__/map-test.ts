import {
  buildMapHtml,
  focusMessage,
  groupByLocation,
  LEAFLET,
  parseMapMessage,
  scriptSafeJson,
} from '../map';

const r = (id: string, latitude: number, longitude: number) => ({ id, latitude, longitude });

describe('groupByLocation', () => {
  it('groups reports at the same rounded location, most reports first', () => {
    const places = groupByLocation([
      r('a', -9.44, 147.18),
      r('b', -6.73, 147.0),
      r('c', -9.44, 147.18),
      r('d', -9.443, 147.181), // rounds to the same place
    ]);
    expect(places.map((p) => [p.key, p.reports.map((x) => x.id)])).toEqual([
      ['-9.44,147.18', ['a', 'c', 'd']],
      ['-6.73,147.00', ['b']],
    ]);
  });

  it('skips invalid coordinates and handles no reports', () => {
    expect(groupByLocation([r('x', NaN, 147), r('y', -9, Infinity)])).toEqual([]);
    expect(groupByLocation([])).toEqual([]);
  });
});

describe('scriptSafeJson', () => {
  it('cannot close the script tag or break out of the JavaScript', () => {
    const text = scriptSafeJson({ key: '</script><script>alert(1)</script>', x: 'a & b', sep: String.fromCharCode(0x2028) });
    expect(text).not.toMatch(/<|>|&/);
    expect(text).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(text)).toEqual({ key: '</script><script>alert(1)</script>', x: 'a & b', sep: String.fromCharCode(0x2028) });
  });
});

describe('parseMapMessage', () => {
  it('accepts valid messages from the map page', () => {
    expect(parseMapMessage('{"source":"scam-map","type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseMapMessage({ source: 'scam-map', type: 'select', key: '-9.44,147.18' })).toEqual({
      type: 'select',
      key: '-9.44,147.18',
    });
  });

  it.each([
    'not json',
    '{"type":"ready"}', // missing source
    { source: 'other', type: 'ready' },
    { source: 'scam-map', type: 'select' }, // missing key
    { source: 'scam-map', type: 'select', key: 'x'.repeat(41) },
    { source: 'scam-map', type: 'navigate', url: 'https://evil.example' },
    null,
    42,
  ])('ignores %j', (data) => {
    expect(parseMapMessage(data)).toBeNull();
  });
});

describe('focusMessage', () => {
  it('builds a focus command for the map page', () => {
    expect(JSON.parse(focusMessage(-9.44, 147.18, 11))).toEqual({
      source: 'scam-app',
      type: 'focus',
      latitude: -9.44,
      longitude: 147.18,
      zoom: 11,
    });
  });
});

describe('buildMapHtml', () => {
  const places = groupByLocation([r('a', -9.44, 147.18), r('b', -9.44, 147.18), r('c', -6.73, 147)]);

  it('loads pinned Leaflet with integrity hashes and OpenStreetMap attribution', () => {
    const html = buildMapHtml(places, false);
    expect(html).toContain(`src="${LEAFLET.js}" integrity="${LEAFLET.jsIntegrity}"`);
    expect(html).toContain(`href="${LEAFLET.css}" integrity="${LEAFLET.cssIntegrity}"`);
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('OpenStreetMap</a> contributors');
  });

  it('includes only keys, coordinates and counts — never report ids or text', () => {
    const html = buildMapHtml(places, false);
    expect(html).toContain('"key":"-9.44,147.18","lat":-9.44,"lng":147.18,"count":2');
    expect(html).toContain('"count":1');
    expect(html).not.toContain('"id"');
  });

  it('switches background for dark mode', () => {
    expect(buildMapHtml([], true)).toContain('#1a1a19');
    expect(buildMapHtml([], false)).toContain('#f4f5f7');
  });

  it('re-measures the map when its size changes (otherwise only part of the map loads)', () => {
    const html = buildMapHtml(places, false);
    expect(html).toContain('new ResizeObserver(onResize)');
    expect(html).toContain('map.invalidateSize()');
  });

  it('shows a message instead of a blank page if Leaflet fails to load', () => {
    expect(buildMapHtml([], false)).toContain("The map couldn't load. Check your internet connection.");
  });
});
