import React from 'react';
import { PatternAnalysis } from '../types';

interface PatternDetectorProps {
  analysis: PatternAnalysis | null;
  loading: boolean;
  onClose: () => void;
}

const PatternDetector: React.FC<PatternDetectorProps> = ({ analysis, loading, onClose }) => {
  return (
    <div className="absolute top-16 right-4 z-50 w-80 bg-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-yellow-400' : 'bg-purple-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${loading ? 'bg-yellow-500' : 'bg-purple-500'}`}></span>
          </div>
          <h3 className="text-sm font-bold text-textBase tracking-wide">AI Pattern Detector</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-textMuted hover:text-textBase transition-colors p-1 rounded-md hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-xs text-textMuted font-mono animate-pulse">Scanning charts for patterns...</p>
          </div>
        ) : !analysis ? (
          <div className="text-center py-6 text-textMuted text-sm">
            Click "Scan" to analyze the current chart.
          </div>
        ) : !analysis.detected || analysis.patterns.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm text-textBase font-medium">No Clear Patterns Detected</p>
            <p className="text-xs text-textMuted mt-1">The AI did not find any strong structural patterns on this timeframe.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {analysis.patterns.map((pattern, idx) => {
              const isBullish = pattern.type === 'Bullish';
              const isBearish = pattern.type === 'Bearish';
              const colorClass = isBullish ? 'text-green-400' : isBearish ? 'text-red-400' : 'text-blue-400';
              const bgClass = isBullish ? 'bg-green-500/10 border-green-500/20' : isBearish ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20';
              
              return (
                <div key={idx} className={`p-3 rounded-lg border ${bgClass}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`text-sm font-bold ${colorClass}`}>{pattern.name}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${colorClass} border-current opacity-80`}>
                        {pattern.confidence}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        pattern.signal === 'Buy' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                        pattern.signal === 'Sell' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {pattern.signal}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-textBase/90 leading-relaxed">
                    {pattern.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternDetector;
