/**
 * Work out what a scanned QR code contains, so the app can check links and
 * explain everything else. Runs on the phone; nothing is opened or sent.
 */

export type QrContent =
  | { kind: 'link'; url: string }
  | { kind: 'crypto'; coin: string; address: string; amount?: string }
  | { kind: 'wifi'; network?: string }
  | { kind: 'contact'; method: 'phone' | 'sms' | 'email'; value: string }
  | { kind: 'text'; text: string }
  | { kind: 'empty' };

/** Longest QR content we read; real QR codes hold at most ~4,300 characters. */
export const MAX_QR_LENGTH = 4096;

/** Payment schemes used by crypto wallets (BIP-21 style: coin:address?amount=…). */
const CRYPTO_SCHEMES: Record<string, string> = {
  bitcoin: 'Bitcoin',
  bitcoincash: 'Bitcoin Cash',
  ethereum: 'Ethereum',
  litecoin: 'Litecoin',
  dogecoin: 'Dogecoin',
  tron: 'TRON',
  solana: 'Solana',
  monero: 'Monero',
  ripple: 'XRP',
  xrp: 'XRP',
  bnb: 'BNB',
  usdt: 'USDT',
};

/** Bare wallet addresses, most specific first. */
const RAW_ADDRESSES: { coin: string; pattern: RegExp }[] = [
  { coin: 'Ethereum or similar (e.g. USDT, BNB)', pattern: /^0x[0-9a-fA-F]{40}$/ },
  { coin: 'Bitcoin', pattern: /^bc1[02-9ac-hj-np-z]{25,87}$/i },
  { coin: 'TRON (often USDT)', pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/ },
  { coin: 'Bitcoin', pattern: /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/ },
];

/** Looks like a web address without "https://" (e.g. www.example.com/claim). */
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

/** First http(s) link inside longer text. */
const EMBEDDED_LINK = /https?:\/\/[^\s<>"']+/i;

/** Schemes the link checker understands (it flags the dangerous ones). */
const LINK_SCHEMES = new Set(['http', 'https', 'javascript', 'data', 'vbscript', 'file']);

export function parseQr(raw: string): QrContent {
  const data = raw.trim().slice(0, MAX_QR_LENGTH);
  if (!data) return { kind: 'empty' };

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(data)?.[1]?.toLowerCase();

  if (scheme && LINK_SCHEMES.has(scheme)) return { kind: 'link', url: data };

  // MECARD-style bookmarks: "URL:https://…", "URLTO:…", "MEBKM:TITLE:x;URL:https://…;;"
  const bookmark = /(?:^|;|MEBKM:)URL(?:TO)?:([^;]+)/i.exec(data);
  if (bookmark && /^(?:url|urlto|mebkm):/i.test(data)) return { kind: 'link', url: bookmark[1].trim() };

  if (scheme && scheme in CRYPTO_SCHEMES) {
    const [address, query = ''] = data.slice(scheme.length + 1).replace(/^\/\//, '').split('?');
    const amount = new URLSearchParams(query).get('amount') ?? undefined;
    return { kind: 'crypto', coin: CRYPTO_SCHEMES[scheme], address: address.trim(), ...(amount ? { amount } : {}) };
  }

  if (scheme === 'wifi') {
    const network = /(?:^WIFI:|;)S:((?:\\.|[^;])*)/i.exec(data)?.[1]?.replace(/\\(.)/g, '$1');
    return { kind: 'wifi', ...(network ? { network } : {}) };
  }

  if (scheme === 'tel') return { kind: 'contact', method: 'phone', value: data.slice(4) };
  if (scheme === 'sms' || scheme === 'smsto') {
    return { kind: 'contact', method: 'sms', value: data.slice(scheme.length + 1).split(/[:?]/)[0] };
  }
  if (scheme === 'mailto') return { kind: 'contact', method: 'email', value: data.slice(7).split('?')[0] };

  for (const { coin, pattern } of RAW_ADDRESSES) {
    if (pattern.test(data)) return { kind: 'crypto', coin, address: data };
  }

  if (BARE_DOMAIN.test(data)) return { kind: 'link', url: data };

  const embedded = EMBEDDED_LINK.exec(data)?.[0];
  if (embedded) return { kind: 'link', url: embedded.replace(/[).,;!?]+$/, '') };

  return { kind: 'text', text: data };
}

export type QrExplanation = { title: string; detail: string };

/** What to tell the user about a QR code that is not a link. Never a verdict. */
export function explainQr(content: Exclude<QrContent, { kind: 'link' }>): QrExplanation {
  switch (content.kind) {
    case 'crypto':
      return {
        title: `Crypto payment request (${content.coin})`,
        detail:
          `This QR code sends money to a crypto wallet${content.amount ? ` (amount: ${content.amount})` : ''}. ` +
          'Crypto payments cannot be reversed, and no bank can get the money back. ' +
          'Only pay if you met the person, know the business, and can check the wallet address with them another way.',
      };
    case 'wifi':
      return {
        title: 'Wi-Fi network',
        detail:
          `This QR code joins a Wi-Fi network${content.network ? ` called "${content.network}"` : ''}. ` +
          'Avoid typing passwords or bank details while connected to a network you don’t know.',
      };
    case 'contact':
      return {
        title: content.method === 'phone' ? 'Phone number' : content.method === 'sms' ? 'Text message' : 'Email address',
        detail:
          `This QR code ${content.method === 'phone' ? 'calls' : content.method === 'sms' ? 'texts' : 'emails'} ${content.value || 'a contact'}. ` +
          'Scammers often move conversations to private chats. Never share PINs, passwords or one-time codes.',
      };
    case 'text':
      return {
        title: 'Plain text',
        detail: 'This QR code holds text, not a link, so there is no web address to check. Read it carefully before acting on it.',
      };
    case 'empty':
      return { title: 'Empty QR code', detail: 'This QR code has nothing in it to check.' };
  }
}
