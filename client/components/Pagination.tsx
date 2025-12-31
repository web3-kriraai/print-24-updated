import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    className = "",
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // If there's only one page (or no items), typically we might hide pagination or show disabled controls.
    // Showing disabled controls is often better for layout stability.
    if (totalPages <= 1 && totalItems === 0) return null;

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // Helper to generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        // Always show first, last, current, and neighbors
        // Logic: 1 ... (current-1) current (current+1) ... total

        if (totalPages <= 7) {
            // Show all if few pages
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show 1
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Calculate start and end of "window" around current
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if near beginning or end to keep constant number of items ideally
            if (currentPage < 3) end = 4;
            if (currentPage > totalPages - 2) start = totalPages - 3;

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 ${className}`}>
            <div className="text-sm text-cream-600">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className={`
            p-2 rounded-lg transition-all duration-200 flex items-center justify-center
            ${currentPage === 1
                            ? 'bg-cream-100 text-cream-400 cursor-not-allowed'
                            : 'bg-white text-cream-700 hover:bg-cream-50 hover:text-cream-900 shadow-sm border border-cream-200 hover:border-cream-300 active:scale-95'
                        }
          `}
                    aria-label="Previous Page"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span className="px-2 text-cream-400">...</span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(page as number)}
                                    className={`
                    min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${currentPage === page
                                            ? 'bg-cream-900 text-white shadow-md transform scale-105'
                                            : 'bg-transparent text-cream-600 hover:bg-cream-100 hover:text-cream-900'
                                        }
                  `}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`
            p-2 rounded-lg transition-all duration-200 flex items-center justify-center
            ${currentPage === totalPages
                            ? 'bg-cream-100 text-cream-400 cursor-not-allowed'
                            : 'bg-white text-cream-700 hover:bg-cream-50 hover:text-cream-900 shadow-sm border border-cream-200 hover:border-cream-300 active:scale-95'
                        }
          `}
                    aria-label="Next Page"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
