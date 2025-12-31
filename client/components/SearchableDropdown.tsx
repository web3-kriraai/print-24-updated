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
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Filter options based on search query
    const filteredOptions = enableSearch && searchQuery.trim()
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

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
    }, [searchQuery]);

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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-cream-300 rounded-lg bg-white text-cream-900 cursor-pointer hover:border-cream-500 transition-all shadow-sm hover:shadow-md min-w-[140px] justify-between w-full"
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
              background: #d4a574;
              border-radius: 3px;
            }
            .filter-dropdown-scroll::-webkit-scrollbar-thumb:hover {
              background: #c49564;
            }
          `}</style>
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-white rounded-lg shadow-lg border border-cream-200 z-50 overflow-hidden">
                        {enableSearch && (
                            <div className="p-2 border-b border-cream-200">
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-500"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="w-full pl-9 pr-8 py-2 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                searchInputRef.current?.focus();
                                            }}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cream-500 hover:text-cream-700 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div
                            className="p-2 overflow-y-auto filter-dropdown-scroll"
                            style={{
                                maxHeight: enableSearch ? "200px" : "132px",
                                scrollbarWidth: "thin",
                                scrollbarColor: "#d4a574 #f5f5f0",
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
