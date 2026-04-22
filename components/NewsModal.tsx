
import React from 'react';
import { NewsItem } from '../types';

interface NewsModalProps {
  item: NewsItem | null;
  onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-panel border border-border/50 rounded-2xl shadow-[0_0_60px_rgba(var(--color-accent),0.15)] overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200 ring-1 ring-glow/20">
        <div className="p-6 border-b border-border/30 flex justify-between items-start gap-4 bg-panel/20">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                item.impact === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]' :
                item.impact === 'Medium' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' :
                'bg-slate-500/10 text-slate-400 border border-slate-500/30'
              }`}>
                {item.impact} IMPACT
              </span>
              <span className="text-xs font-mono text-textMuted">{item.timestamp}</span>
            </div>
            <h2 className="text-xl font-bold text-white leading-tight">{item.headline}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-colors text-textMuted hover:text-glow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 text-textMuted">
            <span className="text-xs font-bold text-glow">SOURCE: {item.source}</span>
          </div>
          <div className="text-textBase leading-relaxed space-y-4 font-light">
            {item.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-background/50 border-t border-border/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-accent/10 hover:bg-accent/20 text-accent hover:text-glow rounded-lg text-sm font-bold transition-all border border-accent/20 hover:border-accent/40 shadow-[0_0_10px_rgba(var(--color-accent),0.1)] hover:shadow-[0_0_15px_rgba(var(--color-accent),0.2)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
