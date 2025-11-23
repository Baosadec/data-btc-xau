import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

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

export default TickerCard;