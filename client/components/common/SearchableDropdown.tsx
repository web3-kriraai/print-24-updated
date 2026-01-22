import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Check, Loader2, X } from 'lucide-react';

export interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

interface SearchableDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string, option: DropdownOption | null) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    error?: string;
    emptyMessage?: string;
    className?: string;
    icon?: React.ReactNode;
}

/**
 * SearchableDropdown – A professional combobox with type‑ahead filtering.
 *
 * Features:
 * - Real‑time filtering as you type
 * - Keyboard navigation (ArrowUp/Down, Enter, Escape)
 * - Click outside to close
 * - Highlight matching text
 * - Loading & empty states
 */
export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    loading = false,
    error,
    emptyMessage = 'No options found',
    className = '',
    icon,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Derive display label from value
    const selectedOption = options.find((o) => o.value === value);
    const displayLabel = selectedOption?.label || '';

    // Filter options based on search term
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current && highlightedIndex >= 0) {
            const item = listRef.current.children[highlightedIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex, isOpen]);

    const openDropdown = useCallback(() => {
        if (disabled || loading) return;
        setIsOpen(true);
        setSearchTerm('');
        setHighlightedIndex(-1);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [disabled, loading]);

    const selectOption = useCallback(
        (opt: DropdownOption) => {
            if (opt.disabled) return;
            onChange(opt.value, opt);
            setIsOpen(false);
            setSearchTerm('');
            setHighlightedIndex(-1);
        },
        [onChange]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                openDropdown();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                    selectOption(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                break;
        }
    };

    const highlightMatch = (text: string, term: string) => {
        if (!term) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="bg-yellow-200 font-semibold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger / display */}
            <div
                onClick={openDropdown}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
                className={`flex items-center w-full px-4 py-3 border-2 rounded-lg cursor-pointer transition-all
          ${disabled ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300 hover:border-gray-400'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
          ${error ? 'border-red-400' : ''}`}
            >
                {icon && <span className="mr-2 text-gray-500">{icon}</span>}
                <span className={`flex-1 text-sm truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {displayLabel || placeholder}
                </span>
                {loading ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : value ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('', null);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                ) : (
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </div>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fadeIn">
                    {/* Search input */}
                    <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Type to search..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                        />
                    </div>

                    {/* Options list */}
                    <ul ref={listRef} className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-500 text-center">{emptyMessage}</li>
                        ) : (
                            filteredOptions.map((opt, idx) => (
                                <li
                                    key={opt.value}
                                    onClick={() => selectOption(opt)}
                                    className={`flex items-center px-4 py-2 text-sm cursor-pointer transition-colors
                    ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${idx === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    ${opt.value === value ? 'bg-blue-100 font-medium' : ''}`}
                                >
                                    {opt.icon && <span className="mr-2">{opt.icon}</span>}
                                    <span className="flex-1">{highlightMatch(opt.label, searchTerm)}</span>
                                    {opt.value === value && <Check className="w-4 h-4 text-blue-600" />}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

export default SearchableDropdown;
