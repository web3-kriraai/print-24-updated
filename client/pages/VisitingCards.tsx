import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader, Search, X } from 'lucide-react';
import GlossProductSelection from './GlossProductSelection';
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import BackButton from '../components/BackButton';
import { formatPrice } from '../src/utils/currencyUtils';

interface SubCategory {
  _id: string;
  name: string;
  description: string;
  image?: string;
  slug?: string;
  sortOrder?: number;
  category?: {
    _id: string;
    name: string;
    description?: string;
  };
}

interface Product {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  image?: string;
  subcategory?: SubCategory | string;
  category?: {
    _id: string;
    name: string;
    description?: string;
  } | string;
}

const VisitingCards: React.FC = () => {
  const { categoryId, subCategoryId, nestedSubCategoryId } = useParams<{ categoryId?: string; subCategoryId?: string; nestedSubCategoryId?: string }>();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryImage, setCategoryImage] = useState<string>('');
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlossFinish, setIsGlossFinish] = useState(false);
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState<string>("");
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string | null>(null);
  const [forcedProductId, setForcedProductId] = useState<string | null>(null);

  // Scroll to top when route params change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categoryId, subCategoryId]);

  // Helper function to handle API responses
  // Fixed: Clone response before reading to prevent "body stream already read" error
  const handleApiResponse = async (response: Response) => {
    // Clone the response to avoid "body stream already read" error
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    // Check if response is HTML (could be error page)
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      // It's likely a server error page
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status} ${response.statusText}`);
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      // If response was not OK, throw error with parsed data
      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed: ${response.status} ${response.statusText}`);
      }
      return data;
    } catch (err) {
      // If it's already an Error (from the !response.ok check above), re-throw it
      if (err instanceof Error) {
        throw err;
      }
      // If it's not valid JSON, it might still be an error
      throw new Error(text || `Invalid response from server. Status: ${response.status} ${response.statusText}`);
    }
  };

  // Fetch subcategories or products based on URL params
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSubCategories([]);
      setProducts([]);
      setIsGlossFinish(false);
      setForcedProductId(null);

      try {
        // If categoryId is provided but no subCategoryId, check if category has child categories
        if (categoryId && !subCategoryId) {
          // Validate categoryId format
          if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
            setError("Invalid category ID format");
            setLoading(false);
            return;
          }

          // Variable to track subcategories for later use
          let subcategoriesArray: SubCategory[] = [];

          // First check if this category has subcategories
          const subcategoriesUrl = `${API_BASE_URL}/subcategories/category/${categoryId}`;

          try {
            const subcategoriesResponse = await fetch(subcategoriesUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!subcategoriesResponse.ok) {
              // If 404 or not found, subcategories don't exist - continue to check for products
              if (subcategoriesResponse.status === 404) {
                console.log("No subcategories found for this category, checking for direct products...");
                // Don't throw error, just continue to check for products below
                // Skip reading response body for 404 to avoid "body stream already read" error
              } else {
                // Try fallback to old endpoint for backward compatibility
                const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });

                if (fallbackResponse.ok) {
                  const fallbackData = await handleApiResponse(fallbackResponse);
                  if (fallbackData && Array.isArray(fallbackData) && fallbackData.length > 0) {
                    // Process fallback data
                    subcategoriesArray = fallbackData;
                    subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));

                    // NEW: Auto-navigation for single subcategory
                    if (subcategoriesArray.length === 1) {
                      const onlySubcat = subcategoriesArray[0];
                      const identifier = onlySubcat.slug || onlySubcat._id;

                      // Safety check: Don't navigate if we are already there to prevent loops
                      if (subCategoryId !== identifier) {
                        console.log(`Only one subcategory found: ${onlySubcat.name} (${identifier}). Auto-navigating...`);
                        navigate(`/digital-print/${categoryId}/${identifier}`, { replace: true });
                        return;
                      }
                    }

                    setSubCategories(subcategoriesArray);
                    setLoading(false);
                    return;
                  }
                }
                // If fallback also fails, continue to check for products (don't throw error)
                console.log("No subcategories found, will check for direct products...");
              }
            } else {
              // Only read response body if response is OK
              const subcategoriesData = await handleApiResponse(subcategoriesResponse);

              // Ensure subcategoriesData is an array
              subcategoriesArray = Array.isArray(subcategoriesData)
                ? subcategoriesData
                : (subcategoriesData?.data || []);

              // If category has subcategories, check if auto-skip is needed
              if (subcategoriesArray && subcategoriesArray.length > 0) {
                // Sort by sortOrder to maintain the order set in admin dashboard
                subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));

                // Multiple subcategories or single subcategory - show them normally
                // We do NOT auto-skip here because we want to show the subcategory content first
                // If specific behavior for single subcategory is needed, it should navigate to the subcategory page, NOT the product page
                if (subcategoriesArray.length === 1) {
                  const singleSubcategory = subcategoriesArray[0];
                  const subCategoryIdForLink = singleSubcategory.slug || singleSubcategory._id;

                  // Navigate to subcategory page proper
                  navigate(categoryId
                    ? `/digital-print/${categoryId}/${subCategoryIdForLink}`
                    : `/digital-print/${subCategoryIdForLink}`,
                    { replace: true }
                  );
                  setLoading(false);
                  return;
                }

                // Multiple subcategories - show them normally
                setSubCategories(subcategoriesArray);

                // Get category info
                try {
                  const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (!categoryResponse.ok) {
                    throw new Error(`Failed to fetch category: ${categoryResponse.status} ${categoryResponse.statusText}`);
                  }

                  const categoryData = await handleApiResponse(categoryResponse);
                  setCategoryName(categoryData.name || '');
                  setCategoryDescription(categoryData.description || '');
                  setCategoryImage(categoryData.image || '/Glossy.png');
                } catch (categoryErr) {
                  console.error("Error fetching category info:", categoryErr);
                  // Don't fail the whole operation if category info fetch fails
                }

                // Note: Even if subcategories exist, we'll check for direct products below
                // But for now, prioritize showing subcategories
                // setLoading(false);
                // return; // Don't return here - continue to check for direct products
              }
            }
          } catch (fetchErr) {
            console.error("Error fetching subcategories:", fetchErr);
            // Don't set error here, just log it - continue to check for products
            // The error might be that there are no subcategories, which is fine
          }

          // Check for products directly under this category (without subcategory)
          // This handles both cases:
          // 1. Category has subcategories → show subcategories (already set above)
          // 2. Category has no subcategories but has direct products → show products
          try {
            // Validate categoryId before making request
            if (!categoryId || !/^[0-9a-fA-F]{24}$/.test(categoryId)) {
              console.warn("Invalid categoryId format, skipping product fetch:", categoryId);
              // Don't throw error, just skip product fetch and show empty state
              setLoading(false);
              return;
            }

            const productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
            const productsResponse = await fetch(productsUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (!productsResponse.ok) {
              // Handle 400 Bad Request and 404 Not Found - both mean no products available
              if (productsResponse.status === 400 || productsResponse.status === 404) {
                // Try to get error message without reading body twice
                let errorMessage = productsResponse.status === 404
                  ? "Category not found"
                  : "Invalid category ID or category not found";
                try {
                  // Clone response to read error message
                  const clonedResponse = productsResponse.clone();
                  const errorText = await clonedResponse.text();
                  if (errorText && !errorText.trim().startsWith("<!DOCTYPE") && !errorText.trim().startsWith("<html")) {
                    try {
                      const errorData = JSON.parse(errorText);
                      errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (e) {
                      // If not JSON, use the text if it's meaningful
                      if (errorText.trim().length > 0 && errorText.trim().length < 200) {
                        errorMessage = errorText.trim();
                      }
                    }
                  }
                } catch (e) {
                  // If we can't read the error, use default message
                  console.error("Error reading response:", e);
                }
                // For 400/404 errors, don't throw - just log and continue (category might not exist or have products)
                console.warn("Failed to fetch products for category:", categoryId, errorMessage);
                setProducts([]);
                setLoading(false);
                return;
              }

              // For other errors (500, etc.), log and continue gracefully
              console.error("Error fetching products:", productsResponse.status, productsResponse.statusText);
              setProducts([]);
              setLoading(false);
              return;
            }

            const productsData = await handleApiResponse(productsResponse);

            // Filter to only include products directly added to category (without subcategory)
            const directProducts = Array.isArray(productsData)
              ? productsData.filter((product: Product) => {
                // A direct product should have category matching categoryId and no valid subcategory
                // First check if product's category matches (convert both to strings for comparison)
                const productCategoryId = typeof product.category === 'object'
                  ? (product.category?._id ? String(product.category._id) : null)
                  : (product.category ? String(product.category) : null);

                const categoryIdStr = String(categoryId);

                // Only include products that belong to this category
                if (!productCategoryId || productCategoryId !== categoryIdStr) {
                  return false;
                }

                // Now check if it has a valid subcategory
                // Product should not have a subcategory
                if (!product.subcategory) return true;
                if (product.subcategory === null) return true;
                if (product.subcategory === undefined) return true;
                if (typeof product.subcategory === 'string') {
                  const subcatStr = product.subcategory.trim();
                  if (subcatStr === '' || subcatStr === 'null' || subcatStr === 'undefined') return true;
                  return false; // Has a non-empty string subcategory
                }

                // If it's an object, check if it's actually empty or has no valid ID
                if (typeof product.subcategory === 'object') {
                  // If it's an empty object, treat as no subcategory
                  const keys = Object.keys(product.subcategory);
                  if (keys.length === 0) return true;

                  // Check if _id exists and is valid
                  const subcategoryId = product.subcategory._id;
                  if (!subcategoryId) return true; // No _id means no valid subcategory
                  if (subcategoryId === null || subcategoryId === '' || subcategoryId === 'null' || subcategoryId === undefined) return true;

                  // Check if it's a valid MongoDB ObjectId (24 hex characters)
                  if (typeof subcategoryId === 'string' && !/^[0-9a-fA-F]{24}$/.test(subcategoryId)) return true;

                  // Has a valid subcategory with valid _id, exclude it
                  return false;
                }

                // Any other case, exclude (has subcategory)
                return false;
              })
              : [];

            // Debug logging
            console.log("Category ID:", categoryId);
            console.log("Total products fetched:", Array.isArray(productsData) ? productsData.length : 0);
            console.log("Direct products after filtering:", directProducts.length);
            if (directProducts.length === 0 && Array.isArray(productsData) && productsData.length > 0) {
              console.log("Sample product category:", productsData[0]?.category);
              console.log("Sample product subcategory:", productsData[0]?.subcategory);
              console.log("Sample product category ID (string):", typeof productsData[0]?.category === 'object'
                ? String(productsData[0]?.category?._id)
                : String(productsData[0]?.category));
            }

            // Determine if category has subcategories
            const hasSubcategories = subcategoriesArray && subcategoriesArray.length > 0;

            // AUTO-SKIP: If only one subcategory, navigate directly to its products
            if (hasSubcategories && subcategoriesArray.length === 1) {
              const singleSubcategory = subcategoriesArray[0];
              // Use ObjectId instead of slug
              const subcategoryIdForLink = singleSubcategory._id;

              // Navigate directly to subcategory products page
              if (categoryId) {
                navigate(`/digital-print/${categoryId}/${subcategoryIdForLink}`, { replace: true });
              } else {
                navigate(`/digital-print/${subcategoryIdForLink}`, { replace: true });
              }
              setLoading(false);
              return;
            }

            // Set subcategories if they exist (multiple subcategories)
            if (hasSubcategories) {
              // Sort by sortOrder to maintain the order set in admin dashboard
              subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
              setSubCategories(subcategoriesArray);
            } else {
              setSubCategories([]);
            }

            // Set direct products if they exist (only when no subcategories)
            // If category has subcategories, show subcategories (already set above)
            // If category has no subcategories but has products, show products directly
            if (directProducts && directProducts.length > 0 && !hasSubcategories) {
              // Auto-skip: If only one product and no subcategories, directly navigate to its detail page
              if (directProducts.length === 1) {
                const singleProduct = directProducts[0];

                // Navigate directly to the product detail page
                if (categoryId) {
                  navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
                } else {
                  navigate(`/digital-print/${singleProduct._id}`, { replace: true });
                }
                setLoading(false);
                return;
              }

              // Multiple products - show them normally
              setProducts(directProducts);

              // Get category info
              try {
                const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });

                if (!categoryResponse.ok) {
                  throw new Error(`Failed to fetch category: ${categoryResponse.status} ${categoryResponse.statusText}`);
                }

                const categoryData = await handleApiResponse(categoryResponse);
                setCategoryName(categoryData.name || '');
                setCategoryDescription(categoryData.description || '');
                setCategoryImage(categoryData.image || '/Glossy.png');
              } catch (categoryErr) {
                console.error("Error fetching category info:", categoryErr);
                // Don't fail the whole operation if category info fetch fails
              }

              setLoading(false);
              return;
            }
          } catch (productsErr) {
            console.error("Error fetching products:", productsErr);

            // Don't set error for 400 Bad Request - it might just mean category has no products or invalid ID
            const errorMessage = productsErr instanceof Error ? productsErr.message : "Failed to fetch products";
            if (!errorMessage.includes("Invalid category") && !errorMessage.includes("400") && !errorMessage.includes("Bad Request")) {
              // Only set error for non-400 errors
              setError(errorMessage);
            } else {
              // For 400 errors, just log and continue - category might not have products
              console.warn("Category may not have products or category ID is invalid:", categoryId);
            }

            // Set empty products array and continue
            setProducts([]);
          }

          // If no subcategories and no products, show empty state
          // Still get category info for display
          try {
            if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });

              if (categoryResponse.ok) {
                const categoryData = await handleApiResponse(categoryResponse);
                setCategoryName(categoryData.name || '');
                setCategoryDescription(categoryData.description || '');
              }
            }
          } catch (categoryErr) {
            console.error("Error fetching category info:", categoryErr);
          }

          setLoading(false);
          return;
        }

        // If subCategoryId is provided, fetch products for that subcategory
        if (subCategoryId) {
          // Reset states
          setProducts([]);
          setSubCategories([]);

          try {
            // First, get subcategory info to get the _id (in case subCategoryId is a slug)
            let subcategoryData: SubCategory | null = null;
            let subcategoryIdForProducts = nestedSubCategoryId || subCategoryId;

            // Check if subcategoryIdForProducts is a valid MongoDB ObjectId (24 hex characters)
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdForProducts || '');

            if (!isObjectId) {
              // If it's not an ObjectId, it's likely a slug - fetch subcategory by slug
              // First try to get all subcategories (including nested) for the category
              let allSubcategories: SubCategory[] = [];

              if (categoryId) {
                try {
                  // Fetch direct subcategories
                  const subcategoriesUrl = `${API_BASE_URL}/subcategories/category/${categoryId}`;
                  const subcategoriesResponse = await fetch(subcategoriesUrl, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (subcategoriesResponse.ok) {
                    const subcategoriesData = await handleApiResponse(subcategoriesResponse);
                    allSubcategories = Array.isArray(subcategoriesData) ? subcategoriesData : (subcategoriesData?.data || []);

                    // Recursively fetch nested subcategories
                    const fetchNestedSubcategories = async (parentId: string): Promise<SubCategory[]> => {
                      try {
                        const nestedResponse = await fetch(`${API_BASE_URL}/subcategories/parent/${parentId}`, {
                          method: "GET",
                          headers: { Accept: "application/json" },
                        });
                        if (nestedResponse.ok) {
                          const nestedData = await handleApiResponse(nestedResponse);
                          const nested = Array.isArray(nestedData) ? nestedData : (nestedData?.data || []);
                          const allNested: SubCategory[] = [...nested];
                          for (const nestedSubCat of nested) {
                            const deeperNested = await fetchNestedSubcategories(nestedSubCat._id);
                            allNested.push(...deeperNested);
                          }
                          return allNested;
                        }
                      } catch (err) {
                        console.error(`Error fetching nested subcategories for ${parentId}:`, err);
                      }
                      return [];
                    };

                    // Fetch nested subcategories for each direct subcategory
                    for (const subCat of allSubcategories) {
                      const nested = await fetchNestedSubcategories(subCat._id);
                      allSubcategories.push(...nested);
                    }
                  }
                } catch (err) {
                  console.error("Error fetching subcategories:", err);
                }
              }

              // If still not found, try fetching all subcategories
              if (allSubcategories.length === 0) {
                try {
                  const allSubcategoriesResponse = await fetch(`${API_BASE_URL}/subcategories`, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                  });
                  if (allSubcategoriesResponse.ok) {
                    const allData = await handleApiResponse(allSubcategoriesResponse);
                    allSubcategories = Array.isArray(allData) ? allData : (allData?.data || []);
                  }
                } catch (err) {
                  console.error("Error fetching all subcategories:", err);
                }
              }

              // Find subcategory by slug or _id in all subcategories (including nested)
              subcategoryData = allSubcategories.find(
                (sc: SubCategory) => sc.slug === subcategoryIdForProducts || sc._id === subcategoryIdForProducts
              );

              if (subcategoryData && subcategoryData._id) {
                subcategoryIdForProducts = subcategoryData._id;
                console.log("Found subcategory by slug, using _id:", subcategoryIdForProducts);
              } else {
                // If not found in list, try fetching directly from API (backend supports slug lookup)
                try {
                  const subcategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${subcategoryIdForProducts}`, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (subcategoryResponse.ok) {
                    subcategoryData = await handleApiResponse(subcategoryResponse);
                    if (subcategoryData && subcategoryData._id) {
                      subcategoryIdForProducts = subcategoryData._id;
                      console.log("Found subcategory via API lookup, using _id:", subcategoryIdForProducts);
                    } else {
                      subcategoryData = null;
                      subcategoryIdForProducts = null;
                    }
                  } else {
                    // Subcategory not found - treat as no subcategory
                    console.warn(`Subcategory not found with slug/id: ${subcategoryIdForProducts}, continuing without subcategory`);
                    subcategoryData = null;
                    subcategoryIdForProducts = null;
                  }
                } catch (err) {
                  // Error fetching - treat as no subcategory
                  console.warn(`Error fetching subcategory with slug/id: ${subcategoryIdForProducts}, continuing without subcategory`);
                  subcategoryData = null;
                  subcategoryIdForProducts = null;
                }
              }
            } else {
              // If it's already an ObjectId, first check category's subcategories list
              // This avoids unnecessary 404 errors when subcategory doesn't exist
              let subcategoriesArray: SubCategory[] = [];

              if (categoryId) {
                try {
                  // First, try fetching from subcategories list for the category
                  const subcategoriesUrl = `${API_BASE_URL}/subcategories/category/${categoryId}`;
                  const subcategoriesResponse = await fetch(subcategoriesUrl, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (subcategoriesResponse.ok) {
                    const subcategoriesData = await handleApiResponse(subcategoriesResponse);
                    subcategoriesArray = Array.isArray(subcategoriesData) ? subcategoriesData : (subcategoriesData?.data || []);
                    subcategoryData = subcategoriesArray.find(
                      (sc: SubCategory) => sc._id === subcategoryIdForProducts || sc.slug === subcategoryIdForProducts
                    ) || null;
                  }
                } catch (listErr) {
                  // Silently continue - will try direct fetch or treat as category
                }
              }

              // Only try direct fetch if:
              // 1. Not found in category's subcategories list
              // 2. subCategoryId is a valid ObjectId
              // This prevents unnecessary 404 errors
              if (!subcategoryData && subcategoryIdForProducts && /^[0-9a-fA-F]{24}$/.test(subcategoryIdForProducts)) {
                // Check if subCategoryId exists in any of the fetched subcategories first
                const foundInList = subcategoriesArray.find(
                  (sc: SubCategory) => sc._id === subcategoryIdForProducts
                );

                if (!foundInList) {
                  // subCategoryId is not a valid subcategory - it might be a productId
                  // Check if it's a valid product by trying to fetch it
                  let isProductId = false;
                  try {
                    const productCheckResponse = await fetch(`${API_BASE_URL}/products/${subcategoryIdForProducts}`, {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                    });

                    if (productCheckResponse.ok) {
                      // It's a product! Set flag to render GlossProductSelection
                      isProductId = true;
                      setIsGlossFinish(true);
                      setForcedProductId(subcategoryIdForProducts);
                      setLoading(false);
                      return;
                    }
                  } catch (err) {
                    // Not a product either, continue with normal flow
                    console.log("subCategoryId is not a product, continuing...");
                  }

                  // Only try to fetch subcategory if it's not a productId
                  if (!isProductId) {
                    try {
                      const subcategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${subcategoryIdForProducts}`, {
                        method: "GET",
                        headers: {
                          Accept: "application/json",
                        },
                      });

                      if (subcategoryResponse.ok) {
                        try {
                          subcategoryData = await handleApiResponse(subcategoryResponse);
                        } catch (parseErr) {
                          // Error parsing response - silently continue
                        }
                      } else if (subcategoryResponse.status === 404) {
                        // Subcategory not found - silently continue, will use category endpoint
                      } else {
                        // Other error status - silently continue
                      }
                    } catch (err) {
                      // Network error or other exception - silently handle
                      // Subcategory doesn't exist, will treat as category
                    }
                  }
                } else {
                  // Found in list, use it
                  subcategoryData = foundInList;
                }
              }
            }

            // Check if this is "Gloss Finish" subcategory - render GlossProductSelection instead
            if (subcategoryData) {
              const subcategoryName = subcategoryData.name?.toLowerCase() || '';
              const subcategorySlug = subcategoryData.slug?.toLowerCase() || '';

              if (subcategoryName.includes('gloss') || subcategorySlug.includes('gloss') || subcategoryIdForProducts?.toLowerCase().includes('gloss')) {
                setIsGlossFinish(true);
                setSelectedSubCategory(subcategoryData);
                setLoading(false);
                return;
              }

              // Set subcategory data
              setSelectedSubCategory(subcategoryData);

              // NEW: Fetch child subcategories for this subcategory
              try {
                const childSubcategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/parent/${subcategoryData._id}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });

                if (childSubcategoriesResponse.ok) {
                  const childrenData = await handleApiResponse(childSubcategoriesResponse);
                  const children = Array.isArray(childrenData) ? childrenData : (childrenData?.data || []);
                  if (children.length > 0) {
                    // NEW: Auto-navigation for single nested subcategory
                    if (children.length === 1) {
                      const onlySubcat = children[0];
                      const identifier = onlySubcat.slug || onlySubcat._id;

                      // Safety check: Don't navigate if we are already there to prevent loops
                      // Check both nestedSubCategoryId and subCategoryId as the identifier could be in either slot
                      if (nestedSubCategoryId !== identifier && subCategoryId !== identifier) {
                        console.log(`Only one nested subcategory found: ${onlySubcat.name} (${identifier}). Auto-navigating...`);

                        // Construct target URL
                        // VisitingCards and GlossProductSelection usually use /:categoryId/:subCategoryId/:nestedSubCategoryId
                        const targetUrl = categoryId && subCategoryId
                          ? `/digital-print/${categoryId}/${subCategoryId}/${identifier}`
                          : `/digital-print/${categoryId}/${identifier}`;

                        navigate(targetUrl, { replace: true });
                        return;
                      }
                    }

                    setSubCategories(children);
                    console.log(`Found ${children.length} nested subcategories`);
                  }
                }
              } catch (childErr) {
                console.error("Error fetching child subcategories:", childErr);
              }
            }

            // Now fetch products using the correct endpoint based on what we have
            // FIRST check if subcategoryData is null - if null, use category endpoint directly
            // If subcategory is found, use /products/subcategory/:subcategoryId
            // If subcategory is NOT found (null), use /products/category/:categoryId
            const baseUrl = API_BASE_URL.replace(/\/+$/, ''); // Remove trailing slashes

            let productsUrl: string;
            let productsResponse: Response;

            // Priority 1: Check if subcategoryData is null - if null, use category endpoint directly
            if (!subcategoryData || subcategoryData === null) {
              // Subcategory is null - use category endpoint directly
              if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
                productsUrl = `${baseUrl}/products/category/${categoryId}`;
                productsResponse = await fetch(productsUrl, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
              } else {
                throw new Error("Valid Category ID is required to fetch products when subcategory is null");
              }
            } else if (subcategoryIdForProducts && /^[0-9a-fA-F]{24}$/.test(subcategoryIdForProducts)) {
              // Subcategory exists - use subcategory endpoint
              productsUrl = `${baseUrl}/products/subcategory/${subcategoryIdForProducts}`;
              productsResponse = await fetch(productsUrl, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });
            } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              // Fallback: No valid subcategoryId but we have a valid categoryId - use category endpoint
              productsUrl = `${baseUrl}/products/category/${categoryId}`;
              productsResponse = await fetch(productsUrl, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });
            } else {
              throw new Error("Valid Subcategory ID or Category ID is required to fetch products");
            }

            // Handle 400 Bad Request errors
            if (!productsResponse.ok && productsResponse.status === 400) {
              const errorText = await productsResponse.text();
              let errorMessage = "Invalid subcategory or category ID";
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.message || errorMessage;
              } catch (e) {
                // If not JSON, use default message
              }
              throw new Error(errorMessage);
            }

            let productsData;
            if (!productsResponse.ok) {
              // For 404, don't try to read the response body
              if (productsResponse.status === 404) {
                productsData = [];
              } else {
                // For other errors, try to get error message
                try {
                  const errorData = await handleApiResponse(productsResponse);
                  throw new Error(errorData.error || errorData.message || `Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
                } catch (err) {
                  if (err instanceof Error && err.message.includes("body stream")) {
                    // If body already read, just throw a generic error
                    throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
                  }
                  throw err;
                }
              }
            } else {
              productsData = await handleApiResponse(productsResponse);
            }

            console.log("=== PRODUCTS FETCHED (VisitingCards) ===");
            console.log("Total products:", Array.isArray(productsData) ? productsData.length : 0);
            console.log("Full products data:", JSON.stringify(productsData, null, 2));

            // If we used subcategory endpoint but got 0 products, and we have a categoryId,
            // the fallback to category endpoint is already handled above
            // So we don't need additional fallback logic here

            // Ensure productsData is always an array
            if (!Array.isArray(productsData)) {
              productsData = [];
            }

            // Fetch nested subcategories recursively if subcategory exists
            let nestedSubcategories: SubCategory[] = [];
            if (subcategoryData && subcategoryIdForProducts) {
              try {
                // Recursive function to fetch all nested subcategories at any depth
                const fetchNestedSubcategoriesRecursive = async (parentId: string): Promise<SubCategory[]> => {
                  try {
                    const nestedResponse = await fetch(`${API_BASE_URL}/subcategories/parent/${parentId}?includeChildren=true`, {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                    });
                    if (nestedResponse.ok) {
                      const nestedData = await handleApiResponse(nestedResponse);
                      const nested = Array.isArray(nestedData) ? nestedData : (nestedData?.data || []);
                      // Sort by sortOrder
                      nested.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));

                      // Flatten nested structure for display (but keep hierarchy info)
                      const flattenNested = (subcats: any[]): SubCategory[] => {
                        let result: SubCategory[] = [];
                        subcats.forEach((subcat) => {
                          result.push(subcat);
                          if (subcat.children && subcat.children.length > 0) {
                            result = result.concat(flattenNested(subcat.children));
                          }
                        });
                        return result;
                      };

                      return flattenNested(nested);
                    }
                  } catch (err) {
                    console.error(`Error fetching nested subcategories for ${parentId}:`, err);
                  }
                  return [];
                };

                nestedSubcategories = await fetchNestedSubcategoriesRecursive(subcategoryIdForProducts);
              } catch (nestedErr) {
                console.error("Error fetching nested subcategories:", nestedErr);
              }
            }

            // Get category info for display
            if (subcategoryData) {
              setSelectedSubCategory(subcategoryData);
              setCategoryName(subcategoryData.category?.name || subcategoryData.name || '');
              setCategoryDescription(subcategoryData.category?.description || subcategoryData.description || '');

              // PRIORITY: If nested subcategories exist, show them instead of products
              if (nestedSubcategories.length > 0) {
                // Auto-skip: If only one nested subcategory, redirect to it
                if (nestedSubcategories.length === 1) {
                  const singleNestedSubcategory = nestedSubcategories[0];
                  // Use ObjectId instead of slug
                  const nestedSubcategoryIdForLink = singleNestedSubcategory._id;

                  if (categoryId) {
                    navigate(`/digital-print/${categoryId}/${subcategoryIdForProducts}/${nestedSubcategoryIdForLink}`, { replace: true });
                  } else {
                    navigate(`/digital-print/${subcategoryIdForProducts}/${nestedSubcategoryIdForLink}`, { replace: true });
                  }
                  setLoading(false);
                  return;
                }

                // Multiple nested subcategories - show them
                setSubCategories(nestedSubcategories);
                setProducts([]); // Clear products when showing nested subcategories
                setLoading(false);
                return;
              }

              // No nested subcategories - will show products below
            } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              // If subcategory data not found, try to get category info (only if categoryId is valid)
              // This handles cases where subcategory doesn't exist but we want to show category products
              try {
                const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });
                if (categoryResponse.ok) {
                  const categoryData = await handleApiResponse(categoryResponse);
                  setCategoryName(categoryData.name || '');
                  setCategoryDescription(categoryData.description || '');
                  setCategoryImage(categoryData.image || '/Glossy.png');
                  // If subcategory doesn't exist but we have products, create a mock subcategory for display
                  // This ensures products can be displayed even when subcategory is missing
                  if (Array.isArray(productsData) && productsData.length > 0) {
                    setSelectedSubCategory({
                      _id: subCategoryId || categoryId,
                      name: categoryData.name || 'Products',
                      description: categoryData.description || '',
                      image: categoryData.image || '/Glossy.png',
                      category: categoryData,
                      slug: subCategoryId || categoryId
                    } as SubCategory);
                  }
                }
              } catch (catErr) {
                console.error("Error fetching category info:", catErr);
                // Even if category fetch fails, set a minimal subcategory for display if we have products
                if (Array.isArray(productsData) && productsData.length > 0) {
                  setSelectedSubCategory({
                    _id: subCategoryId || categoryId || '',
                    name: 'Products',
                    description: '',
                    image: '/Glossy.png',
                    slug: subCategoryId || categoryId || ''
                  } as SubCategory);
                }
              }
            }

            // Auto-skip: If only one product, directly navigate to its detail page
            if (Array.isArray(productsData) && productsData.length === 1) {
              const singleProduct = productsData[0];
              const productSubcategory = typeof singleProduct.subcategory === "object"
                ? singleProduct.subcategory
                : null;

              // Only use subcategory if:
              // 1. The product actually has a subcategory (productSubcategory is not null), OR
              // 2. subcategoryData was actually found (not a mock/fallback)
              // Don't use subCategoryId from URL as fallback - it might be a productId
              // Use ObjectId instead of slug
              const productSubcategoryId = productSubcategory?._id ||
                (subcategoryData ? subcategoryData._id : null);

              // Only include subcategory in URL if:
              // 1. Product has a valid subcategory ID
              // 2. It's different from categoryId
              // 3. subcategoryData was actually found (not null, meaning it's a real subcategory)
              const hasValidSubcategory = productSubcategoryId &&
                productSubcategoryId !== categoryId &&
                productSubcategoryId !== singleProduct._id &&
                subcategoryData !== null;

              // Navigate directly to the product detail page
              if (categoryId && hasValidSubcategory) {
                navigate(`/digital-print/${categoryId}/${productSubcategoryId}/${singleProduct._id}`, { replace: true });
              } else if (categoryId) {
                navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
              } else {
                navigate(`/digital-print/${singleProduct._id}`, { replace: true });
              }
              setLoading(false);
              return;
            }

            // Set products data - ensure it's set even if subcategory doesn't exist
            console.log("Final products data to set:", productsData);
            console.log("Products array length:", Array.isArray(productsData) ? productsData.length : 0);
            setProducts(Array.isArray(productsData) ? productsData : []);

            // If we have products but no subcategory data, ensure we have category info for display
            if (Array.isArray(productsData) && productsData.length > 0 && !subcategoryData && categoryId) {
              // Products exist but subcategory doesn't - this is valid, show the products
              console.log("Products found but subcategory data missing - will display products anyway");
            }

            setLoading(false);
            return;
          } catch (productsErr) {
            console.error("Error fetching products:", productsErr);
            setError(productsErr instanceof Error ? productsErr.message : "Failed to fetch products");
            setLoading(false);
            return;
          }
        } else {
          // Fetch subcategories for the category
          let url = `${API_BASE_URL}/subcategories`;

          if (categoryId) {
            url = `${API_BASE_URL}/subcategories/category/${categoryId}`;
          }

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
          }

          const data = await handleApiResponse(response);
          // Ensure data is an array
          const subcategoriesArray = Array.isArray(data) ? data : (data?.data || []);

          if (subcategoriesArray.length > 0) {
            // Sort by sortOrder to maintain the order set in admin dashboard
            subcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setSubCategories(subcategoriesArray);
            setProducts([]); // Clear products when showing subcategories

            // Set category name and description from first subcategory if available
            if (subcategoriesArray[0].category) {
              const categoryInfo = typeof subcategoriesArray[0].category === 'object'
                ? subcategoriesArray[0].category
                : null;
              if (categoryInfo) {
                setCategoryName(categoryInfo.name || '');
                setCategoryDescription(categoryInfo.description || '');
                setCategoryImage(categoryInfo.image || '/Glossy.png');
              }
            }
          } else {
            // No subcategories found - check if there are products directly under the category
            setSubCategories([]);

            // If we have a categoryId, try to fetch products directly under the category
            if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
              try {
                const productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
                const productsResponse = await fetch(productsUrl, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                  },
                });

                if (productsResponse.ok) {
                  const productsData = await handleApiResponse(productsResponse);
                  const productsArray = Array.isArray(productsData) ? productsData : [];

                  if (productsArray.length > 0) {
                    // Products exist directly under category - set them
                    setProducts(productsArray);

                    // Also fetch category info for display
                    try {
                      const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                        method: "GET",
                        headers: {
                          Accept: "application/json",
                        },
                      });
                      if (categoryResponse.ok) {
                        const categoryData = await handleApiResponse(categoryResponse);
                        setCategoryName(categoryData.name || '');
                        setCategoryDescription(categoryData.description || '');
                        setCategoryImage(categoryData.image || '/Glossy.png');
                      }
                    } catch (catErr) {
                      console.error("Error fetching category info:", catErr);
                    }
                  } else {
                    // No products found
                    setProducts([]);
                  }
                } else {
                  // Products not found or error
                  setProducts([]);
                }
              } catch (productsErr) {
                console.error("Error fetching products for category:", productsErr);
                setProducts([]);
              }
            } else {
              // No valid categoryId
              setProducts([]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId, nestedSubCategoryId]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  // If this is Gloss Finish subcategory, render GlossProductSelection instead
  if (isGlossFinish && categoryId) {
    return <GlossProductSelection forcedProductId={forcedProductId || undefined} />;
  }

  return (
    <div className="min-h-screen bg-cream-50 py-4 sm:py-8">

      {/* Header with Breadcrumb - Only show when viewing subcategories, not products */}
      {!subCategoryId && (
        <div className="bg-white border-b border-cream-200 pb-6 sm:pb-10 pt-6 sm:pt-8 mb-6 sm:mb-8 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm font-medium text-cream-500 uppercase tracking-widest">
                <Link to="/digital-print" className="hover:text-cream-900 transition-colors">Services</Link>
                <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
                <span className="text-cream-900">{categoryName}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-cream-900">
                {categoryName}
              </h1>
              {categoryDescription && (
                <p className="text-sm sm:text-base text-cream-600 mt-2 max-w-xl mx-auto md:mx-0">
                  Choose the perfect paper type and finish for your brand identity.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-cream-900" size={48} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (subCategories.length > 0 && !subCategoryId) || (products.length > 0 && subCategories.length === 0 && !subCategoryId) ? (
          <>
            {/* Subcategory Filters - Only show when subcategories are available */}
            {subCategories.length > 0 && (
              <div className="mb-6 bg-white rounded-xl shadow-md border border-cream-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  {/* Subcategory Search Bar */}
                  <div className="relative flex-1 sm:flex-initial sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search subcategories..."
                      value={subCategorySearchQuery}
                      onChange={(e) => setSubCategorySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 text-sm sm:text-base bg-white shadow-sm transition-all"
                    />
                    {subCategorySearchQuery && (
                      <button
                        onClick={() => setSubCategorySearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cream-500 hover:text-cream-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Subcategory Dropdown */}
                  <div className="flex-1 sm:flex-initial sm:w-64">
                    <label className="block text-sm font-semibold text-cream-900 mb-2">
                      Filter Subcategory
                    </label>
                    <ReviewFilterDropdown
                      label="All Subcategories"
                      value={selectedSubCategoryFilter}
                      onChange={(value) => setSelectedSubCategoryFilter(value as string | null)}
                      options={[
                        { value: null, label: "All Subcategories" },
                        ...subCategories
                          .filter(subCat => {
                            if (subCategorySearchQuery && !subCat.name.toLowerCase().includes(subCategorySearchQuery.toLowerCase())) {
                              return false;
                            }
                            return true;
                          })
                          .map(subCat => ({
                            value: subCat._id,
                            label: subCat.name
                          })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Clear Filters Button */}
                  {(subCategorySearchQuery || selectedSubCategoryFilter) && (
                    <button
                      onClick={() => {
                        setSubCategorySearchQuery("");
                        setSelectedSubCategoryFilter(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-cream-700 hover:text-cream-900 bg-cream-100 hover:bg-cream-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <X size={16} />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Subcategories Grid - Show when category has child categories - Same UI as provided */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {subCategories
                .filter(subCategory => {
                  // Filter by search query
                  if (subCategorySearchQuery && !subCategory.name.toLowerCase().includes(subCategorySearchQuery.toLowerCase())) {
                    return false;
                  }
                  // Filter by selected subcategory
                  if (selectedSubCategoryFilter && subCategory._id !== selectedSubCategoryFilter) {
                    return false;
                  }
                  return true;
                })
                .map((subCategory, idx) => {
                  // Always use ObjectId instead of slug
                  const subCategoryIdForLink = subCategory._id;
                  const imageUrl = subCategory.image || '/Glossy.png'; // Fallback image

                  return (
                    <motion.div
                      key={subCategory._id}
                      variants={itemVariants}
                    >
                      <Link
                        to={categoryId
                          ? `/digital-print/${categoryId}/${subCategoryIdForLink}`
                          : `/digital-print/${subCategoryIdForLink}`
                        }
                        className="group block h-full"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-cream-100 h-full flex flex-col hover:-translate-y-2">

                          {/* Rounded Square Image Container */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-cream-100 flex items-center justify-center rounded-2xl sm:rounded-3xl m-3 sm:m-4 mx-2 sm:mx-3">
                            <img
                              src={imageUrl}
                              alt={subCategory.name}
                              className="object-contain h-full w-full transition-transform duration-700 group-hover:scale-110 rounded-2xl sm:rounded-3xl"
                            />

                            {/* Quick View Overlay */}
                            <div className="absolute inset-0 bg-cream-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                              <span className="bg-white text-cream-900 px-6 py-3 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                                Customize Now
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="px-3 sm:px-4 py-4 sm:py-5 flex flex-col flex-grow">
                            <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-cream-900 mb-2 group-hover:text-cream-600 transition-colors">
                              {subCategory.name}
                            </h3>
                            <p className="text-cream-600 text-sm sm:text-base mb-4 flex-grow leading-relaxed">
                              {subCategory.description || ''}
                            </p>

                            <div className="pt-3 border-t border-cream-100 flex items-center justify-between mt-auto">
                              <span className="text-xs sm:text-sm text-cream-500">View Details</span>
                              <ArrowRight
                                size={18}
                                className="text-cream-900 group-hover:text-cream-600 group-hover:translate-x-1 transition-all duration-300"
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
            </motion.div>

            {/* Direct Products Section - Show direct products if they exist (even when subcategories exist) */}
            {products.length > 0 && (
              <div className="mt-12">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
                  Direct Products
                </h2>

                {/* Main Layout: 50/50 Split - Left Category Image, Right Products */}
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
                  {/* Left Side: Category Image (Fixed, Large) */}
                  <div className="lg:w-1/2">
                    <div className="lg:sticky lg:top-24">
                      <motion.div
                        className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-cream-100/50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={categoryImage || "/Glossy.png"}
                            alt={categoryName || "Category Preview"}
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Right Side: Product List */}
                  <div className="lg:w-1/2">
                    <motion.div
                      className="space-y-3 sm:space-y-4 w-full"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {products.map((product) => {
                        const productSubcategory = typeof product.subcategory === "object"
                          ? product.subcategory
                          : null;
                        // Only use the product's actual subcategory - don't use subCategoryId from URL as fallback
                        // because it might be a productId when products are directly under category
                        // Use ObjectId instead of slug
                        const productSubcategoryId = productSubcategory?._id;

                        // Check if we're in a nested subcategory context
                        const isNestedContext = nestedSubCategoryId && subCategoryId;
                        const currentNestedSubcategoryId = isNestedContext ? nestedSubCategoryId : null;
                        const currentParentSubcategoryId = isNestedContext ? subCategoryId : null;

                        // Only include subcategory in URL if:
                        // 1. Product has a valid subcategory ID
                        // 2. It's different from categoryId
                        // 3. It's different from the product's own ID (to avoid using productId as subcategoryId)
                        const hasValidSubcategory = productSubcategoryId &&
                          productSubcategoryId !== categoryId &&
                          productSubcategoryId !== product._id;

                        // If we're in a nested subcategory context and product belongs to that nested subcategory,
                        // use the nested path structure
                        const useNestedPath = isNestedContext &&
                          productSubcategoryId &&
                          (productSubcategoryId === nestedSubCategoryId ||
                            productSubcategoryId === currentNestedSubcategoryId);

                        const basePrice = product.basePrice || 0;
                        const displayPrice = basePrice < 1
                          ? (basePrice * 1000).toFixed(2)
                          : basePrice.toFixed(2);
                        const priceLabel = basePrice < 1 ? "per 1000 units" : "";

                        const descriptionText = product.description
                          ? product.description.replace(/<[^>]*>/g, '').trim()
                          : "";
                        const lines = descriptionText.split('\n').filter(line => line.trim());
                        const firstFewLines = lines.slice(0, 3).join(' ').trim();
                        const shortDescription = firstFewLines.length > 200
                          ? firstFewLines.substring(0, 200) + '...'
                          : firstFewLines || "";

                        return (
                          <motion.div
                            key={product._id}
                            variants={itemVariants}
                          >
                            <Link
                              to={categoryId && useNestedPath && currentParentSubcategoryId && currentNestedSubcategoryId
                                ? `/digital-print/${categoryId}/${currentParentSubcategoryId}/${currentNestedSubcategoryId}/${product._id}`
                                : categoryId && hasValidSubcategory
                                  ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                                  : categoryId
                                    ? `/digital-print/${categoryId}/${product._id}`
                                    : `/digital-print/${product._id}`
                              }
                              className="group block w-full"
                              onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 min-h-[140px] sm:min-h-[160px] flex gap-4">
                                {/* Product Image */}
                                <div className="flex-shrink-0 w-24 sm:w-32 h-24 sm:h-32 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                                  <img
                                    src={product.image || "/Glossy.png"}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                </div>

                                {/* Product Content */}
                                <div className="flex-1 flex flex-col min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                      {product.name}
                                    </h3>
                                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                                      <div>
                                        <div className="text-lg sm:text-xl font-bold text-cream-900">
                                          {formatPrice(parseFloat(displayPrice) || 0, 'INR')}
                                        </div>
                                        {priceLabel && (
                                          <div className="text-xs text-cream-500 mt-0.5">
                                            {priceLabel}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-cream-900 group-hover:text-cream-600 text-xl font-bold transition-colors">→</span>
                                    </div>
                                  </div>

                                  {shortDescription && (
                                    <div className="text-cream-600 text-xs sm:text-sm leading-relaxed flex-grow">
                                      <p className="line-clamp-2">{shortDescription}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : subCategoryId ? (
          /* Products Display - From subcategory - Old UI: Left Image, Right Products */
          <div>
            {/* Back Button - Only show if viewing subcategory */}
            {subCategoryId && (
              <div className="mb-4">
                <BackButton
                  onClick={() => {
                    if (nestedSubCategoryId && subCategoryId && categoryId) {
                      // If in nested subcategory, go back to parent subcategory
                      navigate(`/digital-print/${categoryId}/${subCategoryId}`);
                    } else if (categoryId) {
                      navigate(`/digital-print/${categoryId}`);
                    } else {
                      navigate('/digital-print');
                    }
                    window.scrollTo(0, 0);
                  }}
                  fallbackPath={
                    nestedSubCategoryId && subCategoryId && categoryId
                      ? `/digital-print/${categoryId}/${subCategoryId}`
                      : categoryId
                        ? `/digital-print/${categoryId}`
                        : "/digital-print"
                  }
                  label={
                    nestedSubCategoryId
                      ? "Back to Subcategory"
                      : (categoryName ? `Back to ${categoryName}` : "Back to Category")
                  }
                  className="inline-flex items-center gap-2 text-sm text-cream-600 hover:text-cream-900"
                />
              </div>
            )}

            {/* Nested Subcategories - Show before products if they exist */}
            {subCategories.length > 0 && (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
                  Nested Subcategories
                </h2>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-12"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {subCategories.map((nestedSubCategory) => {
                    // Always use ObjectId instead of slug
                    const nestedSubCategoryIdForLink = nestedSubCategory._id;
                    const imageUrl = nestedSubCategory.image || '/Glossy.png';
                    // Get parent subcategory ID for proper navigation - always use ObjectId
                    const parentSubcategoryId = selectedSubCategory ? selectedSubCategory._id : subCategoryId;

                    return (
                      <motion.div
                        key={nestedSubCategory._id}
                        variants={itemVariants}
                      >
                        <Link
                          to={categoryId && parentSubcategoryId
                            ? `/digital-print/${categoryId}/${parentSubcategoryId}/${nestedSubCategoryIdForLink}`
                            : categoryId
                              ? `/digital-print/${categoryId}/${nestedSubCategoryIdForLink}`
                              : `/digital-print/${nestedSubCategoryIdForLink}`
                          }
                          className="group block h-full"
                          onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-cream-100 h-full flex flex-col hover:-translate-y-2">
                            <div className="relative aspect-[4/3] overflow-hidden bg-cream-100 flex items-center justify-center rounded-2xl sm:rounded-3xl m-3 sm:m-4 mx-2 sm:mx-3">
                              <img
                                src={imageUrl}
                                alt={nestedSubCategory.name}
                                className="object-contain h-full w-full transition-transform duration-700 group-hover:scale-110 rounded-2xl sm:rounded-3xl"
                              />
                              <div className="absolute inset-0 bg-cream-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                <span className="bg-white text-cream-900 px-6 py-3 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                                  Customize Now
                                </span>
                              </div>
                            </div>
                            <div className="px-3 sm:px-4 py-4 sm:py-5 flex flex-col flex-grow">
                              <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-cream-900 mb-2 group-hover:text-cream-600 transition-colors">
                                {nestedSubCategory.name}
                              </h3>
                              <p className="text-cream-600 text-sm sm:text-base mb-4 flex-grow leading-relaxed">
                                {nestedSubCategory.description || ''}
                              </p>
                              <div className="pt-3 border-t border-cream-100 flex items-center justify-between mt-auto">
                                <span className="text-xs sm:text-sm text-cream-500">View Details</span>
                                <ArrowRight
                                  size={18}
                                  className="text-cream-900 group-hover:text-cream-600 group-hover:translate-x-1 transition-all duration-300"
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </>
            )}

            {/* Products Display */}
            {products.length > 0 ? (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
                  Select Product
                </h2>

                {/* Main Layout: 50/50 Split - Left Image, Right Products */}
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
                  {/* Left Side: Category Image (Fixed, Large) */}
                  <div className="lg:w-1/2">
                    <div className="lg:sticky lg:top-24">
                      <motion.div
                        className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-cream-100/50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={categoryImage || selectedSubCategory?.image || "/Glossy.png"}
                            alt={categoryName || selectedSubCategory?.name || "Category Preview"}
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Right Side: Product List - Old UI Style */}
                  <div className="lg:w-1/2">
                    <motion.div
                      className="space-y-3 sm:space-y-4 w-full"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {products.map((product) => {
                        const productSubcategory = typeof product.subcategory === "object"
                          ? product.subcategory
                          : null;
                        // Only use the product's actual subcategory - don't use subCategoryId from URL as fallback
                        // because it might be a productId when products are directly under category
                        const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id;

                        // Only include subcategory in URL if:
                        // 1. Product has a valid subcategory ID
                        // 2. It's different from categoryId
                        // 3. It's different from the product's own ID (to avoid using productId as subcategoryId)
                        const hasValidSubcategory = productSubcategoryId &&
                          productSubcategoryId !== categoryId &&
                          productSubcategoryId !== product._id;

                        // Calculate price per 1000 units if basePrice is less than 1
                        const basePrice = product.basePrice || 0;
                        const displayPrice = basePrice < 1
                          ? (basePrice * 1000).toFixed(2)
                          : basePrice.toFixed(2);
                        const priceLabel = basePrice < 1 ? "per 1000 units" : "";

                        // Get description preview (strip HTML and get first few lines)
                        const descriptionText = product.description
                          ? product.description.replace(/<[^>]*>/g, '').trim()
                          : "";
                        // Get first 3 lines or up to 200 characters
                        const lines = descriptionText.split('\n').filter(line => line.trim());
                        const firstFewLines = lines.slice(0, 3).join(' ').trim();
                        const shortDescription = firstFewLines.length > 200
                          ? firstFewLines.substring(0, 200) + '...'
                          : firstFewLines || "";

                        return (
                          <motion.div
                            key={product._id}
                            variants={itemVariants}
                          >
                            <Link
                              to={categoryId && hasValidSubcategory
                                ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                                : categoryId
                                  ? `/digital-print/${categoryId}/${product._id}`
                                  : `/digital-print/${product._id}`
                              }
                              className="group block w-full"
                              onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 min-h-[140px] sm:min-h-[160px] flex gap-4">
                                {/* Product Image */}
                                <div className="flex-shrink-0 w-24 sm:w-32 h-24 sm:h-32 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                                  <img
                                    src={product.image || "/Glossy.png"}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                </div>

                                {/* Product Content */}
                                <div className="flex-1 flex flex-col min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                      {product.name}
                                    </h3>
                                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                                      <div>
                                        <div className="text-lg sm:text-xl font-bold text-cream-900">
                                          {formatPrice(parseFloat(displayPrice) || 0, 'INR')}
                                        </div>
                                        {priceLabel && (
                                          <div className="text-xs text-cream-500 mt-0.5">
                                            {priceLabel}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-cream-900 group-hover:text-cream-600 text-xl font-bold transition-colors">→</span>
                                    </div>
                                  </div>

                                  {shortDescription && (
                                    <div className="text-cream-600 text-xs sm:text-sm leading-relaxed flex-grow">
                                      <p className="line-clamp-2">{shortDescription}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              </>
            ) : subCategories.length === 0 ? (
              <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
                <p className="text-cream-700">No products found for this subcategory.</p>
                {categoryId && (
                  <BackButton
                    onClick={() => {
                      if (categoryId) {
                        navigate(`/digital-print/${categoryId}`);
                      } else {
                        navigate('/digital-print');
                      }
                      window.scrollTo(0, 0);
                    }}
                    fallbackPath={categoryId ? `/digital-print/${categoryId}` : "/digital-print"}
                    label={categoryName ? `Back to ${categoryName}` : "Back to Category"}
                    className="text-cream-900 hover:text-cream-600 underline mt-2 inline-block"
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : categoryId && products.length > 0 ? (
          /* Products Display - Direct from category (with or without subcategories) - 50/50 Layout */
          <div>
            {/* Select Product Heading */}
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900 mb-6">
              Select Product
            </h2>

            {/* Main Layout: 50/50 Split - Left Category Image, Right Products */}
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
              {/* Left Side: Category Image (Fixed, Large) */}
              <div className="lg:w-1/2">
                <div className="lg:sticky lg:top-24">
                  <motion.div
                    className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-cream-100/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={categoryImage || "/Glossy.png"}
                        alt={categoryName || "Category Preview"}
                        className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Right Side: Product List with Images */}
              <div className="lg:w-1/2">
                <motion.div
                  className="space-y-3 sm:space-y-4 w-full"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {products.map((product) => {
                    const productSubcategory = typeof product.subcategory === "object"
                      ? product.subcategory
                      : null;
                    // Only use the product's actual subcategory - don't use categoryId as fallback
                    const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id;

                    // Only include subcategory in URL if:
                    // 1. Product has a valid subcategory ID
                    // 2. It's different from categoryId
                    // 3. It's different from the product's own ID (to avoid using productId as subcategoryId)
                    const hasValidSubcategory = productSubcategoryId &&
                      productSubcategoryId !== categoryId &&
                      productSubcategoryId !== product._id;

                    // Calculate price per 1000 units if basePrice is less than 1
                    const basePrice = product.basePrice || 0;
                    const displayPrice = basePrice < 1
                      ? (basePrice * 1000).toFixed(2)
                      : basePrice.toFixed(2);
                    const priceLabel = basePrice < 1 ? "per 1000 units" : "";

                    // Get description preview (strip HTML and get first few lines)
                    const descriptionText = product.description
                      ? product.description.replace(/<[^>]*>/g, '').trim()
                      : "";
                    // Get first 3 lines or up to 200 characters
                    const lines = descriptionText.split('\n').filter(line => line.trim());
                    const firstFewLines = lines.slice(0, 3).join(' ').trim();
                    const shortDescription = firstFewLines.length > 200
                      ? firstFewLines.substring(0, 200) + '...'
                      : firstFewLines || "";

                    return (
                      <motion.div
                        key={product._id}
                        variants={itemVariants}
                      >
                        <Link
                          to={categoryId && hasValidSubcategory
                            ? `/digital-print/${categoryId}/${productSubcategoryId}/${product._id}`
                            : categoryId
                              ? `/digital-print/${categoryId}/${product._id}`
                              : `/digital-print/${product._id}`
                          }
                          className="group block w-full"
                          onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 min-h-[140px] sm:min-h-[160px] flex gap-4">
                            {/* Product Image */}
                            <div className="flex-shrink-0 w-24 sm:w-32 h-24 sm:h-32 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                              <img
                                src={product.image || "/Glossy.png"}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>

                            {/* Product Content */}
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                  {product.name}
                                </h3>
                                <div className="text-right flex-shrink-0 flex items-center gap-2">
                                  <div>
                                    <div className="text-lg sm:text-xl font-bold text-cream-900">
                                      {formatPrice(parseFloat(displayPrice) || 0, 'INR')}
                                    </div>
                                    {priceLabel && (
                                      <div className="text-xs text-cream-500 mt-0.5">
                                        {priceLabel}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-cream-900 group-hover:text-cream-600 text-xl font-bold transition-colors">→</span>
                                </div>
                              </div>

                              {shortDescription && (
                                <div className="text-cream-600 text-xs sm:text-sm leading-relaxed flex-grow">
                                  <p className="line-clamp-2">{shortDescription}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </div>
        ) : (categoryId && subCategories.length === 0) && products.length === 0 ? (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
            <p className="text-cream-700">
              {subCategoryId ? "No products found for this subcategory." : "No products found for this category."}
            </p>
            {categoryId && subCategoryId && (
              <BackButton
                onClick={() => {
                  if (categoryId) {
                    navigate(`/digital-print/${categoryId}`);
                  } else {
                    navigate('/digital-print');
                  }
                  window.scrollTo(0, 0);
                }}
                fallbackPath={categoryId ? `/digital-print/${categoryId}` : "/digital-print"}
                label={categoryName ? `Back to ${categoryName}` : "Back to Category"}
                className="text-cream-900 hover:text-cream-600 underline mt-2 inline-block"
              />
            )}
          </div>
        ) : subCategories.length === 0 && !categoryId ? (
          <div className="bg-cream-50 border border-cream-200 rounded-lg p-6 text-center">
            <p className="text-cream-700">No categories found.</p>
          </div>
        ) : null
        }

        {/* Category Details Footer - Only show when viewing subcategories, not products */}
        {!subCategoryId && categoryName && (
          <motion.div
            className="mt-12 sm:mt-20 bg-white p-8 sm:p-10 rounded-3xl border border-cream-200 shadow-sm"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row gap-10 items-start">
              <div className="flex-1">
                <h3 className="font-serif text-2xl font-bold text-cream-900 mb-4">
                  Why Choose Our {categoryName}?
                </h3>
                {categoryDescription && (
                  <p className="text-cream-700 leading-relaxed mb-6">
                    {categoryDescription}
                  </p>
                )}
                <div className="flex gap-4">
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">24h</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">Production</div>
                  </div>
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">300+</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">GSM Paper</div>
                  </div>
                  <div className="text-center p-4 bg-cream-50 rounded-xl border border-cream-100">
                    <div className="font-bold text-2xl text-cream-900 mb-1">100%</div>
                    <div className="text-xs text-cream-500 uppercase tracking-wider">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VisitingCards;
