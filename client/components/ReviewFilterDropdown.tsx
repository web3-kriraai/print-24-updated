import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface FilterOption {
  value: string | number | null;
  label: string;
}

interface ReviewFilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  className?: string;
  id?: string;
  theme?: "cream" | "blue" | "rose" | "yellow";
  disabled?: boolean;
}

export const ReviewFilterDropdown: React.FC<ReviewFilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = "",
  id,
  theme = "cream",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Theme-based styles configuration
  const themeStyles = {
    cream: {
      button: "border-cream-300 bg-white text-cream-900 hover:border-cream-500",
      activeItem: "text-cream-900",
      hoverItem: "hover:bg-cream-50",
      scrollbarThumb: "#d4a574",
      scrollbarTrack: "#f5f5f0",
      scrollbarThumbHover: "#c49564",
    },
    blue: {
      button: "border-slate-300 bg-white text-slate-700 hover:border-blue-400 focus:ring-blue-100",
      activeItem: "text-blue-600",
      hoverItem: "hover:bg-blue-50 text-slate-700",
      scrollbarThumb: "#60a5fa", // blue-400
      scrollbarTrack: "#eff6ff", // blue-50
      scrollbarThumbHover: "#3b82f6", // blue-500
    },
    rose: {
      button: "border-slate-300 bg-white text-slate-700 hover:border-rose-400 focus:ring-rose-100",
      activeItem: "text-rose-600",
      hoverItem: "hover:bg-rose-50 text-slate-700",
      scrollbarThumb: "#fb7185", // rose-400
      scrollbarTrack: "#fff1f2", // rose-50
      scrollbarThumbHover: "#f43f5e", // rose-500
    },
    yellow: {
      button: "border-slate-300 bg-white text-slate-700 hover:border-yellow-400 focus:ring-yellow-100",
      activeItem: "text-yellow-600",
      hoverItem: "hover:bg-yellow-50 text-slate-700",
      scrollbarThumb: "#facc15", // yellow-400
      scrollbarTrack: "#fefce8", // yellow-50
      scrollbarThumbHover: "#eab308", // yellow-500
    },
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id ? `${id}-container` : undefined}>
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg transition-all shadow-sm min-w-[140px] justify-between ${disabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : `${currentTheme.button} hover:shadow-md`
          }`}
      >
        <span className="text-sm font-medium">
          {selectedOption ? selectedOption.label : label}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <style>{`
            .filter-dropdown-scroll-${theme}::-webkit-scrollbar {
              width: 4px;
            }
            .filter-dropdown-scroll-${theme}::-webkit-scrollbar-track {
              background: ${currentTheme.scrollbarTrack};
              border-radius: 3px;
            }
            .filter-dropdown-scroll-${theme}::-webkit-scrollbar-thumb {
              background: ${currentTheme.scrollbarThumb};
              border-radius: 3px;
            }
            .filter-dropdown-scroll-${theme}::-webkit-scrollbar-thumb:hover {
              background: ${currentTheme.scrollbarThumbHover};
            }
          `}</style>
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
            <div
              className={`p-2 overflow-y-auto filter-dropdown-scroll-${theme}`}
              style={{
                maxHeight: '132px',
                scrollbarWidth: 'thin',
                scrollbarColor: `${currentTheme.scrollbarThumb} ${currentTheme.scrollbarTrack}`
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value === null ? "null" : option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${currentTheme.hoverItem}`}
                >
                  <span className={value === option.value ? "font-medium" : ""}>{option.label}</span>
                  {value === option.value && (
                    <Check size={16} className={currentTheme.activeItem} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


