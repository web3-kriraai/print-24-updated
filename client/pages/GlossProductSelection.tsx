import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Truck, Upload as UploadIcon, FileImage, CreditCard, X, Loader, Info, Lock, AlertCircle, MapPin, Zap, Square, Circle, FileText } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/select';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import { applyAttributeRules, type AttributeRule, type Attribute } from '../utils/attributeRuleEngine';

interface SubCategory {
  _id: string;
  name: string;
  description: string;
  image?: string;
  slug?: string;
  sortOrder?: number;
  parent?: string | {
    _id: string;
    name?: string;
  } | null;
  category?: {
    _id: string;
    name: string;
    description?: string;
  };
}

interface GlossProduct {
  _id: string;
  id: string;
  name: string;
  description?: string;
  descriptionArray?: string[];
  filters: {
    printingOption: string[];
    orderQuantity: {
      min: number;
      max: number;
      multiples: number;
      quantityType?: "SIMPLE" | "STEP_WISE" | "RANGE_WISE";
      stepWiseQuantities?: number[];
      rangeWiseQuantities?: Array<{
        min: number;
        max: number | null;
        priceMultiplier: number;
        label?: string;
      }>;
    };
    deliverySpeed: string[];
    textureType?: string[];
    filterPricesEnabled?: boolean;
    printingOptionPrices?: Array<{ name: string; priceAdd: number }>;
    deliverySpeedPrices?: Array<{ name: string; priceAdd: number }>;
    textureTypePrices?: Array<{ name: string; priceAdd: number }>;
  };
  basePrice: number;
  image?: string;
  category?: {
    _id: string;
    name: string;
    description?: string;
    type?: string;
  } | string;
  subcategory?: SubCategory | string;
  options?: Array<{
    name: string;
    priceAdd: number;
    description?: string;
    image?: string;
  }>;
  dynamicAttributes?: Array<{
    attributeType: string | {
      _id: string;
      attributeName: string;
      inputStyle: string;
      attributeValues: Array<{
        value: string;
        label: string;
        priceMultiplier: number;
        image?: string;
        description?: string;
      }>;
      defaultValue?: string;
    };
    isEnabled: boolean;
    isRequired: boolean;
    displayOrder: number;
    customValues?: Array<{
      value: string;
      label: string;
      priceMultiplier: number;
      image?: string;
      description?: string;
    }>;
  }>;
  quantityDiscounts?: Array<{
    minQuantity: number;
    maxQuantity?: number | null;
    discountPercentage: number;
    priceMultiplier?: number;
  }>;
  // File upload constraints
  maxFileSizeMB?: number;
  minFileWidth?: number;
  maxFileWidth?: number;
  minFileHeight?: number;
  maxFileHeight?: number;
  blockCDRandJPG?: boolean;
  // Additional charges and taxes
  additionalDesignCharge?: number;
  gstPercentage?: number;
  // Price display setting
  showPriceIncludingGst?: boolean; // If true, show prices including GST; if false, show excluding GST
  // Custom instructions for customers
  instructions?: string;
}

interface GlossProductSelectionProps {
  forcedProductId?: string;
}

const GlossProductSelection: React.FC<GlossProductSelectionProps> = ({ forcedProductId }) => {
  const params = useParams<{ categoryId: string; subCategoryId?: string; nestedSubCategoryId?: string; productId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId, subCategoryId, nestedSubCategoryId } = params;
  // Use forcedProductId if provided, otherwise fallback to params.productId
  const productId = forcedProductId || params.productId;
  const [products, setProducts] = useState<GlossProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<GlossProduct | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [nestedSubCategories, setNestedSubCategories] = useState<SubCategory[]>([]);
  // Product variant filter states (for nested subcategories displayed as filters)
  const [availableNestedSubcategories, setAvailableNestedSubcategories] = useState<SubCategory[]>([]);
  const [selectedNestedSubcategoryId, setSelectedNestedSubcategoryId] = useState<string | null>(null);
  // Category products for thumbnail display at top
  const [categoryProducts, setCategoryProducts] = useState<GlossProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Breadcrumb navigation state - store names for each level
  const [breadcrumbCategoryName, setBreadcrumbCategoryName] = useState<string>("");
  const [breadcrumbSubCategoryName, setBreadcrumbSubCategoryName] = useState<string>("");
  const [breadcrumbNestedSubCategoryName, setBreadcrumbNestedSubCategoryName] = useState<string>("");


  // PDP API data state
  const [pdpAttributes, setPdpAttributes] = useState<Attribute[]>([]);
  const [pdpSubAttributes, setPdpSubAttributes] = useState<Record<string, Array<{ _id: string; value: string; label: string; image?: string; priceAdd: number; parentValue: string }>>>({});
  const [pdpRules, setPdpRules] = useState<AttributeRule[]>([]);
  const [pdpQuantityConfig, setPdpQuantityConfig] = useState<any>(null);
  const [pdpLoading, setPdpLoading] = useState(false);
  const [pdpError, setPdpError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter states for selected product
  const [selectedPrintingOption, setSelectedPrintingOption] = useState<string>("");
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>("");
  const [selectedTextureType, setSelectedTextureType] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(100); // Will be set to minimum from product config
  const [activeQuantityConstraints, setActiveQuantityConstraints] = useState<{ min?: number; max?: number; step?: number } | null>(null);

  // Dynamic attributes state - store selected values for each attribute
  const [selectedDynamicAttributes, setSelectedDynamicAttributes] = useState<{ [key: string]: string | number | boolean | File | any[] | null }>({});
  // Track which attributes have been explicitly selected by the user (for image updates)
  const [userSelectedAttributes, setUserSelectedAttributes] = useState<Set<string>>(new Set());
  // Selected product options (from options table)
  const [selectedProductOptions, setSelectedProductOptions] = useState<string[]>([]);

  // Order form states
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(null);
  const [deliveryLocationSource, setDeliveryLocationSource] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  // Delivery information states
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [frontDesignFile, setFrontDesignFile] = useState<File | null>(null);
  const [backDesignFile, setBackDesignFile] = useState<File | null>(null);
  const [frontDesignPreview, setFrontDesignPreview] = useState<string>("");
  const [backDesignPreview, setBackDesignPreview] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [additionalDesignCharge, setAdditionalDesignCharge] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  // Track individual charges for order summary
  const [printingOptionCharge, setPrintingOptionCharge] = useState(0);
  const [deliverySpeedCharge, setDeliverySpeedCharge] = useState(0);
  const [textureTypeCharge, setTextureTypeCharge] = useState(0);
  const [productOptionsCharge, setProductOptionsCharge] = useState(0);
  const [dynamicAttributesCharges, setDynamicAttributesCharges] = useState<Array<{ name: string; label: string; charge: number }>>([]);
  const [baseSubtotalBeforeDiscount, setBaseSubtotalBeforeDiscount] = useState(0);
  const [perUnitPriceExcludingGst, setPerUnitPriceExcludingGst] = useState(0); // Store per unit price excluding GST
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // RADIO attribute modal state
  const [radioModalOpen, setRadioModalOpen] = useState(false);
  const [radioModalData, setRadioModalData] = useState<{
    attributeId: string;
    attributeName: string;
    attributeValues: Array<{
      value: string;
      label: string;
      priceMultiplier?: number;
      image?: string;
      description?: string;
      hasSubAttributes?: boolean;
    }>;
    selectedValue: string | null;
    isRequired: boolean;
  } | null>(null);
  // Sub-attribute modal state (for RADIO values that have sub-attributes)
  const [subAttrModalOpen, setSubAttrModalOpen] = useState(false);
  const [subAttrModalData, setSubAttrModalData] = useState<{
    attributeId: string;
    parentValue: string;
    parentLabel: string;
    subAttributes: Array<{
      _id: string;
      value: string;
      label: string;
      image?: string;
      priceAdd: number;
      parentValue: string;
    }>;
    selectedValue: string | null;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);


  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isImageModalOpen]);

  // Auto-select single options when product changes
  useEffect(() => {
    if (!selectedProduct) return;

    // Auto-select printing option if only one available
    if (selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length === 1) {
      if (!selectedPrintingOption || selectedPrintingOption !== selectedProduct.filters.printingOption[0]) {
        setSelectedPrintingOption(selectedProduct.filters.printingOption[0]);
      }
    }

    // Auto-select delivery speed if only one available
    if (selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length === 1) {
      if (!selectedDeliverySpeed || selectedDeliverySpeed !== selectedProduct.filters.deliverySpeed[0]) {
        setSelectedDeliverySpeed(selectedProduct.filters.deliverySpeed[0]);
      }
    }

    // Auto-select texture type if only one available
    if (selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length === 1) {
      if (!selectedTextureType || selectedTextureType !== selectedProduct.filters.textureType[0]) {
        setSelectedTextureType(selectedProduct.filters.textureType[0]);
      }
    }

    // Auto-select dynamic attributes with single option (only if PDP is initialized)
    if (selectedProduct && isInitialized && pdpAttributes.length > 0) {
      // Apply rules to get evaluated attributes
      const ruleResult = applyAttributeRules({
        attributes: pdpAttributes,
        rules: pdpRules,
        selectedValues: { ...selectedDynamicAttributes } as Record<string, string | number | boolean | File | any[] | null>,
      });

      // Auto-select single values for visible attributes
      ruleResult.attributes.forEach((attr) => {
        if (!attr.isVisible) return;
        const attributeValues = attr.attributeValues || [];
        if (attributeValues.length === 1) {
          const singleValue = attributeValues[0];
          if (!selectedDynamicAttributes[attr._id] || selectedDynamicAttributes[attr._id] !== singleValue.value) {
            setSelectedDynamicAttributes((prev) => ({
              ...prev,
              [attr._id]: singleValue.value,
            }));
          }
        }
        // Apply SET_DEFAULT if no selection and default is set
        if (attr.defaultValue && !selectedDynamicAttributes[attr._id]) {
          setSelectedDynamicAttributes((prev) => ({
            ...prev,
            [attr._id]: attr.defaultValue,
          }));
        }
      });

      // Extract QUANTITY constraints directly from rules
      let quantityConstraints: { min?: number; max?: number; step?: number } | null = null;

      for (const rule of pdpRules) {
        // Skip if rule or when condition is invalid
        if (!rule || !rule.when || !rule.when.attribute) {
          continue;
        }

        // Check if rule condition is met
        const whenAttributeId = typeof rule.when.attribute === 'object'
          ? rule.when.attribute._id
          : rule.when.attribute;

        const selectedValue = selectedDynamicAttributes[whenAttributeId];

        if (selectedValue && String(selectedValue) === rule.when.value) {
          // Rule condition is met, check for QUANTITY actions
          for (const action of rule.then) {
            if (action.action === 'QUANTITY') {
              // Extract quantity constraints from this action
              quantityConstraints = {
                min: action.minQuantity,
                max: action.maxQuantity,
                step: action.stepQuantity,
              };
              break; // Use first matching QUANTITY action
            }
          }
          if (quantityConstraints) break; // Stop after finding first matching rule
        }
      }

      if (quantityConstraints) {
        console.log('✅ Quantity constraints activated:', quantityConstraints);
      } else {
        console.log('❌ No quantity constraints active');
      }

      setActiveQuantityConstraints(quantityConstraints);
    } else if (selectedProduct && !isInitialized) {
      // Fallback to old logic if PDP not loaded yet
      if (selectedProduct.dynamicAttributes) {
        selectedProduct.dynamicAttributes.forEach((attr) => {
          if (!attr.isEnabled) return;
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (!attrType) return;

          const attributeValues = attr.customValues && attr.customValues.length > 0
            ? attr.customValues
            : attrType.attributeValues || [];

          // Auto-select if only one value available
          if (attributeValues.length === 1) {
            const singleValue = attributeValues[0];
            if (!selectedDynamicAttributes[attrType._id] || selectedDynamicAttributes[attrType._id] !== singleValue.value) {
              setSelectedDynamicAttributes({
                ...selectedDynamicAttributes,
                [attrType._id]: singleValue.value
              });
            }
          }
        });
      }
    }
  }, [selectedProduct, isInitialized, pdpAttributes, pdpRules, selectedDynamicAttributes]);

  // Validate and adjust quantity when constraints change
  useEffect(() => {
    if (!activeQuantityConstraints) return;

    const { min, max, step } = activeQuantityConstraints;

    // Always default to minimum value when constraints change
    let adjustedQuantity = min !== undefined ? min : quantity;

    // Ensure the minimum value respects the step constraint
    if (step !== undefined && step > 0 && min !== undefined) {
      // Make sure min is a valid step value
      const stepsFromMin = Math.round((adjustedQuantity - min) / step);
      adjustedQuantity = min + (stepsFromMin * step);
    }

    // Update quantity to minimum value
    if (adjustedQuantity !== quantity) {
      console.log(`Quantity set to minimum value ${adjustedQuantity} based on constraints:`, activeQuantityConstraints);
      setQuantity(adjustedQuantity);

      // Note: Auto-scroll to quantity removed to prevent page scrolling on load

      // Show notification about quantity update
      setValidationError(`Quantity set to ${adjustedQuantity.toLocaleString()} (Min: ${min?.toLocaleString()}, Max: ${max?.toLocaleString()}, Step: ${step?.toLocaleString()})`);
      setTimeout(() => setValidationError(null), 5000);
    }
  }, [activeQuantityConstraints]);

  // Note: Auto-scroll to quantity section removed to prevent page from scrolling down on load

  // Reset quantity to product minimum when constraints are removed
  useEffect(() => {
    if (activeQuantityConstraints || !selectedProduct) return;

    // Get minimum quantity from product configuration
    const orderQuantity = selectedProduct.filters?.orderQuantity;
    let minQuantity = 100; // Default fallback

    if (orderQuantity) {
      if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
        minQuantity = Math.min(...orderQuantity.stepWiseQuantities);
      } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
        minQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r: any) => r.min || 100));
      } else {
        minQuantity = orderQuantity.min || 100;
      }
    }

    // Set to minimum if current quantity doesn't match
    if (quantity !== minQuantity) {
      console.log(`Quantity reset to product minimum ${minQuantity} (no active constraints)`);
      setQuantity(minQuantity);
    }
  }, [activeQuantityConstraints, selectedProduct]);

  // Fetch subcategory and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Reset selected product when category/subcategory changes
        setSelectedProduct(null);
        setProducts([]);

        // Find subcategory by subCategoryId or nestedSubCategoryId from URL
        // Priority: nestedSubCategoryId > subCategoryId
        // If productId is provided, we need to find the product first to get its subcategory
        let subcategoryId: string | null = null;
        let subcategoryData: SubCategory | null = null;
        const activeSubCategoryId = nestedSubCategoryId || subCategoryId; // Use nested subcategory if present

        // If productId is provided, fetch PDP data instead of regular product
        if (productId) {
          // Validate productId format (MongoDB ObjectId: 24 hex characters)
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(productId);

          if (!isValidObjectId) {
            console.warn("Invalid productId format:", productId);
            setPdpError("Invalid product ID format. Please select a product from the list.");
            setPdpLoading(false);
            // Don't return here - continue to fetch products list so user can select a valid product
          } else {
            try {
              setPdpLoading(true);
              setPdpError(null);
              const pdpResponse = await fetch(`${API_BASE_URL}/products/${productId}/detail`, {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              });

              if (pdpResponse.ok) {
                const pdpText = await pdpResponse.text();
                if (!pdpText.startsWith("<!DOCTYPE") && !pdpText.startsWith("<html")) {
                  const pdpData = JSON.parse(pdpText);

                  // Extract PDP data
                  const productData = pdpData.product;
                  const attributes = pdpData.attributes || [];
                  const subAttributes = pdpData.subAttributes || {};
                  const rules = pdpData.rules || [];
                  const quantityConfig = pdpData.quantityConfig;

                  // Get subcategory from product
                  if (productData.subcategory) {
                    if (typeof productData.subcategory === 'object' && productData.subcategory._id) {
                      subcategoryId = productData.subcategory._id;
                      subcategoryData = productData.subcategory;
                      setSelectedSubCategory(productData.subcategory);
                    } else if (typeof productData.subcategory === 'string') {
                      subcategoryId = productData.subcategory;
                    }
                  }

                  // Map product data
                  const mappedProduct: GlossProduct = {
                    _id: productData._id,
                    id: productData._id,
                    name: productData.name || '',
                    description: productData.description || '',
                    descriptionArray: productData.descriptionArray || (productData.description ? [productData.description] : []),
                    filters: {
                      printingOption: productData.filters?.printingOption || [],
                      orderQuantity: quantityConfig || productData.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                      deliverySpeed: productData.filters?.deliverySpeed || [],
                      textureType: productData.filters?.textureType || undefined,
                      filterPricesEnabled: productData.filters?.filterPricesEnabled || false,
                      printingOptionPrices: productData.filters?.printingOptionPrices || [],
                      deliverySpeedPrices: productData.filters?.deliverySpeedPrices || [],
                      textureTypePrices: productData.filters?.textureTypePrices || [],
                    },
                    basePrice: productData.basePrice || 0,
                    image: productData.image,
                    subcategory: productData.subcategory,
                    options: productData.options || [],
                    dynamicAttributes: attributes.map((attr: any) => ({
                      attributeType: {
                        _id: attr._id,
                        attributeName: attr.attributeName,
                        inputStyle: attr.inputStyle,
                        attributeValues: attr.attributeValues || [],
                        defaultValue: attr.defaultValue,
                      },
                      isEnabled: true,
                      isRequired: attr.isRequired || false,
                      displayOrder: attr.displayOrder || 0,
                      customValues: attr.customValues || [],
                    })),
                    quantityDiscounts: productData.quantityDiscounts || [],
                    maxFileSizeMB: productData.maxFileSizeMB,
                    minFileWidth: productData.minFileWidth,
                    maxFileWidth: productData.maxFileWidth,
                    minFileHeight: productData.minFileHeight,
                    maxFileHeight: productData.maxFileHeight,
                    blockCDRandJPG: productData.blockCDRandJPG || false,
                    additionalDesignCharge: productData.additionalDesignCharge || 0,
                    gstPercentage: productData.gstPercentage || 0,
                    showPriceIncludingGst: productData.showPriceIncludingGst || false,
                    instructions: productData.instructions || "",
                  };

                  setSelectedProduct(mappedProduct);

                  // Initialize quantity to minimum from product configuration
                  const orderQuantity = mappedProduct.filters?.orderQuantity;
                  let minQuantity = 100; // Default fallback

                  if (orderQuantity) {
                    if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
                      // Use smallest value from step-wise quantities
                      minQuantity = Math.min(...orderQuantity.stepWiseQuantities);
                    } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
                      // Use smallest min value from ranges
                      minQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r: any) => r.min || 100));
                    } else {
                      // Use min from simple quantity config
                      minQuantity = orderQuantity.min || 100;
                    }
                  }

                  setQuantity(minQuantity);

                  // Store PDP data
                  setPdpAttributes(attributes);
                  setPdpSubAttributes(subAttributes);
                  setPdpRules(rules);
                  setPdpQuantityConfig(quantityConfig);
                  setIsInitialized(true);
                }
              } else {
                const errorText = await pdpResponse.text();
                let errorMessage = "Failed to fetch product details";
                try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.error || errorMessage;
                } catch (e) {
                  // If not JSON, use default message
                }
                setPdpError(errorMessage);
              }
            } catch (err) {
              console.error("Error fetching product details:", err);
              setPdpError("Error loading product details");
            } finally {
              setPdpLoading(false);
            }
          }
        }

        // If we don't have subcategory yet, try to find it from subcategories list
        if (!subcategoryId) {
          // Fetch subcategories for the category (with nested children)
          const subcategoriesUrl = categoryId
            ? `${API_BASE_URL}/subcategories/category/${categoryId}?includeChildren=true`
            : `${API_BASE_URL}/subcategories`;

          const subcategoriesResponse = await fetch(subcategoriesUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          if (subcategoriesResponse.ok) {
            const subcategoriesText = await subcategoriesResponse.text();
            if (!subcategoriesText.startsWith("<!DOCTYPE") && !subcategoriesText.startsWith("<html")) {
              const subcategoriesData = JSON.parse(subcategoriesText);

              // Flatten nested subcategories for searching
              const flattenSubcategories = (subcats: any[]): any[] => {
                let result: any[] = [];
                subcats.forEach((subcat) => {
                  result.push(subcat);
                  if (subcat.children && subcat.children.length > 0) {
                    result = result.concat(flattenSubcategories(subcat.children));
                  }
                });
                return result;
              };

              const flattenedData = flattenSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);

              // First try to find by nestedSubCategoryId or subCategoryId from URL (prioritize ObjectId, then slug, then name)
              const searchId = activeSubCategoryId;
              if (searchId) {
                // First check if it's a valid ObjectId - if so, match by _id only
                const isObjectId = /^[0-9a-fA-F]{24}$/.test(searchId);
                if (isObjectId) {
                  subcategoryData = flattenedData.find(
                    (sc: SubCategory) => sc._id === searchId
                  );
                } else {
                  // It's a slug or name - try to find by slug first, then name
                  subcategoryData = flattenedData.find(
                    (sc: SubCategory) =>
                      sc.slug === searchId ||
                      sc.name?.toLowerCase().replace(/\s+/g, '-') === searchId.toLowerCase().replace(/\s+/g, '-') ||
                      sc.name?.toLowerCase() === searchId.toLowerCase()
                  );
                }
              }

              // If not found and route has "gloss-finish", try that
              if (!subcategoryData) {
                subcategoryData = subcategoriesData.find(
                  (sc: SubCategory) =>
                    sc.slug?.toLowerCase() === "gloss-finish" ||
                    sc.name?.toLowerCase().includes('gloss finish') ||
                    sc.name?.toLowerCase().includes('gloss')
                );
              }

              if (subcategoryData) {
                subcategoryId = subcategoryData._id;
                setSelectedSubCategory(subcategoryData);

                // Check if this subcategory has a parent (it's a nested subcategory)
                const hasParent = subcategoryData.parent &&
                  (typeof subcategoryData.parent === 'object' ? subcategoryData.parent._id : subcategoryData.parent);

                if (hasParent && !nestedSubCategoryId && categoryId) {
                  // This is a nested subcategory accessed directly without parent in URL
                  // Redirect to include parent subcategory in URL
                  const parentId = typeof subcategoryData.parent === 'object'
                    ? subcategoryData.parent._id
                    : subcategoryData.parent;
                  console.log(`Nested subcategory detected in list, redirecting to include parent: ${parentId}`);
                  navigate(`/services/${categoryId}/${parentId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  setLoading(false);
                  return; // Exit early, let the redirect handle the rest
                }

                // If URL contains slug instead of ObjectId, redirect to use ObjectId
                const isSlug = activeSubCategoryId && !/^[0-9a-fA-F]{24}$/.test(activeSubCategoryId);
                if (isSlug && subcategoryId && subcategoryId !== activeSubCategoryId) {
                  // Replace slug with ObjectId in URL
                  if (nestedSubCategoryId) {
                    // This is a nested subcategory case - shouldn't happen here, but handle it
                    navigate(`/services/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  } else if (categoryId) {
                    // Regular subcategory case
                    navigate(`/services/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  } else {
                    // No category case
                    navigate(`/services/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  }
                }
              } else if (activeSubCategoryId) {
                // If not found in list but activeSubCategoryId exists, try API lookup (supports slug)
                // This handles cases where subcategory is not in the fetched list
                try {
                  const subcategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${activeSubCategoryId}`, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (subcategoryResponse.ok) {
                    const subcategoryText = await subcategoryResponse.text();
                    if (!subcategoryText.startsWith("<!DOCTYPE") && !subcategoryText.startsWith("<html")) {
                      const fetchedSubcategory = JSON.parse(subcategoryText);
                      if (fetchedSubcategory && fetchedSubcategory._id) {
                        subcategoryData = fetchedSubcategory;
                        subcategoryId = fetchedSubcategory._id;
                        setSelectedSubCategory(fetchedSubcategory);
                        console.log("Found subcategory via API lookup, using _id:", subcategoryId);

                        // Check if this subcategory has a parent (it's a nested subcategory)
                        const hasParent = fetchedSubcategory.parent &&
                          (typeof fetchedSubcategory.parent === 'object' ? fetchedSubcategory.parent._id : fetchedSubcategory.parent);

                        if (hasParent && !nestedSubCategoryId && categoryId) {
                          // This is a nested subcategory accessed directly without parent in URL
                          // Redirect to include parent subcategory in URL
                          const parentId = typeof fetchedSubcategory.parent === 'object'
                            ? fetchedSubcategory.parent._id
                            : fetchedSubcategory.parent;
                          console.log(`Nested subcategory detected, redirecting to include parent: ${parentId}`);
                          navigate(`/services/${categoryId}/${parentId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          return; // Exit early, let the redirect handle the rest
                        }

                        // If URL contains slug instead of ObjectId, redirect to use ObjectId
                        const isSlug = activeSubCategoryId && !/^[0-9a-fA-F]{24}$/.test(activeSubCategoryId);
                        if (isSlug && subcategoryId && subcategoryId !== activeSubCategoryId) {
                          // Replace slug with ObjectId in URL
                          if (nestedSubCategoryId && subCategoryId) {
                            // Nested subcategory case - preserve parent subcategory ID
                            const parentSubcategoryId = /^[0-9a-fA-F]{24}$/.test(subCategoryId) ? subCategoryId : subCategoryId; // Keep as is, will be converted if needed
                            navigate(`/services/${categoryId}/${parentSubcategoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          } else if (categoryId) {
                            // Regular subcategory case
                            navigate(`/services/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          } else {
                            // No category case
                            navigate(`/services/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn("Error fetching subcategory via API:", err);
                }
              }
              // If subcategoryData is null, don't try to fetch - will use category endpoint instead
            }
          }
        }
        // If subcategoryData is null, don't try to fetch - will use category endpoint instead

        // PRIORITY: Check if selected subcategory has nested subcategories
        // If nested subcategories exist, display them instead of products
        // Use the resolved subcategory ID if we found one, otherwise use the active ID from URL
        const subcategoryToCheck = subcategoryData?._id || activeSubCategoryId;

        if (subcategoryToCheck) {
          try {
            // Fetch nested subcategories (children of this subcategory)
            console.log(`Checking for nested subcategories of: ${subcategoryToCheck}`);
            const nestedSubcategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/parent/${subcategoryToCheck}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });

            if (nestedSubcategoriesResponse.ok) {
              const nestedSubcategoriesText = await nestedSubcategoriesResponse.text();
              if (!nestedSubcategoriesText.startsWith("<!DOCTYPE") && !nestedSubcategoriesText.startsWith("<html")) {
                try {
                  const nestedSubcategoriesData = JSON.parse(nestedSubcategoriesText);
                  const nestedSubcategoriesArray = Array.isArray(nestedSubcategoriesData) ? nestedSubcategoriesData : [];

                  // Sort by sortOrder
                  nestedSubcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));

                  if (nestedSubcategoriesArray.length > 0) {
                    // NEW BEHAVIOR: Auto-navigate to first product of first nested subcategory
                    // Store all nested subcategories for filter display
                    console.log(`Found ${nestedSubcategoriesArray.length} nested subcategories for subcategory ${subcategoryToCheck}`);

                    // If we don't have a productId in URL, auto-navigate to first product of first nested subcategory
                    if (!productId) {
                      const firstNestedSubcat = nestedSubcategoriesArray[0];
                      const firstNestedSubcatId = firstNestedSubcat._id;

                      // Fetch products for the first nested subcategory
                      try {
                        const firstNestedProductsUrl = `${API_BASE_URL}/products/subcategory/${firstNestedSubcatId}`;
                        const firstNestedProductsResponse = await fetch(firstNestedProductsUrl, {
                          method: "GET",
                          headers: {
                            Accept: "application/json",
                          },
                        });

                        if (firstNestedProductsResponse.ok) {
                          const firstNestedProductsText = await firstNestedProductsResponse.text();
                          if (!firstNestedProductsText.startsWith("<!DOCTYPE") && !firstNestedProductsText.startsWith("<html")) {
                            const firstNestedProductsData = JSON.parse(firstNestedProductsText);

                            if (Array.isArray(firstNestedProductsData) && firstNestedProductsData.length > 0) {
                              const firstProduct = firstNestedProductsData[0];
                              const firstProductId = firstProduct._id;

                              // Navigate to the first product with full URL structure
                              console.log(`Auto-navigating to first product: ${firstProduct.name} (${firstProductId})`);
                              const targetUrl = categoryId && subCategoryId
                                ? `/services/${categoryId}/${subCategoryId}/${firstNestedSubcatId}/${firstProductId}`
                                : `/services/${categoryId}/${firstNestedSubcatId}/${firstProductId}`;

                              navigate(targetUrl, { replace: true });
                              return; // Exit early, let the navigation handle the rest
                            }
                          }
                        }
                      } catch (firstProductErr) {
                        console.error("Error fetching first nested subcategory products:", firstProductErr);
                      }
                    }

                    // If we have a productId, store nested subcategories for filter display
                    setAvailableNestedSubcategories(nestedSubcategoriesArray);
                    setSelectedNestedSubcategoryId(nestedSubCategoryId || null);

                    // Continue to fetch products for the current nested subcategory
                    // Don't return early - let the normal product fetching continue
                  } else {
                    console.log(`No nested subcategories found for subcategory ${subcategoryToCheck}, will fetch products`);
                  }
                } catch (parseErr) {
                  console.error("Error parsing nested subcategories response:", parseErr);
                  // Continue to fetch products
                }
              }
            } else {
              console.log(`Nested subcategories check returned ${nestedSubcategoriesResponse.status}, will fetch products`);
            }
          } catch (nestedErr) {
            console.error("Error fetching nested subcategories:", nestedErr);
            // Continue to fetch products if nested subcategories check fails
          }
        }

        // No nested subcategories found - proceed to fetch products
        // Clear nested subcategories state since we're showing products
        setNestedSubCategories([]);

        // Fetch products based on whether subcategory is found or not
        // FIRST check if subcategoryData is null - if null, use category endpoint directly
        // If subcategory is found, use /products/subcategory/:subcategoryId
        // If subcategory is NOT found (null), use /products/category/:categoryId
        let productsUrl: string;
        let productsResponse: Response;

        // Priority 1: Check if subcategoryData is null - if null, use category endpoint directly
        if (!subcategoryData || subcategoryData === null) {
          // Subcategory is null - use category endpoint directly
          if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
            productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
            productsResponse = await fetch(productsUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });
          } else {
            // No valid category ID
            setProducts([]);
            return;
          }
        } else if (subcategoryData && subcategoryData._id) {
          // Subcategory found - use subcategory endpoint
          // Use the resolved ID from subcategoryData which handles slugs correctly
          const productSubcategoryId = subcategoryData._id;

          // Resolve the subcategory name for logging
          const logSubcategoryName = subcategoryData.name || productSubcategoryId;

          // This endpoint will return products for the subcategory and all nested subcategories
          // If no products found, it falls back to category products
          console.log(`Fetching products for subcategory: ${logSubcategoryName} (${productSubcategoryId})`);
          productsUrl = `${API_BASE_URL}/products/subcategory/${productSubcategoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
          // Fallback: Subcategory not found - use category endpoint
          productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else {
          // No valid category or subcategory ID
          setProducts([]);
          return;
        }

        const productsText = await productsResponse.text();
        if (productsText.startsWith("<!DOCTYPE") || productsText.startsWith("<html")) {
          // Server returned HTML instead of JSON - don't throw error, just log and continue
          console.error("Server returned HTML instead of JSON for products");
          setProducts([]);
        } else if (!productsResponse.ok) {
          // Products not found or error - log the error
          console.error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
          try {
            const errorData = JSON.parse(productsText);
            console.error("Error details:", errorData);
          } catch (e) {
            console.error("Error response text:", productsText);
          }
          setProducts([]);
        } else {
          try {
            const productsData = JSON.parse(productsText);

            // Ensure productsData is an array
            if (!Array.isArray(productsData)) {
              console.warn("Products data is not an array:", productsData);
              setProducts([]);
            } else {
              const currentSubName = subcategoryData?.name || subcategoryData?._id || subcategoryId || 'category ' + categoryId;
              console.log(`Fetched ${productsData.length} product(s) for ${currentSubName}`);

              // If no products found for subcategory, try fetching category products as fallback
              let finalProductsData = productsData;
              if (productsData.length === 0 && subcategoryData && categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
                console.log(`No products found for subcategory ${subcategoryId}, fetching category products as fallback`);
                try {
                  const categoryProductsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
                    method: "GET",
                    headers: {
                      Accept: "application/json",
                    },
                  });

                  if (categoryProductsResponse.ok) {
                    const categoryProductsText = await categoryProductsResponse.text();
                    if (!categoryProductsText.startsWith("<!DOCTYPE") && !categoryProductsText.startsWith("<html")) {
                      const categoryProductsData = JSON.parse(categoryProductsText);
                      if (Array.isArray(categoryProductsData) && categoryProductsData.length > 0) {
                        console.log(`Found ${categoryProductsData.length} product(s) in category as fallback`);
                        finalProductsData = categoryProductsData;
                      }
                    }
                  }
                } catch (fallbackErr) {
                  console.error("Error fetching category products as fallback:", fallbackErr);
                }
              }

              // Map API products to GlossProduct format
              const mappedProducts: GlossProduct[] = finalProductsData.map((product: any) => ({
                _id: product._id,
                id: product._id,
                name: product.name || '',
                description: product.description || '',
                descriptionArray: product.descriptionArray || (product.description ? [product.description] : []),
                filters: {
                  printingOption: product.filters?.printingOption || [],
                  orderQuantity: product.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                  deliverySpeed: product.filters?.deliverySpeed || [],
                  textureType: product.filters?.textureType || undefined,
                  filterPricesEnabled: product.filters?.filterPricesEnabled || false,
                  printingOptionPrices: product.filters?.printingOptionPrices || [],
                  deliverySpeedPrices: product.filters?.deliverySpeedPrices || [],
                  textureTypePrices: product.filters?.textureTypePrices || [],
                },
                basePrice: product.basePrice || 0,
                image: product.image,
                subcategory: product.subcategory,
                options: product.options || [],
                dynamicAttributes: product.dynamicAttributes || [],
                quantityDiscounts: product.quantityDiscounts || [],
                maxFileSizeMB: product.maxFileSizeMB,
                minFileWidth: product.minFileWidth,
                maxFileWidth: product.maxFileWidth,
                minFileHeight: product.minFileHeight,
                maxFileHeight: product.maxFileHeight,
                blockCDRandJPG: product.blockCDRandJPG || false,
                additionalDesignCharge: product.additionalDesignCharge || 0,
                gstPercentage: product.gstPercentage || 0,
                showPriceIncludingGst: product.showPriceIncludingGst || false,
                instructions: product.instructions || "",
              }));

              setProducts(mappedProducts);

              // Fetch all products from the same category/subcategory for thumbnail display
              // Only fetch if we have a productId (viewing product details)
              if (productId && mappedProducts.length > 0) {
                try {
                  // Determine which endpoint to use based on the current context
                  let categoryProductsUrl = '';
                  if (subcategoryData && subcategoryData._id) {
                    // Fetch products from the same subcategory
                    categoryProductsUrl = `${API_BASE_URL}/products/subcategory/${subcategoryData._id}`;
                  } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
                    // Fetch products from the same category
                    categoryProductsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
                  }

                  if (categoryProductsUrl) {
                    const categoryProductsResponse = await fetch(categoryProductsUrl, {
                      method: "GET",
                      headers: {
                        Accept: "application/json",
                      },
                    });

                    if (categoryProductsResponse.ok) {
                      const categoryProductsText = await categoryProductsResponse.text();
                      if (!categoryProductsText.startsWith("<!DOCTYPE") && !categoryProductsText.startsWith("<html")) {
                        const categoryProductsData = JSON.parse(categoryProductsText);
                        if (Array.isArray(categoryProductsData)) {
                          // Map to GlossProduct format
                          const mappedCategoryProducts: GlossProduct[] = categoryProductsData.map((product: any) => ({
                            _id: product._id,
                            id: product._id,
                            name: product.name || '',
                            description: product.description || '',
                            descriptionArray: product.descriptionArray || [],
                            filters: {
                              printingOption: product.filters?.printingOption || [],
                              orderQuantity: product.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                              deliverySpeed: product.filters?.deliverySpeed || [],
                              textureType: product.filters?.textureType || undefined,
                              filterPricesEnabled: product.filters?.filterPricesEnabled || false,
                              printingOptionPrices: product.filters?.printingOptionPrices || [],
                              deliverySpeedPrices: product.filters?.deliverySpeedPrices || [],
                              textureTypePrices: product.filters?.textureTypePrices || [],
                            },
                            basePrice: product.basePrice || 0,
                            image: product.image,
                            subcategory: product.subcategory,
                            options: product.options || [],
                            dynamicAttributes: product.dynamicAttributes || [],
                            quantityDiscounts: product.quantityDiscounts || [],
                            maxFileSizeMB: product.maxFileSizeMB,
                            minFileWidth: product.minFileWidth,
                            maxFileWidth: product.maxFileWidth,
                            minFileHeight: product.minFileHeight,
                            maxFileHeight: product.maxFileHeight,
                            blockCDRandJPG: product.blockCDRandJPG || false,
                            additionalDesignCharge: product.additionalDesignCharge || 0,
                            gstPercentage: product.gstPercentage || 0,
                            showPriceIncludingGst: product.showPriceIncludingGst || false,
                            instructions: product.instructions || "",
                          }));
                          setCategoryProducts(mappedCategoryProducts);
                        }
                      }
                    }
                  }
                } catch (categoryProductsErr) {
                  console.error("Error fetching category products for thumbnails:", categoryProductsErr);
                  // Don't fail the whole page if category products fetch fails
                  setCategoryProducts([]);
                }
              } else {
                // Clear category products if not viewing a product
                setCategoryProducts([]);
              }

              // AUTO-SKIP: If only one product, navigate directly to its detail page
              if (mappedProducts.length === 1 && !productId) {
                const singleProduct = mappedProducts[0];
                if (categoryId && subCategoryId) {
                  navigate(`/services/${categoryId}/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else if (categoryId) {
                  navigate(`/services/${categoryId}/${singleProduct._id}`, { replace: true });
                } else if (subCategoryId) {
                  navigate(`/services/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else {
                  navigate(`/services/${singleProduct._id}`, { replace: true });
                }
                return;
              }

              // If productId is provided, auto-select that product
              if (productId && mappedProducts.length > 0) {
                const productToSelect = mappedProducts.find(p => p._id === productId || p.id === productId);
                if (productToSelect) {
                  setSelectedProduct(productToSelect);
                }
              }
            }
          } catch (parseErr) {
            setProducts([]);
          }
        }
      } catch (err) {
        // Don't set error for subcategory-related issues - just log and continue
        setProducts([]);
        // Only set error for critical issues that prevent the page from working
        // Subcategory not found is not a critical error - user can still browse
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId, nestedSubCategoryId, productId]);

  // Fetch breadcrumb names for all levels in the URL
  useEffect(() => {
    const fetchBreadcrumbNames = async () => {
      try {
        // Fetch category name if categoryId exists
        if (categoryId) {
          // First check if we already have it from selectedProduct.category
          if (selectedProduct?.category && typeof selectedProduct.category === 'object' && selectedProduct.category.name) {
            setBreadcrumbCategoryName(selectedProduct.category.name);
          } else {
            // Fetch from API
            const categoryResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
              method: "GET",
              headers: { Accept: "application/json" },
            });
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json();
              setBreadcrumbCategoryName(categoryData.name || "");
            }
          }
        } else {
          setBreadcrumbCategoryName("");
        }

        // Fetch subcategory name if subCategoryId exists
        if (subCategoryId) {
          // First check if we already have it from selectedSubCategory
          if (selectedSubCategory?.name) {
            setBreadcrumbSubCategoryName(selectedSubCategory.name);
          } else {
            // Fetch from API
            const subCategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${subCategoryId}`, {
              method: "GET",
              headers: { Accept: "application/json" },
            });
            if (subCategoryResponse.ok) {
              const subCategoryData = await subCategoryResponse.json();
              setBreadcrumbSubCategoryName(subCategoryData.name || "");
            }
          }
        } else {
          setBreadcrumbSubCategoryName("");
        }

        // Fetch nested subcategory name if nestedSubCategoryId exists
        if (nestedSubCategoryId) {
          // Check if we already have it in availableNestedSubcategories
          const nestedSubCat = availableNestedSubcategories.find(ns => ns._id === nestedSubCategoryId);
          if (nestedSubCat) {
            setBreadcrumbNestedSubCategoryName(nestedSubCat.name);
          } else {
            // Fetch from API
            const nestedSubCategoryResponse = await fetch(`${API_BASE_URL}/subcategories/${nestedSubCategoryId}`, {
              method: "GET",
              headers: { Accept: "application/json" },
            });
            if (nestedSubCategoryResponse.ok) {
              const nestedSubCategoryData = await nestedSubCategoryResponse.json();
              setBreadcrumbNestedSubCategoryName(nestedSubCategoryData.name || "");
            }
          }
        } else {
          setBreadcrumbNestedSubCategoryName("");
        }
      } catch (err) {
        console.error("Error fetching breadcrumb names:", err);
      }
    };

    fetchBreadcrumbNames();
  }, [categoryId, subCategoryId, nestedSubCategoryId, selectedProduct, selectedSubCategory, availableNestedSubcategories]);


  // Handle product selection
  const handleProductSelect = (product: GlossProduct) => {
    setSelectedProduct(product);
    // Reset filters
    setSelectedPrintingOption("");
    setSelectedDeliverySpeed("");
    setSelectedTextureType("");

    // Auto-select smallest quantity value
    const orderQuantity = product.filters?.orderQuantity;
    let smallestQuantity = 1000; // Default fallback

    if (orderQuantity) {
      if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
        // Use smallest value from step-wise quantities
        smallestQuantity = Math.min(...orderQuantity.stepWiseQuantities);
      } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
        // Use smallest min value from ranges
        smallestQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r: any) => r.min || 1000));
      } else {
        // Use min from simple quantity config
        smallestQuantity = orderQuantity.min || 1000;
      }
    }

    setQuantity(smallestQuantity);
    setAppliedDiscount(null);

    // Initialize dynamic attributes with default values
    const initialAttributes: { [key: string]: string | number | boolean | File | null | any[] } = {};
    if (product.dynamicAttributes && Array.isArray(product.dynamicAttributes)) {
      product.dynamicAttributes.forEach((attr) => {
        if (attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const attributeValues = attr.customValues && attr.customValues.length > 0
              ? attr.customValues
              : attrType.attributeValues || [];

            // Set default value if available
            if (attrType.defaultValue && attributeValues.find((av: any) => av.value === attrType.defaultValue)) {
              initialAttributes[attrType._id] = attrType.defaultValue;
            } else if (attributeValues.length > 0) {
              // For checkbox, initialize as empty array, for others use first value
              if (attrType.inputStyle === 'CHECKBOX') {
                initialAttributes[attrType._id] = [];
              } else {
                initialAttributes[attrType._id] = attributeValues[0].value;
              }
            }
          }
        }
      });
    }
    setSelectedDynamicAttributes(initialAttributes);
    // Reset user-selected attributes so main product image is shown initially
    setUserSelectedAttributes(new Set());

    // Reset selected product options
    setSelectedProductOptions([]);

    // Initialize with first options if available
    if (product.filters?.printingOption && product.filters.printingOption.length > 0) {
      setSelectedPrintingOption(product.filters.printingOption[0]);
    }
    if (product.filters?.deliverySpeed && product.filters.deliverySpeed.length > 0) {
      setSelectedDeliverySpeed(product.filters.deliverySpeed[0]);
    }
    if (product.filters?.textureType && product.filters.textureType.length > 0) {
      setSelectedTextureType(product.filters.textureType[0]);
    }
  };

  // Handle nested subcategory filter switch (product variant selection)
  const handleNestedSubcategorySwitch = async (nestedSubcategoryId: string) => {
    try {
      setLoading(true);
      setSelectedNestedSubcategoryId(nestedSubcategoryId);

      // Find the selected nested subcategory to get its slug
      const selectedNestedSubcat = availableNestedSubcategories.find(ns => ns._id === nestedSubcategoryId);
      const nestedSubcategorySlug = selectedNestedSubcat?.slug || nestedSubcategoryId;

      // Fetch products for the selected nested subcategory
      const productsUrl = `${API_BASE_URL}/products/subcategory/${nestedSubcategoryId}`;
      const productsResponse = await fetch(productsUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (productsResponse.ok) {
        const productsText = await productsResponse.text();
        if (!productsText.startsWith("<!DOCTYPE") && !productsText.startsWith("<html")) {
          const productsData = JSON.parse(productsText);

          if (Array.isArray(productsData) && productsData.length > 0) {
            // Map products to GlossProduct format
            const mappedProducts: GlossProduct[] = productsData.map((product: any) => ({
              _id: product._id,
              id: product._id,
              name: product.name || '',
              description: product.description || '',
              descriptionArray: product.descriptionArray || (product.description ? [product.description] : []),
              filters: {
                printingOption: product.filters?.printingOption || [],
                orderQuantity: product.filters?.orderQuantity || { min: 1000, max: 72000, multiples: 1000 },
                deliverySpeed: product.filters?.deliverySpeed || [],
                textureType: product.filters?.textureType || undefined,
                filterPricesEnabled: product.filters?.filterPricesEnabled || false,
                printingOptionPrices: product.filters?.printingOptionPrices || [],
                deliverySpeedPrices: product.filters?.deliverySpeedPrices || [],
                textureTypePrices: product.filters?.textureTypePrices || [],
              },
              basePrice: product.basePrice || 0,
              image: product.image,
              subcategory: product.subcategory,
              options: product.options || [],
              dynamicAttributes: product.dynamicAttributes || [],
              quantityDiscounts: product.quantityDiscounts || [],
              maxFileSizeMB: product.maxFileSizeMB,
              minFileWidth: product.minFileWidth,
              maxFileWidth: product.maxFileWidth,
              minFileHeight: product.minFileHeight,
              maxFileHeight: product.maxFileHeight,
              blockCDRandJPG: product.blockCDRandJPG || false,
              additionalDesignCharge: product.additionalDesignCharge || 0,
              gstPercentage: product.gstPercentage || 0,
              showPriceIncludingGst: product.showPriceIncludingGst || false,
              instructions: product.instructions || "",
            }));

            setProducts(mappedProducts);

            // Auto-select first product
            const firstProduct = mappedProducts[0];
            setSelectedProduct(firstProduct);

            // Create product slug from product name (convert to lowercase and replace spaces with hyphens)
            const productSlug = firstProduct.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // Update URL to reflect the new selection using slugs
            if (categoryId && subCategoryId) {
              navigate(`/services/${categoryId}/${subCategoryId}/${nestedSubcategorySlug}/${productSlug}`, { replace: true });
            }

            // Reset filters for new product
            setSelectedPrintingOption("");
            setSelectedDeliverySpeed("");
            setSelectedTextureType("");
            setSelectedDynamicAttributes({});
            setUserSelectedAttributes(new Set());
            setSelectedProductOptions([]);

            // Initialize quantity to minimum
            const orderQuantity = firstProduct.filters?.orderQuantity;
            let minQuantity = 100;
            if (orderQuantity) {
              if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
                minQuantity = Math.min(...orderQuantity.stepWiseQuantities);
              } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
                minQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r: any) => r.min || 100));
              } else {
                minQuantity = orderQuantity.min || 100;
              }
            }
            setQuantity(minQuantity);
          }
        }
      }
    } catch (err) {
      console.error("Error switching nested subcategory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select product if productId is provided in URL, OR auto-redirect to first product if no productId
  useEffect(() => {
    if (products.length > 0 && !selectedProduct && !loading) {
      if (productId) {
        // If productId is in URL, select that product
        const productToSelect = products.find(p => p._id === productId || p.id === productId);
        if (productToSelect) {
          handleProductSelect(productToSelect);
        }
      } else if (nestedSubCategories.length === 0) {
        // If no productId in URL and no nested subcategories, auto-redirect to first product
        const firstProduct = products[0];
        if (firstProduct) {
          // Build the URL with the first product's ID
          let newUrl = '';
          if (categoryId && subCategoryId && nestedSubCategoryId) {
            newUrl = `/services/${categoryId}/${subCategoryId}/${nestedSubCategoryId}/${firstProduct._id}`;
          } else if (categoryId && subCategoryId) {
            newUrl = `/services/${categoryId}/${subCategoryId}/${firstProduct._id}`;
          } else if (categoryId) {
            newUrl = `/services/${categoryId}/${firstProduct._id}`;
          } else {
            newUrl = `/services/${firstProduct._id}`;
          }
          // Navigate to the first product's detail page
          navigate(newUrl, { replace: true });
        }
      }
    }
  }, [productId, products, selectedProduct, loading, nestedSubCategories.length, categoryId, subCategoryId, nestedSubCategoryId, navigate]);

  // Generate quantity options based on quantity type
  const generateQuantities = (product: GlossProduct) => {
    // PRIORITY 1: Check if active quantity constraints from rules exist
    if (activeQuantityConstraints) {
      const { min, max, step } = activeQuantityConstraints;
      const quantities: number[] = [];

      // If we have min, max, and step, generate the range
      if (min !== undefined && max !== undefined && step !== undefined && step > 0) {
        for (let q = min; q <= max; q += step) {
          quantities.push(q);
        }
        console.log('📊 Generated quantities from rule constraints:', quantities);
        return quantities;
      }

      // If we only have min and max but no step, generate with a reasonable default step
      if (min !== undefined && max !== undefined) {
        const defaultStep = Math.max(1, Math.floor((max - min) / 20)); // Generate ~20 options
        for (let q = min; q <= max; q += defaultStep) {
          quantities.push(q);
        }
        if (!quantities.includes(max)) {
          quantities.push(max);
        }
        console.log('📊 Generated quantities from rule constraints (default step):', quantities);
        return quantities;
      }
    }

    // PRIORITY 2: Check if any selected attribute has step/range quantity settings
    // Check PDP attributes first (if initialized)
    if (isInitialized && pdpAttributes.length > 0) {
      for (const attr of pdpAttributes) {
        if (!attr.isVisible) continue;

        const selectedValue = selectedDynamicAttributes[attr._id];
        if (!selectedValue) continue;

        // Check if this attribute has step/range quantity settings
        if ((attr as any).isStepQuantity && (attr as any).stepQuantities && (attr as any).stepQuantities.length > 0) {
          // Convert step quantities to numbers and return
          const stepQuantities = (attr as any).stepQuantities
            .map((step: any) => {
              const qty = typeof step === 'object' ? parseFloat(step.quantity) : parseFloat(step);
              return isNaN(qty) ? 0 : qty;
            })
            .filter((qty: number) => qty > 0)
            .sort((a: number, b: number) => a - b);

          if (stepQuantities.length > 0) {
            return stepQuantities;
          }
        }

        if ((attr as any).isRangeQuantity && (attr as any).rangeQuantities && (attr as any).rangeQuantities.length > 0) {
          // Generate quantities from range quantities
          const quantities: number[] = [];
          (attr as any).rangeQuantities.forEach((range: any) => {
            const min = typeof range === 'object' ? parseFloat(range.min) : 0;
            const max = typeof range === 'object' && range.max ? parseFloat(range.max) : null;

            if (min > 0) {
              if (!quantities.includes(min)) {
                quantities.push(min);
              }
              // If there's a max, add some intermediate values
              if (max && max > min) {
                const step = Math.max(1, Math.floor((max - min) / 5));
                for (let q = min + step; q < max; q += step) {
                  if (!quantities.includes(q)) {
                    quantities.push(q);
                  }
                }
                // Add max if it's reasonable
                if (max <= min * 10) {
                  if (!quantities.includes(max)) {
                    quantities.push(max);
                  }
                }
              }
            }
          });

          if (quantities.length > 0) {
            return quantities.sort((a, b) => a - b);
          }
        }
      }
    }

    // Fallback to product attributes if PDP not available
    if (selectedProduct && selectedProduct.dynamicAttributes) {
      for (const attr of selectedProduct.dynamicAttributes) {
        if (!attr.isEnabled) continue;

        const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
        if (!attrType) continue;

        const selectedValue = selectedDynamicAttributes[attrType._id];
        if (!selectedValue) continue;

        // Check if this attribute has step/range quantity settings
        if ((attrType as any).isStepQuantity && (attrType as any).stepQuantities && (attrType as any).stepQuantities.length > 0) {
          // Convert step quantities to numbers and return
          const stepQuantities = (attrType as any).stepQuantities
            .map((step: any) => {
              const qty = typeof step === 'object' ? parseFloat(step.quantity) : parseFloat(step);
              return isNaN(qty) ? 0 : qty;
            })
            .filter((qty: number) => qty > 0)
            .sort((a: number, b: number) => a - b);

          if (stepQuantities.length > 0) {
            return stepQuantities;
          }
        }

        if ((attrType as any).isRangeQuantity && (attrType as any).rangeQuantities && (attrType as any).rangeQuantities.length > 0) {
          // Generate quantities from range quantities
          const quantities: number[] = [];
          (attrType as any).rangeQuantities.forEach((range: any) => {
            const min = typeof range === 'object' ? parseFloat(range.min) : 0;
            const max = typeof range === 'object' && range.max ? parseFloat(range.max) : null;

            if (min > 0) {
              if (!quantities.includes(min)) {
                quantities.push(min);
              }
              // If there's a max, add some intermediate values
              if (max && max > min) {
                const step = Math.max(1, Math.floor((max - min) / 5));
                for (let q = min + step; q < max; q += step) {
                  if (!quantities.includes(q)) {
                    quantities.push(q);
                  }
                }
                // Add max if it's reasonable
                if (max <= min * 10) {
                  if (!quantities.includes(max)) {
                    quantities.push(max);
                  }
                }
              }
            }
          });

          if (quantities.length > 0) {
            return quantities.sort((a, b) => a - b);
          }
        }
      }
    }

    // Fallback to product's quantity configuration
    const orderQuantity = product.filters.orderQuantity;
    const quantityType = orderQuantity.quantityType || "SIMPLE";

    if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
      // Return specific step-wise quantities
      return orderQuantity.stepWiseQuantities.filter(qty => qty > 0).sort((a, b) => a - b);
    } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
      // For range-wise, generate quantities from ranges
      // Use the min of each range as the selectable quantity, or generate common quantities within ranges
      const quantities: number[] = [];
      orderQuantity.rangeWiseQuantities.forEach(range => {
        if (range.min > 0) {
          // Add the min quantity of each range
          if (!quantities.includes(range.min)) {
            quantities.push(range.min);
          }
          // If there's a max, add some intermediate values
          if (range.max && range.max > range.min) {
            const step = Math.max(1, Math.floor((range.max - range.min) / 5));
            for (let q = range.min + step; q < range.max; q += step) {
              if (!quantities.includes(q)) {
                quantities.push(q);
              }
            }
            // Add max if it's reasonable
            if (range.max <= range.min * 10) {
              if (!quantities.includes(range.max)) {
                quantities.push(range.max);
              }
            }
          }
        }
      });
      return quantities.sort((a, b) => a - b);
    } else {
      // Default: Simple min/max/multiples - generate ALL quantities
      // Virtual scrolling in Select component handles performance
      const { min, max, multiples } = orderQuantity;
      const quantities: number[] = [];

      for (let q = min; q <= max; q += multiples) {
        quantities.push(q);
      }

      return quantities;
    }
  };


  // Scroll page to top on component mount/navigation
  React.useEffect(() => {
    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Immediate scroll to top
    window.scrollTo(0, 0);
    // Also scroll after a short delay to override any other effects
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Calculate price with all factors
  React.useEffect(() => {
    if (selectedProduct) {
      let basePrice = selectedProduct.basePrice;

      // Apply range-wise price multiplier if applicable (applied first, before other multipliers)
      if (selectedProduct.filters?.orderQuantity?.quantityType === "RANGE_WISE" &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities.length > 0) {
        const applicableRange = selectedProduct.filters.orderQuantity.rangeWiseQuantities.find((range: any) => {
          return quantity >= range.min && (range.max === null || range.max === undefined || quantity <= range.max);
        });
        if (applicableRange && applicableRange.priceMultiplier !== undefined && applicableRange.priceMultiplier !== 1.0) {
          basePrice = basePrice * applicableRange.priceMultiplier;
        }
      }

      // Track price impacts for breakdown display
      let printingOptionImpact = 0;
      let deliverySpeedImpact = 0;
      let textureTypeImpact = 0;
      const dynamicAttributesChargesList: Array<{ name: string; label: string; charge: number }> = [];

      // Check if filter prices are enabled
      const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;

      if (filterPricesEnabled) {
        // Use filter prices from filters object
        if (selectedPrintingOption && selectedProduct.filters?.printingOptionPrices) {
          const priceData = selectedProduct.filters.printingOptionPrices.find((p: any) => p.name === selectedPrintingOption);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            printingOptionImpact = impactPerUnit * quantity;
          }
        }

        if (selectedDeliverySpeed && selectedProduct.filters?.deliverySpeedPrices) {
          const priceData = selectedProduct.filters.deliverySpeedPrices.find((p: any) => p.name === selectedDeliverySpeed);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            deliverySpeedImpact = impactPerUnit * quantity;
          }
        }

        if (selectedTextureType && selectedProduct.filters?.textureTypePrices) {
          const priceData = selectedProduct.filters.textureTypePrices.find((p: any) => p.name === selectedTextureType);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(priceData.priceAdd) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            textureTypeImpact = impactPerUnit * quantity;
          }
        }
      } else {
        // Apply options-based multipliers (legacy system) - only for filters if they match option names
        if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
          selectedProduct.options.forEach((option: any) => {
            if (option.name === selectedPrintingOption) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              // priceAdd is per 1000 units, so calculate impact per unit
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                printingOptionImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                // Handle negative priceAdd as multiplier
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                printingOptionImpact = (basePrice - oldPrice) * quantity;
              }
            } else if (option.name === selectedDeliverySpeed) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                deliverySpeedImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                deliverySpeedImpact = (basePrice - oldPrice) * quantity;
              }
            } else if (option.name === selectedTextureType) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                textureTypeImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                textureTypeImpact = (basePrice - oldPrice) * quantity;
              }
            }
          });
        }
      }
      // Apply legacy hardcoded multipliers if options don't have priceAdd and filter prices are not enabled
      if (!filterPricesEnabled && (!selectedProduct.options || selectedProduct.options.length === 0)) {
        if (selectedPrintingOption === 'Both Sides') {
          const oldPrice = basePrice;
          basePrice *= 1.2;
          printingOptionImpact = (basePrice - oldPrice) * quantity;
        }
        if (selectedDeliverySpeed === 'Express') {
          const oldPrice = basePrice;
          basePrice *= 1.3;
          deliverySpeedImpact = (basePrice - oldPrice) * quantity;
        }
        if (selectedTextureType) {
          const oldPrice = basePrice;
          basePrice *= 1.15;
          textureTypeImpact = (basePrice - oldPrice) * quantity;
        }
      }

      // Apply selected product options (checkboxes) - these are separate from filters and apply regardless of filterPricesEnabled
      let productOptionsImpact = 0;
      if (selectedProduct.options && Array.isArray(selectedProduct.options) && selectedProductOptions.length > 0) {
        selectedProductOptions.forEach((optionName: string) => {
          const option = selectedProduct.options.find((opt: any) => opt.name === optionName);
          if (option && option.priceAdd !== undefined) {
            const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(option.priceAdd) || 0;
            if (priceAdd !== 0) {
              const impactPerUnit = priceAdd / 1000;
              basePrice += impactPerUnit;
              productOptionsImpact += impactPerUnit * quantity;
            }
          }
        });
      }
      setProductOptionsCharge(productOptionsImpact);

      // Apply dynamic attribute multipliers and track impact
      if (selectedProduct.dynamicAttributes && Array.isArray(selectedProduct.dynamicAttributes)) {
        selectedProduct.dynamicAttributes.forEach((attr) => {
          if (attr.isEnabled) {
            const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
            if (attrType) {
              const selectedValue = selectedDynamicAttributes[attrType._id];
              if (selectedValue !== undefined && selectedValue !== null && selectedValue !== "") {
                const attributeValues = attr.customValues && attr.customValues.length > 0
                  ? attr.customValues
                  : attrType.attributeValues || [];

                // Handle checkbox (multiple values) - apply all price impacts
                if (Array.isArray(selectedValue)) {
                  const selectedLabels: string[] = [];
                  let totalCharge = 0;
                  selectedValue.forEach((val) => {
                    const attrValue = attributeValues.find((av: any) => av.value === val);
                    if (attrValue) {
                      // Check if description contains priceImpact (new format with option usage)
                      let priceAdd = 0;
                      if (attrValue.description) {
                        const priceImpactMatch = attrValue.description.match(/Price Impact: ₹([\d.]+)/);
                        if (priceImpactMatch) {
                          priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                        }
                      }

                      // Use priceAdd if available (from option usage), otherwise fall back to priceMultiplier
                      if (priceAdd > 0) {
                        totalCharge += priceAdd * quantity;
                        if (attrValue.label) selectedLabels.push(attrValue.label);
                      } else if (attrValue.priceMultiplier && attrValue.priceMultiplier !== 1) {
                        // Fallback to old priceMultiplier logic
                        const oldPrice = basePrice;
                        basePrice = basePrice * attrValue.priceMultiplier;
                        const charge = (basePrice - oldPrice) * quantity;
                        totalCharge += charge;
                        if (attrValue.label) selectedLabels.push(attrValue.label);
                      }
                    }
                  });
                  if (totalCharge !== 0) {
                    dynamicAttributesChargesList.push({
                      name: attrType.attributeName,
                      label: selectedLabels.join(", ") || "Selected",
                      charge: totalCharge
                    });
                  }
                } else {
                  // Handle single value attributes
                  const attrValue = attributeValues.find((av: any) => av.value === selectedValue);
                  if (attrValue) {
                    // Check if description contains priceImpact (new format with option usage)
                    let priceAdd = 0;
                    if (attrValue.description) {
                      const priceImpactMatch = attrValue.description.match(/Price Impact: ₹([\d.]+)/);
                      if (priceImpactMatch) {
                        priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                      }
                    }

                    // Use priceAdd if available (from option usage), otherwise fall back to priceMultiplier
                    if (priceAdd > 0) {
                      const charge = priceAdd * quantity;
                      if (charge !== 0) {
                        dynamicAttributesChargesList.push({
                          name: attrType.attributeName,
                          label: attrValue.label || String(selectedValue || ''),
                          charge: charge
                        });
                      }
                    } else if (attrValue.priceMultiplier && attrValue.priceMultiplier !== 1) {
                      // Fallback to old priceMultiplier logic
                      const oldPrice = basePrice;
                      basePrice = basePrice * attrValue.priceMultiplier;
                      const charge = (basePrice - oldPrice) * quantity;
                      if (charge !== 0) {
                        dynamicAttributesChargesList.push({
                          name: attrType.attributeName,
                          label: attrValue.label || String(selectedValue || ''),
                          charge: charge
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }

      // Calculate base subtotal before discount
      const baseSubtotal = basePrice * quantity;

      // Apply quantity-based discounts
      let discountMultiplier = 1.0;
      let currentDiscount = null;
      if (selectedProduct.quantityDiscounts && Array.isArray(selectedProduct.quantityDiscounts)) {
        // Find the applicable discount tier for the selected quantity
        const applicableDiscount = selectedProduct.quantityDiscounts.find((discount: any) => {
          const minQty = discount.minQuantity || 0;
          const maxQty = discount.maxQuantity;
          return quantity >= minQty && (maxQty === null || maxQty === undefined || quantity <= maxQty);
        });

        if (applicableDiscount) {
          // Use priceMultiplier if available, otherwise calculate from discountPercentage
          if (applicableDiscount.priceMultiplier) {
            discountMultiplier = applicableDiscount.priceMultiplier;
          } else if (applicableDiscount.discountPercentage) {
            discountMultiplier = (100 - applicableDiscount.discountPercentage) / 100;
          }
          currentDiscount = applicableDiscount.discountPercentage || 0;
        }
      }

      // Calculate total of all attribute charges (priceAdd charges)
      const totalAttributeCharges = dynamicAttributesChargesList.reduce((sum, charge) => sum + charge.charge, 0);

      // Store base subtotal before discount for display (includes base price only, charges shown separately)
      setBaseSubtotalBeforeDiscount(baseSubtotal);

      // Apply discount multiplier to subtotal
      const calculatedSubtotal = baseSubtotal * discountMultiplier;

      // Add attribute charges to subtotal (these are not discounted)
      const subtotalWithCharges = calculatedSubtotal + totalAttributeCharges;

      setSubtotal(subtotalWithCharges);
      setAppliedDiscount(currentDiscount);

      // Store individual charges for order summary
      setPrintingOptionCharge(printingOptionImpact);
      setDeliverySpeedCharge(deliverySpeedImpact);
      setTextureTypeCharge(textureTypeImpact);
      setDynamicAttributesCharges(dynamicAttributesChargesList);

      // Add additional design charge if applicable
      const designCharge = selectedProduct.additionalDesignCharge || 0;
      setAdditionalDesignCharge(designCharge);

      // Calculate GST on (subtotal + design charge)
      const gstPercent = selectedProduct.gstPercentage || 0;
      const calculatedGst = (subtotalWithCharges + designCharge) * (gstPercent / 100);
      setGstAmount(calculatedGst);

      // Store price excluding GST (for product page display)
      // GST will only be added at checkout
      const priceExcludingGst = subtotalWithCharges + designCharge;
      setPrice(priceExcludingGst);

      // Calculate and store per unit price excluding GST (base price + all per-unit charges, after discount)
      const perUnitExcludingGst = quantity > 0 ? priceExcludingGst / quantity : basePrice;
      setPerUnitPriceExcludingGst(perUnitExcludingGst);
    }
  }, [selectedProduct, selectedPrintingOption, selectedDeliverySpeed, selectedTextureType, quantity, selectedDynamicAttributes, selectedProductOptions]);

  // Update quantity when attribute with step/range quantity is selected
  React.useEffect(() => {
    if (!selectedProduct) return;

    const availableQuantities = generateQuantities(selectedProduct);
    if (availableQuantities.length > 0 && !availableQuantities.includes(quantity)) {
      // Current quantity is not in the allowed list, update to the first (minimum) available
      setQuantity(availableQuantities[0]);
    }
  }, [selectedDynamicAttributes, selectedProduct]);

  // Auto-scroll deck slider to center the active card (horizontal only)
  React.useEffect(() => {
    if (!selectedProduct?._id) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const deckContainer = document.getElementById('deck-scroll-container');
      const activeCard = document.getElementById(`deck-card-${selectedProduct._id}`);

      if (deckContainer && activeCard) {
        // Calculate scroll position to center the active card horizontally
        const containerWidth = deckContainer.offsetWidth;
        const cardLeft = activeCard.offsetLeft;
        const cardWidth = activeCard.offsetWidth;
        const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

        deckContainer.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedProduct?._id]);

  // Get preview classes based on selected product
  const getPreviewClasses = (excludeSize: boolean = false) => {
    const classes: string[] = ['preview-container'];

    if (!selectedProduct) {
      // Default gloss effect when no product selected
      classes.push('gloss');
      return classes.join(' ');
    }

    const productName = selectedProduct.name?.toLowerCase() || '';
    const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;

    // Determine effect based on product name and filters
    if (hasTextureType || selectedTextureType) {
      // UV Coating + Texture Effect
      classes.push('uv', 'texture');

      // Add specific texture number class if texture is selected
      if (selectedTextureType) {
        const textureMatch = selectedTextureType.match(/No\.(\d+)/);
        if (textureMatch) {
          const textureNum = textureMatch[1];
          classes.push(`texture-${textureNum}`);
        }
      } else if (hasTextureType) {
        // Default to texture-1 if product has texture but none selected
        classes.push('texture-1');
      }
    } else if (productName.includes('lamination')) {
      // Lamination
      classes.push('laminated');
    } else if (productName.includes('uv') && !productName.includes('texture')) {
      // UV Coating only
      classes.push('uv');
    } else if (productName.includes('without') || productName.includes('basic')) {
      // No coating (matte look)
      classes.push('none');
    } else {
      // Default gloss effect
      classes.push('gloss');
    }

    // Add size class for small size products (exclude for modal)
    if (!excludeSize && productName.includes('small')) {
      classes.push('small');
    }

    return classes.join(' ');
  };

  // Parse instructions to extract validation rules
  const parseInstructions = (instructions: string) => {
    const rules: { maxSizeMB?: number; fileWidth?: number; fileHeight?: number; blockCDRandJPG?: boolean; allowedFormats?: string[] } = {};

    if (!instructions) return rules;

    // Extract max file size (e.g., "Maximum file size: 10 MB" or "max file size 10 mb")
    const maxSizeMatch = instructions.match(/max(?:imum)?\s+file\s+size[:\s]+(\d+)\s*mb/i);
    if (maxSizeMatch) {
      rules.maxSizeMB = parseInt(maxSizeMatch[1]);
    }

    // Extract dimensions (e.g., "3000 × 2000 pixels" or "3000x2000")
    const dimensionMatch = instructions.match(/(\d+)\s*[×x]\s*(\d+)\s*pixels?/i);
    if (dimensionMatch) {
      rules.fileWidth = parseInt(dimensionMatch[1]);
      rules.fileHeight = parseInt(dimensionMatch[2]);
    }

    // Check for CDR/JPG blocking
    if (/cdr|jpg|jpeg.*not\s+(?:accepted|allowed|permitted)/i.test(instructions)) {
      rules.blockCDRandJPG = true;
    }

    // Extract allowed formats (e.g., "PNG or PDF format only")
    const formatMatch = instructions.match(/(?:format|file\s+type|extension).*?only[:\s]+([^.]+)/i);
    if (formatMatch) {
      const formats = formatMatch[1].split(/[,\s]+or\s+/i).map(f => f.trim().toLowerCase());
      rules.allowedFormats = formats;
    }

    return rules;
  };

  // Handle design file upload with product-specific validation
  const handleDesignFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      e.target.value = ""; // Clear the input
      return;
    }

    // Parse instructions to get validation rules
    const instructionRules = selectedProduct?.instructions ? parseInstructions(selectedProduct.instructions) : {};

    // Validate file size - prioritize instructions, then product settings, then default
    const maxSizeMB = instructionRules.maxSizeMB || selectedProduct?.maxFileSizeMB || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size must be less than ${maxSizeMB} MB as specified in the instructions`);
      e.target.value = ""; // Clear the input
      return;
    }

    // Validate file extension if CDR and JPG are blocked - check instructions first
    const blockCDRandJPG = instructionRules.blockCDRandJPG !== undefined
      ? instructionRules.blockCDRandJPG
      : selectedProduct?.blockCDRandJPG || false;

    if (blockCDRandJPG) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      if (extension === 'cdr' || extension === 'jpg' || extension === 'jpeg') {
        alert("CDR and JPG files are not accepted for this product as per instructions. Please use PNG, PDF, or other formats.");
        e.target.value = ""; // Clear the input
        return;
      }
    }

    // Validate allowed formats from instructions
    if (instructionRules.allowedFormats && instructionRules.allowedFormats.length > 0) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      const isAllowed = instructionRules.allowedFormats.some(format =>
        extension.includes(format.toLowerCase())
      );
      if (!isAllowed) {
        alert(`Only ${instructionRules.allowedFormats.join(', ').toUpperCase()} files are accepted as per instructions.`);
        e.target.value = ""; // Clear the input
        return;
      }
    }

    // Validate image dimensions - check min/max width and height
    const minWidth = selectedProduct?.minFileWidth;
    const maxWidth = selectedProduct?.maxFileWidth;
    const minHeight = selectedProduct?.minFileHeight;
    const maxHeight = selectedProduct?.maxFileHeight;

    // Check if any dimension constraints are set
    if (minWidth || maxWidth || minHeight || maxHeight) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let validationErrors: string[] = [];

        // Validate width
        if (minWidth && img.width < minWidth) {
          validationErrors.push(`Image width must be at least ${minWidth} pixels. Current width: ${img.width} pixels.`);
        }
        if (maxWidth && img.width > maxWidth) {
          validationErrors.push(`Image width must be at most ${maxWidth} pixels. Current width: ${img.width} pixels.`);
        }

        // Validate height
        if (minHeight && img.height < minHeight) {
          validationErrors.push(`Image height must be at least ${minHeight} pixels. Current height: ${img.height} pixels.`);
        }
        if (maxHeight && img.height > maxHeight) {
          validationErrors.push(`Image height must be at most ${maxHeight} pixels. Current height: ${img.height} pixels.`);
        }

        if (validationErrors.length > 0) {
          alert(validationErrors.join("\n"));
          e.target.value = ""; // Clear the input
          return;
        }

        // Dimensions are valid, proceed with file upload
        if (side === "front") {
          setFrontDesignFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setFrontDesignPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setBackDesignFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setBackDesignPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert("Failed to load image. Please check the file format.");
        e.target.value = ""; // Clear the input
      };

      img.src = objectUrl;
    } else {
      // No dimension validation needed, proceed directly
      if (side === "front") {
        setFrontDesignFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFrontDesignPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setBackDesignFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setBackDesignPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Get auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Helper function to find nearest branch and calculate delivery estimate
  const calculateDeliveryFromNearestBranch = async (userLat: number, userLon: number, locationAddress: string) => {
    // Sample branches - in production, this should come from an API
    // Format: { name, address, latitude, longitude, pincode }
    const branches = [
      { name: 'Main Branch', address: '1-A, One Colony, One Street, One, India', latitude: 28.6139, longitude: 77.2090, pincode: '110001' }, // Delhi
      { name: 'Branch 2', address: '2-B, Two Colony, Two Street, Two, India', latitude: 19.0760, longitude: 72.8777, pincode: '400001' }, // Mumbai
      { name: 'Branch 3', address: '3-C, Three Colony, Three Street, Three, India', latitude: 12.9716, longitude: 77.5946, pincode: '560001' }, // Bangalore
    ];

    // Find nearest branch
    let nearestBranch = branches[0];
    let minDistance = calculateDistance(userLat, userLon, branches[0].latitude, branches[0].longitude);

    for (const branch of branches) {
      const distance = calculateDistance(userLat, userLon, branch.latitude, branch.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }

    // Calculate delivery days based on distance
    // Base: 2 days for processing + 1 day per 500km (minimum 1 day)
    const baseDays = 2;
    const transitDays = Math.max(1, Math.ceil(minDistance / 500));
    const totalDays = baseDays + transitDays;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + totalDays);

    return {
      deliveryDate: deliveryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      locationSource: locationAddress ? `[Location: ${locationAddress}]` : `[Location: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}]`,
      nearestBranch: nearestBranch.name
    };
  };

  // Helper function to get pincode coordinates (using backend proxy to avoid CORS)
  const getPincodeCoordinates = async (pincode: string): Promise<{ lat: number; lon: number; address: string } | null> => {
    try {
      // Use backend proxy to avoid CORS issues
      const BASE_URL = API_BASE_URL;
      const response = await fetch(
        `${BASE_URL}/geocoding/search?postalcode=${pincode}&country=India&limit=1`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            address: result.display_name || `Pincode: ${pincode}`
          };
        }
      }
    } catch (err) {
    }
    return null;
  };

  // Get user location for delivery estimate
  useEffect(() => {
    const fetchDeliveryEstimate = async () => {
      if (!selectedProduct) return;

      try {
        // Try to get geolocation first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

              // Try to reverse geocode to get address (using backend proxy to avoid CORS)
              let locationAddress = '';
              try {
                const BASE_URL = API_BASE_URL;
                const response = await fetch(
                  `${BASE_URL}/geocoding/reverse?lat=${latitude}&lon=${longitude}&addressdetails=1`,
                  {
                    headers: {
                      'Accept': 'application/json'
                    }
                  }
                );
                if (response.ok) {
                  const data = await response.json();
                  if (data.address) {
                    const addr = data.address;
                    // Format address: house number, street, city, state, country
                    const parts = [];
                    if (addr.house_number) parts.push(addr.house_number);
                    if (addr.road) parts.push(addr.road);
                    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
                    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
                    if (addr.state) parts.push(addr.state);
                    if (addr.country) parts.push(addr.country);
                    locationAddress = parts.join(', ');
                  }
                }
              } catch (geocodeErr) {
              }

              // Calculate delivery from nearest branch
              const estimate = await calculateDeliveryFromNearestBranch(latitude, longitude, locationAddress);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(estimate.locationSource);
            },
            async () => {
              // If geolocation fails, try to get pincode from localStorage
              const savedPincode = localStorage.getItem('userPincode');
              if (savedPincode && savedPincode.length === 6) {
                const coords = await getPincodeCoordinates(savedPincode);
                if (coords) {
                  const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
                  setEstimatedDeliveryDate(estimate.deliveryDate);
                  setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
                } else {
                  // Fallback: use default estimate with pincode
                  const days = 5;
                  const deliveryDate = new Date();
                  deliveryDate.setDate(deliveryDate.getDate() + days);
                  setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }));
                  setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
                }
              } else {
                // Default estimate
                const days = 5;
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + days);
                setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }));
                setDeliveryLocationSource('Default estimate');
              }
            }
          );
        } else {
          // Fallback: try pincode from localStorage
          const savedPincode = localStorage.getItem('userPincode');
          if (savedPincode && savedPincode.length === 6) {
            const coords = await getPincodeCoordinates(savedPincode);
            if (coords) {
              const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
            } else {
              // Fallback: use default estimate with pincode
              const days = 5;
              const deliveryDate = new Date();
              deliveryDate.setDate(deliveryDate.getDate() + days);
              setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }));
              setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
            }
          } else {
            // Default estimate
            const days = 5;
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + days);
            setEstimatedDeliveryDate(deliveryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
            setDeliveryLocationSource('Default estimate');
          }
        }
      } catch (err) {
      }
    };

    fetchDeliveryEstimate();
  }, [selectedProduct]);

  // Get user location and fill address
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setPaymentError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    setPaymentError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding API to get address (using backend proxy to avoid CORS)
      try {
        const BASE_URL = API_BASE_URL;
        const response = await fetch(
          `${BASE_URL}/geocoding/reverse?lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }

        const data = await response.json();
        const addressData = data.address || {};

        // Build address string
        const addressParts = [];
        if (addressData.house_number) addressParts.push(addressData.house_number);
        if (addressData.road) addressParts.push(addressData.road);
        if (addressData.neighbourhood) addressParts.push(addressData.neighbourhood);
        if (addressData.suburb) addressParts.push(addressData.suburb);
        if (addressData.city || addressData.town || addressData.village) {
          addressParts.push(addressData.city || addressData.town || addressData.village);
        }
        if (addressData.state) addressParts.push(addressData.state);
        if (addressData.postcode) {
          setPincode(addressData.postcode);
        }

        const fullAddress = addressParts.join(', ');
        if (fullAddress) {
          setAddress(fullAddress);
          setDeliveryLocationSource("location");
        } else {
          setPaymentError("Could not determine address from location. Please enter manually.");
        }
      } catch (err) {
        setPaymentError("Could not fetch address from location. Please enter manually.");
      }
    } catch (error: any) {
      if (error.code === 1) {
        setPaymentError("Location access denied. Please enable location permissions or enter address manually.");
      } else if (error.code === 2) {
        setPaymentError("Location unavailable. Please enter address manually.");
      } else if (error.code === 3) {
        setPaymentError("Location request timeout. Please try again or enter address manually.");
      } else {
        setPaymentError("Failed to get location. Please enter address manually.");
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle place order with payment
  const firstErrorField = useRef<HTMLElement | null>(null);

  const handlePlaceOrder = async () => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      setValidationError("Please login to place an order. Redirecting to login page...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    // Reset error field reference
    firstErrorField.current = null;

    // Validate product and design fields first
    const validationErrors: string[] = [];
    if (!selectedProduct) {
      validationErrors.push('Please select a product');
      if (!firstErrorField.current) {
        firstErrorField.current = document.querySelector('[data-product-select]') as HTMLElement;
      }
    }
    if (!frontDesignFile) {
      validationErrors.push('Please upload a reference image');
      if (!firstErrorField.current) {
        const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLElement;
        if (fileInput) {
          firstErrorField.current = fileInput;
        } else {
          // Find the upload section
          const uploadSection = document.querySelector('[data-upload-section]') as HTMLElement;
          if (uploadSection) firstErrorField.current = uploadSection;
        }
      }
    }
    if (!selectedPrintingOption) {
      validationErrors.push('Please select a printing option');
      if (!firstErrorField.current) {
        const printingOptionField = document.querySelector('[data-field="printingOption"]') as HTMLElement;
        if (printingOptionField) {
          firstErrorField.current = printingOptionField;
        } else {
          // Find the printing option section
          const section = document.querySelector('[data-section="printingOption"]') as HTMLElement;
          if (section) firstErrorField.current = section;
        }
      }
    }
    if (!selectedDeliverySpeed) {
      validationErrors.push('Please select a delivery speed');
      if (!firstErrorField.current) {
        const deliverySpeedField = document.querySelector('[data-field="deliverySpeed"]') as HTMLElement;
        if (deliverySpeedField) {
          firstErrorField.current = deliverySpeedField;
        } else {
          // Find the delivery speed section
          const section = document.querySelector('[data-section="deliverySpeed"]') as HTMLElement;
          if (section) firstErrorField.current = section;
        }
      }
    }

    // Validate required dynamic attributes
    if (selectedProduct?.dynamicAttributes) {
      selectedProduct.dynamicAttributes.forEach((attr) => {
        if (attr.isRequired && attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const value = selectedDynamicAttributes[attrType._id];
            if (!value || (Array.isArray(value) && value.length === 0)) {
              validationErrors.push(`${attrType.attributeName} is required`);
              if (!firstErrorField.current) {
                // Find the input element within the data-attribute wrapper
                const wrapper = document.querySelector(`[data-attribute="${attrType._id}"]`) as HTMLElement;
                if (wrapper) {
                  const input = wrapper.querySelector('input, select, button') as HTMLElement;
                  firstErrorField.current = input || wrapper;
                } else {
                  // Try to find by attribute name
                  const section = document.querySelector(`[data-attribute-name="${attrType.attributeName}"]`) as HTMLElement;
                  if (section) firstErrorField.current = section;
                }
              }
            }

            // Validate image uploads if option requires images
            if (value && (attrType.inputStyle === 'DROPDOWN' || attrType.inputStyle === 'RADIO')) {
              const attributeValues = attr.customValues && attr.customValues.length > 0
                ? attr.customValues
                : attrType.attributeValues || [];

              const selectedOption = Array.isArray(value)
                ? attributeValues.find((av: any) => value.includes(av.value))
                : attributeValues.find((av: any) => av.value === value);

              if (selectedOption && selectedOption.description) {
                // Parse numberOfImagesRequired from description
                const imagesRequiredMatch = selectedOption.description.match(/Images Required: (\d+)/);
                const numberOfImagesRequired = imagesRequiredMatch ? parseInt(imagesRequiredMatch[1]) : 0;

                if (numberOfImagesRequired > 0) {
                  const imagesKey = `${attrType._id}_images`;
                  const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                    ? (selectedDynamicAttributes[imagesKey] as File[])
                    : [];

                  if (uploadedImages.length < numberOfImagesRequired) {
                    validationErrors.push(`${attrType.attributeName}: Please upload ${numberOfImagesRequired} image(s) for ${selectedOption.label}`);
                    if (!firstErrorField.current) {
                      const wrapper = document.querySelector(`[data-attribute="${attrType._id}"]`) as HTMLElement;
                      if (wrapper) {
                        const imageSection = wrapper.querySelector('.bg-gray-50') as HTMLElement;
                        firstErrorField.current = imageSection || wrapper;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    if (validationErrors.length > 0) {
      // Set validation error message with clear formatting
      setValidationError(validationErrors.join('\n'));

      // Scroll to first error field with better handling
      setTimeout(() => {
        if (firstErrorField.current) {
          // Scroll to element with smooth behavior
          firstErrorField.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Try to focus if it's an input element
          setTimeout(() => {
            if (firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement) {
              firstErrorField.current.focus();
            } else {
              // Try to find and focus input/select within the wrapper
              const input = firstErrorField.current.querySelector('input, select, button') as HTMLElement;
              if (input && (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLButtonElement)) {
                input.focus();
              }
            }
          }, 300);

          // Highlight the field with red border
          const elementToHighlight = firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement
            ? firstErrorField.current
            : firstErrorField.current.querySelector('input, select, button') as HTMLElement || firstErrorField.current;

          if (elementToHighlight) {
            // Add error styling
            elementToHighlight.style.borderColor = '#ef4444';
            elementToHighlight.style.borderWidth = '2px';
            elementToHighlight.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

            // Remove error styling after 3 seconds
            setTimeout(() => {
              elementToHighlight.style.borderColor = '';
              elementToHighlight.style.borderWidth = '';
              elementToHighlight.style.boxShadow = '';
            }, 3000);
          }
        } else {
          // If no specific field found, scroll to validation error message
          setTimeout(() => {
            const errorElement = document.querySelector('[role="alert"]') as HTMLElement;
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }, 100);

      return;
    }

    // Clear any previous validation errors
    setValidationError(null);

    // All product/design validations passed - show payment modal with customer information form
    setShowPaymentModal(true);
    setPaymentError(null);
  };


  // Process payment and create order
  const handlePaymentAndOrder = async () => {
    // Validate product and design first
    if (!selectedProduct) {
      setPaymentError("Please select a product.");
      return;
    }
    if (!frontDesignFile || !frontDesignPreview) {
      setPaymentError("Please upload a reference image.");
      return;
    }
    if (!selectedPrintingOption) {
      setPaymentError("Please select a printing option.");
      return;
    }
    if (!selectedDeliverySpeed) {
      setPaymentError("Please select a delivery speed.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setPaymentError("Please enter a valid quantity (must be greater than 0).");
      return;
    }
    const finalTotalPrice = price + gstAmount;
    if (!finalTotalPrice || finalTotalPrice <= 0) {
      setPaymentError("Invalid order total. Please refresh and try again.");
      return;
    }

    // Validate required dynamic attributes
    if (selectedProduct?.dynamicAttributes) {
      for (const attr of selectedProduct.dynamicAttributes) {
        if (attr.isRequired && attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const value = selectedDynamicAttributes[attrType._id];
            if (!value || (Array.isArray(value) && value.length === 0)) {
              setPaymentError(`${attrType.attributeName} is required.`);
              return;
            }
          }
        }
      }
    }

    // Validate delivery information
    if (!customerName || customerName.trim().length === 0) {
      setPaymentError("Please enter your full name.");
      return;
    }
    if (!customerEmail || customerEmail.trim().length === 0) {
      setPaymentError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setPaymentError("Please enter a valid email address.");
      return;
    }
    if (!pincode || pincode.trim().length === 0) {
      setPaymentError("Please enter your pincode.");
      return;
    }
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPaymentError("Please enter a valid 6-digit pincode.");
      return;
    }
    if (!address || address.trim().length === 0) {
      setPaymentError("Please enter your complete address.");
      return;
    }
    if (!mobileNumber || mobileNumber.trim().length === 0) {
      setPaymentError("Please enter your mobile number.");
      return;
    }
    if (mobileNumber.length < 10 || !/^\d+$/.test(mobileNumber)) {
      setPaymentError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Payment is not required - skip payment processing
      // Minimal delay for better UX (reduced from 2000ms to 300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 2: Prepare order data
      const uploadedDesign: any = {};

      // Validate and prepare front image (required)
      if (!frontDesignPreview || !frontDesignFile) {
        throw new Error("Front design image is required.");
      }

      try {
        // Handle base64 data - remove data:image/... prefix if present
        let frontImageData = frontDesignPreview;
        if (frontImageData.includes(',')) {
          frontImageData = frontImageData.split(',')[1];
        }

        if (!frontImageData || frontImageData.trim().length === 0) {
          throw new Error("Invalid front image data. Please upload the image again.");
        }

        uploadedDesign.frontImage = {
          data: frontImageData,
          contentType: frontDesignFile.type || "image/png",
          filename: frontDesignFile.name || "front-design.png",
        };
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to prepare front design image. Please try uploading again.");
      }

      // Prepare back image (optional)
      if (backDesignFile && backDesignPreview) {
        try {
          // Handle base64 data - remove data:image/... prefix if present
          let backImageData = backDesignPreview;
          if (backImageData.includes(',')) {
            backImageData = backImageData.split(',')[1];
          }

          if (backImageData && backImageData.trim().length > 0) {
            uploadedDesign.backImage = {
              data: backImageData,
              contentType: backDesignFile.type || "image/png",
              filename: backDesignFile.name || "back-design.png",
            };
          }
        } catch (err) {
          // Back image is optional, so we'll just log the error
        }
      }

      // Prepare selected options with complete information
      // Note: selectedProductOptions contains option names, not IDs
      const selectedOptions = selectedProductOptions.map(optionName => {
        const option = selectedProduct.options.find((opt: any) => opt.name === optionName);
        return {
          optionId: optionName, // Store name as optionId for backward compatibility
          optionName: option?.name || optionName,
          name: option?.name || optionName, // Also include name field
          priceAdd: option?.priceAdd || 0,
          description: option?.description || null,
          image: option?.image || null,
        };
      });

      // Prepare dynamic attributes for order with complete information
      const orderDynamicAttributes: any = {};
      const selectedDynamicAttributesArray: Array<{
        attributeTypeId: string;
        attributeName: string;
        attributeValue: any;
        label: string;
        priceMultiplier?: number;
        priceAdd: number;
        description?: string;
        image?: string;
      }> = [];

      for (const key of Object.keys(selectedDynamicAttributes)) {
        const value = selectedDynamicAttributes[key];
        if (value !== null && value !== undefined && value !== "") {
          // Check if this is a sub-attribute key (format: attrId__parentValue)
          if (key.includes('__')) {
            const [attrId, parentValue] = key.split('__');
            // Find the sub-attribute in pdpSubAttributes
            const subAttributesKey = `${attrId}:${parentValue}`;
            const subAttributes = pdpSubAttributes[subAttributesKey] || [];
            const selectedSubAttr = subAttributes.find((sa: any) => sa.value === value);

            if (selectedSubAttr) {
              // Find the parent attribute type
              const productAttr = selectedProduct.dynamicAttributes?.find(
                (attr: any) => {
                  const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                  return attrType?._id === attrId;
                }
              );

              if (productAttr) {
                const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
                if (attrType) {
                  // Add sub-attribute to selectedDynamicAttributesArray
                  selectedDynamicAttributesArray.push({
                    attributeTypeId: attrId,
                    attributeName: `${attrType.attributeName}: ${selectedSubAttr.label}`,
                    attributeValue: value,
                    label: selectedSubAttr.label || value?.toString() || "",
                    priceAdd: selectedSubAttr.priceAdd || 0,
                    description: undefined,
                    image: selectedSubAttr.image || undefined,
                  });
                }
              }
            }
          } else {
            // Regular attribute (not a sub-attribute)
            // Find the attribute type in product
            const productAttr = selectedProduct.dynamicAttributes?.find(
              (attr: any) => {
                const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                return attrType?._id === key;
              }
            );

            if (productAttr) {
              const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
              if (attrType) {
                const customValues = productAttr.customValues || [];
                const defaultValues = attrType.attributeValues || [];
                const allValues = customValues.length > 0 ? customValues : defaultValues;

                // Find selected value details
                let selectedValueDetails: any = null;
                if (Array.isArray(value)) {
                  selectedValueDetails = allValues.filter((av: any) => value.includes(av.value));
                } else {
                  selectedValueDetails = allValues.find((av: any) => av.value === value || av.value === value.toString());
                }

                if (selectedValueDetails) {
                  if (Array.isArray(selectedValueDetails)) {
                    // Multiple values
                    const labels = selectedValueDetails.map((sv: any) => sv.label || sv.value).join(", ");
                    let totalPriceAdd = 0;
                    let totalPriceMultiplier = 0;

                    // Extract priceImpact from descriptions (new format)
                    selectedValueDetails.forEach((sv: any) => {
                      if (sv.description) {
                        const priceImpactMatch = sv.description.match(/Price Impact: ₹([\d.]+)/);
                        if (priceImpactMatch) {
                          totalPriceAdd += parseFloat(priceImpactMatch[1]) || 0;
                        }
                      }
                      if (sv.priceMultiplier) {
                        totalPriceMultiplier += sv.priceMultiplier;
                      }
                    });

                    // Check if there are uploaded images for this attribute (checkbox - multiple values)
                    const imagesKey = `${key}_images`;
                    const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                      ? (selectedDynamicAttributes[imagesKey] as File[]).filter((f: any) => f !== null)
                      : [];

                    // Convert uploaded images to base64
                    const attributeImages: Array<{ data: string; contentType: string; filename: string }> = [];
                    if (uploadedImages.length > 0) {
                      for (const imageFile of uploadedImages) {
                        if (imageFile instanceof File) {
                          try {
                            const reader = new FileReader();
                            const imageData = await new Promise<string>((resolve, reject) => {
                              reader.onload = () => {
                                const result = reader.result as string;
                                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                                resolve(base64Data);
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(imageFile);
                            });

                            attributeImages.push({
                              data: imageData,
                              contentType: imageFile.type || "image/png",
                              filename: imageFile.name || "attribute-image.png"
                            });
                          } catch (err) {
                            console.error("Error converting image to base64:", err);
                          }
                        }
                      }
                    }

                    selectedDynamicAttributesArray.push({
                      attributeTypeId: key,
                      attributeName: attrType.attributeName || "Attribute",
                      attributeValue: value,
                      label: labels,
                      priceMultiplier: totalPriceAdd > 0 ? undefined : (totalPriceMultiplier || undefined),
                      priceAdd: totalPriceAdd,
                      description: selectedValueDetails.map((sv: any) => sv.description).filter(Boolean).join("; ") || undefined,
                      image: selectedValueDetails[0]?.image || undefined,
                      uploadedImages: attributeImages.length > 0 ? attributeImages : undefined,
                    } as any);
                  } else {
                    // Single value
                    let priceAdd = 0;
                    let priceMultiplier = selectedValueDetails.priceMultiplier;

                    // Extract priceImpact from description (new format)
                    if (selectedValueDetails.description) {
                      const priceImpactMatch = selectedValueDetails.description.match(/Price Impact: ₹([\d.]+)/);
                      if (priceImpactMatch) {
                        priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                        // If using priceAdd, don't use priceMultiplier
                        if (priceAdd > 0) {
                          priceMultiplier = undefined;
                        }
                      }
                    }

                    // Check if there are uploaded images for this attribute
                    const imagesKey = `${key}_images`;
                    const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                      ? (selectedDynamicAttributes[imagesKey] as File[]).filter((f: any) => f !== null)
                      : [];

                    // Convert uploaded images to base64
                    const attributeImages: Array<{ data: string; contentType: string; filename: string }> = [];
                    if (uploadedImages.length > 0) {
                      for (const imageFile of uploadedImages) {
                        if (imageFile instanceof File) {
                          try {
                            const reader = new FileReader();
                            const imageData = await new Promise<string>((resolve, reject) => {
                              reader.onload = () => {
                                const result = reader.result as string;
                                // Remove data:image/... prefix
                                const base64Data = result.includes(',') ? result.split(',')[1] : result;
                                resolve(base64Data);
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(imageFile);
                            });

                            attributeImages.push({
                              data: imageData,
                              contentType: imageFile.type || "image/png",
                              filename: imageFile.name || "attribute-image.png"
                            });
                          } catch (err) {
                            console.error("Error converting image to base64:", err);
                          }
                        }
                      }
                    }

                    selectedDynamicAttributesArray.push({
                      attributeTypeId: key,
                      attributeName: attrType.attributeName || "Attribute",
                      attributeValue: value,
                      label: selectedValueDetails.label || value?.toString() || "",
                      priceMultiplier: priceMultiplier || undefined,
                      priceAdd: priceAdd,
                      description: selectedValueDetails.description || undefined,
                      image: selectedValueDetails.image || undefined,
                      uploadedImages: attributeImages.length > 0 ? attributeImages : undefined,
                    } as any);
                  }
                } else {
                  // Value not in predefined list (text/number input)
                  selectedDynamicAttributesArray.push({
                    attributeTypeId: key,
                    attributeName: attrType.attributeName || "Attribute",
                    attributeValue: value,
                    label: value?.toString() || "",
                    priceAdd: 0,
                  });
                }
              }
            }

            // Also keep the simple format for backward compatibility
            if (value instanceof File) {
              orderDynamicAttributes[key] = value.name;
            } else {
              orderDynamicAttributes[key] = value;
            }
          }
        }
      }

      // Step 3: Create order with payment status
      const orderData = {
        productId: selectedProduct._id,
        quantity: quantity,
        finish: selectedPrintingOption,
        shape: selectedDeliverySpeed,
        selectedOptions: selectedOptions,
        selectedDynamicAttributes: selectedDynamicAttributesArray, // Send complete attribute information
        totalPrice: price + gstAmount, // Store total including GST for order
        // Delivery information collected at checkout
        pincode: pincode.trim(),
        address: address.trim(),
        mobileNumber: mobileNumber.trim(),
        uploadedDesign: uploadedDesign,
        notes: orderNotes || "",
        // Payment information - payment not required
        advancePaid: 0, // No advance payment
        paymentStatus: "pending", // Payment pending
        paymentGatewayInvoiceId: null, // No payment gateway invoice
        // Legacy product specifications (kept for backward compatibility)
        paperGSM: orderDynamicAttributes.paperGSM || null,
        paperQuality: orderDynamicAttributes.paperQuality || null,
        laminationType: orderDynamicAttributes.laminationType || null,
        specialEffects: orderDynamicAttributes.specialEffects ? [orderDynamicAttributes.specialEffects] : [],
      };

      // Check if user is authenticated
      const token = localStorage.getItem("token");
      let response: Response;

      if (!token) {
        // User is not authenticated - use the create-with-account endpoint
        const orderDataWithAccount = {
          ...orderData,
          name: customerName.trim(),
          email: customerEmail.trim(),
          mobileNumber: mobileNumber.trim(),
        };

        response = await fetch(`${API_BASE_URL}/orders/create-with-account`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderDataWithAccount),
        });
      } else {
        // User is authenticated - use regular endpoint
        response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData),
        });
      }

      if (!response.ok) {
        let errorMessage = "Failed to create order. Please try again.";
        let errorDetails: any = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details;

          // Check if it's a "No token provided" error (shouldn't happen with new flow, but handle it)
          if (errorMessage.includes("No token provided") || errorMessage.includes("token")) {
            // This shouldn't happen with the new endpoint, but if it does, try the create-with-account endpoint
            const orderDataWithAccount = {
              ...orderData,
              name: customerName.trim(),
              email: customerEmail.trim(),
              mobileNumber: mobileNumber.trim(),
            };

            const retryResponse = await fetch(`${API_BASE_URL}/orders/create-with-account`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(orderDataWithAccount),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              // Store token and user info
              if (retryData.token) {
                localStorage.setItem("token", retryData.token);
                if (retryData.user) {
                  localStorage.setItem("user", JSON.stringify(retryData.user));
                }
              }
              // Continue with success flow
              const order = retryData.order;
              setShowPaymentModal(false);
              setIsProcessingPayment(false);

              if (retryData.isNewUser && retryData.tempPassword) {
                // Email service temporarily disabled - show password in alert instead
                alert(`Account created successfully!\n\nYour temporary password: ${retryData.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nOrder placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
              } else {
                alert(`Order placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
              }

              if (order._id || order.order?._id) {
                navigate(`/order/${order._id || order.order._id}`);
              } else {
                navigate("/profile");
              }
              return;
            }
          }

          if (errorData.details) {
            if (Array.isArray(errorData.details)) {
              const detailsText = errorData.details.map((d: any) => `${d.field}: ${d.message}`).join("\n");
              errorMessage += "\n\n" + detailsText;
            } else {
              errorMessage += "\n\n" + errorData.details;
            }
          }
        } catch (parseError) {
          const responseText = await response.text().catch(() => "");
          errorMessage += `\n\nServer returned: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const order = responseData.order || responseData;

      // If account was created, store token and user info
      if (responseData.token) {
        localStorage.setItem("token", responseData.token);
        if (responseData.user) {
          localStorage.setItem("user", JSON.stringify(responseData.user));
        }
      }

      // Step 4: Close payment modal and redirect to order details
      setShowPaymentModal(false);
      setIsProcessingPayment(false);

      // Show success message
      if (responseData.isNewUser && responseData.tempPassword) {
        // Email service temporarily disabled - show password in alert instead
        alert(`Account created successfully!\n\nYour temporary password: ${responseData.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nOrder placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
      } else {
        alert(`Order placed successfully! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
      }

      // Redirect to order details page
      if (order._id || order.order?._id) {
        navigate(`/order/${order._id || order.order._id}`);
      } else {
        // Fallback to profile page
        navigate("/profile");
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to process payment and create order. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  // Handler for switching between nested subcategory products (variant filters)
  const handleNestedSubcategoryChange = async (nestedSubcategoryId: string) => {
    try {
      // Fetch products for the selected nested subcategory
      const response = await fetch(`${API_BASE_URL}/products/subcategory/${nestedSubcategoryId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const productsText = await response.text();
        if (!productsText.startsWith("<!DOCTYPE") && !productsText.startsWith("<html")) {
          const productsData = JSON.parse(productsText);

          if (Array.isArray(productsData) && productsData.length > 0) {
            const firstProduct = productsData[0];

            // Build new URL with the selected nested subcategory and first product
            const newUrl = categoryId && subCategoryId
              ? `/services/${categoryId}/${subCategoryId}/${nestedSubcategoryId}/${firstProduct._id}`
              : `/services/${categoryId}/${nestedSubcategoryId}/${firstProduct._id}`;

            // Navigate to new product (creates history entry for back button)
            navigate(newUrl, { replace: false });
          }
        }
      }
    } catch (error) {
      console.error('Error switching product variant:', error);
    }
  };

  return (

    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      {/* Preview Effect Styles */}
      <style>{`
        .preview-container {
          position: relative;
          width: 100%;
          max-width: 500px;
          height: auto;
          display: inline-block;
          overflow: hidden;
        }
        
        .card-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 8px;
          transition: filter 0.4s;
          display: block;
          position: relative;
          z-index: 1;
        }
        
        /* GLOSS EFFECT (SHINY OVERLAY) */
        .preview-container.gloss::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.25),
            rgba(255, 255, 255, 0) 60%
          );
          pointer-events: none;
          border-radius: 8px;
          z-index: 2;
        }
        
        /* UV COATING (DEEP SHINE + BOOST COLOR) */
        .preview-container.uv .card-image {
          filter: saturate(1.15) contrast(1.1) !important;
        }
        
        .preview-container.uv::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.35),
            rgba(255, 255, 255, 0) 70%
          );
          mix-blend-mode: screen;
          pointer-events: none;
          border-radius: 8px;
          z-index: 2;
        }
        
        /* LAMINATION (SOFT GLOSS, LOW SHINE) */
        .preview-container.laminated .card-image {
          filter: brightness(1.05) !important;
        }
        
        .preview-container.laminated::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          pointer-events: none;
          z-index: 2;
        }
        
        /* TEXTURE EFFECTS - Different patterns for each texture number */
        .preview-container.texture::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          border-radius: 8px;
          z-index: 3;
          opacity: 0.35;
          mix-blend-mode: overlay;
        }
        
        /* Texture No.1 - Fine Grid */
        .preview-container.texture-1::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          );
        }
        
        /* Texture No.2 - Coarse Grid */
        .preview-container.texture-2::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.04) 4px,
            rgba(0, 0, 0, 0.04) 8px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.04) 4px,
            rgba(0, 0, 0, 0.04) 8px
          );
        }
        
        /* Texture No.3 - Diagonal Lines */
        .preview-container.texture-3::before {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.4 - Dots Pattern */
        .preview-container.texture-4::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
          background-size: 6px 6px;
        }
        
        /* Texture No.5 - Horizontal Lines */
        .preview-container.texture-5::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.6 - Vertical Lines */
        .preview-container.texture-6::before {
          background-image: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        /* Texture No.7 - Crosshatch */
        .preview-container.texture-7::before {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 4px
          ),
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.02) 2px,
            rgba(0, 0, 0, 0.02) 4px
          );
        }
        
        /* Texture No.8 - Fine Dots */
        .preview-container.texture-8::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.03) 0.5px, transparent 0.5px);
          background-size: 4px 4px;
        }
        
        /* NO COATING (MATTE LOOK) */
        .preview-container.none .card-image {
          filter: saturate(0.9) contrast(0.95) !important;
        }
        
        /* SIZE EFFECTS */
        .preview-container.small {
          transform: scale(0.8);
          transition: transform 0.3s ease, max-width 0.3s ease;
        }
        
        .preview-container.small .card-image {
          transform: scale(1);
        }
        
        /* Modal specific styles */
        .preview-container .card-image {
          max-width: 100%;
          max-height: 90vh;
        }
        
        /* Custom scrollbar for product thumbnails */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Hide Scrollbar */
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Pop-out Deck Animation */
        .deck-card {
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          transform: scale(0.9);
          opacity: 0.7;
          z-index: 0;
          filter: grayscale(20%);
        }
        
        .deck-card:not(.active):hover {
          transform: scale(0.95) translateY(-5px);
          opacity: 1;
          filter: grayscale(0%);
          z-index: 20;
        }
        
        .deck-card.active {
          transform: scale(1.15) translateY(-8px);
          opacity: 1;
          z-index: 50 !important;
          filter: grayscale(0%);
          border-color: #2563eb !important;
          background-color: #ffffff;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        /* Checkmark Animation */
        .check-badge {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        /* Smooth Text Fade */
        .fade-in-text {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Radio Card Styling */
        .radio-card:has(input:checked) {
          background-color: #eff6ff;
          border-color: #2563eb;
          color: #1e3a8a;
          box-shadow: inset 0 0 0 1px #2563eb;
        }
        
        .radio-card:has(input:checked) .radio-icon {
          color: #2563eb;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm font-medium">
            {/* Services Link */}
            <Link
              to="/services"
              className="px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-sm"
              onClick={() => {
                const mainNav = document.querySelector('nav');
                if (mainNav) {
                  (mainNav as HTMLElement).style.opacity = '1';
                  (mainNav as HTMLElement).style.visibility = 'visible';
                  (mainNav as HTMLElement).style.pointerEvents = 'auto';
                }
                window.scrollTo(0, 0);
              }}
            >
              Services
            </Link>

            {/* Category Link - if categoryId exists in URL */}
            {categoryId && breadcrumbCategoryName && (
              <>
                <ArrowRight size={14} className="text-gray-400" />
                <Link
                  to={`/services/${categoryId}`}
                  className="px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-sm"
                  onClick={() => {
                    const mainNav = document.querySelector('nav');
                    if (mainNav) {
                      (mainNav as HTMLElement).style.opacity = '1';
                      (mainNav as HTMLElement).style.visibility = 'visible';
                      (mainNav as HTMLElement).style.pointerEvents = 'auto';
                    }
                    window.scrollTo(0, 0);
                  }}
                >
                  {breadcrumbCategoryName}
                </Link>
              </>
            )}

            {/* SubCategory Link - if subCategoryId exists in URL */}
            {categoryId && subCategoryId && breadcrumbSubCategoryName && (
              <>
                <ArrowRight size={14} className="text-gray-400" />
                <Link
                  to={`/services/${categoryId}/${subCategoryId}`}
                  className="px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-sm"
                  onClick={() => {
                    const mainNav = document.querySelector('nav');
                    if (mainNav) {
                      (mainNav as HTMLElement).style.opacity = '1';
                      (mainNav as HTMLElement).style.visibility = 'visible';
                      (mainNav as HTMLElement).style.pointerEvents = 'auto';
                    }
                    window.scrollTo(0, 0);
                  }}
                >
                  {breadcrumbSubCategoryName}
                </Link>
              </>
            )}

            {/* Nested SubCategory Link - if nestedSubCategoryId exists in URL */}
            {categoryId && subCategoryId && nestedSubCategoryId && breadcrumbNestedSubCategoryName && (
              <>
                <ArrowRight size={14} className="text-gray-400" />
                <Link
                  to={`/services/${categoryId}/${subCategoryId}/${nestedSubCategoryId}`}
                  className="px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-300 shadow-sm"
                  onClick={() => {
                    const mainNav = document.querySelector('nav');
                    if (mainNav) {
                      (mainNav as HTMLElement).style.opacity = '1';
                      (mainNav as HTMLElement).style.visibility = 'visible';
                      (mainNav as HTMLElement).style.pointerEvents = 'auto';
                    }
                    window.scrollTo(0, 0);
                  }}
                >
                  {breadcrumbNestedSubCategoryName}
                </Link>
              </>
            )}

            {/* Current Product Name - if viewing a product detail page */}
            {selectedProduct && (
              <>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-purple-500 text-white font-semibold shadow-md">
                  {selectedProduct.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Product Variants Filter - Show when nested subcategories are available */}
        {availableNestedSubcategories.length > 0 && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
          >
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Product Variants
            </h3>
            <div className="flex flex-wrap gap-3">
              {availableNestedSubcategories.map((nestedSubcat) => (
                <button
                  key={nestedSubcat._id}
                  onClick={() => handleNestedSubcategoryChange(nestedSubcat._id)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 font-medium transition-all text-sm sm:text-base ${selectedNestedSubcategoryId === nestedSubcat._id
                    ? 'border-gray-800 bg-gray-800 text-white shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {nestedSubcat.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading State */}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-gray-900" size={48} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading state for PDP
        {pdpLoading && productId && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-gray-900 mx-auto mb-4" />
              <p className="text-gray-700">Loading product details...</p>
            </div>
          </div>
        )} */}

        {/* Error state for PDP */}
        {pdpError && productId && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Product</h2>
              <p className="text-gray-700 mb-4">{pdpError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Only show if not loading and no error */}
        {!loading && !error && !pdpLoading && !pdpError && (
          <>
            {/* Main Layout: 50/50 Split - Left Image + Summary, Right Config / Products */}
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
              {/* Left Side: Subcategory Image (top) + Order Summary (below) */}
              <div className="lg:w-1/2">
                <div className="lg:sticky lg:top-24 space-y-4">
                  <motion.div
                    className="relative bg-gray-50 rounded-xl overflow-hidden aspect-[4/3] border border-gray-100 group shadow-sm"
                  >
                    {/* Premium Badge */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm text-gray-900 border border-gray-200 z-10">
                      {selectedProduct?.name}
                    </div>

                    <div className="w-full h-full flex items-center justify-center ">
                      {(() => {
                        // Get the image to display based on selected attributes
                        // Prioritize product image first, then subcategory, then fallback
                        let displayImage = selectedProduct?.image || selectedSubCategory?.image || "/Glossy.png";
                        let displayAlt = selectedProduct?.name || selectedSubCategory?.name || "Product Preview";

                        // Ensure image URL is valid (not empty or null)
                        if (!displayImage || displayImage.trim() === "" || displayImage === "null" || displayImage === "undefined") {
                          displayImage = selectedSubCategory?.image || "/Glossy.png";
                        }

                        // Only check for attribute images if user has explicitly selected at least one attribute
                        // This ensures the main product image is shown initially
                        if (selectedProduct && selectedProduct.dynamicAttributes && userSelectedAttributes.size > 0) {
                          // Iterate through userSelectedAttributes in REVERSE order (most recent first)
                          // to find the most recently selected attribute that has an image
                          const selectionOrderArray = Array.from(userSelectedAttributes).reverse();

                          for (const attrId of selectionOrderArray) {
                            // Find the attribute configuration for this ID
                            const attr = selectedProduct.dynamicAttributes.find(a => {
                              const aType = typeof a.attributeType === 'object' ? a.attributeType : null;
                              return aType && aType._id === attrId;
                            });

                            if (!attr || !attr.isEnabled) continue;

                            const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                            if (!attrType) continue;

                            const selectedValue = selectedDynamicAttributes[attrType._id];
                            if (!selectedValue) continue;

                            // Handle both single values and arrays (for checkbox inputs)
                            const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

                            const attributeValues = attr.customValues && attr.customValues.length > 0
                              ? attr.customValues
                              : attrType.attributeValues || [];

                            let foundImage = false;
                            for (const val of selectedValues) {
                              // Check for sub-attribute image first
                              const subAttrKey = `${attrId}__${val}`;
                              const selectedSubValue = selectedDynamicAttributes[subAttrKey];
                              if (selectedSubValue) {
                                const valueSubAttributesKey = `${attrId}:${val}`;
                                const valueSubAttributes = pdpSubAttributes[valueSubAttributesKey] || [];
                                const selectedSubAttr = valueSubAttributes.find(sa => sa.value === selectedSubValue);
                                if (selectedSubAttr && selectedSubAttr.image && selectedSubAttr.image.trim() !== "") {
                                  displayImage = selectedSubAttr.image;
                                  displayAlt = `${attrType.attributeName} - ${selectedSubAttr.label}`;
                                  foundImage = true;
                                  break;
                                }
                              }

                              // Then check for parent attribute value image
                              const selectedAttrValue = attributeValues.find((av: any) =>
                                av.value === val || av.value === String(val)
                              );

                              if (selectedAttrValue && selectedAttrValue.image && selectedAttrValue.image.trim() !== "") {
                                displayImage = selectedAttrValue.image;
                                displayAlt = `${attrType.attributeName} - ${selectedAttrValue.label}`;
                                foundImage = true;
                                break;
                              }
                            }

                            // If we found an image for the most recent selection, use it and stop
                            if (foundImage) {
                              break;
                            }
                          }
                        }

                        return (
                          <img
                            src={displayImage}
                            alt={displayAlt}
                            className="w-full h-full object-cover rounded-lg transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              // Fallback to subcategory image or default if product image fails to load
                              const target = e.target as HTMLImageElement;
                              if (target.src !== selectedSubCategory?.image && target.src !== "/Glossy.png") {
                                target.src = selectedSubCategory?.image || "/Glossy.png";
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </motion.div>

                  {/* Compact Order Summary - shown when a product is selected */}
                  {selectedProduct && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                          Order Summary
                        </h2>
                        <span className="text-xs text-white0">
                          Live estimate
                        </span>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-gray-800">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product</span>
                          <span className="font-medium text-right line-clamp-1 ml-2">
                            {selectedProduct.name}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity</span>
                          <span className="font-medium">
                            {(quantity || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">Base price</span>
                          <span className="font-medium">
                            ₹{(baseSubtotalBeforeDiscount || 0).toFixed(2)}
                          </span>
                        </div>

                        {dynamicAttributesCharges.length > 0 && (
                          <>
                            {dynamicAttributesCharges.map((attrCharge, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-gray-600 text-[11px]">
                                  {attrCharge.name}: {attrCharge.label}
                                </span>
                                <span className="font-medium text-[11px]">
                                  ₹{attrCharge.charge.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </>
                        )}

                        {additionalDesignCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Design charge</span>
                            <span className="font-medium">
                              ₹{additionalDesignCharge.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {gstAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              GST ({selectedProduct.gstPercentage || 18}%)
                            </span>
                            <span className="font-medium">
                              ₹{gstAmount.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {appliedDiscount !== null && appliedDiscount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Discount</span>
                            <span>-{appliedDiscount.toFixed(1)}%</span>
                          </div>
                        )}

                        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">
                            Estimated total
                          </span>
                          <span className="text-base sm:text-lg font-bold text-gray-900">
                            ₹{(price + gstAmount).toFixed(2)}
                          </span>
                        </div>

                        <p className="text-[11px] text-white0 mt-1">
                          Final price may adjust slightly based on selected options and taxes at checkout.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Product List or Product Details */}
              <div className="lg:w-1/2">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 min-h-[600px] lg:min-h-[700px] flex flex-col">
                  {!selectedProduct ? (
                    /* Loading state - auto-redirecting to first product */
                    <div className="flex items-center justify-center py-12 min-h-[400px]">
                      <div className="text-center">
                        <Loader className="animate-spin text-gray-600 mx-auto mb-4" size={40} />
                        <p className="text-gray-600 text-lg">Loading product details...</p>
                      </div>
                    </div>
                  ) : (
                    /* Product Filters and Order Form */
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedProduct._id || selectedProduct.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col h-full"
                      >
                        <div className="flex-1 overflow-y-auto pr-2">
                          {/* POP-OUT DECK VARIANT SELECTOR */}
                          {categoryProducts.length > 1 && (
                            <div className="mb-6 relative z-10">
                              {/* Header Row */}
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-widest">Select Product</p>
                              </div>

                              {/* Deck Container */}
                              <div className="relative w-full h-44 flex items-center overflow-visible">
                                {/* Scroll Container with overlapping stacking cards */}
                                <div
                                  id="deck-scroll-container"
                                  className="flex items-center overflow-x-auto hide-scroll pl-4 pr-16 pb-4 -space-x-4 w-full h-full pt-10"
                                >
                                  {categoryProducts.map((product, index) => {
                                    const isCurrentProduct = product._id === selectedProduct._id;
                                    const productImage = product.image || selectedSubCategory?.image || '/Glossy.png';

                                    return (
                                      <div
                                        key={product._id}
                                        id={`deck-card-${product._id}`}
                                        onClick={(e) => {
                                          if (!isCurrentProduct) {
                                            // Scroll clicked card into center view
                                            const cardElement = e.currentTarget;
                                            cardElement.scrollIntoView({
                                              behavior: 'smooth',
                                              block: 'nearest',
                                              inline: 'center'
                                            });

                                            // Navigate to the new product
                                            const newUrl = categoryId && subCategoryId && nestedSubCategoryId
                                              ? `/services/${categoryId}/${subCategoryId}/${nestedSubCategoryId}/${product._id}`
                                              : categoryId && subCategoryId
                                                ? `/services/${categoryId}/${subCategoryId}/${product._id}`
                                                : categoryId
                                                  ? `/services/${categoryId}/${product._id}`
                                                  : `/services/${product._id}`;
                                            navigate(newUrl);
                                          }
                                        }}
                                        className={`deck-card flex-shrink-0 w-24 h-32 rounded-xl border-2 cursor-pointer p-2 flex flex-col items-center justify-center gap-1 select-none bg-white hover:z-50 ${isCurrentProduct ? 'active border-blue-600 shadow-xl' : 'border-gray-200 shadow-sm'
                                          }`}
                                        style={{
                                          zIndex: isCurrentProduct ? 50 : (10 - Math.abs(index - categoryProducts.findIndex(p => p._id === selectedProduct._id))),
                                          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                        }}
                                      >
                                        {/* Blue checkmark badge */}
                                        <div
                                          className={`check-badge absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1 shadow-md z-30 transition-all duration-300 ${isCurrentProduct ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                                            }`}
                                        >
                                          <Check size={10} />
                                        </div>

                                        {/* Product Image */}
                                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-100 shadow-sm relative z-10 pointer-events-none bg-gray-50">
                                          <img
                                            src={productImage}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              if (target.src !== '/Glossy.png') {
                                                target.src = selectedSubCategory?.image || '/Glossy.png';
                                              }
                                            }}
                                          />
                                        </div>

                                        {/* Label */}
                                        <div className="text-center w-full pointer-events-none mt-0.5">
                                          <span className={`block text-[9px] font-bold uppercase tracking-tight leading-tight line-clamp-2 ${isCurrentProduct ? 'text-gray-900' : 'text-gray-500'
                                            }`}>
                                            {product.name}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Fade Gradients */}
                                <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent pointer-events-none z-20"></div>
                                <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none z-20"></div>
                              </div>
                            </div>
                          )}

                          {/* Product Header */}
                          <div className="mb-6 sm:mb-8 border-b border-gray-100 pb-4 sm:pb-6 relative">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1">
                                {/* Product Header with Price */}
                                <div className="border-b border-gray-100 flex flex-row justify-between items-center pb-4 mb-4">
                                  <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                                    {selectedProduct.name}
                                  </h1>
                                </div>

                                {/* Product Variants Filter - Only shown when nested subcategories exist */}
                                {availableNestedSubcategories.length > 0 && (
                                  <div className="mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-900 mb-3 tracking-wide uppercase">PRODUCT VARIANTS</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {availableNestedSubcategories.map((nestedSub) => {
                                        const isSelected = selectedNestedSubcategoryId === nestedSub._id;
                                        return (
                                          <button
                                            key={nestedSub._id}
                                            onClick={() => handleNestedSubcategorySwitch(nestedSub._id)}
                                            disabled={loading}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${isSelected
                                              ? 'border-gray-900 bg-gray-900 text-white font-bold shadow-md'
                                              : 'border-gray-300 bg-white text-gray-900 hover:border-gray-600 hover:bg-gray-50'
                                              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                          >
                                            {nestedSub.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Info Sections Row - Buttons displayed in a single row */}
                                <div className="mt-4 mb-6">
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {/* Product Description Button - Only show if description exists */}
                                    {(selectedProduct.description || (selectedProduct.descriptionArray && selectedProduct.descriptionArray.length > 0)) && (
                                      <button
                                        onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                                      >
                                        <FileText size={16} />
                                        Product Description
                                      </button>
                                    )}

                                    {/* Instructions Button - Only show if instructions or constraints exist */}
                                    {(selectedProduct.instructions || selectedProduct.maxFileSizeMB || selectedProduct.minFileWidth || selectedProduct.maxFileWidth || selectedProduct.minFileHeight || selectedProduct.maxFileHeight || selectedProduct.blockCDRandJPG || selectedProduct.additionalDesignCharge || selectedProduct.gstPercentage) && (
                                      <button
                                        onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                                        className="px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 rounded-lg border border-yellow-200 text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                                      >
                                        <Info size={16} />
                                        Instructions
                                      </button>
                                    )}
                                  </div>

                                  {/* Product Description Expandable Section */}
                                  <AnimatePresence>
                                    {isDescriptionOpen && (selectedProduct.description || (selectedProduct.descriptionArray && selectedProduct.descriptionArray.length > 0)) && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden mb-4"
                                      >
                                        <div className="p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-lg">
                                          <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                                            <FileText size={16} />
                                            Product Description
                                          </h4>
                                          <div className="text-sm sm:text-base text-blue-800 space-y-2">
                                            {(() => {
                                              // First check if description contains HTML (prioritize description field)
                                              if (selectedProduct.description) {
                                                const hasHTML = /<[a-z][\s\S]*>/i.test(selectedProduct.description);
                                                if (hasHTML) {
                                                  // Render HTML description exactly as provided by admin
                                                  return (
                                                    <>
                                                      <style>{`
                                                        .product-description-html {
                                                          color: #1e3a8a;
                                                          line-height: 1.6;
                                                          white-space: normal;
                                                        }
                                                        .product-description-html b,
                                                        .product-description-html strong {
                                                          font-weight: 600;
                                                          color: #1e40af;
                                                          display: inline;
                                                        }
                                                        .product-description-html > b:first-child,
                                                        .product-description-html > strong:first-child {
                                                          display: block;
                                                          font-size: 1.1em;
                                                          margin-bottom: 0.75rem;
                                                          color: #1e40af;
                                                        }
                                                        .product-description-html p,
                                                        .product-description-html div {
                                                          margin-bottom: 0.5rem;
                                                          line-height: 1.6;
                                                          color: #1e3a8a;
                                                          white-space: normal;
                                                          word-wrap: break-word;
                                                          overflow-wrap: break-word;
                                                        }
                                                        .product-description-html div:not(:first-child) {
                                                          padding-left: 0;
                                                        }
                                                        .product-description-html ul,
                                                        .product-description-html ol {
                                                          margin-left: 1.5rem;
                                                          margin-bottom: 0.5rem;
                                                        }
                                                        .product-description-html li {
                                                          margin-bottom: 0.25rem;
                                                        }
                                                      `}</style>
                                                      <div
                                                        className="product-description-html"
                                                        dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                                                      />
                                                    </>
                                                  );
                                                }
                                              }

                                              // Use descriptionArray if available, otherwise use description
                                              if (selectedProduct.descriptionArray && Array.isArray(selectedProduct.descriptionArray) && selectedProduct.descriptionArray.length > 0) {
                                                // Render descriptionArray with formatting
                                                const renderTextWithBold = (text: string) => {
                                                  const parts = text.split(/(\*\*.*?\*\*)/g);
                                                  return parts.map((part, idx) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                      const boldText = part.slice(2, -2);
                                                      return <strong key={idx} className="font-bold text-blue-900">{boldText}</strong>;
                                                    }
                                                    return <span key={idx}>{part}</span>;
                                                  });
                                                };

                                                // Ensure descriptionArray is displayed left to right (correct order)
                                                // Reverse the array if it's stored in reverse order
                                                const descriptionLines = [...selectedProduct.descriptionArray].reverse();
                                                return descriptionLines.map((desc, i) => {
                                                  if (desc.includes(':')) {
                                                    return (
                                                      <div key={i} className="mt-3 first:mt-0">
                                                        <p className="font-semibold text-blue-900 mb-1.5">
                                                          {renderTextWithBold(desc)}
                                                        </p>
                                                      </div>
                                                    );
                                                  } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                                    const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                                    return (
                                                      <p key={i} className="flex items-start">
                                                        <span className="mr-2 text-blue-600 mt-1">→</span>
                                                        <span>{renderTextWithBold(cleanDesc)}</span>
                                                      </p>
                                                    );
                                                  } else {
                                                    return (
                                                      <p key={i} className="flex items-start">
                                                        <span className="mr-2 text-blue-600 mt-1">→</span>
                                                        <span>{renderTextWithBold(desc)}</span>
                                                      </p>
                                                    );
                                                  }
                                                });
                                              } else if (selectedProduct.description) {
                                                // Render plain text description with formatting (HTML already handled above)
                                                const descriptionLines = selectedProduct.description.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                                                const renderTextWithBold = (text: string) => {
                                                  const parts = text.split(/(\*\*.*?\*\*)/g);
                                                  return parts.map((part, idx) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                      const boldText = part.slice(2, -2);
                                                      return <strong key={idx} className="font-bold text-blue-900">{boldText}</strong>;
                                                    }
                                                    return <span key={idx}>{part}</span>;
                                                  });
                                                };
                                                return descriptionLines.map((desc, i) => {
                                                  if (desc.includes(':')) {
                                                    return (
                                                      <div key={i} className="mt-3 first:mt-0">
                                                        <p className="font-semibold text-blue-900 mb-1.5">
                                                          {renderTextWithBold(desc)}
                                                        </p>
                                                      </div>
                                                    );
                                                  } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                                    const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                                    return (
                                                      <p key={i} className="flex items-start">
                                                        <span className="mr-2 text-blue-600 mt-1">→</span>
                                                        <span>{renderTextWithBold(cleanDesc)}</span>
                                                      </p>
                                                    );
                                                  } else {
                                                    return (
                                                      <p key={i} className="flex items-start">
                                                        <span className="mr-2 text-blue-600 mt-1">→</span>
                                                        <span>{renderTextWithBold(desc)}</span>
                                                      </p>
                                                    );
                                                  }
                                                });
                                              } else {
                                                return <p className="text-blue-700 italic">No description available</p>;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Instructions Expandable Section */}
                                  <AnimatePresence>
                                    {isInstructionsOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mb-6 p-4 sm:p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <h4 className="text-sm font-bold text-yellow-900 mb-3 flex items-center gap-2">
                                            <Info size={16} />
                                            Important Instructions - Please Read Carefully
                                          </h4>

                                          {/* Custom Instructions from Admin */}
                                          {selectedProduct.instructions && (
                                            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                              <p className="text-xs font-bold text-red-900 mb-2 flex items-center gap-2">
                                                <X size={14} className="text-red-600" />
                                                CRITICAL: Company Not Responsible If Instructions Not Followed
                                              </p>
                                              <div className="text-xs sm:text-sm text-red-800 whitespace-pre-line">
                                                {selectedProduct.instructions}
                                              </div>
                                            </div>
                                          )}

                                          <div className="space-y-3 text-xs sm:text-sm text-yellow-800">
                                            {/* File Upload Constraints */}
                                            {(selectedProduct.maxFileSizeMB || selectedProduct.minFileWidth || selectedProduct.maxFileWidth || selectedProduct.minFileHeight || selectedProduct.maxFileHeight || selectedProduct.blockCDRandJPG) && (
                                              <div>
                                                <p className="font-semibold text-yellow-900 mb-2">File Upload Requirements:</p>
                                                <div className="space-y-1 ml-4">
                                                  {selectedProduct.maxFileSizeMB && (
                                                    <p>• Maximum file size: <strong>{selectedProduct.maxFileSizeMB} MB</strong></p>
                                                  )}
                                                  {(selectedProduct.minFileWidth || selectedProduct.maxFileWidth || selectedProduct.minFileHeight || selectedProduct.maxFileHeight) && (
                                                    <div>
                                                      <p>• File dimensions:</p>
                                                      <div className="ml-4 space-y-1">
                                                        {(selectedProduct.minFileWidth || selectedProduct.maxFileWidth) && (
                                                          <p>
                                                            - Width: <strong>
                                                              {selectedProduct.minFileWidth && selectedProduct.maxFileWidth
                                                                ? `${selectedProduct.minFileWidth} - ${selectedProduct.maxFileWidth} pixels`
                                                                : selectedProduct.minFileWidth
                                                                  ? `Minimum ${selectedProduct.minFileWidth} pixels`
                                                                  : selectedProduct.maxFileWidth
                                                                    ? `Maximum ${selectedProduct.maxFileWidth} pixels`
                                                                    : "Any"}
                                                            </strong>
                                                          </p>
                                                        )}
                                                        {(selectedProduct.minFileHeight || selectedProduct.maxFileHeight) && (
                                                          <p>
                                                            - Height: <strong>
                                                              {selectedProduct.minFileHeight && selectedProduct.maxFileHeight
                                                                ? `${selectedProduct.minFileHeight} - ${selectedProduct.maxFileHeight} pixels`
                                                                : selectedProduct.minFileHeight
                                                                  ? `Minimum ${selectedProduct.minFileHeight} pixels`
                                                                  : selectedProduct.maxFileHeight
                                                                    ? `Maximum ${selectedProduct.maxFileHeight} pixels`
                                                                    : "Any"}
                                                            </strong>
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {selectedProduct.blockCDRandJPG && (
                                                    <p>• <strong>CDR and JPG files are not accepted</strong> for this product</p>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Additional Settings */}
                                            {(selectedProduct.additionalDesignCharge || selectedProduct.gstPercentage) && (
                                              <div>
                                                <p className="font-semibold text-yellow-900 mb-2">Additional Charges:</p>
                                                <div className="space-y-1 ml-4">
                                                  {selectedProduct.additionalDesignCharge && selectedProduct.additionalDesignCharge > 0 && (
                                                    <p>• Additional Design Charge: <strong>₹{selectedProduct.additionalDesignCharge.toFixed(2)}</strong> (applied if design help is needed)</p>
                                                  )}
                                                  {selectedProduct.gstPercentage && selectedProduct.gstPercentage > 0 && (
                                                    <p>• GST: <strong>{selectedProduct.gstPercentage}%</strong> (applied on subtotal + design charge)</p>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {!selectedProduct.instructions && !selectedProduct.maxFileSizeMB && !selectedProduct.minFileWidth && !selectedProduct.maxFileWidth && !selectedProduct.minFileHeight && !selectedProduct.maxFileHeight && !selectedProduct.blockCDRandJPG && !selectedProduct.additionalDesignCharge && !selectedProduct.gstPercentage && (
                                              <p className="text-yellow-700 italic">No special instructions for this product.</p>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>

                            </div>
                          </div>

                          {(() => {
                            // Calculate section numbers dynamically based on visible sections
                            let sectionNum = 1;
                            const hasOptions = selectedProduct.options && selectedProduct.options.length > 0;
                            const hasPrintingOption = selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length > 0;
                            const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;
                            const hasDeliverySpeed = selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length > 0;

                            return (
                              <>
                                {/* Product Options (from options table) */}
                                {hasOptions && (
                                  <div className="mb-6 sm:mb-8">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Product Options
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.options.map((option: any, idx: number) => {
                                        const isSelected = selectedProductOptions.includes(option.name);
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedProductOptions(selectedProductOptions.filter(name => name !== option.name));
                                              } else {
                                                setSelectedProductOptions([...selectedProductOptions, option.name]);
                                              }
                                            }}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative shadow-sm hover:shadow-md ${isSelected
                                              ? "border-slate-800 bg-slate-50 text-slate-900 ring-1 ring-slate-800"
                                              : "border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                              }`}
                                          >
                                            {isSelected && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-slate-900" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm mb-1">{option.name}</div>
                                            {option.description && (
                                              <p className="text-xs text-gray-600 mt-1">
                                                {option.description}
                                              </p>
                                            )}
                                            {option.priceAdd !== undefined && option.priceAdd !== 0 && (
                                              <p className="text-xs text-gray-700 mt-1 font-medium">
                                                {option.priceAdd > 0 ? '+' : ''}₹{typeof option.priceAdd === 'number' ? option.priceAdd.toFixed(2) : parseFloat(option.priceAdd).toFixed(2)} per 1000 units
                                              </p>
                                            )}
                                            {option.image && (
                                              <img
                                                src={option.image}
                                                alt={option.name}
                                                className="w-full h-24 object-cover rounded-lg mt-2"
                                              />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Printing Option - Auto-skip if only one option */}
                                {hasPrintingOption && selectedProduct.filters.printingOption.length > 1 && (
                                  <div className="mb-6 sm:mb-8" data-section="printingOption">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Printing Option
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.filters.printingOption.map((option) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.printingOptionPrices) {
                                          const priceData = selectedProduct.filters.printingOptionPrices.find((p: any) => p.name === option);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={option}
                                            data-field="printingOption"
                                            onClick={() => setSelectedPrintingOption(option)}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative shadow-sm hover:shadow-md ${selectedPrintingOption === option
                                              ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-1 ring-blue-500"
                                              : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/30"
                                              }`}
                                          >
                                            {selectedPrintingOption === option && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-blue-600" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm">{option}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)} per 1000 units
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Texture Type (if applicable) - Auto-skip if only one option */}
                                {hasTextureType && selectedProduct.filters.textureType.length > 1 && (
                                  <div className="mb-6 sm:mb-8">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Texture Type
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                      {selectedProduct.filters.textureType.map((texture) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.textureTypePrices) {
                                          const priceData = selectedProduct.filters.textureTypePrices.find((p: any) => p.name === texture);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={texture}
                                            onClick={() => setSelectedTextureType(texture)}
                                            className={`p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 relative shadow-sm hover:shadow-md ${selectedTextureType === texture
                                              ? "border-purple-500 bg-purple-50/50 text-purple-900 ring-1 ring-purple-500"
                                              : "border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/30"
                                              }`}
                                          >
                                            {selectedTextureType === texture && (
                                              <div className="absolute top-1 right-1">
                                                <Check size={16} className="text-purple-600" />
                                              </div>
                                            )}
                                            <div>{texture}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)}/1k
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Delivery Speed - Auto-skip if only one option */}
                                {hasDeliverySpeed && selectedProduct.filters.deliverySpeed.length > 1 && (
                                  <div className="mb-6 sm:mb-8" data-section="deliverySpeed">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Delivery Speed
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                      {selectedProduct.filters.deliverySpeed.map((speed) => {
                                        // Check if filter prices are enabled and get price
                                        const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                        let priceInfo = null;
                                        if (filterPricesEnabled && selectedProduct.filters?.deliverySpeedPrices) {
                                          const priceData = selectedProduct.filters.deliverySpeedPrices.find((p: any) => p.name === speed);
                                          if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                            priceInfo = priceData.priceAdd;
                                          }
                                        }

                                        return (
                                          <button
                                            key={speed}
                                            data-field="deliverySpeed"
                                            onClick={() => setSelectedDeliverySpeed(speed)}
                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative shadow-sm hover:shadow-md ${selectedDeliverySpeed === speed
                                              ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500"
                                              : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30"
                                              }`}
                                          >
                                            {selectedDeliverySpeed === speed && (
                                              <div className="absolute top-2 right-2">
                                                <Check size={18} className="text-emerald-600" />
                                              </div>
                                            )}
                                            <div className="font-bold text-sm">{speed}</div>
                                            {priceInfo !== null && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {priceInfo > 0 ? '+' : ''}₹{Math.abs(priceInfo).toFixed(2)} per 1000 units
                                              </div>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Quantity Selection */}
                                <div className="mb-6 sm:mb-8" data-section="quantity">
                                  <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                    {sectionNum++}. Select Quantity
                                  </label>

                                  <div className="mb-3">
                                    <Select
                                      options={generateQuantities(selectedProduct).map((q) => ({
                                        value: q,
                                        label: q.toLocaleString()
                                      }))}
                                      value={quantity}
                                      onValueChange={(value) => setQuantity(Number(value))}
                                      placeholder="Select quantity"
                                      className="w-full"
                                      colorTheme="amber"
                                    />
                                  </div>

                                  {(() => {
                                    // PRIORITY 1: Check if active quantity constraints from rules exist
                                    if (activeQuantityConstraints) {
                                      const { min, max, step } = activeQuantityConstraints;
                                      return (
                                        <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                          <span className="font-medium">Quantity Rules Applied:</span> Min: {min.toLocaleString()}, Max: {max.toLocaleString()}, Step: {step.toLocaleString()}
                                        </div>
                                      );
                                    }

                                    // PRIORITY 2: Check if any selected attribute has step/range quantity settings
                                    let attributeQuantityInfo: any = null;
                                    let attributeName = '';

                                    // Check PDP attributes first (if initialized)
                                    if (isInitialized && pdpAttributes.length > 0) {
                                      for (const attr of pdpAttributes) {
                                        if (!attr.isVisible) continue;

                                        const selectedValue = selectedDynamicAttributes[attr._id];
                                        if (!selectedValue) continue;

                                        // Check if this attribute has step/range quantity settings
                                        if ((attr as any).isStepQuantity && (attr as any).stepQuantities && (attr as any).stepQuantities.length > 0) {
                                          attributeQuantityInfo = {
                                            type: 'STEP_WISE',
                                            stepQuantities: (attr as any).stepQuantities
                                          };
                                          attributeName = attr.attributeName;
                                          break;
                                        }

                                        if ((attr as any).isRangeQuantity && (attr as any).rangeQuantities && (attr as any).rangeQuantities.length > 0) {
                                          attributeQuantityInfo = {
                                            type: 'RANGE_WISE',
                                            rangeQuantities: (attr as any).rangeQuantities
                                          };
                                          attributeName = attr.attributeName;
                                          break;
                                        }
                                      }
                                    }

                                    // Fallback to product attributes if PDP not available
                                    if (!attributeQuantityInfo && selectedProduct && selectedProduct.dynamicAttributes) {
                                      for (const attr of selectedProduct.dynamicAttributes) {
                                        if (!attr.isEnabled) continue;

                                        const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                                        if (!attrType) continue;

                                        const selectedValue = selectedDynamicAttributes[attrType._id];
                                        if (!selectedValue) continue;

                                        // Check if this attribute has step/range quantity settings
                                        if ((attrType as any).isStepQuantity && (attrType as any).stepQuantities && (attrType as any).stepQuantities.length > 0) {
                                          attributeQuantityInfo = {
                                            type: 'STEP_WISE',
                                            stepQuantities: (attrType as any).stepQuantities
                                          };
                                          attributeName = attrType.attributeName;
                                          break;
                                        }

                                        if ((attrType as any).isRangeQuantity && (attrType as any).rangeQuantities && (attrType as any).rangeQuantities.length > 0) {
                                          attributeQuantityInfo = {
                                            type: 'RANGE_WISE',
                                            rangeQuantities: (attrType as any).rangeQuantities
                                          };
                                          attributeName = attrType.attributeName;
                                          break;
                                        }
                                      }
                                    }

                                    // If attribute has quantity settings, use those
                                    if (attributeQuantityInfo) {
                                      if (attributeQuantityInfo.type === 'STEP_WISE') {
                                        const stepQuantities = attributeQuantityInfo.stepQuantities
                                          .map((step: any) => {
                                            const qty = typeof step === 'object' ? parseFloat(step.quantity) : parseFloat(step);
                                            return isNaN(qty) ? 0 : qty;
                                          })
                                          .filter((qty: number) => qty > 0)
                                          .sort((a: number, b: number) => a - b);

                                        return (
                                          <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                            <span className="font-medium">{attributeName}:</span> Available quantities: {stepQuantities.map(q => q.toLocaleString()).join(", ")}
                                          </div>
                                        );
                                      } else if (attributeQuantityInfo.type === 'RANGE_WISE') {
                                        return (
                                          <div className="text-xs sm:text-sm text-gray-600 mb-2 space-y-1">
                                            <div className="font-medium mb-1">{attributeName}:</div>
                                            {attributeQuantityInfo.rangeQuantities.map((range: any, idx: number) => {
                                              const min = typeof range === 'object' ? parseFloat(range.min) : 0;
                                              const max = typeof range === 'object' && range.max ? parseFloat(range.max) : null;
                                              const price = typeof range === 'object' ? parseFloat(range.price) : 0;

                                              return (
                                                <div key={idx}>
                                                  {range.label || `${min.toLocaleString()}${max ? ` - ${max.toLocaleString()}` : "+"} units`}
                                                  {price > 0 && (
                                                    <span className="ml-2 text-green-600">
                                                      (₹{price.toFixed(2)})
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      }
                                    }

                                    // Fallback to product's quantity configuration
                                    const orderQuantity = selectedProduct.filters.orderQuantity;
                                    const quantityType = orderQuantity.quantityType || "SIMPLE";

                                    if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
                                      return (
                                        <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                          Available quantities: {orderQuantity.stepWiseQuantities.sort((a, b) => a - b).map(q => q.toLocaleString()).join(", ")}
                                        </div>
                                      );
                                    } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
                                      return (
                                        <div className="text-xs sm:text-sm text-gray-600 mb-2 space-y-1">
                                          {orderQuantity.rangeWiseQuantities.map((range, idx) => (
                                            <div key={idx}>
                                              {range.label || `${range.min.toLocaleString()}${range.max ? ` - ${range.max.toLocaleString()}` : "+"} units`}
                                              {range.priceMultiplier !== 1.0 && (
                                                <span className="ml-2 text-green-600">
                                                  ({range.priceMultiplier > 1 ? "+" : ""}{((range.priceMultiplier - 1) * 100).toFixed(0)}% price)
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                          Min: {orderQuantity.min.toLocaleString()}, Max: {orderQuantity.max.toLocaleString()}, Multiples of: {orderQuantity.multiples.toLocaleString()}
                                        </div>
                                      );
                                    }
                                  })()}
                                  {appliedDiscount !== null && appliedDiscount > 0 && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                      <p className="text-xs sm:text-sm text-green-800 font-medium">
                                        🎉 You're saving {appliedDiscount}% on this order! (Bulk discount applied)
                                      </p>
                                    </div>
                                  )}
                                  {selectedProduct.quantityDiscounts && selectedProduct.quantityDiscounts.length > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-xs font-medium text-blue-900 mb-2">Available Quantity Discounts:</p>
                                      <div className="space-y-1">
                                        {selectedProduct.quantityDiscounts.map((discount: any, idx: number) => {
                                          const minQty = discount.minQuantity || 0;
                                          const maxQty = discount.maxQuantity;
                                          const discountPct = discount.discountPercentage || 0;
                                          const range = maxQty
                                            ? `${minQty.toLocaleString()} - ${maxQty.toLocaleString()} units`
                                            : `${minQty.toLocaleString()}+ units`;
                                          return (
                                            <p key={idx} className="text-xs text-blue-800">
                                              • {range}: <strong>{discountPct}% off</strong>
                                            </p>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Dynamic Attributes */}
                                {(() => {
                                  // Use PDP attributes with rule evaluation if available, otherwise fallback to product attributes
                                  let attributesToRender: any[] = [];

                                  if (isInitialized && pdpAttributes.length > 0) {
                                    // Apply rules to get evaluated attributes
                                    const ruleResult = applyAttributeRules({
                                      attributes: pdpAttributes,
                                      rules: pdpRules,
                                      selectedValues: { ...selectedDynamicAttributes } as Record<string, string | number | boolean | File | any[] | null>,
                                    });

                                    // Filter to only visible attributes
                                    attributesToRender = ruleResult.attributes
                                      .filter((attr) => attr.isVisible)
                                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                                  } else if (selectedProduct.dynamicAttributes) {
                                    // Fallback to product attributes
                                    attributesToRender = selectedProduct.dynamicAttributes
                                      .filter((attr) => attr.isEnabled)
                                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                                  }

                                  return attributesToRender.length > 0 ? (
                                    <>
                                      {attributesToRender.map((attr) => {
                                        // Handle PDP attributes (already evaluated) vs product attributes
                                        let attrType: any = null;
                                        let attributeValues: any[] = [];
                                        let attrId: string = '';
                                        let isRequired: boolean = false;
                                        let displayOrder: number = 0;

                                        if (isInitialized && pdpAttributes.length > 0) {
                                          // PDP attribute structure
                                          attrId = attr._id;
                                          isRequired = attr.isRequired || false;
                                          displayOrder = attr.displayOrder || 0;
                                          attributeValues = (attr.allowedValues && attr.allowedValues.length > 0)
                                            ? (attr.attributeValues || []).filter((av: any) => attr.allowedValues!.includes(av.value))
                                            : (attr.attributeValues || []);

                                          // Build attrType-like structure for compatibility
                                          attrType = {
                                            _id: attr._id,
                                            attributeName: attr.attributeName,
                                            inputStyle: attr.inputStyle,
                                            attributeValues: attributeValues,
                                            defaultValue: attr.defaultValue,
                                          };
                                        } else {
                                          // Legacy product attribute structure
                                          if (typeof attr.attributeType === 'object' && attr.attributeType !== null) {
                                            attrType = attr.attributeType;
                                            attrId = attrType._id;
                                          } else if (typeof attr.attributeType === 'string' && attr.attributeType.trim() !== '') {
                                            return null;
                                          }

                                          if (!attrType || !attrType._id) {
                                            return null;
                                          }

                                          attrId = attrType._id;
                                          isRequired = attr.isRequired || false;
                                          displayOrder = attr.displayOrder || 0;
                                          attributeValues = attr.customValues && attr.customValues.length > 0
                                            ? attr.customValues
                                            : attrType.attributeValues || [];
                                        }

                                        // For DROPDOWN, RADIO, and POPUP input styles, we need at least 2 options to display
                                        // For TEXT, NUMBER, FILE_UPLOAD, and other input styles, we can display even with 0 or 1 values
                                        const requiresMultipleOptions = ['DROPDOWN', 'RADIO', 'POPUP'].includes(attrType.inputStyle);

                                        if (requiresMultipleOptions) {
                                          // For dropdown/radio/popup, need at least 2 options
                                          if (attributeValues.length < 1) {
                                            return (
                                              <div key={attrId} className="mb-6 sm:mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                                  {sectionNum++}. {attrType.attributeName}
                                                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                <p className="text-sm text-yellow-800">
                                                  This attribute is not available because it requires at least 2 options. Please contact support.
                                                </p>
                                              </div>
                                            );
                                          }
                                        } else {
                                          // For other input types (TEXT, NUMBER, FILE_UPLOAD), can display even with 0 values
                                          // They don't need pre-defined options
                                        }

                                        // Get sub-attributes for this attribute if available
                                        const selectedValue = selectedDynamicAttributes[attrId];
                                        const selectedValueObj = attributeValues.find((av: any) => av.value === selectedValue);

                                        // Filter sub-attributes: parentAttribute matches attrId, parentValue matches selectedValue
                                        // Check if sub-attributes actually exist in the fetched data (don't rely solely on hasSubAttributes flag)
                                        const subAttributesKey = `${attrId}:${selectedValue || ''}`;
                                        const availableSubAttributes = selectedValue
                                          ? (pdpSubAttributes[subAttributesKey] || [])
                                          : [];

                                        return (
                                          <div key={attrId} className="mb-6 sm:mb-8">
                                            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                              {sectionNum++}. {attrType.attributeName}
                                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                                            </label>

                                            {(attrType.inputStyle === 'DROPDOWN' || attrType.inputStyle === 'POPUP') && (
                                              <div data-attribute={attrId} data-attribute-name={attrType.attributeName}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <Select
                                                      options={attributeValues
                                                        .filter((av: any) => av && av.value && av.label) // Filter out invalid options
                                                        .map((av: any) => {
                                                          // Get price display - check for priceImpact first, then fall back to priceMultiplier
                                                          let priceDisplay = '';
                                                          if (av.description) {
                                                            const priceImpactMatch = av.description.match(/Price Impact: ₹([\d.]+)/);
                                                            if (priceImpactMatch) {
                                                              const priceImpact = parseFloat(priceImpactMatch[1]) || 0;
                                                              if (priceImpact > 0) {
                                                                priceDisplay = ` (+₹${priceImpact.toFixed(2)}/unit)`;
                                                              }
                                                            }
                                                          }
                                                          if (!priceDisplay && av.priceMultiplier && av.priceMultiplier !== 1 && selectedProduct) {
                                                            const basePrice = selectedProduct.basePrice || 0;
                                                            const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                                                            if (Math.abs(pricePerUnit) >= 0.01) {
                                                              priceDisplay = ` (+₹${pricePerUnit.toFixed(2)}/unit)`;
                                                            }
                                                          }
                                                          return {
                                                            value: av.value,
                                                            label: `${av.label}${priceDisplay}`
                                                          };
                                                        })}
                                                      value={selectedDynamicAttributes[attrId] as string || ""}
                                                      onValueChange={(value) => {
                                                        setSelectedDynamicAttributes({
                                                          ...selectedDynamicAttributes,
                                                          [attrId]: value
                                                        });
                                                        // Mark this attribute as user-selected for image updates (preserved order)
                                                        setUserSelectedAttributes(prev => {
                                                          const next = new Set(prev);
                                                          next.delete(attrId);
                                                          next.add(attrId);
                                                          return next;
                                                        });
                                                      }}
                                                      placeholder={`Select ${attrType.attributeName}`}
                                                      className="w-full"
                                                      colorTheme={['indigo', 'rose', 'cyan', 'lime', 'fuchsia'][Math.abs(attrId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 5] as any}
                                                    />
                                                    {/* Sub-attributes for selected value */}
                                                    {availableSubAttributes.length > 0 && (
                                                      <div className="mt-4">
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                          Select {selectedValueObj?.label || attrType.attributeName} Option:
                                                        </label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                          {availableSubAttributes.map((subAttr) => {
                                                            // Format price display for sub-attribute
                                                            const getSubAttrPriceDisplay = () => {
                                                              if (!subAttr.priceAdd || subAttr.priceAdd === 0) return null;
                                                              return `+₹${subAttr.priceAdd.toFixed(2)}/piece`;
                                                            };

                                                            const subAttrKey = `${attrId}__${selectedValue}`;
                                                            const isSubAttrSelected = selectedDynamicAttributes[subAttrKey] === subAttr.value;

                                                            return (
                                                              <button
                                                                key={subAttr._id}
                                                                type="button"
                                                                onClick={() => {
                                                                  setSelectedDynamicAttributes((prev) => ({
                                                                    ...prev,
                                                                    [subAttrKey]: subAttr.value,
                                                                  }));
                                                                  // Mark the parent attribute as user-selected for image updates (preserved order)
                                                                  setUserSelectedAttributes(prev => {
                                                                    const next = new Set(prev);
                                                                    next.delete(attrId);
                                                                    next.add(attrId);
                                                                    return next;
                                                                  });
                                                                }}
                                                                className={`p-3 rounded-lg border text-left transition-all ${isSubAttrSelected
                                                                  ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                                                                  : "border-gray-200 hover:border-gray-400"
                                                                  }`}
                                                              >
                                                                {subAttr.image && (
                                                                  <div className="mb-2">
                                                                    <img
                                                                      src={subAttr.image}
                                                                      alt={subAttr.label}
                                                                      className="w-full h-24 object-cover rounded"
                                                                    />
                                                                  </div>
                                                                )}
                                                                <div className="text-sm font-medium">{subAttr.label}</div>
                                                                {getSubAttrPriceDisplay() && (
                                                                  <div className="text-xs text-gray-600 mt-1">
                                                                    {getSubAttrPriceDisplay()}
                                                                  </div>
                                                                )}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}
                                                    {/* Image upload fields if selected option requires images */}
                                                    {(() => {
                                                      const selectedValue = selectedDynamicAttributes[attrId];
                                                      if (!selectedValue) return null;

                                                      const selectedOption = attributeValues.find((av: any) => av.value === selectedValue);
                                                      if (!selectedOption || !selectedOption.description) return null;

                                                      // Parse numberOfImagesRequired from description
                                                      const imagesRequiredMatch = selectedOption.description.match(/Images Required: (\d+)/);
                                                      const numberOfImagesRequired = imagesRequiredMatch ? parseInt(imagesRequiredMatch[1]) : 0;

                                                      if (numberOfImagesRequired <= 0) return null;

                                                      // Get uploaded images for this attribute
                                                      const imagesKey = `${attrId}_images`;
                                                      const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                                                        ? (selectedDynamicAttributes[imagesKey] as File[])
                                                        : [];

                                                      return (
                                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                          <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                            Upload Images for {selectedOption.label} ({numberOfImagesRequired} required) *
                                                          </label>
                                                          <div className="space-y-3">
                                                            {Array.from({ length: numberOfImagesRequired }).map((_, index) => {
                                                              const file = uploadedImages[index] || null;
                                                              return (
                                                                <div key={index} className="flex items-center gap-3">
                                                                  <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    data-image-index={index}
                                                                    data-attr-id={attrId}
                                                                    onChange={(e) => {
                                                                      const newFile = e.target.files?.[0] || null;
                                                                      if (newFile) {
                                                                        const updatedImages = [...uploadedImages];
                                                                        // Fill gaps with null if needed
                                                                        while (updatedImages.length <= index) {
                                                                          updatedImages.push(null as any);
                                                                        }
                                                                        updatedImages[index] = newFile;
                                                                        setSelectedDynamicAttributes({
                                                                          ...selectedDynamicAttributes,
                                                                          [imagesKey]: updatedImages
                                                                        });
                                                                      }
                                                                    }}
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                  />
                                                                  {file && (
                                                                    <div className="flex items-center gap-2">
                                                                      <span className="text-xs text-gray-600 max-w-[150px] truncate">
                                                                        {file.name}
                                                                      </span>
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          const updatedImages = [...uploadedImages];
                                                                          updatedImages[index] = null as any;
                                                                          // Keep array structure but set this index to null
                                                                          setSelectedDynamicAttributes({
                                                                            ...selectedDynamicAttributes,
                                                                            [imagesKey]: updatedImages
                                                                          });
                                                                          // Reset the file input
                                                                          const fileInput = document.querySelector(`input[type="file"][data-image-index="${index}"][data-attr-id="${attrId}"]`) as HTMLInputElement;
                                                                          if (fileInput) {
                                                                            fileInput.value = '';
                                                                          }
                                                                        }}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Remove image"
                                                                      >
                                                                        <X size={16} />
                                                                      </button>
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                          {uploadedImages.length < numberOfImagesRequired && (
                                                            <p className="text-xs text-red-600 mt-2">
                                                              Please upload {numberOfImagesRequired - uploadedImages.length} more image(s)
                                                            </p>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </>
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'RADIO' && (
                                              <div data-attribute={attrId}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const filteredValues = attributeValues.filter((av: any) => av && av.value && av.label);
                                                        setRadioModalData({
                                                          attributeId: attrId,
                                                          attributeName: attrType.attributeName,
                                                          attributeValues: filteredValues,
                                                          selectedValue: (selectedDynamicAttributes[attrId] as string) || null,
                                                          isRequired: isRequired,
                                                        });
                                                        setRadioModalOpen(true);
                                                      }}
                                                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 text-left flex items-center justify-between group"
                                                    >
                                                      <div className="flex-1">
                                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                          {selectedDynamicAttributes[attrId]
                                                            ? attributeValues.find((av: any) => av.value === selectedDynamicAttributes[attrId])?.label || 'Select option'
                                                            : `Select ${attrType.attributeName}${isRequired ? ' *' : ''}`
                                                          }
                                                        </span>
                                                        {selectedDynamicAttributes[attrId] && (
                                                          <div className="text-xs text-white0 mt-1">
                                                            Click to change selection
                                                          </div>
                                                        )}
                                                      </div>
                                                      <ArrowRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                                                    </button>
                                                    {/* Image upload fields if selected option requires images */}
                                                    {(() => {
                                                      const selectedValue = selectedDynamicAttributes[attrId];
                                                      if (!selectedValue) return null;

                                                      const selectedOption = attributeValues.find((av: any) => av.value === selectedValue);
                                                      if (!selectedOption || !selectedOption.description) return null;

                                                      // Parse numberOfImagesRequired from description
                                                      const imagesRequiredMatch = selectedOption.description.match(/Images Required: (\d+)/);
                                                      const numberOfImagesRequired = imagesRequiredMatch ? parseInt(imagesRequiredMatch[1]) : 0;

                                                      if (numberOfImagesRequired <= 0) return null;

                                                      // Get uploaded images for this attribute
                                                      const imagesKey = `${attrId}_images`;
                                                      const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                                                        ? (selectedDynamicAttributes[imagesKey] as File[])
                                                        : [];

                                                      return (
                                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                          <label className="block text-sm font-semibold text-gray-900 mb-3">
                                                            Upload Images for {selectedOption.label} ({numberOfImagesRequired} required) *
                                                          </label>
                                                          <div className="space-y-3">
                                                            {Array.from({ length: numberOfImagesRequired }).map((_, index) => {
                                                              const file = uploadedImages[index] || null;
                                                              return (
                                                                <div key={index} className="flex items-center gap-3">
                                                                  <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    data-image-index={index}
                                                                    data-attr-id={attrId}
                                                                    onChange={(e) => {
                                                                      const newFile = e.target.files?.[0] || null;
                                                                      if (newFile) {
                                                                        const updatedImages = [...uploadedImages];
                                                                        // Fill gaps with null if needed
                                                                        while (updatedImages.length <= index) {
                                                                          updatedImages.push(null as any);
                                                                        }
                                                                        updatedImages[index] = newFile;
                                                                        setSelectedDynamicAttributes({
                                                                          ...selectedDynamicAttributes,
                                                                          [imagesKey]: updatedImages
                                                                        });
                                                                      }
                                                                    }}
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                  />
                                                                  {file && (
                                                                    <div className="flex items-center gap-2">
                                                                      <span className="text-xs text-gray-600 max-w-[150px] truncate">
                                                                        {file.name}
                                                                      </span>
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          const updatedImages = [...uploadedImages];
                                                                          updatedImages[index] = null as any;
                                                                          // Keep array structure but set this index to null
                                                                          setSelectedDynamicAttributes({
                                                                            ...selectedDynamicAttributes,
                                                                            [imagesKey]: updatedImages
                                                                          });
                                                                          // Reset the file input
                                                                          const fileInput = document.querySelector(`input[type="file"][data-image-index="${index}"][data-attr-id="${attrId}"]`) as HTMLInputElement;
                                                                          if (fileInput) {
                                                                            fileInput.value = '';
                                                                          }
                                                                        }}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Remove image"
                                                                      >
                                                                        <X size={16} />
                                                                      </button>
                                                                    </div>
                                                                  )}
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                          {uploadedImages.length < numberOfImagesRequired && (
                                                            <p className="text-xs text-red-600 mt-2">
                                                              Please upload {numberOfImagesRequired - uploadedImages.length} more image(s)
                                                            </p>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </>
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'CHECKBOX' && (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" data-attribute={attrId}>
                                                {attributeValues.length === 0 ? (
                                                  <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-sm text-yellow-800">
                                                      No options available for this attribute. Please contact support.
                                                    </p>
                                                  </div>
                                                ) : (
                                                  attributeValues
                                                    .filter((av: any) => av && av.value && av.label) // Filter out invalid options
                                                    .map((av: any) => {
                                                      // Format price display as per unit price
                                                      const getPriceDisplay = () => {
                                                        // Check for priceImpact first (new format with option usage)
                                                        if (av.description) {
                                                          const priceImpactMatch = av.description.match(/Price Impact: ₹([\d.]+)/);
                                                          if (priceImpactMatch) {
                                                            const priceImpact = parseFloat(priceImpactMatch[1]) || 0;
                                                            if (priceImpact > 0) {
                                                              return `+₹${priceImpact.toFixed(2)}/unit`;
                                                            }
                                                          }
                                                        }
                                                        // Fall back to priceMultiplier calculation
                                                        if (!av.priceMultiplier || av.priceMultiplier === 1 || !selectedProduct) return null;
                                                        const basePrice = selectedProduct.basePrice || 0;
                                                        const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                                                        if (Math.abs(pricePerUnit) < 0.01) return null;
                                                        return `+₹${pricePerUnit.toFixed(2)}/unit`;
                                                      };

                                                      const isSelected = Array.isArray(selectedDynamicAttributes[attrId]) && (selectedDynamicAttributes[attrId] as any).includes(av.value);

                                                      return (
                                                        <button
                                                          key={av.value}
                                                          type="button"
                                                          onClick={() => {
                                                            const current = Array.isArray(selectedDynamicAttributes[attrId]) ? (selectedDynamicAttributes[attrId] as any) : [];
                                                            const newValue = isSelected
                                                              ? current.filter((v: any) => v !== av.value)
                                                              : [...current, av.value];
                                                            setSelectedDynamicAttributes({
                                                              ...selectedDynamicAttributes,
                                                              [attrId]: newValue
                                                            });
                                                            // Mark this attribute as user-selected for image updates (preserved order)
                                                            setUserSelectedAttributes(prev => {
                                                              const next = new Set(prev);
                                                              next.delete(attrId);
                                                              next.add(attrId);
                                                              return next;
                                                            });
                                                          }}
                                                          className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                            ? "border-gray-900 bg-gray-50 text-gray-900 ring-1 ring-gray-900"
                                                            : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                                                            }`}
                                                        >
                                                          {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                              <Check size={18} className="text-gray-900" />
                                                            </div>
                                                          )}
                                                          {av.image && (
                                                            <div className="mb-2">
                                                              <img
                                                                src={av.image}
                                                                alt={av.label}
                                                                className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                                              />
                                                            </div>
                                                          )}
                                                          <div className="font-bold text-sm">{av.label}</div>
                                                          {getPriceDisplay() && (
                                                            <div className="text-xs text-gray-600 mt-1">
                                                              {getPriceDisplay()}
                                                            </div>
                                                          )}
                                                        </button>
                                                      );
                                                    })
                                                )}
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'TEXT_FIELD' && (
                                              <div data-attribute={attrId}>
                                                <input
                                                  type="text"
                                                  value={(selectedDynamicAttributes[attrId] as string) || ""}
                                                  onChange={(e) => {
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrId]: e.target.value
                                                    });
                                                    // Mark this attribute as user-selected for image updates (preserved order)
                                                    setUserSelectedAttributes(prev => {
                                                      const next = new Set(prev);
                                                      next.delete(attrId);
                                                      next.add(attrId);
                                                      return next;
                                                    });
                                                  }}
                                                  placeholder={`Enter ${attrType.attributeName}`}
                                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                />
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'NUMBER' && (
                                              <div data-attribute={attrId}>
                                                <input
                                                  type="number"
                                                  value={(selectedDynamicAttributes[attrId] as number) || ""}
                                                  onChange={(e) => {
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrId]: parseFloat(e.target.value) || 0
                                                    });
                                                    // Mark this attribute as user-selected for image updates (preserved order)
                                                    setUserSelectedAttributes(prev => {
                                                      const next = new Set(prev);
                                                      next.delete(attrId);
                                                      next.add(attrId);
                                                      return next;
                                                    });
                                                  }}
                                                  placeholder={`Enter ${attrType.attributeName}`}
                                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                />
                                              </div>
                                            )}

                                            {attrType.inputStyle === 'FILE_UPLOAD' && (
                                              <div data-attribute={attrId}>
                                                <input
                                                  type="file"
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setSelectedDynamicAttributes({
                                                      ...selectedDynamicAttributes,
                                                      [attrId]: file
                                                    });
                                                    // Mark this attribute as user-selected for image updates (preserved order)
                                                    setUserSelectedAttributes(prev => {
                                                      const next = new Set(prev);
                                                      next.delete(attrId);
                                                      next.add(attrId);
                                                      return next;
                                                    });
                                                  }}
                                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                  accept="*/*"
                                                />
                                                {attrType.fileRequirements && (
                                                  <p className="text-xs text-gray-600 mt-1">{attrType.fileRequirements}</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  ) : null;
                                })()}

                              </>
                            );
                          })()}

                          {/* Delivery information removed - will be shown at checkout only */}

                          {/* Upload Design Section */}
                          <div className="mb-6 sm:mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200" data-upload-section>
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                              <UploadIcon size={16} className="sm:w-[18px] sm:h-[18px]" /> Upload Your Design
                            </h3>

                            <div className="mb-4">
                              <label className="block text-sm text-gray-700 mb-2">Upload Reference Image *</label>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleDesignFileChange(e, "front")}
                                  className="hidden"
                                  data-required-field
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-900 transition-colors">
                                  {frontDesignPreview ? (
                                    <div className="relative">
                                      <img
                                        src={frontDesignPreview}
                                        alt="Reference image preview"
                                        className="max-h-32 mx-auto rounded"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setFrontDesignFile(null);
                                          setFrontDesignPreview("");
                                        }}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <FileImage size={24} className="text-gray-600" />
                                      <span className="text-sm text-gray-600">Click to upload reference image</span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm text-gray-700 mb-2">Back Design (Optional)</label>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleDesignFileChange(e, "back")}
                                  className="hidden"
                                />
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-900 transition-colors">
                                  {backDesignPreview ? (
                                    <div className="relative">
                                      <img
                                        src={backDesignPreview}
                                        alt="Back design preview"
                                        className="max-h-32 mx-auto rounded"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setBackDesignFile(null);
                                          setBackDesignPreview("");
                                        }}
                                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <FileImage size={24} className="text-gray-600" />
                                      <span className="text-sm text-gray-600">Click to upload back design</span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm text-gray-700 mb-2">Additional Notes (Optional)</label>
                              <textarea
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                placeholder="Any special instructions or notes..."
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm resize-none"
                                rows={3}
                              />
                            </div>
                          </div>

                        </div>

                        {/* Premium Sticky Footer with Total Price + CTA */}
                        <div className="mt-auto pt-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Price</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-gray-900">
                                  ₹{(price + gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">incl. taxes</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-green-600 font-medium flex flex-col items-end">
                              <span className="flex items-center gap-1">
                                <Zap size={12} className="text-green-600" />
                                Fast Production
                              </span>
                              {/* <span className="text-gray-600">
                                Est. Delivery: <strong className="text-gray-900">
                                  {(() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + (selectedProduct.productionTime || 4));
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  })()}
                                </strong>
                              </span> */}
                            </div>
                          </div>

                          <button
                            onClick={handlePlaceOrder}
                            disabled={isProcessingPayment}
                            className={`w-full py-4 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group ${isProcessingPayment
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-60'
                                : 'bg-gray-900 text-white hover:bg-black'
                              }`}
                          >
                            {isProcessingPayment ? (
                              <>
                                <Loader className="animate-spin" size={20} />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <span>Customize Design</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </button>

                          <div className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                            <Lock size={12} />
                            <span>Secure Payment & Data Protection</span>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
              data-payment-modal
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-xl">Payment Confirmation</span>
                </h3>
                {!isProcessingPayment && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Subtotal (Excluding GST):</span>
                      <span className="text-lg font-bold text-gray-900">₹{price.toFixed(2)}</span>
                    </div>
                    {gstAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">GST ({selectedProduct?.gstPercentage || 18}%):</span>
                          <span className="text-gray-700">+₹{gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                          <span className="text-gray-700 font-medium">Total Amount (Including GST):</span>
                          <span className="text-2xl font-bold text-gray-900">₹{(price + gstAmount).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Your order will be placed and you can pay later.
                  </p>
                </div>

                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{paymentError}</p>
                  </div>
                )}

                {/* Delivery Information Form */}
                <div className="mb-6 space-y-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <Truck size={18} />
                    Delivery Information
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      id="customerName"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      id="customerEmail"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter your email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      id="pincode"
                      value={pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPincode(value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter 6-digit pincode"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complete Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        name="address"
                        id="address"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (paymentError) setPaymentError(null);
                        }}
                        placeholder="Enter your complete delivery address"
                        rows={3}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="px-3 py-2 bg-purple-200 text-gray-900 rounded-lg hover:bg-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Get location automatically"
                      >
                        {isGettingLocation ? (
                          <Loader className="animate-spin" size={18} />
                        ) : (
                          <MapPin size={18} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-white0 mt-1">You can enter address manually or use location button</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      id="mobileNumber"
                      value={mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMobileNumber(value);
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-semibold mb-2">Order Summary:</p>
                  <div className="space-y-1 ml-4">
                    <p>• Product: <strong>{selectedProduct?.name}</strong></p>
                    <p>• Quantity: <strong>{quantity.toLocaleString()}</strong></p>
                    <p>• Printing Option: <strong>{selectedPrintingOption}</strong></p>
                    <p>• Delivery Speed: <strong>{selectedDeliverySpeed}</strong></p>
                    {selectedTextureType && (
                      <p>• Texture Type: <strong>{selectedTextureType}</strong></p>
                    )}
                  </div>
                </div>

                {/* Estimated Delivery Information - Show at checkout */}
                {estimatedDeliveryDate && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                      <Truck size={16} /> Estimated Delivery
                    </h3>
                    <div className="text-green-700 text-sm">
                      <div className="font-semibold mb-1">Estimated Delivery by <strong>{estimatedDeliveryDate}</strong></div>
                      {deliveryLocationSource && (
                        <div className="text-xs text-green-600 mt-1">
                          {deliveryLocationSource}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {!isProcessingPayment && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handlePaymentAndOrder}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirm Order ₹{(price + gstAmount).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Size Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  width: 'auto',
                  height: 'auto',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={selectedSubCategory?.image || "/Glossy.png"}
                  alt={selectedSubCategory?.name || "Product Preview"}
                  className="w-full h-full object-contain"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-50"
                aria-label="Close image"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RADIO Attribute Selection Modal */}
      <AnimatePresence>
        {radioModalOpen && radioModalData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRadioModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Select {radioModalData.attributeName}
                  </h2>
                  {radioModalData.isRequired && (
                    <p className="text-xs text-red-500 mt-1">Required field</p>
                  )}
                </div>
                <button
                  onClick={() => setRadioModalOpen(false)}
                  className="p-2 hover:bg-purple-200 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-gray-700" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 justify-items-center">
                  {radioModalData.attributeValues.map((av) => {
                    // Format price display as per unit price
                    const getPriceDisplay = () => {
                      // Check for priceImpact first (new format with option usage)
                      if (av.description) {
                        const priceImpactMatch = av.description.match(/Price Impact: ₹([\d.]+)/);
                        if (priceImpactMatch) {
                          const priceImpact = parseFloat(priceImpactMatch[1]) || 0;
                          if (priceImpact > 0) {
                            return `+₹${priceImpact.toFixed(2)}/unit`;
                          }
                        }
                      }
                      // Fall back to priceMultiplier calculation
                      if (!av.priceMultiplier || av.priceMultiplier === 1 || !selectedProduct) return null;
                      const basePrice = selectedProduct.basePrice || 0;
                      const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                      if (Math.abs(pricePerUnit) < 0.01) return null;
                      return `+₹${pricePerUnit.toFixed(2)}/unit`;
                    };

                    const isSelected = radioModalData.selectedValue === av.value;

                    // Check if this value has sub-attributes available in PDP data
                    const valueSubAttributesKey = `${radioModalData.attributeId}:${av.value}`;
                    const valueSubAttributes = pdpSubAttributes[valueSubAttributesKey] || [];

                    return (
                      <motion.button
                        key={av.value}
                        type="button"
                        onClick={() => {
                          // Select main attribute value
                          const newSelected = {
                            ...selectedDynamicAttributes,
                            [radioModalData.attributeId]: av.value
                          };
                          setSelectedDynamicAttributes(newSelected);

                          // Mark this attribute as user-selected for image updates (preserved order)
                          setUserSelectedAttributes(prev => {
                            const next = new Set(prev);
                            next.delete(radioModalData.attributeId);
                            next.add(radioModalData.attributeId);
                            return next;
                          });

                          // If this value has sub-attributes, open sub-attribute modal
                          if (valueSubAttributes.length > 0) {
                            const subAttrKey = `${radioModalData.attributeId}__${av.value}`;
                            const existingSubValue = (newSelected[subAttrKey] as string) || null;
                            setSubAttrModalData({
                              attributeId: radioModalData.attributeId,
                              parentValue: av.value,
                              parentLabel: av.label,
                              subAttributes: valueSubAttributes,
                              selectedValue: existingSubValue,
                            });
                            setSubAttrModalOpen(true);
                          }

                          // Close main radio modal
                          setRadioModalOpen(false);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-lg border-2 text-left transition-all duration-200 flex flex-col w-[140px] h-[140px] overflow-hidden ${isSelected
                          ? "border-gray-900 bg-gray-50 text-gray-900 ring-2 ring-gray-900 ring-offset-1"
                          : "border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
                          }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 bg-gray-900 text-white rounded-full p-1 shadow-lg z-10"
                          >
                            <Check size={12} />
                          </motion.div>
                        )}

                        {av.image && (
                          <div className="mb-1.5 overflow-hidden rounded border border-gray-200 bg-gray-50 flex-shrink-0">
                            <img
                              src={av.image}
                              alt={av.label}
                              className="w-full h-[70px] object-cover transition-transform duration-200 hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 flex flex-col min-h-0">
                          <div className="font-semibold text-xs text-gray-900 leading-tight line-clamp-2">
                            {av.label}
                          </div>

                          {av.description && (
                            <p className="text-[10px] text-gray-600 line-clamp-2 leading-tight">
                              {av.description}
                            </p>
                          )}

                          {getPriceDisplay() && (
                            <div className="mt-auto pt-1 border-t border-gray-200 text-[10px] font-semibold text-gray-700 leading-tight">
                              {getPriceDisplay()}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {radioModalData.selectedValue ? (
                    <span>
                      Selected: <span className="font-semibold text-gray-900">
                        {radioModalData.attributeValues.find(av => av.value === radioModalData.selectedValue)?.label}
                      </span>
                    </span>
                  ) : (
                    <span>Please select an option</span>
                  )}
                </div>
                <button
                  onClick={() => setRadioModalOpen(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  {radioModalData.selectedValue ? 'Done' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-Attribute Selection Modal (for RADIO values with sub-attributes) */}
      <AnimatePresence>
        {subAttrModalOpen && subAttrModalData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSubAttrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Select {subAttrModalData.parentLabel} Option
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Additional options related to {subAttrModalData.parentLabel}
                  </p>
                </div>
                <button
                  onClick={() => setSubAttrModalOpen(false)}
                  className="p-2 hover:bg-purple-200 rounded-full transition-colors"
                  aria-label="Close sub-attribute modal"
                >
                  <X size={18} className="text-gray-700" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 justify-items-center">
                  {subAttrModalData.subAttributes.map((subAttr) => {
                    const getSubAttrPriceDisplay = () => {
                      if (!subAttr.priceAdd || subAttr.priceAdd === 0) return null;
                      return `+₹${subAttr.priceAdd.toFixed(2)}/piece`;
                    };

                    const subAttrKey = `${subAttrModalData.attributeId}__${subAttrModalData.parentValue}`;
                    const isSelected = selectedDynamicAttributes[subAttrKey] === subAttr.value;

                    return (
                      <motion.button
                        key={subAttr._id}
                        type="button"
                        onClick={() => {
                          setSelectedDynamicAttributes((prev) => ({
                            ...prev,
                            [subAttrKey]: subAttr.value,
                          }));
                          setSubAttrModalData({
                            ...subAttrModalData,
                            selectedValue: subAttr.value,
                          });
                          // Mark the parent attribute as user-selected for image updates (preserved order)
                          setUserSelectedAttributes(prev => {
                            const next = new Set(prev);
                            next.delete(subAttrModalData.attributeId);
                            next.add(subAttrModalData.attributeId);
                            return next;
                          });
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-lg border-2 text-left transition-all duration-200 flex flex-col w-[140px] h-[140px] overflow-hidden ${isSelected
                          ? "border-gray-900 bg-gray-50 text-gray-900 ring-2 ring-gray-900 ring-offset-1"
                          : "border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
                          }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 bg-gray-900 text-white rounded-full p-1 shadow-lg z-10"
                          >
                            <Check size={12} />
                          </motion.div>
                        )}

                        {subAttr.image && (
                          <div className="mb-1.5 overflow-hidden rounded border border-gray-200 bg-gray-50 flex-shrink-0">
                            <img
                              src={subAttr.image}
                              alt={subAttr.label}
                              className="w-full h-[70px] object-cover transition-transform duration-200 hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 flex flex-col min-h-0">
                          <div className="font-semibold text-xs text-gray-900 leading-tight line-clamp-2">
                            {subAttr.label}
                          </div>

                          {getSubAttrPriceDisplay() && (
                            <div className="mt-auto pt-1 border-t border-gray-200 text-[10px] font-semibold text-gray-700 leading-tight">
                              {getSubAttrPriceDisplay()}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {subAttrModalData.selectedValue ? (
                    <span>
                      Selected:{" "}
                      <span className="font-semibold text-gray-900">
                        {subAttrModalData.subAttributes.find(
                          (s) => s.value === subAttrModalData.selectedValue
                        )?.label}
                      </span>
                    </span>
                  ) : (
                    <span>Sub-option is optional</span>
                  )}
                </div>
                <button
                  onClick={() => setSubAttrModalOpen(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default GlossProductSelection;

