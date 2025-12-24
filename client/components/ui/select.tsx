import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"

export { cn }

export interface SelectOption {
    value: string | number
    label: string
}

export interface SelectProps {
    options: SelectOption[]
    value?: string | number
    onValueChange?: (value: string | number) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
    ({ options, value, onValueChange, placeholder = "Select...", disabled, className }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false)
        const [scrollTop, setScrollTop] = React.useState(0)
        const selectRef = React.useRef<HTMLDivElement>(null)
        const dropdownRef = React.useRef<HTMLDivElement>(null)

        // Virtual scrolling constants
        const ITEM_HEIGHT = 32 // px - height of each option
        const VISIBLE_ITEMS = 10 // number of items visible at once
        const BUFFER = 5 // extra items to render above/below visible area
        const containerHeight = VISIBLE_ITEMS * ITEM_HEIGHT

        // Only use virtual scrolling for large lists
        const useVirtualScrolling = options.length > 50

        // Calculate visible range for virtual scrolling
        const startIndex = useVirtualScrolling
            ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER)
            : 0
        const endIndex = useVirtualScrolling
            ? Math.min(options.length, startIndex + VISIBLE_ITEMS + (BUFFER * 2))
            : options.length

        const visibleOptions = options.slice(startIndex, endIndex)
        const offsetY = startIndex * ITEM_HEIGHT
        const totalHeight = options.length * ITEM_HEIGHT

        // Handle scroll
        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            if (useVirtualScrolling) {
                setScrollTop(e.currentTarget.scrollTop)
            }
        }

        // Scroll to selected option when opening
        React.useEffect(() => {
            if (isOpen && dropdownRef.current && value !== undefined) {
                const selectedIndex = options.findIndex(opt => opt.value === value)
                if (selectedIndex !== -1) {
                    const scrollPosition = selectedIndex * ITEM_HEIGHT - (containerHeight / 2)
                    dropdownRef.current.scrollTop = Math.max(0, scrollPosition)
                    setScrollTop(dropdownRef.current.scrollTop)
                }
            }
        }, [isOpen, value, options, containerHeight])

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

        return (
            <div className={cn("relative", className)} ref={selectRef}>
                <button
                    ref={ref}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-cream-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-cream-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        isOpen && "ring-2 ring-cream-900"
                    )}
                >
                    <span className={cn("block truncate", !selectedOption && "text-cream-500")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")}
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-cream-200 bg-white shadow-lg">
                        {options.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-cream-500">No options available</div>
                        ) : (
                            <div
                                ref={dropdownRef}
                                className="p-1"
                                style={{
                                    height: useVirtualScrolling ? `${containerHeight}px` : 'auto',
                                    maxHeight: useVirtualScrolling ? `${containerHeight}px` : '240px',
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
                                                            "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-cream-50 focus:bg-cream-50",
                                                            value === option.value && "bg-cream-50"
                                                        )}
                                                        style={{ height: `${ITEM_HEIGHT}px` }}
                                                    >
                                                        <span className={cn("block truncate", value === option.value && "font-medium")}>
                                                            {option.label}
                                                        </span>
                                                        {value === option.value && (
                                                            <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                                                <Check className="h-4 w-4 text-cream-900" />
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
                                                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-cream-50 focus:bg-cream-50",
                                                value === option.value && "bg-cream-50"
                                            )}
                                        >
                                            <span className={cn("block truncate", value === option.value && "font-medium")}>
                                                {option.label}
                                            </span>
                                            {value === option.value && (
                                                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                                    <Check className="h-4 w-4 text-cream-900" />
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
