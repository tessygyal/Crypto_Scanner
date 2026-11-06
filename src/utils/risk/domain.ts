/**
 * Small, dependency-free helpers for reading web addresses. We parse URLs
 * ourselves (instead of the URL class) so results are the same on Android,
 * iOS and web, and so we can see non-Latin characters before any conversion.
 */

export type ParsedUrl = {
  /** Lowercased scheme without "://", or null if the user didn't type one. */
  scheme: string | null;
  /** Text before "@" in the address part, e.g. "binance.com" in "https://binance.com@evil.xyz". */
  userinfo: string | null;
  /** Lowercased host name or IP address, without port or brackets. */
  host: string;
  port: number | null;
  /** Everything after the host: path, query and fragment. */
  rest: string;
};

/**
 * Parse a web address. Returns null if there's no usable host.
 * A missing scheme is allowed ("binance.com/login").
 */
export function parseUrl(raw: string): ParsedUrl | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):(\/\/)?/i.exec(text);
  let scheme: string | null = null;
  let afterScheme = text;
  if (schemeMatch && (schemeMatch[2] || !/^\d+$/.test(text.slice(schemeMatch[0].length).split(/[/?#]/)[0]))) {
    // "host:8080" (no "//", digits after the colon) is a port, not a scheme.
    scheme = schemeMatch[1].toLowerCase();
    afterScheme = text.slice(schemeMatch[0].length);
  }

  const end = afterScheme.search(/[/?#\\]/);
  const authority = end === -1 ? afterScheme : afterScheme.slice(0, end);
  const rest = end === -1 ? '' : afterScheme.slice(end);

  const at = authority.lastIndexOf('@');
  const userinfo = at === -1 ? null : authority.slice(0, at);
  let hostPort = at === -1 ? authority : authority.slice(at + 1);

  let host: string;
  let portText: string | undefined;
  if (hostPort.startsWith('[')) {
    const close = hostPort.indexOf(']');
    if (close === -1) return null;
    host = hostPort.slice(1, close);
    portText = hostPort.slice(close + 1).replace(/^:/, '') || undefined;
  } else {
    const colon = hostPort.lastIndexOf(':');
    if (colon !== -1) {
      portText = hostPort.slice(colon + 1);
      hostPort = hostPort.slice(0, colon);
    }
    host = hostPort;
  }

  host = host.toLowerCase().replace(/\.$/, '');
  if (!host || host.startsWith('.') || host.includes('..')) return null;

  let port: number | null = null;
  if (portText !== undefined && portText !== '') {
    if (!/^\d{1,5}$/.test(portText)) return null;
    port = Number(portText);
  }

  return { scheme, userinfo, host, port, rest };
}

export function isIPv4(host: string): boolean {
  const parts = host.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

export function isIPv6(host: string): boolean {
  return host.includes(':') && /^[0-9a-f:.]+$/i.test(host);
}

/** Decimal, hex or octal forms that browsers also treat as an IP, e.g. "3232235777" or "0x7f.1". */
export function isObfuscatedIp(host: string): boolean {
  return /^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){0,3}$/i.test(host) && !isIPv4(host);
}

/** Endings with more than one part, so "bsp.com.pg" counts as one registrable domain. */
const MULTI_PART_SUFFIXES = new Set([
  'com.pg', 'gov.pg', 'org.pg', 'net.pg', 'ac.pg', 'edu.pg',
  'com.au', 'net.au', 'org.au', 'gov.au', 'edu.au',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
  'co.nz', 'org.nz', 'govt.nz',
  'com.fj', 'gov.fj', 'com.sb',
  'co.id', 'com.ph', 'com.sg', 'com.my', 'co.in', 'com.cn', 'com.hk', 'co.jp', 'co.za', 'com.br',
]);

/** The part of a host a person can register, e.g. "login.bsp.com.pg" → "bsp.com.pg". */
export function registrableDomain(host: string): string {
  const labels = host.split('.');
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_PART_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

/** The ending of a registrable domain, e.g. "com.pg" or "xyz". */
export function publicSuffix(domain: string): string {
  return domain.split('.').slice(1).join('.');
}

/** The name part of a registrable domain, e.g. "bsp.com.pg" → "bsp". */
export function domainLabel(domain: string): string {
  return domain.split('.')[0];
}

/**
 * Edit distance counting insertions, deletions, substitutions and swaps of
 * neighbouring letters (optimal string alignment).
 */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Replace characters scammers swap in for look-alike letters ("b1nance" → "binance"). */
export function normalizeLookalikes(text: string): string {
  return text
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');
}
