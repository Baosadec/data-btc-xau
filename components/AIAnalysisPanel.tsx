import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { fetchAIAnalysis } from '../services/marketService.ts';
import { ChartMode, HighLowData } from '../types.ts';

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
    if (!process.env.API_KEY) {
      setAnalysis("⚠️ Lỗi: Chưa cấu hình API Key cho AI Analyst.");
      return;
    }

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
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden shadow-xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5">
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

export default AIAnalysisPanel;