import {
  domainLabel,
  editDistance,
  isIPv4,
  isIPv6,
  isObfuscatedIp,
  normalizeLookalikes,
  parseUrl,
  publicSuffix,
  registrableDomain,
} from './domain';
import { KNOWN_BRANDS, type Brand } from './known-brands';
import { scoreSignals } from './scoring';
import type { RiskResult, Signal } from './types';

/**
 * Offline analysis of a web address. Rules-based (not machine learning):
 * each rule that matches adds a risk indicator with a weight, and the
 * weights add up to a 0–100 score.
 */

export type UrlAnalysis = { ok: true; result: RiskResult } | { ok: false; error: string };

const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'cutt.ly', 'is.gd', 'rb.gy', 'shorturl.at', 'ow.ly',
  'buff.ly', 'rebrand.ly', 't.ly', 'tiny.cc', 's.id', 'shorte.st', 'v.gd', 'bl.ink', 'lnkd.in',
]);

/** Endings often used for throwaway scam sites (because they are cheap or free). */
const ABUSED_ENDINGS = new Set([
  'xyz', 'top', 'click', 'loan', 'work', 'zip', 'mov', 'icu', 'buzz', 'cfd', 'sbs', 'rest',
  'gq', 'tk', 'ml', 'ga', 'cf', 'cyou', 'monster', 'quest', 'bond', 'lat',
]);

/** Words common in crypto scam links. Matched inside the address, case-insensitive. */
const SCAM_WORDS = [
  'airdrop', 'giveaway', 'double', 'doubling', 'bonus', 'claim', 'reward', 'free-crypto', 'freecrypto',
  'walletconnect', 'connect-wallet', 'connectwallet', 'validate', 'verify-wallet', 'wallet-verify',
  'seed', 'recovery-phrase', 'recoveryphrase', 'unlock', 'guaranteed', 'profit', 'investment-plan',
  'mining-pool', 'presale', 'whitelist', 'kyc-update', 'suspended', 'urgent',
];

const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file']);

const MAX_INPUT = 2048;

export function analyzeUrl(raw: string): UrlAnalysis {
  const input = raw.trim();
  if (!input) return { ok: false, error: 'Enter a link to check.' };
  if (input.length > MAX_INPUT) return { ok: false, error: 'That link is too long to check.' };

  const signals: Signal[] = [];

  const parsed = parseUrl(input);
  const scheme = parsed?.scheme ?? /^([a-z][a-z0-9+.-]*):/i.exec(input)?.[1]?.toLowerCase() ?? null;

  if (scheme && DANGEROUS_SCHEMES.has(scheme)) {
    signals.push({
      id: 'dangerous_scheme',
      title: 'Not a normal web link',
      detail: `This is a "${scheme}:" link, which can run code or open files instead of a web page. Real websites don't send links like this.`,
      weight: 60,
    });
    return { ok: true, result: finish(input, signals) };
  }

  if (!parsed || (scheme && scheme !== 'http' && scheme !== 'https')) {
    return { ok: false, error: "That doesn't look like a web link. Paste the full address, e.g. https://example.com" };
  }

  const { host, userinfo, port, rest } = parsed;

  // --- Address structure -----------------------------------------------------

  if (scheme === 'http') {
    signals.push({
      id: 'no_https',
      title: 'Not a secure connection',
      detail: 'The link starts with "http://", not "https://", so anything you type could be read by others. Real exchanges and banks always use https.',
      weight: 15,
    });
  }

  if (userinfo !== null) {
    signals.push({
      id: 'userinfo_trick',
      title: 'Hidden real address',
      detail: `Everything before the "@" is ignored by your browser. The link really goes to "${host}", not "${userinfo}".`,
      weight: 35,
    });
  }

  const isIp = isIPv4(host) || isIPv6(host) || isObfuscatedIp(host);
  if (isIp) {
    signals.push({
      id: 'raw_ip',
      title: 'Uses a number instead of a name',
      detail: 'The address is an IP number, not a website name. Real companies use a proper domain name.',
      weight: 30,
    });
  }

  if (/[^\x00-\x7f]/.test(host) || host.split('.').some((label) => label.startsWith('xn--'))) {
    signals.push({
      id: 'punycode',
      title: 'Uses look-alike foreign letters',
      detail: 'The website name contains special or foreign characters (or their "xn--" code). Scammers use these to make fake names that look identical to real ones.',
      weight: 30,
    });
  }

  if (port !== null && port !== 80 && port !== 443) {
    signals.push({
      id: 'unusual_port',
      title: 'Unusual connection port',
      detail: `The link uses port ${port}. Normal websites don't need a port number in the address.`,
      weight: 10,
    });
  }

  if (isIp) return { ok: true, result: finish(input, signals) };

  const domain = registrableDomain(host);
  const subdomainCount = host.split('.').length - domain.split('.').length;

  if (SHORTENERS.has(domain) || SHORTENERS.has(host)) {
    signals.push({
      id: 'shortener',
      title: 'Shortened link',
      detail: `"${domain}" is a link shortener, so we can't see where it really goes. Ask for the full address, or don't open it.`,
      weight: 15,
    });
  }

  if (ABUSED_ENDINGS.has(publicSuffix(domain))) {
    signals.push({
      id: 'abused_ending',
      title: `Uncommon ".${publicSuffix(domain)}" address`,
      detail: `Website names ending in ".${publicSuffix(domain)}" are cheap and often used for short-lived scam sites.`,
      weight: 10,
    });
  }

  if (host.length > 40) {
    signals.push({
      id: 'long_domain',
      title: 'Very long website name',
      detail: 'Long, complicated names are often used to hide the real website or to look official.',
      weight: 10,
    });
  }

  if (subdomainCount >= 3) {
    signals.push({
      id: 'many_subdomains',
      title: 'Many parts before the real name',
      detail: `The real website is "${domain}". The extra parts in front are often added to make a link look official.`,
      weight: 10,
    });
  }

  if ((domainLabel(domain).match(/-/g) ?? []).length >= 2) {
    signals.push({
      id: 'many_hyphens',
      title: 'Several hyphens in the name',
      detail: 'Names like "secure-login-wallet" are common in fake sites.',
      weight: 10,
    });
  }

  // --- Brand impersonation -----------------------------------------------------

  const brandSignal = checkBrands(host, domain);
  if (brandSignal) signals.push(brandSignal);

  // --- Scam words ----------------------------------------------------------------

  const haystack = `${host}${rest}`.toLowerCase();
  const words = SCAM_WORDS.filter((w) => haystack.includes(w));
  if (words.length) {
    signals.push({
      id: 'scam_words',
      title: 'Words often used in crypto scams',
      detail: `The link contains: ${words.map((w) => `"${w}"`).join(', ')}.`,
      weight: Math.min(25, 10 * words.length),
    });
  }

  return { ok: true, result: finish(input, signals) };
}

function checkBrands(host: string, domain: string): Signal | null {
  const label = domainLabel(domain);
  const normalized = normalizeLookalikes(label);
  const words = host.split(/[.-]/);

  for (const brand of KNOWN_BRANDS) {
    if (brand.domains.some((d) => domain === d)) {
      return {
        id: 'official_domain',
        title: `Matches ${brand.name}'s official address`,
        detail: `"${domain}" is ${brand.name}'s real website. Still check the address letter by letter, and never share your recovery phrase.`,
        weight: 0,
      };
    }
  }

  for (const brand of KNOWN_BRANDS) {
    for (const official of brand.domains) {
      const officialLabel = domainLabel(official);

      // Same name on a different ending, e.g. binance.xyz
      if (label === officialLabel) {
        return impersonation('brand_other_domain', brand, domain, `uses ${brand.name}'s name on a different website ending ("${domain}" instead of "${official}")`, 45);
      }

      // Spelled almost the same, e.g. binnance.com, b1nance.com, rnetamask.io
      if (officialLabel.length >= 5) {
        const allowed = officialLabel.length >= 8 ? 2 : 1;
        if (normalized === officialLabel || editDistance(normalized, officialLabel) <= allowed) {
          return impersonation('lookalike', brand, domain, `is spelled almost like ${brand.name} ("${official}")`, 50);
        }
      }

      // Brand used as a word in someone else's address, e.g. binance-airdrop.com
      if (brand.matchAsWord && words.includes(officialLabel)) {
        return impersonation('brand_in_address', brand, domain, `uses the name "${officialLabel}" but the real website is "${domain}", which ${brand.name} does not own`, 40);
      }
    }
  }
  return null;
}

function impersonation(id: string, brand: Brand, domain: string, what: string, weight: number): Signal {
  return {
    id,
    title: `Pretends to be ${brand.name}`,
    detail: `This address ${what}. Fake copies of well-known sites are used to steal logins and crypto.`,
    weight,
  };
}

function finish(input: string, signals: Signal[]): RiskResult {
  const { score, level } = scoreSignals(signals);
  return { type: 'url', input, score, level, signals };
}
