import {
  editDistance,
  isIPv4,
  isObfuscatedIp,
  normalizeLookalikes,
  parseUrl,
  registrableDomain,
} from '../domain';

describe('parseUrl', () => {
  it('reads scheme, host, port and the rest', () => {
    expect(parseUrl('HTTPS://Login.Binance.com:8443/claim?x=1#y')).toEqual({
      scheme: 'https',
      userinfo: null,
      host: 'login.binance.com',
      port: 8443,
      rest: '/claim?x=1#y',
    });
  });

  it('accepts addresses without a scheme', () => {
    expect(parseUrl('binance.com/login')).toMatchObject({ scheme: null, host: 'binance.com', rest: '/login' });
    expect(parseUrl('localhost:8080')).toMatchObject({ scheme: null, host: 'localhost', port: 8080 });
  });

  it('separates the hidden "user@" part', () => {
    expect(parseUrl('https://binance.com@evil.xyz/x')).toMatchObject({ userinfo: 'binance.com', host: 'evil.xyz' });
  });

  it('reads bracketed IPv6 hosts', () => {
    expect(parseUrl('http://[2001:db8::1]:8080/')).toMatchObject({ host: '2001:db8::1', port: 8080 });
  });

  it('keeps non-Latin characters in the host', () => {
    expect(parseUrl('https://bіnance.com')?.host).toBe('bіnance.com'); // Cyrillic "і"
  });

  it.each(['', '   ', 'https://', 'not a url', 'https://.com', 'https://a..b.com', 'http://x.com:99999999', 'http://[::1'])(
    'rejects %j',
    (text) => {
      expect(parseUrl(text)).toBeNull();
    }
  );
});

describe('IP helpers', () => {
  it('recognises IPv4 and obfuscated forms', () => {
    expect(isIPv4('192.168.1.1')).toBe(true);
    expect(isIPv4('256.1.1.1')).toBe(false);
    expect(isObfuscatedIp('3232235777')).toBe(true);
    expect(isObfuscatedIp('0x7f.0.0.1')).toBe(true);
    expect(isObfuscatedIp('binance.com')).toBe(false);
    expect(isObfuscatedIp('192.168.1.1')).toBe(false);
  });
});

describe('registrableDomain', () => {
  it.each([
    ['binance.com', 'binance.com'],
    ['login.binance.com', 'binance.com'],
    ['a.b.c.binance.com', 'binance.com'],
    ['www.bsp.com.pg', 'bsp.com.pg'],
    ['bankpng.gov.pg', 'bankpng.gov.pg'],
    ['shop.example.co.uk', 'example.co.uk'],
    ['localhost', 'localhost'],
  ])('%s → %s', (host, domain) => {
    expect(registrableDomain(host)).toBe(domain);
  });
});

describe('editDistance', () => {
  it.each([
    ['binance', 'binance', 0],
    ['binnance', 'binance', 1], // insertion
    ['bnance', 'binance', 1], // deletion
    ['binanse', 'binance', 1], // substitution
    ['bniance', 'binance', 1], // swap
    ['coinbsae', 'coinbase', 1],
    ['kitten', 'sitting', 3],
    ['', 'abc', 3],
  ])('%s vs %s = %i', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
  });
});

describe('normalizeLookalikes', () => {
  it('maps common look-alike characters', () => {
    expect(normalizeLookalikes('b1nance')).toBe('blnance');
    expect(normalizeLookalikes('rnetamask')).toBe('metamask');
    expect(normalizeLookalikes('c0inbase')).toBe('coinbase');
    expect(normalizeLookalikes('vvallet')).toBe('wallet');
  });
});
