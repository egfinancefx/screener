
import React, { useState, useEffect } from 'react';
import TradingViewWidget from './components/TradingViewWidget';
import NewsModal from './components/NewsModal';
import SmtOverlay from './components/SmtOverlay';
import GlassDropdown from './components/GlassDropdown';
import PatternDetector from './components/PatternDetector';
import MarketAnalyst from './components/MarketAnalyst';
import { getMarketNews, getPatternAnalysis, getMarketAnalysis } from './services/geminiService';
import { SymbolOption, Timeframe, NewsItem, SMT_PAIRS, SmtPair, TIMEFRAME_OPTIONS, PatternAnalysis, MarketAnalysis } from './types';

const SYMBOLS: SymbolOption[] = [
  { label: "XAUUSD", value: "OANDA:XAUUSD" },
  { label: "EURUSD", value: "OANDA:EURUSD" },
  { label: "GBPUSD", value: "OANDA:GBPUSD" },
  { label: "USDJPY", value: "OANDA:USDJPY" },
  { label: "GBPJPY", value: "OANDA:GBPJPY" },
  { label: "EURJPY", value: "OANDA:EURJPY" },
  { label: "BTCUSD", value: "COINBASE:BTCUSD" },
  { label: "US30", value: "BLACKBULL:US30" },
  { label: "SP500", value: "OANDA:SPX500USD" },
  { label: "Crude Oil", value: "TVC:USOIL" }
];

const TF_PRESETS = [
  { id: 'macro', label: 'Macro View', frames: ['W', 'D', '240', '60'] as Timeframe[] },
  { id: 'intraday', label: 'Intraday View', frames: ['60', '30', '15', '5'] as Timeframe[] }
];

const LS_KEYS = {
  SYMBOL: 'goldview_selected_symbol',
  TIMEFRAMES: 'goldview_preferred_timeframes',
  THEME: 'goldview_theme'
};

const THEMES = {
  blue: {
    name: 'blue',
    type: 'dark',
    bg: '#020617', // Slate 950
    candleUp: '#ffffff',
    candleDown: '#3b82f6', // Blue 500
    grid: 'rgba(30, 58, 138, 0.1)'
  },
  red: {
    name: 'red',
    type: 'dark',
    bg: '#050000', // Black/Red Dark
    candleUp: '#ffffff',
    candleDown: '#ef4444', // Red 500
    grid: 'rgba(127, 29, 29, 0.1)'
  },
  bw: {
    name: 'bw',
    type: 'dark',
    bg: '#000000', // Pure Black
    candleUp: '#ffffff',
    candleDown: '#525252', // Neutral 600
    grid: 'rgba(255, 255, 255, 0.08)'
  },
  light: {
    name: 'light',
    type: 'light',
    bg: '#ffffff', // White
    candleUp: '#089981', // TV Green
    candleDown: '#f23645', // TV Red
    grid: 'rgba(0, 0, 0, 0.06)'
  }
};

type ThemeType = 'blue' | 'red' | 'bw' | 'light';
type SmtLayout = 'portrait' | 'vertical'; // Portrait = Stacked (Top/Bottom), Vertical = Side-by-Side (Left/Right)

const App: React.FC = () => {
  // State
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(() => {
    const saved = localStorage.getItem(LS_KEYS.SYMBOL);
    return saved ? (SYMBOLS.find(s => s.value === saved) || SYMBOLS[0]) : SYMBOLS[0];
  });

  const [chartTimeframes, setChartTimeframes] = useState<Timeframe[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.TIMEFRAMES);
    try {
      const parsed = JSON.parse(saved || '[]');
      if (Array.isArray(parsed) && parsed.length === 4) return parsed;
    } catch {}
    return ['W', 'D', '240', '60']; // Default to Macro view
  });

  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem(LS_KEYS.THEME) as ThemeType) || 'blue';
  });

  const [maximizedChartIndex, setMaximizedChartIndex] = useState<number | null>(null);
  
  // SMT Mode State
  const [viewMode, setViewMode] = useState<'default' | 'smt'>('default');
  const [selectedSmtPair, setSelectedSmtPair] = useState<SmtPair>(SMT_PAIRS[0]);
  const [smtTimeframe, setSmtTimeframe] = useState<Timeframe>('15');
  const [smtLayout, setSmtLayout] = useState<SmtLayout>('portrait');
  const [isSyncActive, setIsSyncActive] = useState(false);

  // Data State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [isMarketAnalysisLoading, setIsMarketAnalysisLoading] = useState(false);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [showMarketAnalyst, setShowMarketAnalyst] = useState(false);

  // Pattern Detector State
  const [showPatternDetector, setShowPatternDetector] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [isPatternLoading, setIsPatternLoading] = useState(false);

  // Background Scanner State
  interface AppNotification {
    id: number;
    symbol: SymbolOption;
    timeframe: Timeframe;
    pattern: string;
    signal: 'Buy' | 'Sell' | 'Neutral';
    confidence: string;
    time: string;
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [activeSignalDetails, setActiveSignalDetails] = useState<AppNotification | null>(null);

  // Persistence
  useEffect(() => { localStorage.setItem(LS_KEYS.SYMBOL, selectedSymbol.value); }, [selectedSymbol]);
  useEffect(() => { localStorage.setItem(LS_KEYS.TIMEFRAMES, JSON.stringify(chartTimeframes)); }, [chartTimeframes]);
  useEffect(() => {
    localStorage.setItem(LS_KEYS.THEME, theme);
    const root = document.documentElement;
    
    // Clean up
    root.classList.remove('theme-red', 'theme-bw', 'theme-light');

    // Apply new theme
    if (theme === 'red') {
      root.classList.add('theme-red');
    } else if (theme === 'bw') {
      root.classList.add('theme-bw');
    } else if (theme === 'light') {
      root.classList.add('theme-light');
    }
  }, [theme]);

  // General Data Fetching
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      setLoadingData(true);
      setIsMarketAnalysisLoading(true);
      try {
        const [newsData, analysisData] = await Promise.all([
          getMarketNews(selectedSymbol.label).catch(() => []),
          getMarketAnalysis(selectedSymbol.label).catch(() => null)
        ]);
        
        if (!isCancelled) {
          setNews(newsData);
          setMarketAnalysis(analysisData);
        }
      } catch (e) {
        if (!isCancelled) console.error("Failed to fetch data", e);
      } finally {
        if (!isCancelled) {
          setLoadingData(false);
          setIsMarketAnalysisLoading(false);
        }
      }
    };

    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 300000); 
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  const handleTimeframeChange = React.useCallback((index: number, newTimeframe: Timeframe) => {
    setChartTimeframes(prev => {
      const nextTimeframes = [...prev];
      nextTimeframes[index] = newTimeframe;
      return nextTimeframes;
    });
  }, []);

  const handleToggleMaximize = React.useCallback((index: number) => {
    setMaximizedChartIndex(prev => prev === index ? null : index);
  }, []);

  const runPatternScan = async () => {
    setIsPatternLoading(true);
    try {
      // Use the timeframe of the first chart (primary chart)
      const primaryTimeframe = chartTimeframes[0];
      const analysis = await getPatternAnalysis(selectedSymbol.label, primaryTimeframe);
      setPatternAnalysis(analysis);
    } catch (e) {
      console.error("Failed to scan patterns", e);
    } finally {
      setIsPatternLoading(false);
    }
  };

  useEffect(() => {
    if (showPatternDetector) {
      runPatternScan();
    }
  }, [showPatternDetector, selectedSymbol, chartTimeframes[0]]);

  // Background Scanner Effect
  useEffect(() => {
    if (!isScannerActive) return;
    
    // Increased interval to 2 minutes (120000ms) to prevent Gemini 429 API rate limits
    const scanInterval = setInterval(async () => {
       const otherSymbols = SYMBOLS.filter(s => s.value !== selectedSymbol.value);
       const randomSymbol = otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
       const tfs: Timeframe[] = ['15', '30', '60', '240', 'D'];
       const randomTf = tfs[Math.floor(Math.random() * tfs.length)];
       
       try {
         const analysis = await getPatternAnalysis(randomSymbol.label, randomTf);
         if (analysis.detected && analysis.patterns.length > 0) {
           const pattern = analysis.patterns[0];
           setNotifications(prev => [...prev, {
             id: Date.now(),
             symbol: randomSymbol,
             timeframe: randomTf,
             pattern: pattern.name,
             signal: pattern.signal,
             confidence: pattern.confidence,
             time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
           }]);
         }
       } catch (e) {
         console.error("Background scan error", e);
       }
    }, 120000); 

    return () => clearInterval(scanInterval);
  }, [isScannerActive, selectedSymbol]);

  const dismissNotification = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (n: AppNotification) => {
      // Switch view to it
      setViewMode('default');
      setSelectedSymbol(n.symbol);
      handleTimeframeChange(0, n.timeframe);
      handleToggleMaximize(0); // Maximize the first chart to show the signal clearly
      setActiveSignalDetails({ ...n, id: Date.now() }); // Force new ID to re-trigger chart animations
      dismissNotification(n.id);
  };

  const handleSmtPairChange = (value: string) => {
    const pair = SMT_PAIRS.find(p => p.label === value);
    if (pair) {
      setSelectedSmtPair(pair);
      // Update the main selected symbol to the first asset of the pair so the AI sidebar is relevant
      setSelectedSymbol(pair.asset1);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
        if (prev === 'blue') return 'red';
        if (prev === 'red') return 'bw';
        if (prev === 'bw') return 'light';
        return 'blue';
    });
  };

  // Determine active preset
  const activePreset = TF_PRESETS.find(p => JSON.stringify(p.frames) === JSON.stringify(chartTimeframes))?.id || 'custom';

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background text-textBase relative overflow-hidden font-sans transition-colors duration-500 selection:bg-accent/30 selection:text-glow">
      {/* Background FX */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent/5 blur-[100px] rounded-full pointer-events-none transform-gpu"></div>
      
      {/* 1. Creative Header */}
      <header className="h-16 border-b border-white/5 bg-panel/60 backdrop-blur-xl flex items-center justify-between px-6 z-50 shrink-0 shadow-lg relative">
        {/* Top Highlight Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-50"></div>
        
        {/* Left: Brand & Navigation Island */}
        <div className="flex items-center gap-8">
           {/* Modern Logo */}
           <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setViewMode('default')}>
              <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-accent to-blue-900 rounded-lg shadow-[0_0_15px_rgba(var(--color-accent),0.4)] group-hover:shadow-[0_0_25px_rgba(var(--color-glow),0.5)] transition-all duration-500 ring-1 ring-white/10 group-hover:ring-glow/40">
                 <div className="absolute inset-0 bg-grid opacity-30 rounded-lg mix-blend-overlay"></div>
                 <svg className="w-5 h-5 text-white drop-shadow-md relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div className="flex flex-col justify-center">
                 <h1 className="text-xl font-bold tracking-tight text-textBase leading-none flex items-center gap-0.5">
                   EG<span className="text-accent drop-shadow-[0_0_8px_rgba(var(--color-accent),0.5)]">FINANCE</span>
                 </h1>
                 <span className="text-xs font-medium text-glow/80 tracking-normal group-hover:text-glow transition-colors">Fx Scanner</span>
              </div>
           </div>

           {/* Divider */}
           <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

           {/* Command Center / Navigation */}
           <nav className="flex items-center p-1 bg-black/5 dark:bg-black/20 border border-white/5 rounded-lg backdrop-blur-sm shadow-inner">
             {viewMode === 'default' ? (
                <div className="flex items-center gap-2">
                  
                  {/* Asset Selector Dropdown */}
                  <div className="flex items-center gap-2 px-3 border-r border-white/10 relative group/assets">
                      <div className="flex flex-col items-start justify-center">
                          <span className="text-[11px] font-medium text-textMuted mb-0.5 opacity-80">Asset</span>
                          <GlassDropdown 
                            value={selectedSymbol.value}
                            options={SYMBOLS}
                            onChange={(val) => {
                                const s = SYMBOLS.find(sym => sym.value === val);
                                if(s) setSelectedSymbol(s);
                            }}
                            triggerClassName="text-sm font-bold text-textBase min-w-[100px]"
                            dropdownClassName="w-[180px]"
                          />
                      </div>
                   </div>

                   {/* View Layout Selector */}
                   <div className="flex items-center gap-2 px-3 relative group/views">
                        <div className="flex flex-col items-start justify-center">
                            <span className="text-[11px] font-medium text-textMuted mb-0.5 opacity-80">Layout</span>
                            <GlassDropdown 
                              value={activePreset}
                              options={TF_PRESETS.map(p => ({ label: p.label, value: p.id }))}
                              onChange={(val) => {
                                const p = TF_PRESETS.find(pre => pre.id === val);
                                if(p) setChartTimeframes(p.frames);
                              }}
                              triggerClassName="text-sm font-bold text-textBase min-w-[140px]"
                              dropdownClassName="w-[200px]"
                            />
                        </div>
                   </div>

                   <div className="w-[1px] h-4 bg-white/10 mx-2"></div>
                   
                   <div className="flex items-center gap-2">
                     <button
                      onClick={() => setIsScannerActive(!isScannerActive)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold tracking-wide transition-all duration-300 ${
                        isScannerActive 
                          ? 'text-green-400 bg-green-500/10 border border-green-500/30' 
                          : 'text-textMuted bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                      title="Background Pattern Scanner"
                     >
                       <div className={`w-2 h-2 rounded-full ${isScannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                       Scanner
                     </button>

                     <button
                      onClick={() => setShowPatternDetector(!showPatternDetector)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold tracking-wide transition-all duration-300 group ${
                        showPatternDetector 
                          ? 'text-blue-400 bg-blue-500/10 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                          : 'text-blue-400/80 hover:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.05)]'
                      }`}
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                       AI Pattern Detector
                     </button>

                     <button
                      onClick={() => setShowMarketAnalyst(!showMarketAnalyst)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold tracking-wide transition-all duration-300 group ${
                        showMarketAnalyst 
                          ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                          : 'text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.05)]'
                      }`}
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                       AI Analyst
                     </button>
                     
                     <button
                      onClick={() => setViewMode('smt')}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold tracking-wide text-purple-400 hover:text-glow hover:bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group shadow-[0_0_10px_rgba(168,85,247,0.05)] hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                     >
                       <span className="w-2 h-2 rounded-full bg-purple-500 group-hover:animate-pulse shadow-[0_0_5px_#a855f7]"></span>
                       SMT Scanner
                     </button>
                   </div>
                </div>
             ) : (
                // SMT Toolbar
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300 px-2">
                    <button
                        onClick={() => setViewMode('default')}
                        className="flex items-center gap-1.5 text-xs font-bold text-textMuted hover:text-glow transition-colors pr-4 border-r border-white/10 h-8"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>

                    <div className="flex items-center gap-3 px-2">
                      <span className="text-xs font-medium text-purple-400 opacity-80">Pair</span>
                      <GlassDropdown 
                        value={selectedSmtPair.label}
                        options={SMT_PAIRS.map(p => ({ label: p.label, value: p.label }))}
                        onChange={handleSmtPairChange}
                        triggerClassName="text-sm font-bold text-purple-500 min-w-[140px]"
                        iconClassName="text-purple-400"
                        dropdownClassName="w-[200px]"
                      />
                    </div>

                    <div className="w-[1px] h-5 bg-white/10"></div>

                    {/* SMT Tools */}
                     <div className="flex bg-black/5 dark:bg-black/20 rounded border border-white/5 p-1 ml-1">
                        <button
                            onClick={() => setSmtLayout('portrait')}
                            className={`p-1.5 rounded transition-colors ${smtLayout === 'portrait' ? 'bg-purple-500/20 text-purple-500 shadow-inner' : 'text-textMuted hover:text-textBase'}`}
                            title="Portrait View"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        </button>
                        <button
                            onClick={() => setSmtLayout('vertical')}
                            className={`p-1.5 rounded transition-colors ${smtLayout === 'vertical' ? 'bg-purple-500/20 text-purple-500 shadow-inner' : 'text-textMuted hover:text-textBase'}`}
                            title="Side by Side"
                        >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16m6-16v16" /></svg>
                        </button>
                    </div>

                    <button
                       onClick={() => setIsSyncActive(!isSyncActive)}
                       className={`
                          ml-2 flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border
                          ${isSyncActive 
                            ? 'bg-glow/10 border-glow text-glow shadow-[0_0_10px_rgba(var(--color-glow),0.2)]' 
                            : 'bg-transparent border-white/10 text-textMuted hover:text-textBase hover:border-white/30'
                          }
                       `}
                    >
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" /></svg>
                       Sync Mode
                    </button>
                </div>
             )}
           </nav>
        </div>

        {/* Right: System & Theme */}
        <div className="flex items-center gap-4">
           {/* Status Pill */}
           <div className="flex items-center gap-3 bg-black/5 dark:bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                    <div className={`w-2 h-2 rounded-full ${loadingData ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
                    <span className="text-xs font-bold text-textMuted tracking-wide">
                        {loadingData ? 'Updating' : 'Online'}
                    </span>
                </div>
                <div className="text-xs font-bold text-textBase min-w-[60px] text-center">
                    {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
           </div>

           {/* Theme Switcher */}
           <button
             onClick={toggleTheme}
             className={`p-2 rounded-xl border transition-all duration-500 relative group overflow-hidden ${
               theme === 'red' 
               ? 'bg-red-950/30 border-red-500/20 text-red-400 hover:border-red-500/50' 
               : theme === 'bw'
                 ? 'bg-neutral-900/30 border-neutral-500/20 text-neutral-400 hover:border-white/50'
                 : theme === 'light'
                   ? 'bg-slate-100 border-slate-300 text-yellow-600 hover:border-yellow-500/50'
                   : 'bg-blue-950/30 border-blue-500/20 text-blue-400 hover:border-blue-500/50'
             }`}
             title="Switch Theme"
           >
             <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${
                 theme === 'red' ? 'from-red-500/10' : theme === 'bw' ? 'from-white/10' : theme === 'light' ? 'from-yellow-400/20' : 'from-blue-500/10'
             } to-transparent`}></div>
             
             {theme === 'blue' && (
                <svg className="w-5 h-5 relative z-10 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             )}
             {theme === 'red' && (
                <svg className="w-5 h-5 relative z-10 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             )}
             {theme === 'bw' && (
                <svg className="w-5 h-5 relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm0-14a6 6 0 100 12V6z" /></svg>
             )}
             {theme === 'light' && (
                <svg className="w-5 h-5 relative z-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             )}
           </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex overflow-hidden z-10 relative">
        
        {/* Notifications Container */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          {notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className="pointer-events-auto w-80 bg-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 animate-in slide-in-from-right-8 fade-in duration-300 relative overflow-hidden cursor-pointer hover:bg-white/5 transition-colors group/notif"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${n.signal === 'Buy' ? 'bg-green-500' : n.signal === 'Sell' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <button 
                onClick={(e) => dismissNotification(n.id, e)} 
                className="absolute top-2 right-2 text-textMuted hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex justify-between items-start mb-2 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-textBase group-hover/notif:text-glow transition-colors">{n.symbol.label}</span>
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">
                    {n.timeframe === 'D' ? 'Daily' : n.timeframe === 'W' ? 'Weekly' : `${n.timeframe}m`}
                  </span>
                  <span className="text-[10px] text-textMuted">{n.time}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${n.signal === 'Buy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : n.signal === 'Sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                  {n.signal}
                </span>
              </div>
              <p className="text-sm text-textBase/90 font-medium pb-1">{n.pattern}</p>
              <div className="flex items-center justify-between mt-1">
                 <p className="text-xs text-textMuted">Confidence: {n.confidence}</p>
                 <span className="text-[10px] text-accent font-bold opacity-0 group-hover/notif:opacity-100 transition-opacity flex items-center gap-1">
                    View Chart 
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Container */}
        <main className="flex-1 flex flex-col relative bg-panel/30">
          {showPatternDetector && (
            <PatternDetector 
              analysis={patternAnalysis} 
              loading={isPatternLoading} 
              onClose={() => setShowPatternDetector(false)} 
            />
          )}
          
          <div className="flex-1 p-1 h-full relative">
             {viewMode === 'default' ? (
               // DEFAULT GRID VIEW (4 Charts)
               <div className="grid grid-cols-2 grid-rows-2 h-full gap-1">
                 {chartTimeframes.map((tf, idx) => {
                   const isMaximized = maximizedChartIndex === idx;
                   const isHidden = maximizedChartIndex !== null && !isMaximized;
                   
                   return (
                     <div 
                       key={idx}
                       className={`
                         relative bg-background border border-border/20 rounded-lg overflow-hidden transition-all duration-300 shadow-2xl
                         ${isMaximized ? 'col-span-2 row-span-2 z-50 border-accent/30 shadow-[0_0_30px_rgba(var(--color-accent),0.15)]' : ''}
                         ${isHidden ? 'hidden' : ''}
                         group hover:border-accent/20
                       `}
                     >
                       <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"></div>
                       <TradingViewWidget 
                         symbol={selectedSymbol.value}
                         interval={tf}
                         containerId={`tv_chart_${idx}`}
                         title={selectedSymbol.label}
                         onTimeframeChange={(newTf) => handleTimeframeChange(idx, newTf)} // Note: We actually need a wrapper but it's okay because we didn't export TradingViewWidget using custom props comparison. Let's fix that next!
                         isMaximized={isMaximized}
                         onToggleMaximize={() => handleToggleMaximize(idx)}
                         themeConfig={THEMES[theme]}
                         initDelay={idx * 300} // Stagger by 300ms each to prevent CPU freeze
                       />
                       
                        {/* Maximize Button Overlay */}
                        {/* TradingViewWidget handles its own maximize button now, but we keep this for structure if needed, or remove it since TradingViewWidget has onToggleMaximize */}
                     </div>
                   );
                 })}
               </div>
             ) : (
               // SMT DIVERGENCE VIEW (2 Charts)
               <div className={`flex ${smtLayout === 'portrait' ? 'flex-col' : 'flex-row'} h-full gap-1 relative`}>
                  
                  {/* SMT SCANNER OVERLAY */}
                  <SmtOverlay 
                    analysis={null} 
                    loading={false} 
                    layout={smtLayout}
                    isSyncActive={isSyncActive}
                    onDeactivateSync={() => setIsSyncActive(false)}
                  />
                  
                  {/* Chart 1 */}
                  <div className="flex-1 relative bg-background border border-purple-900/20 rounded-lg overflow-hidden group hover:border-purple-500/30 transition-colors">
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-purple-900/20 text-purple-300 text-[10px] font-bold px-3 py-0.5 rounded-full border border-purple-500/20 backdrop-blur-md shadow-lg">
                        {selectedSmtPair.asset1.label}
                     </div>
                     <TradingViewWidget 
                       symbol={selectedSmtPair.asset1.value}
                       interval={smtTimeframe}
                       containerId="tv_smt_1"
                       title={selectedSmtPair.asset1.label}
                       variant="minimal"
                       onTimeframeChange={setSmtTimeframe}
                       themeConfig={THEMES[theme]}
                       initDelay={0}
                     />
                  </div>
                  
                  {/* Chart 2 */}
                  <div className="flex-1 relative bg-background border border-purple-900/20 rounded-lg overflow-hidden group hover:border-purple-500/30 transition-colors">
                     <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-purple-900/20 text-purple-300 text-[10px] font-bold px-3 py-0.5 rounded-full border border-purple-500/20 backdrop-blur-md shadow-lg">
                        {selectedSmtPair.asset2.label}
                     </div>
                     <TradingViewWidget 
                       symbol={selectedSmtPair.asset2.value}
                       interval={smtTimeframe}
                       containerId="tv_smt_2"
                       title={selectedSmtPair.asset2.label}
                       variant="minimal"
                       onTimeframeChange={setSmtTimeframe}
                       themeConfig={THEMES[theme]}
                       initDelay={400} // Stagger 2nd chart
                     />
                  </div>
               </div>
             )}
          </div>
        </main>

        {/* AI Market Analyst Panel (Floating Right Side) */}
        {viewMode === 'default' && (
          <aside 
            className={`
              absolute top-0 right-0 h-full w-80 border-l border-border/20 
              bg-panel/95 backdrop-blur-xl flex flex-col p-4 overflow-y-auto 
              shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-40 transition-transform duration-300 ease-in-out
              ${showMarketAnalyst ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-bold text-textBase flex items-center gap-2 uppercase tracking-wider">
                 <svg className="w-4 h-4 text-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                 AI Market Analyst
              </h2>
              <button 
                 onClick={() => setShowMarketAnalyst(false)}
                 className="p-1 text-textMuted hover:text-textBase rounded bg-white/5 hover:bg-white/10 transition-colors"
                 title="Close Panel"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1">
              <MarketAnalyst 
                symbolLabel={selectedSymbol.label} 
                analysis={marketAnalysis} 
                loading={isMarketAnalysisLoading} 
              />
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      <NewsModal item={selectedNewsItem} onClose={() => setSelectedNewsItem(null)} />
    </div>
  );
};

export default App;
