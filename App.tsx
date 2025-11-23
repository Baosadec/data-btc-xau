import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import MarketChart from './components/MarketChart';
import TickerCard from './components/TickerCard';
import InfoPanel from './components/InfoPanel';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import { 
  fetchBTCPrice, 
  fetchGoldPrice, 
  fetchFundingRates, 
  fetchHighLow, 
  fetchChartData 
} from './services/marketService';
import { ChartDataPoint, FundingRate, HighLowData, TimeFrame, ChartMode } from './types';

function App() {
  const [btcData, setBtcData] = useState({ price: 0, changePercent: 0 });
  const [goldData, setGoldData] = useState({ price: 0, changePercent: 0 });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [fundingData, setFundingData] = useState<FundingRate[]>([]);
  const [highLowData, setHighLowData] = useState<HighLowData[]>([]);
  
  // New States for Controls
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.H1);
  const [chartMode, setChartMode] = useState<ChartMode>('combined');

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch for speed
      const [btc, gold, funding, hl, chart] = await Promise.all([
        fetchBTCPrice(),
        fetchGoldPrice(),
        fetchFundingRates(),
        fetchHighLow(),
        fetchChartData(timeFrame) // Pass the selected timeframe
      ]);

      setBtcData(btc);
      setGoldData(gold);
      setFundingData(funding);
      setHighLowData(hl);
      setChartData(chart);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, [timeFrame]); // Re-create fetcher when timeframe changes

  // Initial load and Interval
  useEffect(() => {
    loadAllData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAllData]);

  // Handle manual timeframe change
  const handleTimeFrameChange = (newTf: TimeFrame) => {
    if (newTf !== timeFrame) {
      setTimeFrame(newTf);
      // Trigger load immediately via effect dependency
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] p-4 md:p-6 lg:p-8 font-sans selection:bg-[#4ecdc4]/30">
      
      {/* Header / Meta Bar */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-[#4ecdc4] text-[#1e1e2e] font-black p-2 rounded text-xl shadow-[0_0_15px_rgba(78,205,196,0.5)]">
                TV
            </div>
            <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Market Intelligence
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                    Cross-Asset Correlation Engine
                </p>
            </div>
        </div>

        <div className="flex items-center gap-4 text-sm bg-slate-800/50 p-2 rounded-full border border-slate-700/50 px-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-400">
                <Clock size={14} />
                <span>Cập nhật: <span className="text-white font-mono">{lastUpdated || '...'}</span></span>
            </div>
            <button 
                onClick={loadAllData} 
                className={`p-1.5 rounded-full hover:bg-slate-700 transition-all ${loading ? 'animate-spin text-[#4ecdc4]' : 'text-slate-300'}`}
                title="Refresh Data"
            >
                <RefreshCw size={16} />
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Tickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TickerCard 
            symbol="BTC/USDT" 
            name="Bitcoin Spot"
            price={btcData.price}
            changePercent={btcData.changePercent}
            color="teal"
          />
          <TickerCard 
            symbol="XAU/USD" 
            name="Gold (PAXG Real-time)"
            price={goldData.price}
            changePercent={goldData.changePercent}
            color="gold"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart & AI Section (Takes up 2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <MarketChart 
              data={chartData} 
              isLoading={loading}
              timeFrame={timeFrame}
              onTimeFrameChange={handleTimeFrameChange}
              chartMode={chartMode}
              onChartModeChange={setChartMode}
            />

             {/* AI Analysis Panel */}
             <AIAnalysisPanel 
                btcPrice={btcData.price}
                btcChange={btcData.changePercent}
                goldPrice={goldData.price}
                goldChange={goldData.changePercent}
                fundingRate={fundingData[0]?.rate * 100 || 0}
             />
            
            {/* Disclaimer / Footer */}
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-600 px-2">
                <p>• Data sources: Binance (BTC), PAXG/USDT (Gold Proxy)</p>
                <p>• AI Analysis powered by Google Gemini 2.5 Flash</p>
            </div>
          </div>

          {/* Side Panel (Stats, Funding, High/Low) */}
          <div className="lg:col-span-1">
            <InfoPanel highLow={highLowData} funding={fundingData} />
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;