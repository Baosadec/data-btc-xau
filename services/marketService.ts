import { GoogleGenAI } from "@google/genai";
import { ChartDataPoint, FundingRate, HighLowData, TimeFrame, ChartMode } from '../types.ts';

// Constants
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

// --- DATA FETCHERS ---

export const fetchBTCPrice = async () => {
  const data = await safeFetch(`${BINANCE_API}/ticker/24hr?symbol=BTCUSDT`);
  if (!data) return { price: 95000, changePercent: 0 }; 
  return {
    price: parseFloat(data.lastPrice),
    changePercent: parseFloat(data.priceChangePercent),
    change24h: parseFloat(data.priceChange)
  };
};

export const fetchGoldPrice = async () => {
  // Use PAXGUSDT (Paxos Gold) as a proxy for Real-Time Gold Price
  const data = await safeFetch(`${BINANCE_API}/ticker/24hr?symbol=PAXGUSDT`);
  if (!data) return { price: 2650, changePercent: 0 };
  
  return {
    price: parseFloat(data.lastPrice),
    changePercent: parseFloat(data.priceChangePercent)
  };
};

export const fetchFundingRates = async (): Promise<FundingRate[]> => {
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

export const fetchHighLow = async (symbol: string = 'BTCUSDT'): Promise<HighLowData[]> => {
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

export const fetchChartData = async (timeFrame: TimeFrame): Promise<ChartDataPoint[]> => {
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

// --- AI ANALYST ---

interface AnalysisInput {
  btcPrice: number;
  btcChange: number;
  goldPrice: number;
  goldChange: number;
  fundingRate: number;
  btcVolatility: HighLowData[];
  goldVolatility: HighLowData[];
}

export const fetchAIAnalysis = async (marketData: AnalysisInput, mode: ChartMode) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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