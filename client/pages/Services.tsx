import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
} from "lucide-react";
import { useInactivitySlider } from "../hooks/useInactivitySlider";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import BackButton from "../components/BackButton";

interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Helper function to get number of visible items based on screen width
const getVisibleItems = (screenWidth: number): number => {
  if (screenWidth >= 1536) return 9; // 2xl: 9 items
  if (screenWidth >= 1280) return 8; // xl: 8 items
  if (screenWidth >= 1024) return 6; // lg: 6 items
  if (screenWidth >= 768) return 5; // md: 5 items
  if (screenWidth >= 640) return 4; // sm: 4 items
  return 3; // mobile: 3 items
};

// Helper function to get column width percentage based on visible items
const getColumnWidth = (visibleItems: number): string => {
  return `${100 / visibleItems}%`;
};

const DigitalPrint: React.FC = () => {
  const navigate = useNavigate();
  const [digitalCategories, setDigitalCategories] = useState<Category[]>([]);
  const [bulkCategories, setBulkCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleItems, setVisibleItems] = useState<number>(getVisibleItems(window.innerWidth));
  const [digitalScrollState, setDigitalScrollState] = useState({ isAtStart: true, isAtEnd: false });
  const [bulkScrollState, setBulkScrollState] = useState({ isAtStart: true, isAtEnd: false });

  const checkScrollPosition = (containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isAtStart = scrollLeft <= 0;
    // buffer of 1px for float/zoom issues
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

    if (containerId === "digital-scroll-container") {
      setDigitalScrollState({ isAtStart, isAtEnd });
    } else if (containerId === "bulk-scroll-container") {
      setBulkScrollState({ isAtStart, isAtEnd });
    }
  };

  // Update visible items and check scroll on resize
  useEffect(() => {
    const handleResize = () => {
      setVisibleItems(getVisibleItems(window.innerWidth));
      checkScrollPosition("digital-scroll-container");
      checkScrollPosition("bulk-scroll-container");
    };
    window.addEventListener('resize', handleResize);
    // Initial check on mount
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll for digital categories using inactivity slider
  const digitalSlider = useInactivitySlider({
    containerId: "digital-scroll-container",
    interval: 6000, // 6 seconds of inactivity before auto-slide starts
    slideInterval: 3000, // Slide every 3 seconds when auto-sliding
    scrollAmount: 150,
    onScroll: (container) => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;

      // Calculate width of 1 item based on responsive visible items
      const screenWidth = window.innerWidth;
      const visibleItems = getVisibleItems(screenWidth);
      const oneItemWidth = screenWidth / visibleItems;

      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const newScrollLeft = currentScroll + oneItemWidth;
        if (newScrollLeft >= maxScroll) {
          container.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
        }
      }
    },
  });

  // Reset slider when arrow button is clicked
  useEffect(() => {
    (window as any).digitalUpdateFromArrow = () => {
      digitalSlider.reset();
    };
  }, [digitalSlider]);

  // Auto-scroll for bulk categories using inactivity slider
  const bulkSlider = useInactivitySlider({
    containerId: "bulk-scroll-container",
    interval: 6000, // 6 seconds of inactivity before auto-slide starts
    slideInterval: 3000, // Slide every 3 seconds when auto-sliding
    scrollAmount: 150,
    onScroll: (container) => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;

      // Calculate width of 1 item based on responsive visible items
      const screenWidth = window.innerWidth;
      const visibleItems = getVisibleItems(screenWidth);
      const oneItemWidth = screenWidth / visibleItems;

      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const newScrollLeft = currentScroll + oneItemWidth;
        if (newScrollLeft >= maxScroll) {
          container.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
        }
      }
    },
  });

  // Reset slider when arrow button is clicked
  useEffect(() => {
    (window as any).bulkUpdateFromArrow = () => {
      bulkSlider.reset();
    };
  }, [bulkSlider]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const BASE_URL = API_BASE_URL_WITH_API;

        const headers = {
          Accept: "application/json",
        };

        // Fetch Digital Categories
        const digitalResponse = await fetch(`${BASE_URL}/categories/digital`, {
          method: "GET",
          headers,
        });

        const digitalText = await digitalResponse.text();

        if (
          digitalText.trim().startsWith("<!DOCTYPE") ||
          digitalText.trim().startsWith("<html")
        ) {
          throw new Error(
            "Server returned HTML instead of JSON. Please check your server configuration."
          );
        }

        if (!digitalResponse.ok) {
          throw new Error(
            `HTTP ${digitalResponse.status} - ${digitalResponse.statusText}`
          );
        }

        const digitalData = JSON.parse(digitalText);
        // Sort digital categories by sortOrder
        const sortedDigital = Array.isArray(digitalData)
          ? digitalData.sort((a: Category, b: Category) => (a.sortOrder || 0) - (b.sortOrder || 0))
          : digitalData;
        setDigitalCategories(sortedDigital);

        // Fetch Bulk Categories
        const bulkResponse = await fetch(`${BASE_URL}/categories/bulk`, {
          method: "GET",
          headers,
        });

        const bulkText = await bulkResponse.text();

        if (
          bulkText.trim().startsWith("<!DOCTYPE") ||
          bulkText.trim().startsWith("<html")
        ) {
          throw new Error(
            "Server returned HTML instead of JSON. Please check your server configuration."
          );
        }

        if (!bulkResponse.ok) {
          throw new Error(
            `HTTP ${bulkResponse.status} - ${bulkResponse.statusText}`
          );
        }

        const bulkData = JSON.parse(bulkText);
        // Sort bulk categories by sortOrder
        const sortedBulk = Array.isArray(bulkData)
          ? bulkData.sort((a: Category, b: Category) => (a.sortOrder || 0) - (b.sortOrder || 0))
          : bulkData;
        setBulkCategories(sortedBulk);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        console.error("Fetch categories error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch subcategories when a category is selected
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (!selectedCategory) {
        setSubCategories([]);
        setSelectedSubCategory(null);
        return;
      }

      try {
        setLoadingSubCategories(true);
        const BASE_URL = API_BASE_URL_WITH_API;
        const headers = {
          Accept: "application/json",
        };

        const response = await fetch(`${BASE_URL}/subcategories/category/${selectedCategory}?includeChildren=true`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const text = await response.text();
          if (!text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html")) {
            const data = JSON.parse(text);
            const subcategories = Array.isArray(data) ? data : (data?.data || []);

            // Flatten nested subcategories for display (but keep hierarchy info)
            const flattenSubcategories = (subcats: any[]): any[] => {
              let result: any[] = [];
              subcats.forEach((subcat) => {
                result.push({ ...subcat, _displayLevel: 0 });
                if (subcat.children && subcat.children.length > 0) {
                  const nested = subcat.children.map((child: any) => ({
                    ...child,
                    _displayLevel: 1,
                    _parentName: subcat.name,
                  }));
                  result = result.concat(nested);
                }
              });
              return result;
            };

            const flattened = flattenSubcategories(subcategories);
            // Sort by sortOrder
            flattened.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setSubCategories(flattened);
          } else {
            setSubCategories([]);
          }
        } else {
          setSubCategories([]);
        }
      } catch (err) {
        console.error("Error fetching subcategories:", err);
        setSubCategories([]);
      } finally {
        setLoadingSubCategories(false);
      }
    };

    fetchSubCategories();
  }, [selectedCategory]);

  // Check scroll position when categories filter/load
  useEffect(() => {
    // Small timeout to allow DOM to update
    setTimeout(() => {
      checkScrollPosition("digital-scroll-container");
      checkScrollPosition("bulk-scroll-container");
    }, 100);
  }, [digitalCategories, bulkCategories, selectedType, selectedCategory, searchQuery, visibleItems]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Services
            </h1>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream-900 mb-4">
              Services
            </h1>
            <p className="text-gray-600">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }


  // Combine all categories for filtering
  const allCategories = [
    ...digitalCategories.map(cat => ({ ...cat, type: "Digital" })),
    ...bulkCategories.map(cat => ({ ...cat, type: "Bulk" }))
  ];

  // Determine which sections to show
  const selectedCategoryData = selectedCategory
    ? allCategories.find(c => c._id === selectedCategory)
    : null;

  // If a category is selected, determine its type and show only that section
  const shouldShowDigital = !selectedType || selectedType === "Digital";
  const shouldShowBulk = !selectedType || selectedType === "Bulk";

  // If a specific category is selected, show only its type section
  const showDigitalSection = selectedCategoryData
    ? selectedCategoryData.type === "Digital"
    : shouldShowDigital;
  const showBulkSection = selectedCategoryData
    ? selectedCategoryData.type === "Bulk"
    : shouldShowBulk;

  // Filter categories based on selected filters
  const filteredDigitalCategories = digitalCategories.filter(category => {
    // Type filter - if type is selected and it's not Digital, hide
    if (selectedType && selectedType !== "Digital") return false;

    // Category filter - if a category is selected, show only that category
    if (selectedCategory && category._id !== selectedCategory) return false;

    // Search filter
    if (searchQuery && !category.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  const filteredBulkCategories = bulkCategories.filter(category => {
    // Type filter - if type is selected and it's not Bulk, hide
    if (selectedType && selectedType !== "Bulk") return false;

    // Category filter - if a category is selected, show only that category
    if (selectedCategory && category._id !== selectedCategory) return false;

    // Search filter
    if (searchQuery && !category.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });



  // Get unique categories for dropdown (all categories)
  const categoryOptions = allCategories.map(cat => ({
    value: cat._id,
    label: `${cat.name} (${cat.type})`
  }));


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 pt-4 xs:pt-5 sm:pt-6 md:pt-8 lg:pt-10 pb-8 xs:pb-10 sm:pb-12 md:pb-16 lg:pb-20">

        {/* Enhanced Filters Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Left Side - Print Type and Category Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-1">
              {/* Type Filter - Moved to Left */}
              <div className="sm:w-48">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Print Type
                </label>
                <ReviewFilterDropdown
                  label="All Types"
                  value={selectedType}
                  onChange={(value) => {
                    setSelectedType(value as string | null);
                    setSelectedCategory(null); // Reset category when type changes
                  }}
                  options={[
                    { value: null, label: "All Types" },
                    { value: "Digital", label: "Digital Print" },
                    { value: "Bulk", label: "Bulk Print" },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Category Filter */}
              <div className="flex-1 sm:flex-initial sm:w-64">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category
                </label>
                <ReviewFilterDropdown
                  label="All Categories"
                  value={selectedCategory}
                  onChange={(value) => {
                    setSelectedCategory(value as string | null);
                    setSelectedSubCategory(null); // Reset subcategory when category changes
                    // Auto-set the type filter based on selected category
                    if (value) {
                      const category = allCategories.find(c => c._id === value);
                      if (category) {
                        setSelectedType(category.type as string);
                      }
                    } else {
                      // If "All Categories" is selected, reset type filter
                      setSelectedType(null);
                    }
                  }}
                  options={[
                    { value: null, label: "All Categories" },
                    ...categoryOptions.filter(cat => {
                      if (selectedType) {
                        const category = allCategories.find(c => c._id === cat.value);
                        return category?.type === selectedType;
                      }
                      return true;
                    }),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Subcategory Filter - Only show when a category is selected */}
              {selectedCategory && (
                <div className="flex-1 sm:flex-initial sm:w-64">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Subcategory
                  </label>
                  <ReviewFilterDropdown
                    label={loadingSubCategories ? "Loading..." : "All Subcategories"}
                    value={selectedSubCategory}
                    onChange={(value) => {
                      setSelectedSubCategory(value as string | null);
                      // Navigate to subcategory page when a subcategory is selected
                      if (value && selectedCategory) {
                        const subCategory = subCategories.find(sc => sc._id === value);
                        if (subCategory) {
                          // Always use ObjectId instead of slug
                          const subCategoryId = subCategory._id;
                          navigate(`/home/allservices/${selectedCategory}/${subCategoryId}`);
                        }
                      }
                    }}
                    options={[
                      { value: null, label: "All Subcategories" },
                      ...subCategories.map(subCat => ({
                        value: subCat._id,
                        label: subCat.name
                      })),
                    ]}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Right Side - Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-1 sm:flex-initial sm:justify-end">

              {/* Search Bar */}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm sm:text-base bg-white shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Clear All Button */}
              {(selectedType || selectedCategory || selectedSubCategory || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedType(null);
                    setSelectedCategory(null);
                    setSelectedSubCategory(null);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <X size={16} />
                  Clear All
                </button>
              )}
            </div>
          </div>


          {/* Active Filters Display */}
          {(selectedType || selectedCategory || selectedSubCategory || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs font-medium text-gray-600">Active filters:</span>
              {selectedType && (
                <span className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-xs font-medium flex items-center gap-2">
                  Type: {selectedType}
                  <button
                    onClick={() => {
                      setSelectedType(null);
                      setSelectedCategory(null);
                      setSelectedSubCategory(null);
                    }}
                    className="hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-xs font-medium flex items-center gap-2">
                  Category: {allCategories.find(c => c._id === selectedCategory)?.name}
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedSubCategory(null);
                      setSelectedType(null);
                    }}
                    className="hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedSubCategory && (
                <span className="px-3 py-1 bg-gray-200 text-gray-900 rounded-full text-xs font-medium flex items-center gap-2">
                  Subcategory: {subCategories.find(sc => sc._id === selectedSubCategory)?.name}
                  <button
                    onClick={() => {
                      setSelectedSubCategory(null);
                    }}
                    className="hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Digital Print Category Slider */}
        {showDigitalSection && (
          <div className="mb-8 xs:mb-10 sm:mb-12 md:mb-16 lg:mb-20">
            <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 mb-4 xs:mb-5 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl" style={{ backgroundColor: '#588157' }}>
                <Zap className="text-white w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Digital Print
                </h2>
                <p className="text-gray-600 text-xs xs:text-sm sm:text-base font-medium">Fast & small batches</p>
              </div>
            </div>

            <div
              className="relative group/slider overflow-hidden"
            >
              {/* Left Arrow Button - Only show if items overflow and NOT at start */}
              {filteredDigitalCategories.length > visibleItems && !digitalScrollState.isAtStart && (
                <button
                  onClick={() => {
                    const container = document.getElementById("digital-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;

                      const currentScroll = container.scrollLeft;

                      // Scroll left by 1 item
                      container.scrollTo({ left: currentScroll - itemWidth, behavior: "smooth" });
                    }
                    if ((window as any).digitalUpdateFromArrow) {
                      (window as any).digitalUpdateFromArrow();
                    }
                  }}
                  className="absolute left-2 sm:left-3 md:left-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
              )}

              {/* Right Arrow Button - Only show if items overflow and NOT at end */}
              {filteredDigitalCategories.length > visibleItems && !digitalScrollState.isAtEnd && (
                <button
                  onClick={() => {
                    const container = document.getElementById("digital-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;

                      const currentScroll = container.scrollLeft;
                      const newScrollLeft = currentScroll + itemWidth;

                      // Scroll right by 1 item
                      container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
                    }
                    if ((window as any).digitalUpdateFromArrow) {
                      (window as any).digitalUpdateFromArrow();
                    }
                  }}
                  className="absolute right-2 sm:right-3 md:right-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
              )}

              <div
                id="digital-scroll-container"
                onScroll={() => checkScrollPosition("digital-scroll-container")}
                className="flex overflow-x-auto overflow-y-hidden pb-2 sm:pb-3 md:pb-4 snap-x snap-mandatory scroll-smooth touch-pan-x"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  scrollBehavior: 'smooth'
                }}
              >
                {filteredDigitalCategories.length === 0 ? (
                  <div className="w-full text-center py-8 text-gray-600">
                    No digital print categories found matching your filters.
                  </div>
                ) : (
                  filteredDigitalCategories.map((category, index) => (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex-shrink-0 snap-start transition-all duration-500 ease-in-out w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6 xl:w-1/8 2xl:w-[11.11%]"
                    >
                      <Link to={`/home/allservices/${category._id}`} className="block">
                        <div className="group flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all duration-300 bg-gray-50">
                          {/* Reduced circle sizes for better mobile compatibility */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full overflow-hidden bg-white group-hover:bg-[#f5faf0] transition-all duration-300 shadow-sm sm:shadow-md group-hover:shadow-lg group-hover:scale-105 flex items-center justify-center">
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center max-w-[80px] sm:max-w-[100px] md:max-w-[120px] line-clamp-2 leading-tight mt-0.5">
                            {category.name}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Print Category Slider */}
        {showBulkSection && (
          <div className="mb-0">
            <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 mb-4 xs:mb-5 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl" style={{ backgroundColor: '#003049' }}>
                <Shield className="text-white w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Bulk & Offset Print
                </h2>
                <p className="text-gray-600 text-xs xs:text-sm sm:text-base font-medium">Quality & large orders</p>
              </div>
            </div>

            <div
              className="relative group/slider overflow-hidden"
            >
              {/* Left Arrow Button - Only show if items overflow and NOT at start */}
              {filteredBulkCategories.length > visibleItems && !bulkScrollState.isAtStart && (
                <button
                  onClick={() => {
                    const container = document.getElementById("bulk-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;

                      const currentScroll = container.scrollLeft;

                      // Scroll left by 1 item
                      container.scrollTo({ left: currentScroll - itemWidth, behavior: "smooth" });
                    }
                    if ((window as any).bulkUpdateFromArrow) {
                      (window as any).bulkUpdateFromArrow();
                    }
                  }}
                  className="absolute left-2 sm:left-3 md:left-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
              )}

              {/* Right Arrow Button - Only show if items overflow and NOT at end */}
              {filteredBulkCategories.length > visibleItems && !bulkScrollState.isAtEnd && (
                <button
                  onClick={() => {
                    const container = document.getElementById("bulk-scroll-container");
                    if (container) {
                      const screenWidth = window.innerWidth;
                      const visibleItems = getVisibleItems(screenWidth);
                      const itemWidth = screenWidth / visibleItems;

                      const currentScroll = container.scrollLeft;
                      const newScrollLeft = currentScroll + itemWidth;

                      // Scroll right by 1 item
                      container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
                    }
                    if ((window as any).bulkUpdateFromArrow) {
                      (window as any).bulkUpdateFromArrow();
                    }
                  }}
                  className="absolute right-2 sm:right-3 md:right-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                  style={{ top: 'calc(50% - 1rem)' }}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </button>
              )}

              <div
                id="bulk-scroll-container"
                onScroll={() => checkScrollPosition("bulk-scroll-container")}
                className="flex overflow-x-auto overflow-y-hidden pb-2 sm:pb-3 md:pb-4 snap-x snap-mandatory scroll-smooth touch-pan-x"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  scrollBehavior: 'smooth'
                }}
              >
                {filteredBulkCategories.length === 0 ? (
                  <div className="w-full text-center py-8 text-gray-600">
                    No bulk print categories found matching your filters.
                  </div>
                ) : (
                  filteredBulkCategories.map((category, index) => (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex-shrink-0 snap-start transition-all duration-500 ease-in-out w-1/3 sm:w-1/4 md:w-1/5 lg:w-1/6 xl:w-1/8 2xl:w-[11.11%]"
                    >
                      <Link to={`/home/allservices/${category._id}`} className="block">
                        <div className="group flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all duration-300 bg-gray-50">
                          {/* Reduced circle sizes for better mobile compatibility */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full overflow-hidden bg-white group-hover:bg-[#f5fbff] transition-all duration-300 shadow-sm sm:shadow-md group-hover:shadow-lg group-hover:scale-105 flex items-center justify-center">
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center max-w-[80px] sm:max-w-[100px] md:max-w-[120px] line-clamp-2 leading-tight mt-0.5">
                            {category.name}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalPrint;
