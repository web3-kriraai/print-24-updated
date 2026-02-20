import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

interface FilterOption {
    value: string | number | null;
    label: string;
}

interface AdminSearchableDropdownProps {
    label: string;
    options: FilterOption[];
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    className?: string;
    id?: string;
    searchPlaceholder?: string;
    enableSearch?: boolean;
    disabled?: boolean;
    required?: boolean;
}

export const AdminSearchableDropdown: React.FC<AdminSearchableDropdownProps> = ({
    label,
    options,
    value,
    onChange,
    className = "",
    id,
    searchPlaceholder = "Search...",
    enableSearch = true,
    disabled = false,
    required = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!enableSearch || !query) {
            return options;
        }

        return options
            .filter((opt) => {
                const label = String(opt.label || "").toLowerCase();
                return label.includes(query);
            })
            .sort((a, b) => {
                const labelA = String(a.label || "").toLowerCase();
                const labelB = String(b.label || "").toLowerCase();

                // 1. Exact match priority
                if (labelA === query && labelB !== query) return -1;
                if (labelA !== query && labelB === query) return 1;

                // 2. Starts with priority
                const aStartsWith = labelA.startsWith(query);
                const bStartsWith = labelB.startsWith(query);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                // 3. Match position priority (earlier is better)
                const aIndex = labelA.indexOf(query);
                const bIndex = labelB.indexOf(query);
                if (aIndex !== bIndex) return aIndex - bIndex;

                // 4. Alphabetical fallback
                return labelA.localeCompare(labelB);
            });
    }, [options, searchQuery, enableSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Auto-focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && enableSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, enableSearch]);

    // Reset highlighted index when filtered options change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredOptions]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setSearchQuery("");
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleSelect = (optionValue: string | number | null) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
    };

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div
            className={`relative ${className}`}
            ref={dropdownRef}
            id={id ? `${id}-container` : undefined}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                id={id}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer w-full min-w-[200px] text-left flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
            >
                <span className="text-sm truncate">
                    {selectedOption ? selectedOption.label : label}
                </span>
                <ChevronDown
                    size={18}
                    className={`transition-transform flex-shrink-0 text-gray-400 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <>
                    <style>{`
            .admin-dropdown-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .admin-dropdown-scroll::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 3px;
            }
            .admin-dropdown-scroll::-webkit-scrollbar-thumb {
              background: #10b981;
              border-radius: 3px;
            }
            .admin-dropdown-scroll::-webkit-scrollbar-thumb:hover {
              background: #059669;
            }
          `}</style>
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] max-w-[400px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                        {enableSearch && (
                            <div className="p-2 border-b border-gray-200">
                                <div className="relative">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="w-full pl-3 pr-20 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    searchInputRef.current?.focus();
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition-colors"
                                            onClick={() => searchInputRef.current?.focus()}
                                        >
                                            <Search size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div
                            className="p-2 overflow-y-auto admin-dropdown-scroll"
                            style={{
                                maxHeight: enableSearch ? "200px" : "132px",
                                scrollbarWidth: "thin",
                                scrollbarColor: "#10b981 #f1f5f9",
                            }}
                        >
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    No results found
                                </div>
                            ) : (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={option.value === null ? "null" : option.value}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 rounded-md transition-colors ${highlightedIndex === index
                                                ? "bg-emerald-50"
                                                : "hover:bg-gray-50"
                                            }`}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <span className="text-left break-words pr-2">{option.label}</span>
                                        {value === option.value && (
                                            <Check size={16} className="text-emerald-600 flex-shrink-0 ml-2" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
