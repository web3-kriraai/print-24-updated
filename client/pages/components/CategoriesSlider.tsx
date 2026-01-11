// components/CategoriesSlider.tsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  type?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CategoriesSliderProps {
  categories: Category[];
  loadingCategories: boolean;
}

// Helper function to get number of visible items based on screen width
const getVisibleItems = (screenWidth: number): number => {
  if (screenWidth >= 1536) return 7; // 2xl: 7 items
  if (screenWidth >= 1280) return 6; // xl: 6 items
  if (screenWidth >= 1024) return 5; // lg: 5 items
  if (screenWidth >= 768) return 4; // md: 4 items
  if (screenWidth >= 640) return 3; // sm: 3 items
  return 2; // mobile: 2 items
};

const CategoriesSlider: React.FC<CategoriesSliderProps> = ({ 
  categories, 
  loadingCategories 
}) => {
  useEffect(() => {
    if (loadingCategories || categories.length === 0) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let isScrolling = false;
    let lastInteractionTime = Date.now();
    let arrowButtonClicked = false;

    const performScroll = () => {
      const scrollContainer = document.getElementById("category-scroll-container");
      if (!scrollContainer) return;

      isScrolling = true;
      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      const currentScroll = scrollContainer.scrollLeft;
      
      // Calculate width of 1 item based on screen size
      const screenWidth = window.innerWidth;
      let oneItemWidth = screenWidth / 2; // mobile: 1 item = 50% of screen
      if (screenWidth >= 1280) oneItemWidth = screenWidth * 0.2; // xl: 1 item = 20%
      else if (screenWidth >= 1024) oneItemWidth = screenWidth * 0.25; // lg: 1 item = 25%
      else if (screenWidth >= 768) oneItemWidth = screenWidth * 0.333; // md: 1 item = 33.3%
      else if (screenWidth >= 640) oneItemWidth = screenWidth / 2; // sm: 1 item = 50%
      
      if (currentScroll >= maxScroll - 10) {
        scrollContainer.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const newScrollLeft = currentScroll + oneItemWidth;
        if (newScrollLeft >= maxScroll) {
          scrollContainer.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          scrollContainer.style.scrollBehavior = 'smooth';
          scrollContainer.style.transition = 'scroll-left 0.8s ease-in-out';
          scrollContainer.scrollTo({ left: newScrollLeft, behavior: "smooth" });
        }
      }
      
      setTimeout(() => {
        isScrolling = false;
        lastInteractionTime = Date.now();
        arrowButtonClicked = false;
        startAutoScroll();
      }, 1000);
    };

    const startAutoScroll = () => {
      if (isScrolling) return;
      
      const timeoutDuration = arrowButtonClicked ? 20000 : 10000;
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      const remainingTime = Math.max(0, timeoutDuration - timeSinceInteraction);
      
      timeoutId = setTimeout(() => {
        const timeSinceLastInteraction = Date.now() - lastInteractionTime;
        const requiredTime = arrowButtonClicked ? 20000 : 10000;
        if (timeSinceLastInteraction >= requiredTime) {
          performScroll();
        } else {
          isScrolling = false;
          startAutoScroll();
        }
      }, remainingTime);
    };

    const updateInteraction = () => {
      lastInteractionTime = Date.now();
      arrowButtonClicked = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isScrolling = false;
      startAutoScroll();
    };

    const updateInteractionFromArrow = () => {
      lastInteractionTime = Date.now();
      arrowButtonClicked = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isScrolling = false;
      startAutoScroll();
    };

    (window as any).homeCategoryUpdateFromArrow = updateInteractionFromArrow;

    // Event listeners
    const handleMouseMove = () => updateInteraction();
    const handleMouseEnter = () => updateInteraction();
    const handleClick = () => updateInteraction();
    const handleMouseDown = () => updateInteraction();
    const handleKeyDown = () => updateInteraction();
    const handleTouchStart = () => updateInteraction();
    const handleWheel = () => updateInteraction();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('wheel', handleWheel);
    
    const container = document.getElementById("category-scroll-container");
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
    }

    lastInteractionTime = Date.now();
    startAutoScroll();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('wheel', handleWheel);
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [loadingCategories, categories.length]);

  return (
    <div className="mb-10">
      <div 
        className="relative group/slider overflow-hidden"
        onMouseEnter={() => {
          (window as any).categoryLastInteraction = Date.now();
        }}
        onMouseLeave={() => {
          (window as any).categoryLastInteraction = Date.now();
        }}
      >
        {/* Left Arrow Button */}
        <button
          onClick={() => {
            const container = document.getElementById("category-scroll-container");
            if (container) {
              const screenWidth = window.innerWidth;
              const visibleItems = getVisibleItems(screenWidth);
              const itemWidth = screenWidth / visibleItems;
              
              const currentScroll = container.scrollLeft;
              
              if (currentScroll <= 0) {
                container.scrollTo({ left: container.scrollWidth - container.clientWidth, behavior: "smooth" });
              } else {
                container.scrollTo({ left: currentScroll - itemWidth, behavior: "smooth" });
              }
            }
            if ((window as any).homeCategoryUpdateFromArrow) {
              (window as any).homeCategoryUpdateFromArrow();
            }
          }}
          className="absolute left-1 sm:left-2 md:left-3 z-10 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 hover:bg-white active:bg-white shadow-sm sm:shadow-md rounded-full flex items-center justify-center text-cream-900 hover:text-cream-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
          style={{ top: 'calc(50% - 0.875rem)' }}
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => {
            const container = document.getElementById("category-scroll-container");
            if (container) {
              const screenWidth = window.innerWidth;
              const visibleItems = getVisibleItems(screenWidth);
              const itemWidth = screenWidth / visibleItems;
              
              const currentScroll = container.scrollLeft;
              const maxScroll = container.scrollWidth - container.clientWidth;
              const newScrollLeft = currentScroll + itemWidth;
              
              if (currentScroll >= maxScroll - 1) {
                container.scrollTo({ left: 0, behavior: "smooth" });
              } else if (newScrollLeft >= maxScroll) {
                container.scrollTo({ left: maxScroll, behavior: "smooth" });
              } else {
                container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
              }
            }
            if ((window as any).homeCategoryUpdateFromArrow) {
              (window as any).homeCategoryUpdateFromArrow();
            }
          }}
          className="absolute right-1 sm:right-2 md:right-3 z-10 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 hover:bg-white active:bg-white shadow-sm sm:shadow-md rounded-full flex items-center justify-center text-cream-900 hover:text-cream-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
          style={{ top: 'calc(50% - 0.875rem)' }}
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>

        <div 
          id="category-scroll-container"
          className="flex overflow-x-auto overflow-y-hidden pb-1 sm:pb-2 md:pb-3 snap-x snap-mandatory scroll-smooth touch-pan-x"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none', 
            scrollBehavior: 'smooth'
          }}
        >
          {categories.map((category, index) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="flex-shrink-0 snap-start transition-all duration-500 ease-in-out w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 2xl:w-[14.285%] px-0.5 sm:px-0.5 md:px-0.5"
            >
              <Link to={`/digital-print/${category._id}`} className="block">
                <div className="group flex flex-col items-center gap-0.5 sm:gap-1 p-1.5 sm:p-2 rounded-lg transition-all duration-300 relative">
                  {/* Type Badge */}
                  {category.type && (
                    <div 
                      className={`absolute top-0 left-1/2 -translate-x-1/2 px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-0.5 md:py-1 rounded-full text-[8px] sm:text-[9px] md:text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap shadow-md ${
                        category.type === "digital"
                          ? "bg-[#588157] text-white"
                          : "bg-[#003049] text-white"
                      }`}
                    >
                      {category.type === "digital" ? "Digital Print" : "Bulk Print"}
                    </div>
                  )}
                  {/* Category Image */}
                  <div className={`w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden bg-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-105 flex items-center justify-center relative ${
                    category.type === "digital" 
                      ? "group-hover:bg-[#f5faf0]" 
                      : "group-hover:bg-[#f5fbff]"
                  }`}>
                    <img
                      src={category.image}
                      alt={category.name}
                      className={`${
                        category.name.toLowerCase().includes('visiting card') 
                          ? 'w-full h-full object-cover' 
                          : category.name.toLowerCase().includes('card holder')
                          ? 'w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 object-contain'
                          : 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 object-contain'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-cream-900 text-center max-w-[70px] sm:max-w-[80px] md:max-w-[90px] line-clamp-2 leading-tight mt-0.5">
                    {category.name}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesSlider;