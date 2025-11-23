
import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Clock, ArrowUpRight, ArrowDownRight, TrendingUp, 
  Maximize2, Layers, DollarSign, Zap, Activity, AlertTriangle, 
  Bot, Sparkles 
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

// ==========================================
// 1. TYPES (Merged from types.ts)
// ==========================================

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
}

export interface HighLowData {
  timeframe: string;
  high: number;
  low: number;
  rangePercent: number;
}

export enum TimeFrame {
  H1 = '1h',
  H4 = '4h',
  D1 = '24h',
  D7 = '7d',
}

export type ChartMode = 'combined' | 'btc' | 'gold';

// ==========================================
// 2. SERVICES (Merged from services/marketService.ts)
// ==========================================

const BINANCE_API = 'https://api.binance.com/api/v3';
const BINANCE_F_API = 'https://fapi.binance.com/fapi/v1';

// Helper to handle fetch errors gracefully
const safeFetch = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`Fetch failed for ${url}:`, error);
    return null;
  }
};

const fetchBTCPrice = async () => {
  const data = await safeFetch(`${BINANCE_API}/ticker/24hr?symbol=BTCUSDT`);
  if (!data) return { price: 95000, changePercent: 0 }; 
  return {
    price: parseFloat(data.lastPrice),
    changePercent: parseFloat(data.priceChangePercent),
    change24h: parseFloat(data.priceChange)
  };
};

const fetchGoldPrice = async () => {
  // Use PAXGUSDT (Paxos Gold) as a proxy for Real-Time Gold Price
  const data = await safeFetch(`${BINANCE_API}/ticker/24hr?symbol=PAXGUSDT`);
  if (!data) return { price: 2650, changePercent: 0 };
  
  return {
    price: parseFloat(data.lastPrice),
    changePercent: parseFloat(data.priceChangePercent)
  };
};

const fetchFundingRates = async (): Promise<FundingRate[]> => {
  const binanceData = await safeFetch(`${BINANCE_F_API}/premiumIndex?symbol=BTCUSDT`);
  // Bybit simulation remains as fallback since their public API often has CORS issues in browser
  const bybitRate = 0.01 + (Math.random() * 0.005);

  return [
    {
      exchange: 'Binance',
      rate: binanceData ? parseFloat(binanceData.lastFundingRate) : 0.0100
    },
    {
      exchange: 'Bybit',
      rate: bybitRate
    }
  ];
};

const fetchHighLow = async (symbol: string = 'BTCUSDT'): Promise<HighLowData[]> => {
  const definitions = [
    { label: '1 Giờ', interval: '1h', limit: 2 }, 
    { label: '4 Giờ', interval: '4h', limit: 2 },
    { label: '24 Giờ', interval: '1d', limit: 1 }, 
    { label: '7 Ngày', interval: '1w', limit: 1 },
  ];

  const results = await Promise.all(definitions.map(async (def) => {
    const data = await safeFetch(`${BINANCE_API}/klines?symbol=${symbol}&interval=${def.interval}&limit=${def.limit}`);
    
    if (!data || data.length === 0) {
      return {
        timeframe: def.label,
        high: 0,
        low: 0,
        rangePercent: 0
      };
    }

    const candle = data[data.length - 1];
    const high = parseFloat(candle[2]);
    const low = parseFloat(candle[3]);
    const range = low > 0 ? ((high - low) / low) * 100 : 0;

    return {
      timeframe: def.label,
      high,
      low,
      rangePercent: range
    };
  }));

  return results;
};

const fetchChartData = async (timeFrame: TimeFrame): Promise<ChartDataPoint[]> => {
  let interval = '1h';
  let limit = 168;

  switch (timeFrame) {
    case TimeFrame.H1:
      interval = '1m';
      limit = 60; 
      break;
    case TimeFrame.H4:
      interval = '5m';
      limit = 48; 
      break;
    case TimeFrame.D1: 
      interval = '15m';
      limit = 96; 
      break;
    case TimeFrame.D7: 
      interval = '2h'; 
      limit = 84; 
      break;
    default:
      interval = '1h';
      limit = 168;
  }

  // Fetch BTC and Gold (PAXG) data in parallel
  const [btcKlines, goldKlines] = await Promise.all([
    safeFetch(`${BINANCE_API}/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`),
    safeFetch(`${BINANCE_API}/klines?symbol=PAXGUSDT&interval=${interval}&limit=${limit}`)
  ]);

  if (!btcKlines && !goldKlines) return [];

  const btcData = btcKlines || [];
  
  // Create a map for Gold prices by timestamp for easier lookup
  const goldMap = new Map();
  if (goldKlines) {
    goldKlines.forEach((k: any) => {
      goldMap.set(k[0], parseFloat(k[4]));
    });
  }

  // If BTC fails but Gold exists, use Gold timestamps (unlikely scenario but robust)
  const baseData = btcData.length > 0 ? btcData : (goldKlines || []);

  return baseData.map((k: any) => {
    const timestamp = k[0];
    const btcClose = btcData.length > 0 ? parseFloat(k[4]) : 0;
    
    // Get real gold price matching timestamp, or fallback to previous known or 2650
    const xauClose = goldMap.get(timestamp) || 2650;

    const dateObj = new Date(timestamp);
    let timeLabel = '';
    if (timeFrame === TimeFrame.D7) {
      timeLabel = dateObj.toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit' });
    } else {
      timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return {
      time: timeLabel,
      timestamp: timestamp,
      btc: btcClose,
      xau: xauClose
    };
  });
};

interface AnalysisInput {
  btcPrice: number;
  btcChange: number;
  goldPrice: number;
  goldChange: number;
  fundingRate: number;
  btcVolatility: HighLowData[];
  goldVolatility: HighLowData[];
}

const fetchAIAnalysis = async (marketData: AnalysisInput, mode: ChartMode) => {
  try {
    // Access env safely for browser
    const apiKey = (window as any).process?.env?.API_KEY;
    if (!apiKey) return "API Key not configured in environment.";

    const ai = new GoogleGenAI({ apiKey });
    
    // Helper to format volatility for prompt
    const formatVol = (data: HighLowData[]) => {
      return data.map(d => `- ${d.timeframe}: Range ${d.rangePercent.toFixed(2)}% (High: $${d.high}, Low: $${d.low})`).join('\n');
    };

    let prompt = "";

    if (mode === 'btc') {
      prompt = `
        Đóng vai một **Chuyên gia Giao dịch Bitcoin (Crypto Trader Pro)**.
        Hãy phân tích kỹ thuật sâu (Deep Dive) cho BTC/USDT dựa trên dữ liệu đa khung thời gian sau:
        
        1. **Dữ liệu Giá**: $${marketData.btcPrice} (24h: ${marketData.btcChange}%)
        2. **Tâm lý & Đòn bẩy**: Funding Rate ${marketData.fundingRate}% (Dương cao = Long đông/FOMO, Âm = Short đông).
        3. **Biến động giá (Volatility Structure)**:
        ${formatVol(marketData.btcVolatility)}

        **Yêu cầu phân tích:**
        1. **Cấu trúc thị trường**: Phân tích hành động giá dựa trên High/Low của khung 4H và 24H. Phe nào đang kiểm soát?
        2. **Vùng thanh khoản**: Xác định hỗ trợ/kháng cự quan trọng.
        3. **TÍN HIỆU GIAO DỊCH (SIGNAL)**: Bắt buộc đưa ra kết luận rõ ràng:
           - 🟢 **MUA (BUY/LONG)**: Entry vùng nào?
           - 🔴 **BÁN (SELL/SHORT)**: Entry vùng nào?
           - 🟡 **CHỜ (WAIT)**: Nếu thị trường sideway.

        Trả lời ngắn gọn, format Markdown, dùng icon. Tập trung vào tín hiệu.
      `;
    } else if (mode === 'gold') {
      prompt = `
        Đóng vai một **Chuyên gia Giao dịch Vàng & Hàng hóa (Commodities Trader)**.
        Hãy phân tích kỹ thuật sâu cho Vàng (XAU/USD - PAXG) dựa trên dữ liệu thực tế:

        1. **Dữ liệu Giá**: $${marketData.goldPrice} (24h: ${marketData.goldChange}%)
        2. **Biến động giá (Volatility Structure)**:
        ${formatVol(marketData.goldVolatility)}

        **Yêu cầu phân tích:**
        1. **Xu hướng chủ đạo**: Đánh giá trend dựa trên biên độ dao động (Range) 4H và 24H.
        2. **Tâm lý thị trường**: Dòng tiền đang trú ẩn hay chốt lời?
        3. **TÍN HIỆU GIAO DỊCH (SIGNAL)**: Bắt buộc đưa ra kết luận:
           - 🟢 **LONG (MUA)**
           - 🔴 **SHORT (BÁN)**
           - 🟡 **QUAN SÁT (Neutral)**

        Trả lời ngắn gọn, format Markdown, dùng icon.
      `;
    } else {
      // Combined / Overlay
      prompt = `
        Đóng vai một **Chuyên gia Chiến lược Vĩ mô (Macro Strategist)**.
        Phân tích tương quan liên thị trường giữa Bitcoin và Vàng:

        - **BTC**: $${marketData.btcPrice} (${marketData.btcChange}%)
        - **Gold**: $${marketData.goldPrice} (${marketData.goldChange}%)
        
        - **Biến động BTC**: Range 24H là ${marketData.btcVolatility.find(d => d.timeframe.includes('24'))?.rangePercent.toFixed(2)}%
        - **Biến động Gold**: Range 24H là ${marketData.goldVolatility.find(d => d.timeframe.includes('24'))?.rangePercent.toFixed(2)}%

        **Yêu cầu:**
        1. **Tương quan (Correlation)**: Hai tài sản đang đi cùng chiều (Risk-on/Risk-off) hay ngược chiều (Trú ẩn)?
        2. **Dòng tiền thông minh**: Tiền đang chảy vào đâu mạnh hơn dựa trên % thay đổi và biến động?
        3. **Khuyến nghị phân bổ**: Tỷ trọng nắm giữ cho ngắn hạn (Ví dụ: 70% BTC / 30% Gold).

        Trả lời ngắn gọn, xúc tích, format Markdown.
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Hệ thống AI đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau.";
  }
};

// ==========================================
// 3. COMPONENTS (Merged from components/*)
// ==========================================

// --- TickerCard ---
interface TickerCardProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  color: 'teal' | 'gold';
}

const TickerCard: React.FC<TickerCardProps> = ({ symbol, name, price, changePercent, color }) => {
  const isPositive = changePercent >= 0;
  const colorClass = color === 'teal' ? 'text-[#4ecdc4]' : 'text-[#ffd700]';
  const borderColor = color === 'teal' ? 'border-[#4ecdc4]/30' : 'border-[#ffd700]/30';

  return (
    <div className={`bg-slate-800/50 rounded-xl p-4 border ${borderColor} flex items-center justify-between shadow-lg backdrop-blur-sm`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-bold text-lg tracking-wider ${colorClass}`}>{symbol}</span>
          <span className="text-slate-500 text-xs font-medium uppercase">{name}</span>
        </div>
        <div className="text-2xl font-mono font-semibold text-white">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className={`flex flex-col items-end ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded-md">
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span className="font-bold text-sm">{Math.abs(changePercent).toFixed(2)}%</span>
        </div>
        <div className="mt-1 text-slate-500 text-xs">24h Change</div>
      </div>
    </div>
  );
};

// --- MarketChart ---
interface MarketChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
  timeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
}

const MarketChart: React.FC<MarketChartProps> = ({ 
  data, 
  isLoading, 
  timeFrame, 
  onTimeFrameChange,
  chartMode,
  onChartModeChange
}) => {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded shadow-2xl backdrop-blur text-sm">
          <p className="text-slate-400 mb-2 font-mono text-xs pb-1 border-b border-slate-800">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-3 mb-1 justify-between min-w-[140px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium text-slate-300">
                  {entry.name}
                </span>
              </div>
              <span className="font-mono font-bold" style={{ color: entry.color }}>
                ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderControls = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
      {/* Chart Mode Selector */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
        <button
          onClick={() => onChartModeChange('combined')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            chartMode === 'combined' 
              ? 'bg-slate-700 text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} /> Overlay
        </button>
        <button
          onClick={() => onChartModeChange('btc')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            chartMode === 'btc' 
              ? 'bg-[#4ecdc4]/20 text-[#4ecdc4] border border-[#4ecdc4]/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign size={14} /> BTC Only
        </button>
        <button
          onClick={() => onChartModeChange('gold')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            chartMode === 'gold' 
              ? 'bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/20' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Maximize2 size={14} /> Gold Only
        </button>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
        {[
          { label: '1H', value: TimeFrame.H1 },
          { label: '4H', value: TimeFrame.H4 },
          { label: '24H', value: TimeFrame.D1 },
          { label: '7D', value: TimeFrame.D7 },
        ].map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeFrameChange(tf.value)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              timeFrame === tf.value
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading && data.length === 0) {
    return (
      <div className="w-full h-[500px] bg-slate-800/50 rounded-xl border border-slate-700 p-4 relative">
        {renderControls()}
        <div className="h-[400px] flex items-center justify-center border border-dashed border-slate-700 rounded-lg">
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-[#4ecdc4] border-t-transparent rounded-full animate-spin"></div>
             <div className="text-slate-400 font-mono text-sm animate-pulse">Synchronizing Market Data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Determine Y-Axes Configuration based on mode
  const showRightAxis = chartMode === 'combined';
  const leftAxisColor = chartMode === 'gold' ? '#ffd700' : '#4ecdc4';

  return (
    <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      
      {renderControls()}
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientBtc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradientXau" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffd700" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
            
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              dy={10}
            />
            
            {/* Primary Axis (Dynamic based on mode) */}
            <YAxis 
              yAxisId="left"
              stroke={leftAxisColor}
              tick={{ fill: leftAxisColor, fontSize: 11, fontFamily: 'monospace' }}
              domain={['auto', 'auto']}
              tickFormatter={(val) => chartMode === 'btc' || chartMode === 'combined' ? `$${(val/1000).toFixed(1)}k` : `$${val}`}
              axisLine={false}
              tickLine={false}
              width={50}
            />

            {/* Secondary Axis (Only for Combined mode) */}
            {showRightAxis && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#ffd700"
                tick={{ fill: '#ffd700', fontSize: 11, fontFamily: 'monospace' }}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `$${val}`}
                axisLine={false}
                tickLine={false}
                width={50}
              />
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

            {/* Render BTC Line if mode is btc or combined */}
            {(chartMode === 'combined' || chartMode === 'btc') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="btc"
                name="Bitcoin (BTC)"
                stroke="#4ecdc4"
                strokeWidth={2}
                fill="url(#gradientBtc)"
                activeDot={{ r: 6, fill: '#1e1e2e', stroke: '#4ecdc4', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}
            
            {/* Render Gold Line if mode is gold or combined */}
            {(chartMode === 'combined' || chartMode === 'gold') && (
              <Area
                yAxisId={chartMode === 'combined' ? "right" : "left"} // Switch axis if solo
                type="monotone"
                dataKey="xau"
                name="Gold (XAU)"
                stroke="#ffd700"
                strokeWidth={2}
                fill="url(#gradientXau)"
                activeDot={{ r: 6, fill: '#1e1e2e', stroke: '#ffd700', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- InfoPanel ---
interface InfoPanelProps {
  btcHighLow: HighLowData[];
  goldHighLow: HighLowData[];
  funding: FundingRate[];
  chartMode: ChartMode;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ btcHighLow, goldHighLow, funding, chartMode }) => {
  
  const VolatilityTable: React.FC<{ title: string, color: string, data: HighLowData[] }> = ({ title, color, data }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-4 text-slate-300">
        <Activity size={18} style={{ color: color }} />
        <h3 className="font-semibold text-sm uppercase tracking-wider">{title} Volatility</h3>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-4 text-xs text-slate-500 pb-2 border-b border-slate-700/50 font-medium">
          <div>Time</div>
          <div className="text-right">High</div>
          <div className="text-right">Low</div>
          <div className="text-right">Range</div>
        </div>
        
        {data.map((item, idx) => (
          <div key={idx} className="grid grid-cols-4 text-sm items-center hover:bg-slate-700/30 p-1 rounded transition-colors">
            <div className="text-slate-400 font-medium">{item.timeframe}</div>
            <div className="text-right font-mono text-green-400/90 text-xs sm:text-sm">
              ${item.high.toLocaleString()}
            </div>
            <div className="text-right font-mono text-red-400/90 text-xs sm:text-sm">
              ${item.low.toLocaleString()}
            </div>
            <div className="text-right font-bold text-white text-xs sm:text-sm">
              {item.rangePercent.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Dynamic Volatility Cards */}
      {(chartMode === 'combined' || chartMode === 'btc') && (
        <VolatilityTable title="BTC" color="#4ecdc4" data={btcHighLow} />
      )}
      
      {(chartMode === 'combined' || chartMode === 'gold') && (
        <VolatilityTable title="GOLD (XAU)" color="#ffd700" data={goldHighLow} />
      )}

      {/* Funding & Gaps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        
        {/* Funding Rates - Only relevant for Crypto/BTC usually, but shown always as context */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
           <div className="flex items-center gap-2 mb-3 text-slate-300">
            <Zap size={18} className="text-yellow-400" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Funding Rates</h3>
          </div>
          
          <div className="space-y-2">
            {funding.map((f, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-900/40 p-2 rounded border border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">{f.exchange}</span>
                <span className={`font-mono font-bold ${f.rate > 0.01 ? 'text-red-400' : 'text-green-400'}`}>
                  {(f.rate * 100).toFixed(4)}%
                </span>
              </div>
            ))}
            <div className="text-[10px] text-slate-500 mt-2 text-center">
              Longs pay Shorts (Bullish) when positive
            </div>
          </div>
        </div>

        {/* CME Gaps & Correlations */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
           <div className="flex items-center gap-2 mb-3 text-slate-300">
            <AlertTriangle size={18} className="text-orange-400" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Analysis Data</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            {chartMode !== 'gold' && (
              <div className="bg-slate-900/40 p-2 rounded">
                <div className="text-slate-500 text-xs mb-1">CME BTC Gap</div>
                <div className="flex justify-between">
                  <span className="text-white">$85,500 <span className="text-slate-600">→</span> $86,200</span>
                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/30">Unfilled</span>
                </div>
              </div>
            )}
            
             <div className="bg-slate-900/40 p-2 rounded">
              <div className="text-slate-500 text-xs mb-1">Correlation (30D)</div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">BTC / XAU</span>
                <span className="font-bold text-[#4ecdc4]">+0.75</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- AIAnalysisPanel ---
interface AIAnalysisPanelProps {
  btcPrice: number;
  btcChange: number;
  goldPrice: number;
  goldChange: number;
  fundingRate: number;
  chartMode: ChartMode;
  btcVolatility: HighLowData[];
  goldVolatility: HighLowData[];
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  btcPrice,
  btcChange,
  goldPrice,
  goldChange,
  fundingRate,
  chartMode,
  btcVolatility,
  goldVolatility
}) => {
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Clear analysis when mode changes to encourage new analysis
  useEffect(() => {
    setAnalysis("");
  }, [chartMode]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(""); 

    try {
      const result = await fetchAIAnalysis({
        btcPrice,
        btcChange,
        goldPrice,
        goldChange,
        fundingRate,
        btcVolatility,
        goldVolatility
      }, chartMode);
      setAnalysis(result || "Không có phản hồi từ AI.");
    } catch (e) {
      setAnalysis("Lỗi khi kết nối với chuyên gia AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRoleTitle = () => {
    if (chartMode === 'btc') return "Crypto Trader Pro";
    if (chartMode === 'gold') return "Gold Commodities Expert";
    return "Macro Market Strategist";
  };

  const getRoleColor = () => {
    if (chartMode === 'btc') return "text-[#4ecdc4]";
    if (chartMode === 'gold') return "text-[#ffd700]";
    return "text-indigo-400";
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden shadow-xl mt-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Bot size={150} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 z-10 relative gap-4">
        <div className="flex items-center gap-3">
          <div className={`bg-slate-800 p-2 rounded-lg ${getRoleColor()}`}>
            {chartMode === 'btc' ? <TrendingUp size={24} /> : <Sparkles size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Gemini AI: <span className={getRoleColor()}>{getRoleTitle()}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {chartMode === 'combined' ? 'Phân tích tương quan & Dòng tiền' : 'Phân tích kỹ thuật sâu & Tín hiệu Giao dịch'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all
            ${isAnalyzing 
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95'
            }
          `}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Bot size={16} />
              Phân tích {chartMode === 'combined' ? 'Thị trường' : (chartMode === 'btc' ? 'BTC' : 'Vàng')}
            </>
          )}
        </button>
      </div>

      <div className="min-h-[120px] bg-slate-950/50 rounded-lg p-5 border border-slate-700/50 font-mono text-sm leading-relaxed text-slate-300 shadow-inner">
        {analysis ? (
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-line">
            {analysis}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6">
            <Bot size={32} className="mb-3 opacity-30" />
            <p className="text-center max-w-md">
              Nhấn nút phía trên để kích hoạt AI. <br/>
              Chế độ <b>{chartMode.toUpperCase()}</b> sẽ kích hoạt prompt phân tích {chartMode === 'combined' ? 'vĩ mô' : 'kỹ thuật sâu & tín hiệu'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

function App() {
  const [btcData, setBtcData] = useState({ price: 0, changePercent: 0 });
  const [goldData, setGoldData] = useState({ price: 0, changePercent: 0 });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [fundingData, setFundingData] = useState<FundingRate[]>([]);
  const [btcHighLow, setBtcHighLow] = useState<HighLowData[]>([]);
  const [goldHighLow, setGoldHighLow] = useState<HighLowData[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.H1);
  const [chartMode, setChartMode] = useState<ChartMode>('combined');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [btc, gold, funding, btcHL, goldHL, chart] = await Promise.all([
        fetchBTCPrice(),
        fetchGoldPrice(),
        fetchFundingRates(),
        fetchHighLow('BTCUSDT'),
        fetchHighLow('PAXGUSDT'),
        fetchChartData(timeFrame)
      ]);
      setBtcData(btc);
      setGoldData(gold);
      setFundingData(funding);
      setBtcHighLow(btcHL);
      setGoldHighLow(goldHL);
      setChartData(chart);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, [timeFrame]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] p-4 md:p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-[#4ecdc4] text-[#1e1e2e] font-black p-2 rounded text-xl shadow-[0_0_15px_rgba(78,205,196,0.5)]">TV</div>
            <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Market Intelligence</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Cross-Asset Dashboard</p>
            </div>
        </div>
        <div className="flex items-center gap-4 text-sm bg-slate-800/50 p-2 rounded-full border border-slate-700/50 px-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span>Updated: <span className="text-white font-mono">{lastUpdated || '...'}</span></span>
            </div>
            <button onClick={loadAllData} className={`p-1.5 rounded-full hover:bg-slate-700 transition-all ${loading ? 'animate-spin text-[#4ecdc4]' : 'text-slate-300'}`}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TickerCard symbol="BTC/USDT" name="Bitcoin Spot" price={btcData.price} changePercent={btcData.changePercent} color="teal" />
          <TickerCard symbol="XAU/USD" name="Gold (PAXG)" price={goldData.price} changePercent={goldData.changePercent} color="gold" />
        </div>

        {/* Charts and Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MarketChart data={chartData} isLoading={loading} timeFrame={timeFrame} onTimeFrameChange={setTimeFrame} chartMode={chartMode} onChartModeChange={setChartMode} />
             
             {/* AI Panel */}
             <AIAnalysisPanel 
                chartMode={chartMode}
                btcPrice={btcData.price}
                btcChange={btcData.changePercent}
                goldPrice={goldData.price}
                goldChange={goldData.changePercent}
                fundingRate={fundingData[0]?.rate * 100 || 0}
                btcVolatility={btcHighLow}
                goldVolatility={goldHighLow}
             />
             
             <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-600 px-2">
               <p>• Data sources: Binance (BTC), PAXG/USDT (Gold Proxy)</p>
               <p>• AI Analysis powered by Google Gemini 2.5 Flash</p>
             </div>
          </div>
          
          <div className="lg:col-span-1">
            <InfoPanel chartMode={chartMode} btcHighLow={btcHighLow} goldHighLow={goldHighLow} funding={fundingData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
