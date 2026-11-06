/**
 * Official domains that scammers commonly imitate. A link whose domain looks
 * like one of these (but isn't) is flagged as a lookalike.
 *
 * ⚠️ Keep this list accurate: if an entry is wrong, the real site could be
 * flagged as a lookalike. Check each domain against the organisation's own
 * published website before adding it.
 */

export type Brand = {
  name: string;
  /** Official registrable domains (subdomains of these are also official). */
  domains: string[];
  /**
   * Flag addresses that use the brand name as a separate word, e.g.
   * "binance-airdrop.com". Turn off for brand names that are ordinary words.
   */
  matchAsWord: boolean;
};

export const KNOWN_BRANDS: Brand[] = [
  // Crypto exchanges and wallets
  { name: 'Binance', domains: ['binance.com', 'binance.us'], matchAsWord: true },
  { name: 'Coinbase', domains: ['coinbase.com'], matchAsWord: true },
  { name: 'Kraken', domains: ['kraken.com'], matchAsWord: true },
  { name: 'KuCoin', domains: ['kucoin.com'], matchAsWord: true },
  { name: 'Bybit', domains: ['bybit.com'], matchAsWord: true },
  { name: 'OKX', domains: ['okx.com'], matchAsWord: true },
  { name: 'MetaMask', domains: ['metamask.io'], matchAsWord: true },
  { name: 'Trust Wallet', domains: ['trustwallet.com'], matchAsWord: true },
  { name: 'Ledger', domains: ['ledger.com'], matchAsWord: false },
  { name: 'Trezor', domains: ['trezor.io'], matchAsWord: true },
  { name: 'Uniswap', domains: ['uniswap.org'], matchAsWord: true },
  { name: 'OpenSea', domains: ['opensea.io'], matchAsWord: true },
  { name: 'Etherscan', domains: ['etherscan.io'], matchAsWord: true },
  { name: 'Tether', domains: ['tether.to'], matchAsWord: true },
  // Papua New Guinea banks and regulator (verify before relying on these)
  { name: 'BSP (Bank South Pacific)', domains: ['bsp.com.pg'], matchAsWord: true },
  { name: 'Kina Bank', domains: ['kinabank.com.pg'], matchAsWord: true },
  { name: 'Bank of Papua New Guinea', domains: ['bankpng.gov.pg'], matchAsWord: true },
];
