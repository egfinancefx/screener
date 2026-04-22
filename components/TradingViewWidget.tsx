
import React, { useEffect, useRef, memo, useState } from 'react';
import { Timeframe, TIMEFRAME_OPTIONS } from '../types';
import GlassDropdown from './GlassDropdown';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface ThemeConfig {
  name: string;
  type?: 'dark' | 'light';
  bg: string;
  candleUp: string;
  candleDown: string;
  grid: string;
}

interface TradingViewWidgetProps {
  symbol: string;
  interval: Timeframe;
  containerId: string;
  title: string;
  onTimeframeChange: (newTimeframe: Timeframe) => void;
  variant?: 'default' | 'minimal';
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  themeConfig: ThemeConfig;
  initDelay?: number; // Add delay prop for staggered loading
  activeSignal?: any; // The pattern that was clicked
}

// Singleton script loader to ensure tv.js is only downloaded once
let tvScriptLoadingPromise: Promise<void> | null = null;

const loadTradingViewScript = (): Promise<void> => {
  if (tvScriptLoadingPromise) return tvScriptLoadingPromise;

  tvScriptLoadingPromise = new Promise((resolve) => {
    if (window.TradingView) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.type = 'text/javascript';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return tvScriptLoadingPromise;
};

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  symbol, 
  interval, 
  containerId, 
  title, 
  onTimeframeChange,
  variant = 'default',
  isMaximized = false,
  onToggleMaximize,
  themeConfig,
  initDelay = 0,
  activeSignal
}) => {
  const container = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const currentSymbol = useRef(symbol);
  const currentInterval = useRef(interval);
  const [showDrawingTools, setShowDrawingTools] = useState(false);

  const SIDEBAR_WIDTH = 52; 
  
  // Update Tracking Info
  useEffect(() => {
    currentSymbol.current = symbol;
    currentInterval.current = interval;
  }, [symbol, interval]);

  // Handle Dynamic Updates WITHOUT Re-rendering iframe
  useEffect(() => {
    if (widgetRef.current) {
      try {
        widgetRef.current.onChartReady(() => {
          const chart = widgetRef.current.activeChart();
          if (chart) {
             if (chart.symbol() !== symbol) {
                 chart.setSymbol(symbol, () => {});
             }
             if (chart.resolution() !== interval) {
                 chart.setResolution(interval, () => {});
             }
          }
        });
      } catch (e) {
        console.warn('Failed to update chart dynamically', e);
      }
    }
  }, [symbol, interval]);

  // Initialize Widget (Runs on mount and theme change)
  useEffect(() => {
    let initTimeout: ReturnType<typeof setTimeout>;

    const initWidget = () => {
      loadTradingViewScript().then(() => {
        if (!container.current) return;
        
        // Clear previous widget explicitly
        container.current.innerHTML = '';

        if (window.TradingView) {
          // Create the widget and store it in ref
          widgetRef.current = new window.TradingView.widget({
            "autosize": true,
            "symbol": currentSymbol.current,
            "interval": currentInterval.current,
            "timezone": "Etc/UTC",
            "theme": themeConfig.type || "dark",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "hide_top_toolbar": true, 
            "hide_side_toolbar": false, // Always load with sidebar enabled
            "hide_legend": true, // Hidden to remove Title, OHLC, etc.
            "allow_symbol_change": false,
            "save_image": false,
            "calendar": false,
            "hide_volume": true,
            "container_id": containerId,
            "backgroundColor": themeConfig.bg, 
            "gridColor": "rgba(0, 0, 0, 0)", 
            "toolbar_bg": themeConfig.bg,
            "overrides": {
              "paneProperties.background": themeConfig.bg,
              "paneProperties.vertGridProperties.color": "rgba(0, 0, 0, 0)",
              "paneProperties.horzGridProperties.color": "rgba(0, 0, 0, 0)",
              "scalesProperties.showSymbolLabels": false, // Removes the asset name next to the price
              "paneProperties.legendProperties.showSymbol": false,
              "mainSeriesProperties.showPriceLine": true,
              "mainSeriesProperties.priceLineWidth": 1,
              "mainSeriesProperties.priceAxisProperties.showSymbolLabels": false, // Remove symbol from last value line
              "mainSeriesProperties.candleStyle.upColor": themeConfig.candleUp, 
              "mainSeriesProperties.candleStyle.downColor": themeConfig.candleDown, 
              "mainSeriesProperties.candleStyle.borderUpColor": themeConfig.candleUp,
              "mainSeriesProperties.candleStyle.borderDownColor": themeConfig.candleDown,
              "mainSeriesProperties.candleStyle.wickUpColor": themeConfig.candleUp,
              "mainSeriesProperties.candleStyle.wickDownColor": themeConfig.candleDown
            }
          });
        }
      });
    };

    if (initDelay > 0) {
      initTimeout = setTimeout(initWidget, initDelay);
    } else {
      initWidget();
    }

    // True cleanup: remove iframe to prevent memory leaks and lag
    return () => {
        clearTimeout(initTimeout);
        if (widgetRef.current && widgetRef.current.remove) {
           widgetRef.current.remove();
           widgetRef.current = null;
        } else if (container.current) {
           container.current.innerHTML = '';
        }
    };
  }, [containerId, themeConfig.name, initDelay]); // Do NOT depend on symbol or interval here!

  const chartStyle: React.CSSProperties = {
    width: showDrawingTools ? '100%' : `calc(100% + ${SIDEBAR_WIDTH}px)`, 
    marginLeft: showDrawingTools ? '0px' : `-${SIDEBAR_WIDTH}px`,
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative group">
      {/* Floating Header Control */}
      <div className={`
          absolute top-2 z-20 transition-all duration-300 ease-out
          ${showDrawingTools ? 'left-[60px]' : 'left-3'}
          flex items-center gap-1 p-1 pr-2 rounded-md
          bg-panel/90 backdrop-blur-md border border-border/20 shadow-[0_0_15px_rgba(0,0,0,0.4)]
          opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0
      `}>
          
        {/* Interval Selector */}
        <div className="relative">
          <GlassDropdown 
             value={interval}
             options={TIMEFRAME_OPTIONS}
             onChange={(val) => onTimeframeChange(val as Timeframe)}
             triggerClassName="text-[11px] font-bold text-textBase hover:text-glow px-2 py-0.5"
             dropdownClassName="w-24"
             iconClassName="w-2.5 h-2.5"
          />
        </div>

        <div className="w-[1px] h-3 bg-border/50"></div>

        {/* Tools Toggle */}
        <button
          onClick={() => setShowDrawingTools(prev => !prev)}
          className={`
            relative p-1 rounded hover:bg-accent/10 transition-colors
            ${showDrawingTools ? 'text-glow' : 'text-textMuted'}
          `}
          title={showDrawingTools ? "Hide Tools" : "Show Tools"}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        
        {/* Maximize Toggle */}
        {onToggleMaximize && (
          <button
            onClick={onToggleMaximize}
            className="text-textMuted hover:text-textBase transition-colors p-1 rounded hover:bg-accent/10"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6v6M20 10h-6V4" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            )}
          </button>
        )}
      </div>
      
      {/* Chart Wrapper */}
      <div className="flex-1 w-full overflow-hidden relative">
        <div 
          className="h-full" 
          id={containerId} 
          ref={container}
          style={chartStyle}
        ></div>
      </div>
      
      {/* Sidebar Mask */}
      {showDrawingTools && (
        <div className="absolute bottom-0 left-0 w-[38px] h-[32px] bg-background z-20 pointer-events-auto border-t border-r border-border/20"></div>
      )}

      {/* Signal Overlay */}
      {activeSignal && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
           <div className={`
             px-6 py-4 rounded-xl backdrop-blur-xl border-2 shadow-2xl flex flex-col items-center gap-2
             ${activeSignal.signal === 'Buy' 
                ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]' 
                : activeSignal.signal === 'Sell'
                   ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                   : 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.3)]'
             }
           `}>
             <span className={`text-xs font-black tracking-[0.2em] uppercase ${activeSignal.signal === 'Buy' ? 'text-green-400' : activeSignal.signal === 'Sell' ? 'text-red-400' : 'text-blue-400'}`}>
               Target Identified
             </span>
             <h3 className="text-xl font-bold text-white text-center drop-shadow-md">
               {activeSignal.pattern}
             </h3>
             <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${activeSignal.signal === 'Buy' ? 'bg-green-500/20 text-green-300' : activeSignal.signal === 'Sell' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {activeSignal.signal} SIGNAL
                </span>
                <span className="text-xs text-white/70 font-mono">
                  CONFIDENCE: {activeSignal.confidence.toUpperCase()}
                </span>
             </div>
           </div>
           
           {/* Pointing down to chart center */}
           <div className="relative mt-2 animate-bounce">
              <svg className={`w-10 h-10 drop-shadow-lg ${activeSignal.signal === 'Buy' ? 'text-green-500' : activeSignal.signal === 'Sell' ? 'text-red-500' : 'text-blue-500'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21l-9-9h6V3h6v9h6l-9 9z" />
              </svg>
           </div>
        </div>
      )}
    </div>
  );
};

export default memo(TradingViewWidget, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.interval === nextProps.interval &&
    prevProps.themeConfig.name === nextProps.themeConfig.name &&
    prevProps.isMaximized === nextProps.isMaximized &&
    prevProps.activeSignal?.id === nextProps.activeSignal?.id
  );
});
