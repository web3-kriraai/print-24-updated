// components/ReviewFilterDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  value: string | number | null;
  label: string;
}

interface ReviewFilterDropdownProps {
  label: string;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: DropdownOption[];
  className?: string;
}

export const ReviewFilterDropdown: React.FC<ReviewFilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string | number | null) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-cream-900 bg-white border border-cream-300 rounded-lg hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-cream-500 focus:ring-offset-2 transition-colors"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : label}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-cream-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-cream-50 transition-colors ${
                option.value === value
                  ? "bg-cream-100 text-cream-900 font-medium"
                  : "text-cream-700"
              } first:rounded-t-lg last:rounded-b-lg`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};