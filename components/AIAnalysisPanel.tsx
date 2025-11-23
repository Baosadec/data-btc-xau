import React, { useState } from 'react';
import { Bot, Sparkles, RefreshCw } from 'lucide-react';
import { fetchAIAnalysis } from '../services/marketService';

interface AIAnalysisPanelProps {
  btcPrice: number;
  btcChange: number;
  goldPrice: number;
  goldChange: number;
  fundingRate: number;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  btcPrice,
  btcChange,
  goldPrice,
  goldChange,
  fundingRate
}) => {
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!process.env.API_KEY) {
      setAnalysis("⚠️ Lỗi: Chưa cấu hình API Key cho AI Analyst.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(""); // Clear old analysis

    try {
      const result = await fetchAIAnalysis({
        btcPrice,
        btcChange,
        goldPrice,
        goldChange,
        fundingRate
      });
      setAnalysis(result || "Không có phản hồi từ AI.");
    } catch (e) {
      setAnalysis("Lỗi khi kết nối với chuyên gia AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6 relative overflow-hidden shadow-xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Bot size={120} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 z-10 relative gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Gemini Market Analyst</h2>
            <p className="text-xs text-slate-400">Phân tích xu hướng & tâm lý thị trường (AI)</p>
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
              Đang suy nghĩ...
            </>
          ) : (
            <>
              <Bot size={16} />
              Phân tích Ngay
            </>
          )}
        </button>
      </div>

      <div className="min-h-[100px] bg-slate-950/50 rounded-lg p-4 border border-slate-700/50 font-mono text-sm leading-relaxed text-slate-300">
        {analysis ? (
          <div className="prose prose-invert max-w-none text-sm whitespace-pre-line">
            {analysis}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
            <Bot size={32} className="mb-2 opacity-50" />
            <p>Nhấn nút "Phân tích Ngay" để AI đọc dữ liệu và đưa ra nhận định.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPanel;