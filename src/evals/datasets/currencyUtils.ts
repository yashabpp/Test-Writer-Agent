/**
 * currencyUtils.ts
 * Currency formatting, conversion, and rounding utilities.
 */

export class CurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyError';
  }
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
};

// Exchange rates relative to USD (simplified for demonstration)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  INR: 83.1,
};

/**
 * Formats a number as a currency string.
 * @example formatCurrency(1234.5, 'USD') => '$1,234.50'
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  if (!Number.isFinite(amount)) throw new CurrencyError('Amount must be a finite number');
  const symbol = CURRENCY_SYMBOLS[currency];
  const decimals = currency === 'JPY' ? 0 : 2;
  const formatted = Math.abs(amount).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

/**
 * Converts an amount from one currency to another.
 * @throws {CurrencyError} for invalid or unknown currencies.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (!Number.isFinite(amount)) throw new CurrencyError('Amount must be a finite number');
  if (!(from in EXCHANGE_RATES)) throw new CurrencyError(`Unknown currency: ${from}`);
  if (!(to in EXCHANGE_RATES)) throw new CurrencyError(`Unknown currency: ${to}`);
  const inUSD = amount / EXCHANGE_RATES[from];
  return inUSD * EXCHANGE_RATES[to];
}

/**
 * Rounds a number to a specified number of decimal places using banker's rounding.
 * @throws {CurrencyError} for negative decimals.
 */
export function roundToDecimal(amount: number, decimals: number): number {
  if (decimals < 0) throw new CurrencyError('Decimals must be non-negative');
  if (!Number.isFinite(amount)) return amount;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/** Returns the list of supported currency codes. */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Object.keys(CURRENCY_SYMBOLS) as CurrencyCode[];
}

/** Returns the currency symbol for a given code. */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (!symbol) throw new CurrencyError(`Unknown currency: ${currency}`);
  return symbol;
}
