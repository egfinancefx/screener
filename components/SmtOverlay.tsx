
import React, { useState, useRef, useEffect } from 'react';
import { SmtAnalysis } from '../types';

interface SmtOverlayProps {
  analysis: SmtAnalysis | null;
  loading: boolean;
  layout: 'portrait' | 'vertical';
  isSyncActive: boolean;
  onDeactivateSync: () => void;
}

const SmtOverlay: React.FC<SmtOverlayProps> = ({ 
  analysis, 
  loading, 
  layout, 
  isSyncActive,
  onDeactivateSync 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Sync Crosshair Mode (Interactive Overlay)
  if (isSyncActive) {
    return (
      <div 
        ref={containerRef}
        className="absolute inset-0 z-40 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onDeactivateSync}
      >
        {/* Info Badge */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-accent/80 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md border border-white/20 pointer-events-none">
          SYNC MODE ACTIVE - CLICK TO EXIT
        </div>

        {mousePos && (
          <>
            {layout === 'portrait' ? (
              // PORTRAIT (Stacked): Single vertical line spans top to bottom
              <>
                <div 
                  className="absolute top-0 bottom-0 w-[1px] bg-glow shadow-[0_0_10px_rgba(var(--color-glow),0.8)] pointer-events-none"
                  style={{ left: mousePos.x }}
                ></div>
                {/* Horizontal line following mouse for precise Y check */}
                <div 
                  className="absolute left-0 right-0 h-[1px] bg-glow/50 border-t border-dashed border-glow/80 pointer-events-none"
                  style={{ top: mousePos.y }}
                ></div>
              </>
            ) : (
              // VERTICAL (Side-by-Side): Duplicate vertical lines
              (() => {
                const width = containerRef.current?.offsetWidth || 0;
                const mid = width / 2;
                const isLeft = mousePos.x < mid;
                
                // Calculate relative position (0 to 100% of a single chart)
                const relativeX = isLeft ? mousePos.x : mousePos.x - mid;
                
                // Position for Left Cursor and Right Cursor
                const leftX = relativeX;
                const rightX = relativeX + mid;

                return (
                  <>
                    {/* Left Chart Cursor */}
                    <div 
                      className="absolute top-0 bottom-0 w-[1px] bg-glow shadow-[0_0_10px_rgba(var(--color-glow),0.8)] pointer-events-none transition-transform duration-75"
                      style={{ left: leftX }}
                    >
                      <div className="absolute top-0 -translate-x-1/2 bg-glow text-panel text-[9px] font-bold px-1 rounded-b">T1</div>
                    </div>
                    
                    {/* Right Chart Cursor */}
                    <div 
                      className="absolute top-0 bottom-0 w-[1px] bg-glow shadow-[0_0_10px_rgba(var(--color-glow),0.8)] pointer-events-none transition-transform duration-75"
                      style={{ left: rightX }}
                    >
                      <div className="absolute top-0 -translate-x-1/2 bg-glow text-panel text-[9px] font-bold px-1 rounded-b">T2</div>
                    </div>

                    {/* Horizontal Line (Only on the hovered side to inspect price) */}
                    <div 
                       className="absolute h-[1px] bg-glow/50 border-t border-dashed border-glow/80 pointer-events-none w-1/2"
                       style={{ 
                         top: mousePos.y,
                         left: isLeft ? 0 : '50%'
                       }}
                    ></div>
                  </>
                );
              })()
            )}
          </>
        )}
      </div>
    );
  }

  // Default SMT Analysis Overlay (Passive)
  if (!analysis || !analysis.detected || analysis.type === 'None') {
    return null;
  }

  const isBullish = analysis.type === 'Bullish';
  const colorClass = isBullish ? 'text-green-400 border-green-500 shadow-green-500/20' : 'text-red-400 border-red-500 shadow-red-500/20';
  const arrowColor = isBullish ? '#4ade80' : '#f87171'; // green-400 : red-400

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
      {/* Central HUD Badge */}
      <div className={`
        bg-panel/90 backdrop-blur-xl border-2 px-6 py-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] 
        flex flex-col items-center gap-1 animate-in zoom-in fade-in duration-300
        ${colorClass}
      `}>
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-black tracking-widest uppercase">{analysis.type} SMT DETECTED</span>
        </div>
        <span className="text-[10px] font-mono opacity-80 max-w-[200px] text-center leading-tight">
          {analysis.reasoning}
        </span>
        <div className="mt-1 flex gap-1">
          {[1,2,3].map(i => (
             <div key={i} className={`w-8 h-1 rounded-full ${i <= (analysis.confidence === 'High' ? 3 : analysis.confidence === 'Medium' ? 2 : 1) ? (isBullish ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-700'}`}></div>
          ))}
        </div>
      </div>

      {/* Visual Lines / Indicators */}
      <svg className="absolute inset-0 w-full h-full opacity-60">
        <defs>
           <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
             <polygon points="0 0, 10 3.5, 0 7" fill={arrowColor} />
           </marker>
        </defs>
        
        {layout === 'portrait' ? (
           // Top/Bottom Layout Indicators
           <>
             {/* Line for Top Chart */}
             <line 
               x1="20%" y1="25%" x2="80%" y2={isBullish ? "35%" : "15%"} 
               stroke={arrowColor} strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)"
             />
             <text x="50%" y="20%" fill={arrowColor} fontSize="10" fontWeight="bold" textAnchor="middle">
                {isBullish ? "LOWER LOW" : "HIGHER HIGH"}
             </text>

             {/* Line for Bottom Chart */}
             <line 
               x1="20%" y1="75%" x2="80%" y2={isBullish ? "65%" : "85%"} 
               stroke={arrowColor} strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)"
             />
              <text x="50%" y="70%" fill={arrowColor} fontSize="10" fontWeight="bold" textAnchor="middle">
                {isBullish ? "HIGHER LOW" : "LOWER HIGH"}
             </text>
           </>
        ) : (
            // Left/Right Layout Indicators
            <>
             {/* Line for Left Chart */}
             <line 
               x1="10%" y1="50%" x2="40%" y2={isBullish ? "60%" : "40%"} 
               stroke={arrowColor} strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)"
             />
             
             {/* Line for Right Chart */}
             <line 
               x1="60%" y1="50%" x2="90%" y2={isBullish ? "40%" : "60%"} 
               stroke={arrowColor} strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)"
             />
            </>
        )}
      </svg>
    </div>
  );
};

export default SmtOverlay;
