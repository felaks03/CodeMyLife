export const TRADING_ACCESS_START_HOUR = 8;
export const TRADING_ACCESS_END_HOUR = 15;

export const TRADING_ALLOWED_DOMAINS = [
  'tradingview.com',
  'www.tradingview.com',
  'tradovate.com',
  'www.tradovate.com',
  'live.tradovate.com',
  'demo.tradovate.com',
  'trader.tradovate.com',
  'api.tradovate.com',
  'md.tradovate.com'
];

export const TRADING_ALLOWED_PROCESSES = [
  'TradingView.exe',
  'Tradovate.exe',
  'TradovateTrader.exe',
  'Tradovate Trader.exe'
];

export function isTradingAccessWindow(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= TRADING_ACCESS_START_HOUR * 60 && minutes < TRADING_ACCESS_END_HOUR * 60;
}

export function isTradingDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  return TRADING_ALLOWED_DOMAINS.some((allowed) =>
    normalized === allowed || normalized.endsWith(`.${allowed}`)
  );
}

export function filterTradingDomains(domains: string[], date: Date): string[] {
  if (!isTradingAccessWindow(date)) return domains;
  return domains.filter((domain) => !isTradingDomain(domain));
}
