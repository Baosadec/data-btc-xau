import React from 'react';
import { HighLowData, FundingRate, ChartMode } from '../types.ts';
import { Zap, Activity, AlertTriangle, Disc } from 'lucide-react';

interface InfoPanelProps {
  btcHighLow: HighLowData[];
  goldHighLow: HighLowData[];
  funding: FundingRate[];
  chartMode: ChartMode;
}

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

const InfoPanel: React.FC<InfoPanelProps> = ({ btcHighLow, goldHighLow, funding, chartMode }) => {
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

export default InfoPanel;