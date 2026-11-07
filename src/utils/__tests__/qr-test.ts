import { analyzeUrl } from '@/utils/risk/url-analysis';

import { explainQr, MAX_QR_LENGTH, parseQr } from '../qr';

describe('parseQr — links', () => {
  it.each([
    ['https://www.binance.com', 'https://www.binance.com'],
    ['  http://binance-airdrop.xyz/claim \n', 'http://binance-airdrop.xyz/claim'],
    ['HTTPS://EXAMPLE.COM', 'HTTPS://EXAMPLE.COM'],
    ['www.example.com', 'www.example.com'],
    ['b1nance.com/login?ref=1', 'b1nance.com/login?ref=1'],
    ['URL:https://example.com/x', 'https://example.com/x'],
    ['URLTO:example.com', 'example.com'],
    ['MEBKM:TITLE:Prize;URL:https://claim-prize.top;;', 'https://claim-prize.top'],
    ['Claim your reward now: https://reward.example.top/go). Hurry!', 'https://reward.example.top/go'],
  ])('%s → link %s', (raw, url) => {
    expect(parseQr(raw)).toEqual({ kind: 'link', url });
  });

  it('keeps dangerous schemes as links so the checker can flag them', () => {
    const content = parseQr('javascript:alert(1)');
    expect(content).toEqual({ kind: 'link', url: 'javascript:alert(1)' });
    const analysis = analyzeUrl(content.kind === 'link' ? content.url : '');
    expect(analysis.ok && analysis.result.signals.map((s) => s.id)).toContain('dangerous_scheme');
  });

  it('gives the link checker addresses it can read', () => {
    for (const raw of ['www.example.com', 'b1nance.com/login', 'URL:https://example.com']) {
      const content = parseQr(raw);
      expect(content.kind === 'link' && analyzeUrl(content.url).ok).toBe(true);
    }
  });
});

describe('parseQr — crypto', () => {
  it('reads payment URIs with amount', () => {
    expect(parseQr('bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.05&label=Prize')).toEqual({
      kind: 'crypto',
      coin: 'Bitcoin',
      address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      amount: '0.05',
    });
    expect(parseQr('ethereum:0x52908400098527886E0F7030069857D2E4169EE7')).toEqual({
      kind: 'crypto',
      coin: 'Ethereum',
      address: '0x52908400098527886E0F7030069857D2E4169EE7',
    });
  });

  it.each([
    ['0x52908400098527886E0F7030069857D2E4169EE7', 'Ethereum or similar (e.g. USDT, BNB)'],
    ['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'Bitcoin'],
    ['1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'Bitcoin'],
    ['TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', 'TRON (often USDT)'],
  ])('recognises the bare address %s', (address, coin) => {
    expect(parseQr(address)).toEqual({ kind: 'crypto', coin, address });
  });
});

describe('parseQr — other content', () => {
  it('reads Wi-Fi network names, including escaped characters', () => {
    expect(parseQr('WIFI:T:WPA;S:Free\\;Airport;P:secret;;')).toEqual({ kind: 'wifi', network: 'Free;Airport' });
    expect(parseQr('WIFI:T:nopass;;')).toEqual({ kind: 'wifi' });
  });

  it('reads phone, SMS and email codes', () => {
    expect(parseQr('tel:+67571234567')).toEqual({ kind: 'contact', method: 'phone', value: '+67571234567' });
    expect(parseQr('SMSTO:+67571234567:You won')).toEqual({ kind: 'contact', method: 'sms', value: '+67571234567' });
    expect(parseQr('sms:+67571234567?body=hi')).toEqual({ kind: 'contact', method: 'sms', value: '+67571234567' });
    expect(parseQr('mailto:support@example.com?subject=x')).toEqual({
      kind: 'contact',
      method: 'email',
      value: 'support@example.com',
    });
  });

  it('treats everything else as text, and blank codes as empty', () => {
    expect(parseQr('Table 12 — order at the counter')).toEqual({ kind: 'text', text: 'Table 12 — order at the counter' });
    expect(parseQr('   ')).toEqual({ kind: 'empty' });
  });

  it('caps very long content', () => {
    const content = parseQr('x'.repeat(MAX_QR_LENGTH + 500));
    expect(content.kind === 'text' && content.text.length).toBe(MAX_QR_LENGTH);
  });
});

describe('explainQr', () => {
  const VERDICTS = /\b(safe|legit|legitimate|this is a scam|genuine)\b/i;

  it('warns that crypto payments cannot be reversed and shows the amount', () => {
    const e = explainQr({ kind: 'crypto', coin: 'Bitcoin', address: 'bc1q', amount: '0.05' });
    expect(e.title).toContain('Bitcoin');
    expect(e.detail).toContain('0.05');
    expect(e.detail).toMatch(/cannot be reversed/);
  });

  it('never gives a verdict', () => {
    const all = [
      explainQr({ kind: 'crypto', coin: 'Bitcoin', address: 'x' }),
      explainQr({ kind: 'wifi', network: 'Cafe' }),
      explainQr({ kind: 'wifi' }),
      explainQr({ kind: 'contact', method: 'phone', value: '+675' }),
      explainQr({ kind: 'contact', method: 'sms', value: '+675' }),
      explainQr({ kind: 'contact', method: 'email', value: 'a@b.c' }),
      explainQr({ kind: 'text', text: 'hi' }),
      explainQr({ kind: 'empty' }),
    ];
    for (const e of all) expect(`${e.title} ${e.detail}`).not.toMatch(VERDICTS);
  });
});
