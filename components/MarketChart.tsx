import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area
} from 'recharts';
import { ChartDataPoint, ChartMode, TimeFrame } from '../types.ts';
import { Maximize2, Layers, DollarSign } from 'lucide-react';

interface MarketChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
  timeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
}

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

const MarketChart: React.FC<MarketChartProps> = ({ 
  data, 
  isLoading, 
  timeFrame, 
  onTimeFrameChange,
  chartMode,
  onChartModeChange
}) => {
  
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
  const leftDataKey = chartMode === 'gold' ? 'xau' : 'btc';

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

export default MarketChart;