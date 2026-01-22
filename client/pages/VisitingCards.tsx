import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader, X, Clock, FileText, Star } from 'lucide-react';
import GlossProductSelection from './GlossProductSelection';
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";

import BackButton from '../components/BackButton';

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
                        navigate(`/services/${categoryId}/${identifier}`, { replace: true });
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
                    ? `/services/${categoryId}/${subCategoryIdForLink}`
                    : `/services/${subCategoryIdForLink}`,
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

            // Filter products to decide what to display
            // If we have subcategories (folders), we only want to show products that DON'T belong to any subcategory (direct children) for mixed view.
            // If we have NO subcategories, we show ALL products returned (flattened view), to ensure nothing is hidden.
            const hasSubcategories = subcategoriesArray && subcategoriesArray.length > 0;

            const directProducts = Array.isArray(productsData)
              ? productsData.filter((product: Product) => {
                // First check if product's category matches (convert both to strings for comparison)
                const productCategoryId = typeof product.category === 'object'
                  ? (product.category?._id ? String(product.category._id) : null)
                  : (product.category ? String(product.category) : null);

                const categoryIdStr = String(categoryId);

                // Only include products that belong to this category
                if (!productCategoryId || productCategoryId !== categoryIdStr) {
                  return false;
                }

                // If no subcategories are being displayed, show ALL products for this category
                // This fixes the issue where products with subcategories were hidden when no subcategory folders existed
                if (!hasSubcategories) {
                  return true;
                }

                // If subcategories ARE displayed, only show products that don't have a subcategory
                // (Strict filtering to prevent duplicates - product inside folder and outside)
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

            // (hasSubcategories already defined above)

            // AUTO-SKIP: If only one subcategory, navigate directly to its products
            if (hasSubcategories && subcategoriesArray.length === 1) {
              const singleSubcategory = subcategoriesArray[0];
              // Use ObjectId instead of slug
              const subcategoryIdForLink = singleSubcategory._id;

              // Navigate directly to subcategory products page
              if (categoryId) {
                navigate(`/services/${categoryId}/${subcategoryIdForLink}`, { replace: true });
              } else {
                navigate(`/services/${subcategoryIdForLink}`, { replace: true });
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
            // If category has no subcategories but has products, AUTO-REDIRECT to first product
            if (directProducts && directProducts.length > 0 && !hasSubcategories) {
              // AUTO-REDIRECT: Always navigate to the first product (removed product listing page)
              const firstProduct = directProducts[0];

              // Navigate directly to the product detail page
              if (categoryId) {
                navigate(`/services/${categoryId}/${firstProduct._id}`, { replace: true });
              } else {
                navigate(`/services/${firstProduct._id}`, { replace: true });
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
                          ? `/services/${categoryId}/${subCategoryId}/${identifier}`
                          : `/services/${categoryId}/${identifier}`;

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

              // PRIORITY: If nested subcategories exist, auto-navigate to first product
              if (nestedSubcategories.length > 0) {
                // Loop through ALL nested subcategories to find first one with products
                for (const nestedSubcat of nestedSubcategories) {
                  const nestedSubcatId = nestedSubcat._id;

                  try {
                    const nestedProductsUrl = `${API_BASE_URL}/products/subcategory/${nestedSubcatId}`;
                    const nestedProductsResponse = await fetch(nestedProductsUrl, {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                    });

                    if (nestedProductsResponse.ok) {
                      const nestedProductsText = await nestedProductsResponse.text();
                      if (!nestedProductsText.startsWith("<!DOCTYPE") && !nestedProductsText.startsWith("<html")) {
                        const nestedProductsData = JSON.parse(nestedProductsText);

                        if (Array.isArray(nestedProductsData) && nestedProductsData.length > 0) {
                          const firstProduct = nestedProductsData[0];
                          const firstProductId = firstProduct._id;

                          // Navigate to the first product with full URL structure
                          console.log(`Auto-navigating to first product: ${firstProduct.name} (${firstProductId}) from nested subcategory: ${nestedSubcat.name}`);
                          const targetUrl = categoryId
                            ? `/services/${categoryId}/${subcategoryIdForProducts}/${nestedSubcatId}/${firstProductId}`
                            : `/services/${subcategoryIdForProducts}/${nestedSubcatId}/${firstProductId}`;

                          navigate(targetUrl, { replace: true });
                          setLoading(false);
                          return;
                        }
                      }
                    }
                  } catch (nestedProductErr) {
                    console.error(`Error fetching products for nested subcategory ${nestedSubcat.name}:`, nestedProductErr);
                    // Continue to next nested subcategory
                  }
                }

                // If no products found in any nested subcategory, show empty state instead of Product Variants page
                console.log("No products found in any nested subcategory");
                setSubCategories([]);
                setProducts([]);
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

            // Auto-skip: If products exist, directly navigate to the first product's detail page
            // This skips the product selection page entirely
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
                navigate(`/services/${categoryId}/${productSubcategoryId}/${singleProduct._id}`, { replace: true });
              } else if (categoryId) {
                navigate(`/services/${categoryId}/${singleProduct._id}`, { replace: true });
              } else {
                navigate(`/services/${singleProduct._id}`, { replace: true });
              }
              setLoading(false);
              return;
            }

            // Set products data - ensure it's set even if subcategory doesn't exist
            console.log("Final products data to set:", productsData);
            console.log("Products array length:", Array.isArray(productsData) ? productsData.length : 0);

            // AUTO-REDIRECT: If products exist, navigate to first product instead of showing listing
            if (Array.isArray(productsData) && productsData.length > 0) {
              const firstProduct = productsData[0];
              const productSubcategory = typeof firstProduct.subcategory === "object"
                ? firstProduct.subcategory
                : null;
              const productSubcategoryId = productSubcategory?.slug || productSubcategory?._id;

              // Only include subcategory in URL if:
              // 1. Product has a valid subcategory ID
              // 2. It's different from categoryId
              // 3. subcategoryData was actually found (not null, meaning it's a real subcategory)
              const hasValidSubcategory = productSubcategoryId &&
                productSubcategoryId !== categoryId &&
                productSubcategoryId !== firstProduct._id &&
                subcategoryData !== null;

              // Navigate directly to the first product detail page
              console.log(`Auto-navigating to first product: ${firstProduct.name} (${firstProduct._id})`);
              if (categoryId && hasValidSubcategory) {
                navigate(`/services/${categoryId}/${productSubcategoryId}/${firstProduct._id}`, { replace: true });
              } else if (categoryId) {
                navigate(`/services/${categoryId}/${firstProduct._id}`, { replace: true });
              } else {
                navigate(`/services/${firstProduct._id}`, { replace: true });
              }
              setLoading(false);
              return;
            }

            // No products found - set empty array
            setProducts(Array.isArray(productsData) ? productsData : []);

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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">

      {/* Header with Breadcrumb - Only show when viewing subcategories, not products */}
      {!subCategoryId && (
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-50 via-purple-50 to-blue-50 pb-8 sm:pb-12 pt-8 sm:pt-12 mb-8 sm:mb-10">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-rose-200/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-gradient-to-r from-blue-200/20 to-transparent rounded-full blur-2xl" />

          {/* Floating sparkle decorations */}
          <motion.div
            className="absolute top-8 right-16 text-rose-300"
            animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star size={24} />
          </motion.div>
          <motion.div
            className="absolute bottom-12 right-1/4 text-purple-300"
            animate={{ y: [5, -5, 5], rotate: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star size={18} />
          </motion.div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="flex flex-col gap-3 text-center md:text-left">
              {/* Breadcrumb with pill style */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm font-medium">
                <Link to="/services" className="px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-sm">
                  Services
                </Link>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-purple-500 text-white font-semibold shadow-md">
                  {categoryName}
                </span>
              </div>

              {/* Animated title */}
              <motion.h1
                className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-rose-900 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {categoryName}
              </motion.h1>

              {categoryDescription && (
                <motion.p
                  className="text-base sm:text-lg text-gray-600 mt-2 max-w-2xl mx-auto md:mx-0 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Choose the perfect paper type and finish for your brand identity.
                </motion.p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-gray-900" size={48} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (subCategories.length > 0 && !subCategoryId) || (products.length > 0 && subCategories.length === 0 && !subCategoryId) ? (
          <>
            {/* Subcategories Grid - Show when category has child categories - Same UI as provided */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {subCategories
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
                          ? `/services/${categoryId}/${subCategoryIdForLink}`
                          : `/services/${subCategoryIdForLink}`
                        }
                        className="group block h-full"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="bg-gradient-to-br from-white/50 via-white/30 to-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 border border-white/60 h-full flex flex-col hover:-translate-y-2 hover:scale-[1.02] group relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-500">
                          {/* Rounded Square Image Container with Glow Effect */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50/80 via-white to-gray-100/80 flex items-center justify-center rounded-2xl sm:rounded-3xl m-4 mx-3 sm:mx-4 shadow-inner group-hover:shadow-lg transition-shadow duration-500">
                            {/* Subtle Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/20 via-transparent to-rose-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                            <img
                              src={imageUrl}
                              alt={subCategory.name}
                              className="object-contain h-full w-full transition-all duration-700 group-hover:scale-110 group-hover:brightness-105 rounded-2xl sm:rounded-3xl p-2"
                            />

                          </div>

                          {/* Content */}
                          <div className="px-5 sm:px-6 py-5 sm:py-6 flex flex-col flex-grow">
                            <div className="mb-3">
                              <h3 className="font-serif text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-rose-600 transition-all duration-400">
                                {subCategory.name}
                              </h3>
                            </div>

                            {/* Decorative Divider */}
                            <div className="pt-4 mt-auto border-t border-gray-200/50 group-hover:border-purple-200 transition-colors duration-300">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600 group-hover:text-purple-700 transition-colors duration-300 flex items-center gap-2">
                                  Explore Collection
                                  <div className="w-4 h-0.5 bg-gradient-to-r from-purple-400 to-rose-400 rounded-full group-hover:w-6 transition-all duration-300" />
                                </span>
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-purple-500 rounded-full blur group-hover:blur-md transition-all duration-300 opacity-50" />
                                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-r from-rose-400 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg">
                                    <ArrowRight
                                      size={18}
                                      className="text-white group-hover:translate-x-1 transition-all duration-300"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Floating corner accent */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-rose-400/10 rounded-bl-3xl transform translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-transform duration-500" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
            </motion.div>

            {/* Direct Products Section - Show direct products if they exist (even when subcategories exist) */}
            {products.length > 0 && (
              <div className="mt-12">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                  Direct Products
                </h2>

                {/* Main Layout: 50/50 Split - Left Category Image, Right Products */}
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
                  {/* Left Side: Category Image (Fixed, Large) */}
                  <div className="lg:w-1/2">
                    <div className="lg:sticky lg:top-24">
                      <motion.div
                        className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] bg-gray-100/50"
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
                                ? `/services/${categoryId}/${currentParentSubcategoryId}/${currentNestedSubcategoryId}/${product._id}`
                                : categoryId && hasValidSubcategory
                                  ? `/services/${categoryId}/${productSubcategoryId}/${product._id}`
                                  : categoryId
                                    ? `/services/${categoryId}/${product._id}`
                                    : `/services/${product._id}`
                              }
                              className="group block w-full"
                              onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <div className="w-full p-4 sm:p-6 rounded-xl border-2 border-gray-200 hover:border-purple-400 text-left transition-all duration-300 hover:bg-gradient-to-br hover:from-white hover:to-purple-50 min-h-[140px] sm:min-h-[160px] flex gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1">
                                {/* Product Image */}
                                <div className="flex-shrink-0 w-24 sm:w-32 h-24 sm:h-32 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-inner">
                                  <img
                                    src={product.image || "/Glossy.png"}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                </div>

                                {/* Product Content */}
                                <div className="flex-1 flex flex-col min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="font-serif text-base sm:text-lg font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-purple-700 group-hover:to-rose-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 flex-1">
                                      {product.name}
                                    </h3>
                                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                                      <div>
                                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                                          ₹{displayPrice}
                                        </div>
                                        {priceLabel && (
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {priceLabel}
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-purple-600 group-hover:text-rose-600 text-xl font-bold transition-all duration-300 group-hover:translate-x-1">→</span>
                                    </div>
                                  </div>

                                  {shortDescription && (
                                    <div className="text-gray-600 text-xs sm:text-sm leading-relaxed flex-grow">
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
            {/* Back Button - Only show if viewing subcategory AND not deeply nested (user request: remove if more than 2) */}
            {/* Interpretation: Show back button only if we are NOT in a subcategory (Wait, logic in plan was !subCategoryId) */}
            {/* But this block is inside "else if (subCategoryId)". So we are ALREADY in a subcategory. */}
            {/* The request "remove the back button if it more than 2" implies when depth > 2. */}
            {/* If we are here, depth is at least 2 (Category -> SubCategory). */}
            {/* So we should HIDE it here? */}
            {/* If I hide it here, there is NO back button on the subcategory page. */}
            {/* Let's follow the plan: "Interpretation: If navigation depth is > 2 (i.e., when subCategoryId is present), hide the back button." */}
            {/* So I will remove this block or comment it out if subCategoryId is present. */}
            {/* Since we are inside `else if (subCategoryId)`, subCategoryId IS present. So I will NOT render the back button here. */}
            {false && subCategoryId && (
              <div className="mb-4">
                <BackButton
                  onClick={() => {
                    if (nestedSubCategoryId && subCategoryId && categoryId) {
                      // If in nested subcategory, go back to parent subcategory
                      navigate(`/services/${categoryId}/${subCategoryId}`);
                    } else if (categoryId) {
                      navigate(`/services/${categoryId}`);
                    } else {
                      navigate('/services');
                    }
                    window.scrollTo(0, 0);
                  }}
                  fallbackPath={
                    nestedSubCategoryId && subCategoryId && categoryId
                      ? `/services/${categoryId}/${subCategoryId}`
                      : categoryId
                        ? `/services/${categoryId}`
                        : "/services"
                  }
                  label={
                    nestedSubCategoryId
                      ? "Back to Subcategory"
                      : (categoryName ? `Back to ${categoryName}` : "Back to Category")
                  }
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                />
              </div>
            )}

            {/* Products Display - Removed: Auto-redirect navigates to first product */}
            {subCategories.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-700">No products found for this subcategory.</p>
                {categoryId && (
                  <BackButton
                    onClick={() => {
                      if (categoryId) {
                        navigate(`/services/${categoryId}`);
                      } else {
                        navigate('/services');
                      }
                      window.scrollTo(0, 0);
                    }}
                    fallbackPath={categoryId ? `/services/${categoryId}` : "/services"}
                    label={categoryName ? `Back to ${categoryName}` : "Back to Category"}
                    className="text-gray-900 hover:text-gray-600 underline mt-2 inline-block"
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : (categoryId && subCategories.length === 0) && products.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-700">
              {subCategoryId ? "No products found for this subcategory." : "No products found for this category."}
            </p>
            {categoryId && subCategoryId && (
              <BackButton
                onClick={() => {
                  if (categoryId) {
                    navigate(`/services/${categoryId}`);
                  } else {
                    navigate('/services');
                  }
                  window.scrollTo(0, 0);
                }}
                fallbackPath={categoryId ? `/services/${categoryId}` : "/services"}
                label={categoryName ? `Back to ${categoryName}` : "Back to Category"}
                className="text-gray-900 hover:text-gray-600 underline mt-2 inline-block"
              />
            )}
          </div>
        ) : subCategories.length === 0 && !categoryId ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-700">No categories found.</p>
          </div>
        ) : null
        }

        {/* Category Details Footer - Only show when viewing subcategories, not products */}
        {!subCategoryId && categoryName && (
          <motion.div
            className="mt-16 sm:mt-24 relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-rose-50 to-blue-50 rounded-3xl" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-200/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-rose-200/30 to-transparent rounded-full blur-3xl" />

            <div className="relative p-8 sm:p-12 rounded-3xl border border-white/60 backdrop-blur-sm shadow-xl">
              <div className="flex flex-col gap-8">
                {/* Title */}
                <div className="text-center">
                  <motion.h3
                    className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-rose-900 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Why Choose Our {categoryName}?
                  </motion.h3>
                  {categoryDescription && (
                    <motion.p
                      className="text-gray-600 leading-relaxed max-w-2xl mx-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      {categoryDescription}
                    </motion.p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {/* Production Time */}
                  <motion.div
                    className="text-center p-6 sm:p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Clock size={28} />
                    </div>
                    <div className="font-bold text-3xl sm:text-4xl bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent mb-2">24h</div>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Fast Production</div>
                  </motion.div>

                  {/* Paper Quality */}
                  <motion.div
                    className="text-center p-6 sm:p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <FileText size={28} />
                    </div>
                    <div className="font-bold text-3xl sm:text-4xl bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">300+</div>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">GSM Premium Paper</div>
                  </motion.div>

                  {/* Satisfaction */}
                  <motion.div
                    className="text-center p-6 sm:p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white shadow-lg group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Star size={28} />
                    </div>
                    <div className="font-bold text-3xl sm:text-4xl bg-gradient-to-r from-amber-500 to-rose-600 bg-clip-text text-transparent mb-2">100%</div>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Satisfaction Guaranteed</div>
                  </motion.div>
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
