export interface ChartDataPoint {
  time: string;
  timestamp: number;
  btc: number;
  xau: number;
}

export interface MarketTicker {
  price: number;
  change24h: number;
  changePercent: number;
}

export interface FundingRate {
  exchange: string;
  rate: number;
  predicted?: number;
}

export interface HighLowData {
  timeframe: string;
  high: number;
  low: number;
  rangePercent: number;
  isLoading?: boolean;
}

export enum TimeFrame {
  H1 = '1h',
  H4 = '4h',
  D1 = '24h',
  D7 = '7d',
}

export type ChartMode = 'combined' | 'btc' | 'gold';