import * as React from "react"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "../../lib/utils"

export { cn }

export interface SelectOption {
    value: string | number
    label: string
}

export type SelectTheme = 'slate' | 'blue' | 'purple' | 'green' | 'amber' | 'rose' | 'indigo';

export interface SelectProps {
    options: SelectOption[]
    value?: string | number
    onValueChange?: (value: string | number) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    colorTheme?: SelectTheme
    searchable?: boolean
}

const getThemeClasses = (theme: SelectTheme = 'slate') => {
    const themes = {
        slate: {
            trigger: "border-slate-200 focus:ring-slate-900 ring-slate-900",
            placeholder: "placeholder:text-slate-400",
            icon: "text-slate-500",
            dropdown: "border-slate-200",
            itemHover: "hover:bg-slate-50 focus:bg-slate-50",
            itemActive: "bg-slate-50 font-medium",
            check: "text-slate-900"
        },
        blue: {
            trigger: "border-blue-200 focus:ring-blue-500 ring-blue-500 bg-blue-50/30",
            placeholder: "placeholder:text-blue-400",
            icon: "text-blue-500",
            dropdown: "border-blue-100",
            itemHover: "hover:bg-blue-50 focus:bg-blue-50",
            itemActive: "bg-blue-50 font-medium text-blue-900",
            check: "text-blue-600"
        },
        purple: {
            trigger: "border-purple-200 focus:ring-purple-500 ring-purple-500 bg-purple-50/30",
            placeholder: "placeholder:text-purple-400",
            icon: "text-purple-500",
            dropdown: "border-purple-100",
            itemHover: "hover:bg-purple-50 focus:bg-purple-50",
            itemActive: "bg-purple-50 font-medium text-purple-900",
            check: "text-purple-600"
        },
        green: {
            trigger: "border-emerald-200 focus:ring-emerald-500 ring-emerald-500 bg-emerald-50/30",
            placeholder: "placeholder:text-emerald-400",
            icon: "text-emerald-500",
            dropdown: "border-emerald-100",
            itemHover: "hover:bg-emerald-50 focus:bg-emerald-50",
            itemActive: "bg-emerald-50 font-medium text-emerald-900",
            check: "text-emerald-600"
        },
        amber: {
            trigger: "border-amber-200 focus:ring-amber-500 ring-amber-500 bg-amber-50/30",
            placeholder: "placeholder:text-amber-400",
            icon: "text-amber-500",
            dropdown: "border-amber-100",
            itemHover: "hover:bg-amber-50 focus:bg-amber-50",
            itemActive: "bg-amber-50 font-medium text-amber-900",
            check: "text-amber-600"
        },
        rose: {
            trigger: "border-rose-200 focus:ring-rose-500 ring-rose-500 bg-rose-50/30",
            placeholder: "placeholder:text-rose-400",
            icon: "text-rose-500",
            dropdown: "border-rose-100",
            itemHover: "hover:bg-rose-50 focus:bg-rose-50",
            itemActive: "bg-rose-50 font-medium text-rose-900",
            check: "text-rose-600"
        },
        indigo: {
            trigger: "border-indigo-200 focus:ring-indigo-500 ring-indigo-500 bg-indigo-50/30",
            placeholder: "placeholder:text-indigo-400",
            icon: "text-indigo-500",
            dropdown: "border-indigo-100",
            itemHover: "hover:bg-indigo-50 focus:bg-indigo-50",
            itemActive: "bg-indigo-50 font-medium text-indigo-900",
            check: "text-indigo-600"
        }
    };
    return themes[theme] || themes.slate;
};

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
    ({ options, value, onValueChange, placeholder = "Select...", disabled, className, colorTheme = 'slate', searchable = false }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false)
        const [scrollTop, setScrollTop] = React.useState(0)
        const [searchTerm, setSearchTerm] = React.useState("")
        const selectRef = React.useRef<HTMLDivElement>(null)
        const dropdownRef = React.useRef<HTMLDivElement>(null)
        const searchInputRef = React.useRef<HTMLInputElement>(null)

        // Filter options based on search term
        const filteredOptions = React.useMemo(() => {
            if (!searchable || !searchTerm) return options;
            return options.filter(opt => 
                opt.label.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }, [options, searchTerm, searchable]);

        // Virtual scrolling constants
        const ITEM_HEIGHT = 32 // px - height of each option
        const VISIBLE_ITEMS = 10 // number of items visible at once
        const BUFFER = 5 // extra items to render above/below visible area
        const containerHeight = VISIBLE_ITEMS * ITEM_HEIGHT

        // Only use virtual scrolling for large lists
        const useVirtualScrolling = filteredOptions.length > 50

        // Calculate visible range for virtual scrolling
        const startIndex = useVirtualScrolling
            ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER)
            : 0
        const endIndex = useVirtualScrolling
            ? Math.min(filteredOptions.length, startIndex + VISIBLE_ITEMS + (BUFFER * 2))
            : filteredOptions.length

        const visibleOptions = filteredOptions.slice(startIndex, endIndex)
        const offsetY = startIndex * ITEM_HEIGHT
        const totalHeight = filteredOptions.length * ITEM_HEIGHT

        // Handle scroll
        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            if (useVirtualScrolling) {
                setScrollTop(e.currentTarget.scrollTop)
            }
        }

        // Clear search when closing
        React.useEffect(() => {
            if (!isOpen) {
                setSearchTerm("");
            } else if (searchable && searchInputRef.current) {
                // Focus search input when opening
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
        }, [isOpen, searchable]);

        // Scroll to selected option when opening
        React.useEffect(() => {
            if (isOpen && dropdownRef.current && value !== undefined) {
                const selectedIndex = filteredOptions.findIndex(opt => opt.value === value)
                if (selectedIndex !== -1) {
                    const scrollPosition = selectedIndex * ITEM_HEIGHT - (containerHeight / 2)
                    dropdownRef.current.scrollTop = Math.max(0, scrollPosition)
                    setScrollTop(dropdownRef.current.scrollTop)
                }
            }
        }, [isOpen, value, filteredOptions, containerHeight])

        // Close dropdown when clicking outside
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                    setIsOpen(false)
                }
            }

            if (isOpen) {
                document.addEventListener("mousedown", handleClickOutside)
                return () => document.removeEventListener("mousedown", handleClickOutside)
            }
        }, [isOpen])

        const selectedOption = options.find((opt) => opt.value === value)
        const themeClasses = getThemeClasses(colorTheme);

        return (
            <div className={cn("relative", className)} ref={selectRef}>
                <button
                    ref={ref}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={cn(
                        "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 py-2 text-sm transition-all shadow-sm hover:border-gray-300",
                        themeClasses.trigger,
                        themeClasses.placeholder,
                        "focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
                        isOpen && "ring-2",
                        !selectedOption && "text-gray-400"
                    )}
                >
                    <span className={cn("block truncate font-medium", !selectedOption ? "text-gray-400" : "text-gray-700")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", themeClasses.icon, isOpen && "rotate-180")}
                    />
                </button>

                {isOpen && (
                    <div className={cn(
                        "absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-xl ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100",
                        themeClasses.dropdown
                    )}>
                        {/* Search Input */}
                        {searchable && (
                            <div className="p-2 border-b border-gray-100">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                                        onClick={(e) => e.stopPropagation()}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400 italic text-center">
                                {searchTerm ? "No matching options" : "No options available"}
                            </div>
                        ) : (
                            <div
                                ref={dropdownRef}
                                className="p-1.5"
                                style={{
                                    height: useVirtualScrolling ? `${containerHeight}px` : 'auto',
                                    maxHeight: useVirtualScrolling ? `${containerHeight}px` : '280px',
                                    overflow: 'auto'
                                }}
                                onScroll={handleScroll}
                            >
                                {useVirtualScrolling ? (
                                    // Virtual scrolling for large lists
                                    <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                                        <div style={{ transform: `translateY(${offsetY}px)` }}>
                                            {visibleOptions.map((option, index) => {
                                                const actualIndex = startIndex + index
                                                return (
                                                    <button
                                                        key={`${option.value}-${actualIndex}`}
                                                        type="button"
                                                        onClick={() => {
                                                            onValueChange?.(option.value)
                                                            setIsOpen(false)
                                                        }}
                                                        className={cn(
                                                            "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none transition-colors",
                                                            themeClasses.itemHover,
                                                            value === option.value && themeClasses.itemActive
                                                        )}
                                                        style={{ height: `${ITEM_HEIGHT}px` }}
                                                    >
                                                        <span className={cn("block truncate", value === option.value ? "font-semibold" : "text-gray-600")}>
                                                            {option.label}
                                                        </span>
                                                        {value === option.value && (
                                                            <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                                                <Check className={cn("h-4 w-4", themeClasses.check)} />
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    // Regular rendering for small lists
                                    options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onValueChange?.(option.value)
                                                setIsOpen(false)
                                            }}
                                            className={cn(
                                                "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none transition-colors",
                                                themeClasses.itemHover,
                                                value === option.value && themeClasses.itemActive
                                            )}
                                        >
                                            <span className={cn("block truncate", value === option.value ? "font-semibold" : "text-gray-600")}>
                                                {option.label}
                                            </span>
                                            {value === option.value && (
                                                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                                    <Check className={cn("h-4 w-4", themeClasses.check)} />
                                                </span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
