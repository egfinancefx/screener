
export type Timeframe = 'W' | 'D' | '240' | '60' | '30' | '15' | '5' | '1';

export const TIMEFRAME_OPTIONS: { label: string; value: Timeframe }[] = [
  { label: 'Weekly', value: 'W' },
  { label: 'Daily', value: 'D' },
  { label: '4 Hour', value: '240' },
  { label: '1 Hour', value: '60' },
  { label: '30 Min', value: '30' },
  { label: '15 Min', value: '15' },
  { label: '5 Min', value: '5' },
  { label: '1 Min', value: '1' },
];

export interface SymbolOption {
  label: string;
  value: string;
}

export interface TechnicalIndicator {
  name: string;
  value: string;
  signal: 'Buy' | 'Sell' | 'Neutral' | 'Overbought' | 'Oversold';
}

export interface NewsItem {
  id: string;
  headline: string;
  content: string;
  timestamp: string;
  source: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface MarketAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  summary: string;
  keyLevels: {
    resistance: string[];
    support: string[];
  };
  indicators: TechnicalIndicator[];
}

export interface SmtPair {
  label: string;
  asset1: SymbolOption;
  asset2: SymbolOption;
}

export const SMT_PAIRS: SmtPair[] = [
  { 
    label: 'Gold vs Silver', 
    asset1: { label: 'XAUUSD', value: 'OANDA:XAUUSD' }, 
    asset2: { label: 'Silver', value: 'OANDA:XAGUSD' } 
  },
  { 
    label: 'EURUSD vs GBPUSD', 
    asset1: { label: 'EURUSD', value: 'OANDA:EURUSD' }, 
    asset2: { label: 'GBPUSD', value: 'OANDA:GBPUSD' } 
  },
  { 
    label: 'NAS100 vs US30', 
    asset1: { label: 'NAS100', value: 'CAPITALCOM:US100' },
    asset2: { label: 'US30', value: 'BLACKBULL:US30' } 
  },
  { 
    label: 'Bitcoin vs Ethereum', 
    asset1: { label: 'BTCUSD', value: 'COINBASE:BTCUSD' },
    asset2: { label: 'ETHUSD', value: 'COINBASE:ETHUSD' } 
  }
];

export interface SmtAnalysis {
  detected: boolean;
  type: 'Bullish' | 'Bearish' | 'None';
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface OHLCData {
  time: string | number; // YYYY-MM-DD or Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DrawingPoint {
  time: string | number;
  price: number;
}

export interface DrawingLine {
  start: DrawingPoint;
  end: DrawingPoint;
  color: string;
}

export interface DrawingMarker {
  time: string | number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown';
  text: string;
}

export interface PatternAnalysis {
  detected: boolean;
  patterns: {
    name: string;
    type: 'Bullish' | 'Bearish' | 'Neutral';
    confidence: 'High' | 'Medium' | 'Low';
    description: string;
    signal: 'Buy' | 'Sell' | 'Neutral';
    lines?: DrawingLine[];
    markers?: DrawingMarker[];
  }[];
}
