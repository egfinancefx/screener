
import React from 'react';
import { MarketAnalysis } from '../types';

interface MarketAnalystProps {
  symbolLabel: string;
  analysis: MarketAnalysis | null;
  loading: boolean;
}

const MarketAnalyst: React.FC<MarketAnalystProps> = ({ symbolLabel, analysis, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center animate-pulse bg-background/30 border border-border/30 rounded-lg backdrop-blur-sm">
        <div className="text-glow text-sm text-center px-4 font-mono">Consulting Gemini AI...</div>
      </div>
    );
  }

  return (
    <div className="bg-background/80 border border-border/40 rounded-lg p-4 flex flex-col gap-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-textBase uppercase tracking-tight">{symbolLabel} Sentiment</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${
          analysis?.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_5px_rgba(34,197,94,0.2)]' :
          analysis?.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_5px_rgba(239,68,68,0.2)]' :
          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
        }`}>
          {analysis?.sentiment}
        </span>
      </div>
      
      <p className="text-xs text-textMuted leading-relaxed italic border-l-2 border-glow/50 pl-3 py-1">
        "{analysis?.summary}"
      </p>

      <div className="grid grid-cols-2 gap-3 mt-2 bg-panel/30 p-2 rounded-lg border border-border/30">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-tighter">Resistance</span>
          {analysis?.keyLevels.resistance.map((level, i) => (
            <div key={i} className="text-[11px] font-mono text-textBase">{level}</div>
          ))}
        </div>
        <div className="space-y-1 border-l border-border/30 pl-3">
          <span className="text-[10px] font-bold text-green-400/80 uppercase tracking-tighter">Support</span>
          {analysis?.keyLevels.support.map((level, i) => (
            <div key={i} className="text-[11px] font-mono text-textBase">{level}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketAnalyst;
