import { analyzeUrl } from '../url-analysis';

/** Analyse and return the result, failing the test if the input was rejected. */
function check(url: string) {
  const a = analyzeUrl(url);
  if (!a.ok) throw new Error(`rejected: ${a.error}`);
  return a.result;
}
const ids = (url: string) => check(url).signals.map((s) => s.id);

describe('invalid input', () => {
  it.each([
    ['', 'Enter a link to check.'],
    ['   ', 'Enter a link to check.'],
    ['hello there', "That doesn't look like a web link"],
    ['mailto:someone@example.com', "That doesn't look like a web link"],
    ['ftp://files.example.com', "That doesn't look like a web link"],
  ])('%j', (input, message) => {
    const a = analyzeUrl(input);
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toContain(message);
  });

  it('rejects very long input', () => {
    expect(analyzeUrl(`https://example.com/${'a'.repeat(2100)}`).ok).toBe(false);
  });
});

describe('individual rules', () => {
  it.each([
    ['javascript:alert(1)', 'dangerous_scheme'],
    ['data:text/html,<script>', 'dangerous_scheme'],
    ['http://example.com', 'no_https'],
    ['https://binance.com@evil-site.com', 'userinfo_trick'],
    ['http://185.23.44.10/login', 'raw_ip'],
    ['https://3232235777/login', 'raw_ip'],
    ['http://[2001:db8::1]/', 'raw_ip'],
    ['https://xn--bnance-6va.com', 'punycode'],
    ['https://bіnance.com', 'punycode'], // Cyrillic "і"
    ['https://example.com:8443/', 'unusual_port'],
    ['https://bit.ly/3abcXYZ', 'shortener'],
    ['https://cheap-tokens.xyz', 'abused_ending'],
    ['https://this-is-a-really-long-website-name-for-testing.com', 'long_domain'],
    ['https://a.b.c.example.com', 'many_subdomains'],
    ['https://secure-login-wallet.com', 'many_hyphens'],
    ['https://example.com/airdrop/claim', 'scam_words'],
  ])('%s → %s', (url, id) => {
    expect(ids(url)).toContain(id);
  });

  it('does not flag https, ports 80/443 or ordinary paths', () => {
    expect(ids('https://example.com:443/about')).toEqual([]);
    expect(ids('http://example.com:80/')).toEqual(['no_https']);
  });

  it('caps scam-word weight at 25', () => {
    const words = check('https://example.com/airdrop-giveaway-bonus-claim-reward').signals.find((s) => s.id === 'scam_words');
    expect(words?.weight).toBe(25);
    expect(words?.detail).toContain('"airdrop"');
  });
});

describe('brand impersonation', () => {
  it.each([
    ['https://binnance.com', 'lookalike'], // extra letter
    ['https://b1nance.com', 'lookalike'], // digit for letter
    ['https://rnetamask.io', 'lookalike'], // "rn" for "m"
    ['https://coinbsae.com', 'lookalike'], // swapped letters
    ['https://trustwalet.com', 'lookalike'],
    ['https://kinabnk.com.pg', 'lookalike'],
    ['https://binance.xyz', 'brand_other_domain'],
    ['https://metamask.app', 'brand_other_domain'],
    ['https://bsp.com', 'brand_other_domain'],
    ['https://binance-airdrop.com', 'brand_in_address'],
    ['https://login.metamask.wallet-verify.io', 'brand_in_address'],
    ['https://bsp-online-banking.net', 'brand_in_address'],
  ])('%s → %s', (url, id) => {
    const result = check(url);
    expect(result.signals.map((s) => s.id)).toContain(id);
    expect(result.signals.find((s) => s.id === id)?.title).toMatch(/^Pretends to be /);
  });

  it.each(['https://www.binance.com/en', 'https://app.uniswap.org', 'https://www.bsp.com.pg', 'https://kinabank.com.pg/personal'])(
    'official address %s has no risk indicators',
    (url) => {
      const result = check(url);
      expect(result.score).toBe(0);
      expect(result.level).toBe('none');
      expect(result.signals.map((s) => s.id)).toEqual(['official_domain']);
    }
  );

  it.each([
    'https://example.com',
    'https://www.google.com/search?q=png',
    'https://github.com/expo/expo',
    'https://www.post-courier.com.pg',
    'https://cryptonews.com',
    'https://learn.microsoft.com',
    'https://ledger-academy.org', // "ledger" is an ordinary word, so not matched as a brand word
    'https://binary.com',
  ])('ordinary site %s is not flagged as impersonation', (url) => {
    const found = ids(url);
    for (const id of ['lookalike', 'brand_other_domain', 'brand_in_address']) expect(found).not.toContain(id);
  });
});

describe('scoring and levels', () => {
  it('ordinary https link: no known warnings', () => {
    expect(check('https://example.com')).toMatchObject({ score: 0, level: 'none', signals: [], type: 'url' });
  });

  it('http only: low', () => {
    expect(check('http://example.com')).toMatchObject({ score: 15, level: 'low' });
  });

  it('IP address over http: medium', () => {
    expect(check('http://185.23.44.10/')).toMatchObject({ score: 45, level: 'medium' });
  });

  it.each([
    'http://binance-airdrop.xyz/claim',
    'https://b1nance.com/double-your-btc',
    'https://binance.com@185.23.44.10/login',
    'javascript:alert(document.cookie)',
  ])('typical scam link %s: high', (url) => {
    expect(check(url).level).toBe('high');
  });

  it('never exceeds 100', () => {
    const result = check('http://user@xn--bnance-6va.binance-airdrop-claim-bonus.wallet.verify.login.xyz:8080/airdrop/claim/bonus/double');
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toBe('high');
  });

  it('keeps the original input (trimmed)', () => {
    expect(check('  https://example.com/path  ').input).toBe('https://example.com/path');
  });
});
