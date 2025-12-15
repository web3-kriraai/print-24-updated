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
}

export const ReviewFilterDropdown: React.FC<ReviewFilterDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  className = "",
  id,
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id ? `${id}-container` : undefined}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-cream-300 rounded-lg bg-white text-cream-900 cursor-pointer hover:border-cream-500 transition-all shadow-sm hover:shadow-md min-w-[140px] justify-between"
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
            .filter-dropdown-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .filter-dropdown-scroll::-webkit-scrollbar-track {
              background: #f5f5f0;
              border-radius: 3px;
            }
            .filter-dropdown-scroll::-webkit-scrollbar-thumb {
              background: #d4a574;
              border-radius: 3px;
            }
            .filter-dropdown-scroll::-webkit-scrollbar-thumb:hover {
              background: #c49564;
            }
          `}</style>
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-cream-200 z-50 overflow-hidden">
            <div 
              className="p-2 overflow-y-auto filter-dropdown-scroll"
              style={{
                maxHeight: '132px', // Shows approximately 3 options (each ~40px + padding)
                scrollbarWidth: 'thin',
                scrollbarColor: '#d4a574 #f5f5f0'
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
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-cream-900 hover:bg-cream-50 rounded-md transition-colors"
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check size={16} className="text-cream-900" />
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


