import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

interface FilterOption {
    value: string | number | null;
    label: string;
}

interface SearchableDropdownProps {
    label: string;
    options: FilterOption[];
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    className?: string;
    id?: string;
    searchPlaceholder?: string;
    enableSearch?: boolean;
    disabled?: boolean;
    buttonClassName?: string;
    dropdownClassName?: string;
    searchClassName?: string;
    searchIconClassName?: string;
    scrollbarColor?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    label,
    options,
    value,
    onChange,
    className = "",
    id,
    searchPlaceholder = "Search...",
    enableSearch = true,
    disabled = false,
    buttonClassName = "",
    dropdownClassName = "",
    searchClassName = "",
    searchIconClassName = "",
    scrollbarColor = "#d4a574",
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
                className={`flex items-center gap-2 px-4 py-2.5 border-2 border-cream-300 rounded-lg bg-white text-cream-900 transition-all shadow-sm min-w-[140px] justify-between w-full ${disabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "cursor-pointer hover:border-cream-500 hover:shadow-md"
                    } ${buttonClassName}`}
            >
                <span className="text-sm font-medium truncate">
                    {selectedOption ? selectedOption.label : label}
                </span>
                <ChevronDown
                    size={16}
                    className={`transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
              background: ${scrollbarColor};
              border-radius: 3px;
            }
            .filter-dropdown-scroll::-webkit-scrollbar-thumb:hover {
              filter: brightness(0.9);
            }
          `}</style>
                    <div className={`absolute top-full left-0 mt-2 w-full min-w-[250px] bg-white rounded-lg shadow-lg border border-cream-200 z-50 overflow-hidden ${dropdownClassName}`}>
                        {enableSearch && (
                            <div className="p-2 border-b border-cream-200">
                                <div className="relative">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className={`w-full pl-3 pr-20 py-2 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${searchClassName}`}
                                    />
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    searchInputRef.current?.focus();
                                                }}
                                                className="p-1 text-cream-400 hover:text-cream-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={`p-1.5 bg-cream-100 text-cream-600 rounded hover:bg-cream-200 transition-colors ${searchIconClassName}`}
                                            onClick={() => searchInputRef.current?.focus()}
                                        >
                                            <Search size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div
                            className="p-2 overflow-y-auto filter-dropdown-scroll"
                            style={{
                                maxHeight: enableSearch ? "200px" : "132px",
                                scrollbarWidth: "thin",
                                scrollbarColor: `${scrollbarColor} #f5f5f0`,
                            }}
                        >
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-cream-600 text-center">
                                    No results found
                                </div>
                            ) : (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={option.value === null ? "null" : option.value}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-cream-900 rounded-md transition-colors ${highlightedIndex === index
                                            ? "bg-cream-100"
                                            : "hover:bg-cream-50"
                                            }`}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {value === option.value && (
                                            <Check size={16} className="text-cream-900 flex-shrink-0 ml-2" />
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
