
import React from 'react';
import { NewsItem } from '../types';

interface NewsTickerProps {
  news: NewsItem[];
  onHeadlineClick: (news: NewsItem) => void;
  loading: boolean;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ news, onHeadlineClick, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center px-4 animate-pulse bg-panel/50">
        <div className="h-2 w-full bg-border/30 rounded"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center overflow-hidden bg-panel/90 border-t border-border/30 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 bg-accent text-white font-black text-[10px] h-full z-10 skew-x-[-15deg] -ml-2 shadow-[0_0_20px_rgba(var(--color-accent),0.6)] border-r border-glow/50">
        <span className="skew-x-[15deg] tracking-wider drop-shadow-md">LIVE NEWS</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative group">
        <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap gap-12 hover:[animation-play-state:paused] cursor-default py-2">
          {/* Duplicate for seamless scrolling */}
          {[...news, ...news].map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onHeadlineClick(item)}
              className="flex items-center gap-3 group/item transition-all"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                item.impact === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 
                item.impact === 'Medium' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-slate-500'
              }`}></span>
              <span className="text-[11px] font-bold text-textMuted group-hover/item:text-glow transition-colors">
                {item.source}:
              </span>
              <span className="text-[11px] text-textBase group-hover/item:text-white group-hover/item:underline decoration-glow/50 underline-offset-4 transition-colors">
                {item.headline}
              </span>
              <span className="text-[9px] font-mono text-textMuted">
                {item.timestamp}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};

export default NewsTicker;
