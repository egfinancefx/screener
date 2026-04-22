
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
}

interface GlassDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  triggerClassName?: string;
  iconClassName?: string;
  dropdownClassName?: string;
  align?: 'left' | 'right';
}

const GlassDropdown: React.FC<GlassDropdownProps> = ({ 
  value, 
  options, 
  onChange,
  triggerClassName = "text-sm font-bold text-textBase",
  iconClassName = "text-textMuted",
  dropdownClassName = "w-48",
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const label = selectedOption ? selectedOption.label : value;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 outline-none hover:text-glow transition-colors ${triggerClassName}`}
      >
        <span className="truncate">{label}</span>
        <svg 
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${iconClassName}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 p-1 bg-panel/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5 overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'} ${dropdownClassName}`}>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                        }}
                        className={`
                            w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all
                            ${opt.value === value 
                                ? 'bg-accent text-white shadow-[0_0_15px_rgba(var(--color-accent),0.4)]' 
                                : 'text-textBase hover:bg-white/10 hover:text-white'
                            }
                        `}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default GlassDropdown;
