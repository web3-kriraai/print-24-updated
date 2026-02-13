import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Truck, Upload as UploadIcon, FileImage, CreditCard, X, Loader, Info, Lock, AlertCircle, MapPin } from 'lucide-react';
import { Select } from '../components/ui/select';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import BackButton from '../components/BackButton';
import { applyAttributeRules, type AttributeRule, type Attribute } from '../utils/attributeRuleEngine';
import ProductPriceBox from '../components/ProductPriceBox';
import LocationDetector from '../components/LocationDetector';
import { useBulkOrderPermission } from '../hooks/useBulkOrder';
import BulkOrderToggle from '../components/BulkOrderToggle';
import { formatPrice } from '../src/utils/currencyUtils';
import PaymentConfirmationModal from '../src/components/PaymentConfirmationModal';

const BulkOrderWizard = React.lazy(() => import('../components/BulkOrderWizard'));

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
  maxFileSizeMB?: number;
  minFileWidth?: number;
  maxFileWidth?: number;
  minFileHeight?: number;
  maxFileHeight?: number;
  blockCDRandJPG?: boolean;
  additionalDesignCharge?: number;
  gstPercentage?: number;
  showPriceIncludingGst?: boolean;
  instructions?: string;
}

interface GlossProductSelectionProps {
  forcedProductId?: string;
}

interface AttributeValueWithPrice {
  value: string;
  label: string;
  priceMultiplier?: number;
  image?: string;
  description?: string;
  hasSubAttributes?: boolean;
}

interface PDPAttribute extends Attribute {
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
  isRequired?: boolean;
  displayOrder?: number;
  isVisible?: boolean;
  allowedValues?: string[];
  isStepQuantity?: boolean;
  stepQuantities?: Array<number | { quantity: number }>;
  isRangeQuantity?: boolean;
  rangeQuantities?: Array<{
    min: number;
    max: number | null;
    price: number;
    label?: string;
  }>;
  fileRequirements?: string;
}

interface PDPSubAttribute {
  _id: string;
  value: string;
  label: string;
  image?: string;
  priceAdd: number;
  parentValue: string;
}

const GlossProductSelection: React.FC<GlossProductSelectionProps> = ({ forcedProductId }) => {
  const params = useParams<{ categoryId: string; subCategoryId?: string; nestedSubCategoryId?: string; productId?: string }>();
  const navigate = useNavigate();
  const { categoryId, subCategoryId, nestedSubCategoryId } = params;
  const productId = forcedProductId || params.productId;

  const [products, setProducts] = useState<GlossProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<GlossProduct | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [nestedSubCategories, setNestedSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdpAttributes, setPdpAttributes] = useState<PDPAttribute[]>([]);
  const [pdpSubAttributes, setPdpSubAttributes] = useState<Record<string, PDPSubAttribute[]>>({});
  const [pdpRules, setPdpRules] = useState<AttributeRule[]>([]);
  const [pdpQuantityConfig, setPdpQuantityConfig] = useState<any>(null);
  const [pdpLoading, setPdpLoading] = useState(false);
  const [pdpError, setPdpError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [selectedPrintingOption, setSelectedPrintingOption] = useState<string>("");
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState<string>("");
  const [selectedTextureType, setSelectedTextureType] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1000);

  const [selectedDynamicAttributes, setSelectedDynamicAttributes] = useState<{ [key: string]: string | number | boolean | File | any[] | null }>({});
  const [userSelectedAttributes, setUserSelectedAttributes] = useState<Set<string>>(new Set());
  const [selectedProductOptions, setSelectedProductOptions] = useState<string[]>([]);

  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(null);
  const [deliveryLocationSource, setDeliveryLocationSource] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

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
  const [printingOptionCharge, setPrintingOptionCharge] = useState(0);
  const [deliverySpeedCharge, setDeliverySpeedCharge] = useState(0);
  const [textureTypeCharge, setTextureTypeCharge] = useState(0);
  const [productOptionsCharge, setProductOptionsCharge] = useState(0);
  const [dynamicAttributesCharges, setDynamicAttributesCharges] = useState<Array<{ name: string; label: string; charge: number }>>([]);
  const [baseSubtotalBeforeDiscount, setBaseSubtotalBeforeDiscount] = useState(0);
  const [perUnitPriceExcludingGst, setPerUnitPriceExcludingGst] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [promoCodes, setPromoCodes] = useState<string[]>([]);

  const [radioModalOpen, setRadioModalOpen] = useState(false);
  const [radioModalData, setRadioModalData] = useState<{
    attributeId: string;
    attributeName: string;
    attributeValues: AttributeValueWithPrice[];
    selectedValue: string | null;
    isRequired: boolean;
  } | null>(null);

  const [subAttrModalOpen, setSubAttrModalOpen] = useState(false);
  const [subAttrModalData, setSubAttrModalData] = useState<{
    attributeId: string;
    parentValue: string;
    parentLabel: string;
    subAttributes: PDPSubAttribute[];
    selectedValue: string | null;
  } | null>(null);

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [orderMode, setOrderMode] = useState<'single' | 'bulk'>('single');
  const [showBulkWizard, setShowBulkWizard] = useState(false);
  const { hasPermission } = useBulkOrderPermission();

  const firstErrorField = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isImageModalOpen]);

  useEffect(() => {
    try {
      const userLocation = localStorage.getItem('userLocation');
      if (userLocation) {
        const location = JSON.parse(userLocation);
        if (location.pincode && !pincode) {
          setPincode(location.pincode);
        }
      }
    } catch (e) {
      console.error('Error loading user location:', e);
    }
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;

    if (selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length === 1) {
      if (!selectedPrintingOption || selectedPrintingOption !== selectedProduct.filters.printingOption[0]) {
        setSelectedPrintingOption(selectedProduct.filters.printingOption[0]);
      }
    }

    if (selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length === 1) {
      if (!selectedDeliverySpeed || selectedDeliverySpeed !== selectedProduct.filters.deliverySpeed[0]) {
        setSelectedDeliverySpeed(selectedProduct.filters.deliverySpeed[0]);
      }
    }

    if (selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length === 1) {
      if (!selectedTextureType || selectedTextureType !== selectedProduct.filters.textureType[0]) {
        setSelectedTextureType(selectedProduct.filters.textureType[0]);
      }
    }

    if (selectedProduct && isInitialized && pdpAttributes.length > 0) {
      const ruleResult = applyAttributeRules({
        attributes: pdpAttributes,
        rules: pdpRules,
        selectedValues: { ...selectedDynamicAttributes } as Record<string, string | number | boolean | File | any[] | null>,
      });

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
        if (attr.defaultValue && !selectedDynamicAttributes[attr._id]) {
          setSelectedDynamicAttributes((prev) => ({
            ...prev,
            [attr._id]: attr.defaultValue,
          }));
        }
      });
    } else if (selectedProduct && !isInitialized) {
      if (selectedProduct.dynamicAttributes) {
        selectedProduct.dynamicAttributes.forEach((attr) => {
          if (!attr.isEnabled) return;
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (!attrType) return;

          const attributeValues = attr.customValues && attr.customValues.length > 0
            ? attr.customValues
            : attrType.attributeValues || [];

          if (attributeValues.length === 1) {
            const singleValue = attributeValues[0];
            if (!selectedDynamicAttributes[attrType._id] || selectedDynamicAttributes[attrType._id] !== singleValue.value) {
              setSelectedDynamicAttributes((prev) => ({
                ...prev,
                [attrType._id]: singleValue.value
              }));
            }
          }
        });
      }
    }
  }, [selectedProduct, isInitialized, pdpAttributes, pdpRules, selectedDynamicAttributes, selectedPrintingOption, selectedDeliverySpeed, selectedTextureType]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedProduct(null);
        setProducts([]);

        let subcategoryId: string | null = null;
        let subcategoryData: SubCategory | null = null;
        const activeSubCategoryId = nestedSubCategoryId || subCategoryId;

        if (productId) {
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(productId);

          if (!isValidObjectId) {
            console.warn("Invalid productId format:", productId);
            setPdpError("Invalid product ID format. Please select a product from the list.");
            setPdpLoading(false);
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

                  const productData = pdpData.product;
                  const attributes = pdpData.attributes || [];
                  const subAttributes = pdpData.subAttributes || {};
                  const rules = pdpData.rules || [];
                  const quantityConfig = pdpData.quantityConfig;

                  if (productData.subcategory) {
                    if (typeof productData.subcategory === 'object' && productData.subcategory._id) {
                      subcategoryId = productData.subcategory._id;
                      subcategoryData = productData.subcategory;
                      setSelectedSubCategory(productData.subcategory);
                    } else if (typeof productData.subcategory === 'string') {
                      subcategoryId = productData.subcategory;
                    }
                  }

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
                  // Use default message
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

        if (!subcategoryId) {
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

              const searchId = activeSubCategoryId;
              if (searchId) {
                const isObjectId = /^[0-9a-fA-F]{24}$/.test(searchId);
                if (isObjectId) {
                  subcategoryData = flattenedData.find(
                    (sc: SubCategory) => sc._id === searchId
                  );
                } else {
                  subcategoryData = flattenedData.find(
                    (sc: SubCategory) =>
                      sc.slug === searchId ||
                      sc.name?.toLowerCase().replace(/\s+/g, '-') === searchId.toLowerCase().replace(/\s+/g, '-') ||
                      sc.name?.toLowerCase() === searchId.toLowerCase()
                  );
                }
              }

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

                const hasParent = subcategoryData.parent &&
                  (typeof subcategoryData.parent === 'object' ? subcategoryData.parent._id : subcategoryData.parent);

                if (hasParent && !nestedSubCategoryId && categoryId && subcategoryData.parent) {
                  const parentId = typeof subcategoryData.parent === 'object'
                    ? subcategoryData.parent._id
                    : subcategoryData.parent;
                  console.log(`Nested subcategory detected in list, redirecting to include parent: ${parentId}`);
                  navigate(`/digital-print/${categoryId}/${parentId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  setLoading(false);
                  return;
                }

                const isSlug = activeSubCategoryId && !/^[0-9a-fA-F]{24}$/.test(activeSubCategoryId);
                if (isSlug && subcategoryId && subcategoryId !== activeSubCategoryId) {
                  if (nestedSubCategoryId) {
                    navigate(`/digital-print/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  } else if (categoryId) {
                    navigate(`/digital-print/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  } else {
                    navigate(`/digital-print/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                  }
                }
              } else if (activeSubCategoryId) {
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

                        const hasParent = fetchedSubcategory.parent &&
                          (typeof fetchedSubcategory.parent === 'object' ? fetchedSubcategory.parent._id : fetchedSubcategory.parent);

                        if (hasParent && !nestedSubCategoryId && categoryId) {
                          const parentId = typeof fetchedSubcategory.parent === 'object'
                            ? fetchedSubcategory.parent._id
                            : fetchedSubcategory.parent;
                          console.log(`Nested subcategory detected, redirecting to include parent: ${parentId}`);
                          navigate(`/digital-print/${categoryId}/${parentId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          return;
                        }

                        const isSlug = activeSubCategoryId && !/^[0-9a-fA-F]{24}$/.test(activeSubCategoryId);
                        if (isSlug && subcategoryId && subcategoryId !== activeSubCategoryId) {
                          if (nestedSubCategoryId && subCategoryId) {
                            const parentSubcategoryId = /^[0-9a-fA-F]{24}$/.test(subCategoryId) ? subCategoryId : subCategoryId;
                            navigate(`/digital-print/${categoryId}/${parentSubcategoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          } else if (categoryId) {
                            navigate(`/digital-print/${categoryId}/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          } else {
                            navigate(`/digital-print/${subcategoryId}${productId ? `/${productId}` : ''}`, { replace: true });
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.warn("Error fetching subcategory via API:", err);
                }
              }
            }
          }
        }

        const subcategoryToCheck = subcategoryData?._id || activeSubCategoryId;

        if (subcategoryToCheck) {
          try {
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

                  nestedSubcategoriesArray.sort((a: SubCategory, b: SubCategory) => (a.sortOrder || 0) - (b.sortOrder || 0));

                  if (nestedSubcategoriesArray.length > 0) {
                    if (nestedSubcategoriesArray.length === 1 && !productId) {
                      const onlySubcat = nestedSubcategoriesArray[0];
                      const onlySubcatIdForLink = onlySubcat._id;

                      if (nestedSubCategoryId !== onlySubcatIdForLink && subCategoryId !== onlySubcatIdForLink) {
                        console.log(`Only one nested subcategory found: ${onlySubcat.name} (${onlySubcatIdForLink}). Auto-navigating...`);

                        const targetUrl = categoryId && subCategoryId
                          ? `/digital-print/${categoryId}/${subCategoryId}/${onlySubcatIdForLink}`
                          : `/digital-print/${categoryId}/${onlySubcatIdForLink}`;

                        navigate(targetUrl, { replace: true });
                        return;
                      }
                    }

                    console.log(`Found ${nestedSubcategoriesArray.length} nested subcategories for subcategory ${subcategoryToCheck}`);
                    setNestedSubCategories(nestedSubcategoriesArray);
                    setProducts([]);
                    setLoading(false);
                    return;
                  } else {
                    console.log(`No nested subcategories found for subcategory ${subcategoryToCheck}, will fetch products`);
                  }
                } catch (parseErr) {
                  console.error("Error parsing nested subcategories response:", parseErr);
                }
              }
            } else {
              console.log(`Nested subcategories check returned ${nestedSubcategoriesResponse.status}, will fetch products`);
            }
          } catch (nestedErr) {
            console.error("Error fetching nested subcategories:", nestedErr);
          }
        }

        setNestedSubCategories([]);

        let productsUrl: string;
        let productsResponse: Response;

        if (!subcategoryData || subcategoryData === null) {
          if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
            productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
            productsResponse = await fetch(productsUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            });
          } else {
            setProducts([]);
            setLoading(false);
            return;
          }
        } else if (subcategoryData && subcategoryData._id) {
          const productSubcategoryId = subcategoryData._id;
          const logSubcategoryName = subcategoryData.name || productSubcategoryId;
          console.log(`Fetching products for subcategory: ${logSubcategoryName} (${productSubcategoryId})`);
          productsUrl = `${API_BASE_URL}/products/subcategory/${productSubcategoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else if (categoryId && /^[0-9a-fA-F]{24}$/.test(categoryId)) {
          productsUrl = `${API_BASE_URL}/products/category/${categoryId}`;
          productsResponse = await fetch(productsUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
        } else {
          setProducts([]);
          setLoading(false);
          return;
        }

        const productsText = await productsResponse.text();
        if (productsText.startsWith("<!DOCTYPE") || productsText.startsWith("<html")) {
          console.error("Server returned HTML instead of JSON for products");
          setProducts([]);
        } else if (!productsResponse.ok) {
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

            if (!Array.isArray(productsData)) {
              console.warn("Products data is not an array:", productsData);
              setProducts([]);
            } else {
              const currentSubName = subcategoryData?.name || subcategoryData?._id || subcategoryId || 'category ' + categoryId;
              console.log(`Fetched ${productsData.length} product(s) for ${currentSubName}`);

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

              if (mappedProducts.length === 1 && !productId) {
                const singleProduct = mappedProducts[0];
                if (categoryId && subCategoryId) {
                  navigate(`/digital-print/${categoryId}/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else if (categoryId) {
                  navigate(`/digital-print/${categoryId}/${singleProduct._id}`, { replace: true });
                } else if (subCategoryId) {
                  navigate(`/digital-print/${subCategoryId}/${singleProduct._id}`, { replace: true });
                } else {
                  navigate(`/digital-print/${singleProduct._id}`, { replace: true });
                }
                setLoading(false);
                return;
              }

              if (productId && mappedProducts.length > 0) {
                const productToSelect = mappedProducts.find(p => p._id === productId || p.id === productId);
                if (productToSelect) {
                  setSelectedProduct(productToSelect);
                }
              }
            }
          } catch (parseErr) {
            console.error("Error parsing products data:", parseErr);
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId, nestedSubCategoryId, productId, navigate]);

  const handleProductSelect = (product: GlossProduct) => {
    setSelectedProduct(product);
    setSelectedPrintingOption("");
    setSelectedDeliverySpeed("");
    setSelectedTextureType("");

    const orderQuantity = product.filters?.orderQuantity;
    let smallestQuantity = 1000;

    if (orderQuantity) {
      if (orderQuantity.quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
        smallestQuantity = Math.min(...orderQuantity.stepWiseQuantities);
      } else if (orderQuantity.quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
        smallestQuantity = Math.min(...orderQuantity.rangeWiseQuantities.map((r) => r.min || 1000));
      } else {
        smallestQuantity = orderQuantity.min || 1000;
      }
    }

    setQuantity(smallestQuantity);
    setAppliedDiscount(null);

    const initialAttributes: { [key: string]: string | number | boolean | File | null | any[] } = {};
    if (product.dynamicAttributes && Array.isArray(product.dynamicAttributes)) {
      product.dynamicAttributes.forEach((attr) => {
        if (attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const attributeValues = attr.customValues && attr.customValues.length > 0
              ? attr.customValues
              : attrType.attributeValues || [];

            if (attrType.defaultValue && attributeValues.find((av: any) => av.value === attrType.defaultValue)) {
              initialAttributes[attrType._id] = attrType.defaultValue;
            } else if (attributeValues.length > 0) {
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
    setUserSelectedAttributes(new Set());
    setSelectedProductOptions([]);

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

  useEffect(() => {
    if (productId && products.length > 0 && !selectedProduct) {
      const productToSelect = products.find(p => p._id === productId || p.id === productId);
      if (productToSelect) {
        handleProductSelect(productToSelect);
      }
    }
  }, [productId, products, selectedProduct]);

  const generateQuantities = (product: GlossProduct) => {
    if (isInitialized && pdpAttributes.length > 0) {
      for (const attr of pdpAttributes) {
        if (!attr.isVisible) continue;

        const selectedValue = selectedDynamicAttributes[attr._id];
        if (!selectedValue) continue;

        if (attr.isStepQuantity && attr.stepQuantities && attr.stepQuantities.length > 0) {
          const stepQuantities = attr.stepQuantities
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

        if (attr.isRangeQuantity && attr.rangeQuantities && attr.rangeQuantities.length > 0) {
          const quantities: number[] = [];
          attr.rangeQuantities.forEach((range: any) => {
            const min = typeof range === 'object' ? parseFloat(range.min) : 0;
            const max = typeof range === 'object' && range.max ? parseFloat(range.max) : null;

            if (min > 0) {
              if (!quantities.includes(min)) {
                quantities.push(min);
              }
              if (max && max > min) {
                const step = Math.max(1, Math.floor((max - min) / 5));
                for (let q = min + step; q < max; q += step) {
                  if (!quantities.includes(q)) {
                    quantities.push(q);
                  }
                }
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

    if (selectedProduct && selectedProduct.dynamicAttributes) {
      for (const attr of selectedProduct.dynamicAttributes) {
        if (!attr.isEnabled) continue;

        const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
        if (!attrType) continue;

        const selectedValue = selectedDynamicAttributes[attrType._id];
        if (!selectedValue) continue;

        if ((attrType as any).isStepQuantity && (attrType as any).stepQuantities && (attrType as any).stepQuantities.length > 0) {
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
          const quantities: number[] = [];
          (attrType as any).rangeQuantities.forEach((range: any) => {
            const min = typeof range === 'object' ? parseFloat(range.min) : 0;
            const max = typeof range === 'object' && range.max ? parseFloat(range.max) : null;

            if (min > 0) {
              if (!quantities.includes(min)) {
                quantities.push(min);
              }
              if (max && max > min) {
                const step = Math.max(1, Math.floor((max - min) / 5));
                for (let q = min + step; q < max; q += step) {
                  if (!quantities.includes(q)) {
                    quantities.push(q);
                  }
                }
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

    const orderQuantity = product.filters.orderQuantity;
    const quantityType = orderQuantity.quantityType || "SIMPLE";

    if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
      return orderQuantity.stepWiseQuantities.filter(qty => qty > 0).sort((a, b) => a - b);
    } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
      const quantities: number[] = [];
      orderQuantity.rangeWiseQuantities.forEach(range => {
        if (range.min > 0) {
          if (!quantities.includes(range.min)) {
            quantities.push(range.min);
          }
          if (range.max && range.max > range.min) {
            const step = Math.max(1, Math.floor((range.max - range.min) / 5));
            for (let q = range.min + step; q < range.max; q += step) {
              if (!quantities.includes(q)) {
                quantities.push(q);
              }
            }
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
      const { min, max, multiples } = orderQuantity;
      const quantities: number[] = [];
      for (let q = min; q <= max && q <= min + (multiples * 20); q += multiples) {
        quantities.push(q);
      }
      return quantities;
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      let basePrice = selectedProduct.basePrice;

      if (selectedProduct.filters?.orderQuantity?.quantityType === "RANGE_WISE" &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities &&
        selectedProduct.filters.orderQuantity.rangeWiseQuantities.length > 0) {
        const applicableRange = selectedProduct.filters.orderQuantity.rangeWiseQuantities.find((range) => {
          return quantity >= range.min && (range.max === null || range.max === undefined || quantity <= range.max);
        });
        if (applicableRange && applicableRange.priceMultiplier !== undefined && applicableRange.priceMultiplier !== 1.0) {
          basePrice = basePrice * applicableRange.priceMultiplier;
        }
      }

      let printingOptionImpact = 0;
      let deliverySpeedImpact = 0;
      let textureTypeImpact = 0;
      const dynamicAttributesChargesList: Array<{ name: string; label: string; charge: number }> = [];

      const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;

      if (filterPricesEnabled) {
        if (selectedPrintingOption && selectedProduct.filters?.printingOptionPrices) {
          const priceData = selectedProduct.filters.printingOptionPrices.find((p) => p.name === selectedPrintingOption);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(String(priceData.priceAdd)) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            printingOptionImpact = impactPerUnit * quantity;
          }
        }

        if (selectedDeliverySpeed && selectedProduct.filters?.deliverySpeedPrices) {
          const priceData = selectedProduct.filters.deliverySpeedPrices.find((p) => p.name === selectedDeliverySpeed);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(String(priceData.priceAdd)) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            deliverySpeedImpact = impactPerUnit * quantity;
          }
        }

        if (selectedTextureType && selectedProduct.filters?.textureTypePrices) {
          const priceData = selectedProduct.filters.textureTypePrices.find((p) => p.name === selectedTextureType);
          if (priceData && priceData.priceAdd !== undefined) {
            const priceAdd = typeof priceData.priceAdd === 'number' ? priceData.priceAdd : parseFloat(String(priceData.priceAdd)) || 0;
            const impactPerUnit = priceAdd / 1000;
            basePrice += impactPerUnit;
            textureTypeImpact = impactPerUnit * quantity;
          }
        }
      } else {
        if (selectedProduct.options && Array.isArray(selectedProduct.options)) {
          selectedProduct.options.forEach((option) => {
            if (option.name === selectedPrintingOption) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(String(option.priceAdd)) || 0;
              if (priceAdd > 0) {
                const impactPerUnit = priceAdd / 1000;
                basePrice += impactPerUnit;
                printingOptionImpact = impactPerUnit * quantity;
              } else if (priceAdd < 0) {
                const multiplier = (1 + Math.abs(priceAdd) / 100);
                const oldPrice = basePrice;
                basePrice *= multiplier;
                printingOptionImpact = (basePrice - oldPrice) * quantity;
              }
            } else if (option.name === selectedDeliverySpeed) {
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(String(option.priceAdd)) || 0;
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
              const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(String(option.priceAdd)) || 0;
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

      let productOptionsImpact = 0;
      if (selectedProduct.options && Array.isArray(selectedProduct.options) && selectedProductOptions.length > 0) {
        selectedProductOptions.forEach((optionName) => {
          const option = selectedProduct.options?.find((opt) => opt.name === optionName);
          if (option && option.priceAdd !== undefined) {
            const priceAdd = typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(String(option.priceAdd)) || 0;
            if (priceAdd !== 0) {
              const impactPerUnit = priceAdd / 1000;
              basePrice += impactPerUnit;
              productOptionsImpact += impactPerUnit * quantity;
            }
          }
        });
      }
      setProductOptionsCharge(productOptionsImpact);

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

                if (Array.isArray(selectedValue)) {
                  const selectedLabels: string[] = [];
                  let totalCharge = 0;
                  selectedValue.forEach((val) => {
                    const attrValue = attributeValues.find((av) => av.value === val);
                    if (attrValue) {
                      let priceAdd = 0;
                      if (attrValue.description) {
                        const priceImpactMatch = attrValue.description.match(/Price Impact: ₹([\d.]+)/);
                        if (priceImpactMatch) {
                          priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                        }
                      }

                      if (priceAdd > 0) {
                        totalCharge += priceAdd * quantity;
                        if (attrValue.label) selectedLabels.push(attrValue.label);
                      } else if (attrValue.priceMultiplier && attrValue.priceMultiplier !== 1) {
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
                  const attrValue = attributeValues.find((av) => av.value === selectedValue);
                  if (attrValue) {
                    let priceAdd = 0;
                    if (attrValue.description) {
                      const priceImpactMatch = attrValue.description.match(/Price Impact: ₹([\d.]+)/);
                      if (priceImpactMatch) {
                        priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                      }
                    }

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

      const baseSubtotal = basePrice * quantity;

      let discountMultiplier = 1.0;
      let currentDiscount = null;
      if (selectedProduct.quantityDiscounts && Array.isArray(selectedProduct.quantityDiscounts)) {
        const applicableDiscount = selectedProduct.quantityDiscounts.find((discount) => {
          const minQty = discount.minQuantity || 0;
          const maxQty = discount.maxQuantity;
          return quantity >= minQty && (maxQty === null || maxQty === undefined || quantity <= maxQty);
        });

        if (applicableDiscount) {
          if (applicableDiscount.priceMultiplier) {
            discountMultiplier = applicableDiscount.priceMultiplier;
          } else if (applicableDiscount.discountPercentage) {
            discountMultiplier = (100 - applicableDiscount.discountPercentage) / 100;
          }
          currentDiscount = applicableDiscount.discountPercentage || 0;
        }
      }

      const totalAttributeCharges = dynamicAttributesChargesList.reduce((sum, charge) => sum + charge.charge, 0);

      setBaseSubtotalBeforeDiscount(baseSubtotal);

      const calculatedSubtotal = baseSubtotal * discountMultiplier;
      const subtotalWithCharges = calculatedSubtotal + totalAttributeCharges;

      setSubtotal(subtotalWithCharges);
      setAppliedDiscount(currentDiscount);

      setPrintingOptionCharge(printingOptionImpact);
      setDeliverySpeedCharge(deliverySpeedImpact);
      setTextureTypeCharge(textureTypeImpact);
      setDynamicAttributesCharges(dynamicAttributesChargesList);

      const designCharge = selectedProduct.additionalDesignCharge || 0;
      setAdditionalDesignCharge(designCharge);

      const gstPercent = selectedProduct.gstPercentage || 0;
      const calculatedGst = (subtotalWithCharges + designCharge) * (gstPercent / 100);
      setGstAmount(calculatedGst);

      const priceExcludingGst = subtotalWithCharges + designCharge;
      setPrice(priceExcludingGst);

      const perUnitExcludingGst = quantity > 0 ? priceExcludingGst / quantity : basePrice;
      setPerUnitPriceExcludingGst(perUnitExcludingGst);
    }
  }, [selectedProduct, selectedPrintingOption, selectedDeliverySpeed, selectedTextureType, quantity, selectedDynamicAttributes, selectedProductOptions]);

  useEffect(() => {
    if (!selectedProduct) return;

    const availableQuantities = generateQuantities(selectedProduct);
    if (availableQuantities.length > 0 && !availableQuantities.includes(quantity)) {
      setQuantity(availableQuantities[0]);
    }
  }, [selectedDynamicAttributes, selectedProduct, quantity]);

  const getPreviewClasses = (excludeSize: boolean = false) => {
    const classes: string[] = ['preview-container'];

    if (!selectedProduct) {
      classes.push('gloss');
      return classes.join(' ');
    }

    const productName = selectedProduct.name?.toLowerCase() || '';
    const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;

    if (hasTextureType || selectedTextureType) {
      classes.push('uv', 'texture');

      if (selectedTextureType) {
        const textureMatch = selectedTextureType.match(/No\.(\d+)/);
        if (textureMatch) {
          const textureNum = textureMatch[1];
          classes.push(`texture-${textureNum}`);
        }
      } else if (hasTextureType) {
        classes.push('texture-1');
      }
    } else if (productName.includes('lamination')) {
      classes.push('laminated');
    } else if (productName.includes('uv') && !productName.includes('texture')) {
      classes.push('uv');
    } else if (productName.includes('without') || productName.includes('basic')) {
      classes.push('none');
    } else {
      classes.push('gloss');
    }

    if (!excludeSize && productName.includes('small')) {
      classes.push('small');
    }

    return classes.join(' ');
  };

  const parseInstructions = (instructions: string) => {
    const rules: { maxSizeMB?: number; fileWidth?: number; fileHeight?: number; blockCDRandJPG?: boolean; allowedFormats?: string[] } = {};

    if (!instructions) return rules;

    const maxSizeMatch = instructions.match(/max(?:imum)?\s+file\s+size[:\s]+(\d+)\s*mb/i);
    if (maxSizeMatch) {
      rules.maxSizeMB = parseInt(maxSizeMatch[1]);
    }

    const dimensionMatch = instructions.match(/(\d+)\s*[×x]\s*(\d+)\s*pixels?/i);
    if (dimensionMatch) {
      rules.fileWidth = parseInt(dimensionMatch[1]);
      rules.fileHeight = parseInt(dimensionMatch[2]);
    }

    if (/cdr|jpg|jpeg.*not\s+(?:accepted|allowed|permitted)/i.test(instructions)) {
      rules.blockCDRandJPG = true;
    }

    const formatMatch = instructions.match(/(?:format|file\s+type|extension).*?only[:\s]+([^.]+)/i);
    if (formatMatch) {
      const formats = formatMatch[1].split(/[,\s]+or\s+/i).map(f => f.trim().toLowerCase());
      rules.allowedFormats = formats;
    }

    return rules;
  };

  const handleDesignFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      e.target.value = "";
      return;
    }

    const instructionRules = selectedProduct?.instructions ? parseInstructions(selectedProduct.instructions) : {};

    const maxSizeMB = instructionRules.maxSizeMB || selectedProduct?.maxFileSizeMB || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size must be less than ${maxSizeMB} MB as specified in the instructions`);
      e.target.value = "";
      return;
    }

    const blockCDRandJPG = instructionRules.blockCDRandJPG !== undefined
      ? instructionRules.blockCDRandJPG
      : selectedProduct?.blockCDRandJPG || false;

    if (blockCDRandJPG) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      if (extension === 'cdr' || extension === 'jpg' || extension === 'jpeg') {
        alert("CDR and JPG files are not accepted for this product as per instructions. Please use PNG, PDF, or other formats.");
        e.target.value = "";
        return;
      }
    }

    if (instructionRules.allowedFormats && instructionRules.allowedFormats.length > 0) {
      const fileName = file.name.toLowerCase();
      const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
      const isAllowed = instructionRules.allowedFormats.some(format =>
        extension.includes(format.toLowerCase())
      );
      if (!isAllowed) {
        alert(`Only ${instructionRules.allowedFormats.join(', ').toUpperCase()} files are accepted as per instructions.`);
        e.target.value = "";
        return;
      }
    }

    const minWidth = selectedProduct?.minFileWidth;
    const maxWidth = selectedProduct?.maxFileWidth;
    const minHeight = selectedProduct?.minFileHeight;
    const maxHeight = selectedProduct?.maxFileHeight;

    if (minWidth || maxWidth || minHeight || maxHeight) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let validationErrors: string[] = [];

        if (minWidth && img.width < minWidth) {
          validationErrors.push(`Image width must be at least ${minWidth} pixels. Current width: ${img.width} pixels.`);
        }
        if (maxWidth && img.width > maxWidth) {
          validationErrors.push(`Image width must be at most ${maxWidth} pixels. Current width: ${img.width} pixels.`);
        }

        if (minHeight && img.height < minHeight) {
          validationErrors.push(`Image height must be at least ${minHeight} pixels. Current height: ${img.height} pixels.`);
        }
        if (maxHeight && img.height > maxHeight) {
          validationErrors.push(`Image height must be at most ${maxHeight} pixels. Current height: ${img.height} pixels.`);
        }

        if (validationErrors.length > 0) {
          alert(validationErrors.join("\n"));
          e.target.value = "";
          return;
        }

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
        e.target.value = "";
      };

      img.src = objectUrl;
    } else {
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateDeliveryFromNearestBranch = async (userLat: number, userLon: number, locationAddress: string) => {
    const branches = [
      { name: 'Main Branch', address: '1-A, One Colony, One Street, One, India', latitude: 28.6139, longitude: 77.2090, pincode: '110001' },
      { name: 'Branch 2', address: '2-B, Two Colony, Two Street, Two, India', latitude: 19.0760, longitude: 72.8777, pincode: '400001' },
      { name: 'Branch 3', address: '3-C, Three Colony, Three Street, Three, India', latitude: 12.9716, longitude: 77.5946, pincode: '560001' },
    ];

    let nearestBranch = branches[0];
    let minDistance = calculateDistance(userLat, userLon, branches[0].latitude, branches[0].longitude);

    for (const branch of branches) {
      const distance = calculateDistance(userLat, userLon, branch.latitude, branch.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }

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

  const getPincodeCoordinates = async (pincode: string): Promise<{ lat: number; lon: number; address: string } | null> => {
    try {
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
      console.error("Error getting pincode coordinates:", err);
    }
    return null;
  };

  useEffect(() => {
    const fetchDeliveryEstimate = async () => {
      if (!selectedProduct) return;

      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;

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
                console.error("Geocode error:", geocodeErr);
              }

              const estimate = await calculateDeliveryFromNearestBranch(latitude, longitude, locationAddress);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(estimate.locationSource);
            },
            async () => {
              const savedPincode = localStorage.getItem('userPincode');
              if (savedPincode && savedPincode.length === 6) {
                const coords = await getPincodeCoordinates(savedPincode);
                if (coords) {
                  const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
                  setEstimatedDeliveryDate(estimate.deliveryDate);
                  setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
                } else {
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
          const savedPincode = localStorage.getItem('userPincode');
          if (savedPincode && savedPincode.length === 6) {
            const coords = await getPincodeCoordinates(savedPincode);
            if (coords) {
              const estimate = await calculateDeliveryFromNearestBranch(coords.lat, coords.lon, coords.address);
              setEstimatedDeliveryDate(estimate.deliveryDate);
              setDeliveryLocationSource(`[Pincode: ${savedPincode}]`);
            } else {
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
        console.error("Error fetching delivery estimate:", err);
      }
    };

    fetchDeliveryEstimate();
  }, [selectedProduct]);

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
        console.error("Reverse geocoding error:", err);
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

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setValidationError("Please login to place an order. Redirecting to login page...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      return;
    }

    firstErrorField.current = null;

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
          const uploadSection = document.querySelector('[data-upload-section]') as HTMLElement;
          if (uploadSection) firstErrorField.current = uploadSection;
        }
      }
    }

    if (selectedProduct?.dynamicAttributes) {
      selectedProduct.dynamicAttributes.forEach((attr) => {
        if (attr.isRequired && attr.isEnabled) {
          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
          if (attrType) {
            const value = selectedDynamicAttributes[attrType._id];
            if (!value || (Array.isArray(value) && value.length === 0)) {
              validationErrors.push(`${attrType.attributeName} is required`);
              if (!firstErrorField.current) {
                const wrapper = document.querySelector(`[data-attribute="${attrType._id}"]`) as HTMLElement;
                if (wrapper) {
                  const input = wrapper.querySelector('input, select, button') as HTMLElement;
                  firstErrorField.current = input || wrapper;
                } else {
                  const section = document.querySelector(`[data-attribute-name="${attrType.attributeName}"]`) as HTMLElement;
                  if (section) firstErrorField.current = section;
                }
              }
            }

            if (value && (attrType.inputStyle === 'DROPDOWN' || attrType.inputStyle === 'RADIO')) {
              const attributeValues = attr.customValues && attr.customValues.length > 0
                ? attr.customValues
                : attrType.attributeValues || [];

              const selectedOption = Array.isArray(value)
                ? attributeValues.find((av) => value.includes(av.value))
                : attributeValues.find((av) => av.value === value);

              if (selectedOption && selectedOption.description) {
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
                        const imageSection = wrapper.querySelector('.bg-cream-50') as HTMLElement;
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
      setValidationError(validationErrors.join('\n'));

      setTimeout(() => {
        if (firstErrorField.current) {
          firstErrorField.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          setTimeout(() => {
            if (firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement) {
              firstErrorField.current?.focus();
            } else {
              const input = firstErrorField.current?.querySelector('input, select, button') as HTMLElement;
              if (input && (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLButtonElement)) {
                input.focus();
              }
            }
          }, 300);

          const elementToHighlight = firstErrorField.current instanceof HTMLInputElement || firstErrorField.current instanceof HTMLSelectElement
            ? firstErrorField.current
            : firstErrorField.current?.querySelector('input, select, button') as HTMLElement || firstErrorField.current;

          if (elementToHighlight) {
            elementToHighlight.style.borderColor = '#ef4444';
            elementToHighlight.style.borderWidth = '2px';
            elementToHighlight.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

            setTimeout(() => {
              elementToHighlight.style.borderColor = '';
              elementToHighlight.style.borderWidth = '';
              elementToHighlight.style.boxShadow = '';
            }, 3000);
          }
        } else {
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

    setValidationError(null);
    setShowPaymentModal(true);
    setPaymentError(null);
  };

  const handlePaymentAndOrder = async () => {
    if (!selectedProduct) {
      setPaymentError("Please select a product.");
      return;
    }
    if (!frontDesignFile || !frontDesignPreview) {
      setPaymentError("Please upload a reference image.");
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
      await new Promise((resolve) => setTimeout(resolve, 300));

      const uploadedDesign: any = {};

      if (!frontDesignPreview || !frontDesignFile) {
        throw new Error("Front design image is required.");
      }

      try {
        const reader = new FileReader();
        const frontImageData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(frontDesignFile);
        });

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

      if (backDesignFile && backDesignPreview) {
        try {
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
          console.error("Error preparing back image:", err);
        }
      }

      const selectedOptions = selectedProductOptions.map(optionName => {
        const option = selectedProduct.options?.find((opt) => opt.name === optionName);
        return {
          optionId: optionName,
          optionName: option?.name || optionName,
          name: option?.name || optionName,
          priceAdd: option?.priceAdd || 0,
          description: option?.description || null,
          image: option?.image || null,
        };
      });

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
        uploadedImages?: Array<{ data: string; contentType: string; filename: string }>;
      }> = [];

      for (const key of Object.keys(selectedDynamicAttributes)) {
        const value = selectedDynamicAttributes[key];
        if (value !== null && value !== undefined && value !== "") {
          if (key.includes('__')) {
            const [attrId, parentValue] = key.split('__');
            const subAttributesKey = `${attrId}:${parentValue}`;
            const subAttributes = pdpSubAttributes[subAttributesKey] || [];
            const selectedSubAttr = subAttributes.find((sa) => sa.value === value);

            if (selectedSubAttr) {
              const productAttr = selectedProduct.dynamicAttributes?.find(
                (attr) => {
                  const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                  return attrType?._id === attrId;
                }
              );

              if (productAttr) {
                const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
                if (attrType) {
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
            const productAttr = selectedProduct.dynamicAttributes?.find(
              (attr) => {
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

                let selectedValueDetails: any = null;
                if (Array.isArray(value)) {
                  selectedValueDetails = allValues.filter((av) => value.includes(av.value));
                } else {
                  selectedValueDetails = allValues.find((av) => av.value === value || av.value === value.toString());
                }

                if (selectedValueDetails) {
                  if (Array.isArray(selectedValueDetails)) {
                    const labels = selectedValueDetails.map((sv) => sv.label || sv.value).join(", ");
                    let totalPriceAdd = 0;
                    let totalPriceMultiplier = 0;

                    selectedValueDetails.forEach((sv) => {
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

                    const imagesKey = `${key}_images`;
                    const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                      ? (selectedDynamicAttributes[imagesKey] as File[]).filter((f) => f !== null)
                      : [];

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
                      description: selectedValueDetails.map((sv) => sv.description).filter(Boolean).join("; ") || undefined,
                      image: selectedValueDetails[0]?.image || undefined,
                      uploadedImages: attributeImages.length > 0 ? attributeImages : undefined,
                    });
                  } else {
                    let priceAdd = 0;
                    let priceMultiplier = selectedValueDetails.priceMultiplier;

                    if (selectedValueDetails.description) {
                      const priceImpactMatch = selectedValueDetails.description.match(/Price Impact: ₹([\d.]+)/);
                      if (priceImpactMatch) {
                        priceAdd = parseFloat(priceImpactMatch[1]) || 0;
                        if (priceAdd > 0) {
                          priceMultiplier = undefined;
                        }
                      }
                    }

                    const imagesKey = `${key}_images`;
                    const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                      ? (selectedDynamicAttributes[imagesKey] as File[]).filter((f) => f !== null)
                      : [];

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
                      label: selectedValueDetails.label || value?.toString() || "",
                      priceMultiplier: priceMultiplier || undefined,
                      priceAdd: priceAdd,
                      description: selectedValueDetails.description || undefined,
                      image: selectedValueDetails.image || undefined,
                      uploadedImages: attributeImages.length > 0 ? attributeImages : undefined,
                    });
                  }
                } else {
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

            if (value instanceof File) {
              orderDynamicAttributes[key] = value.name;
            } else {
              orderDynamicAttributes[key] = value;
            }
          }
        }
      }

      const orderData = {
        productId: selectedProduct._id,
        quantity: quantity,
        finish: selectedPrintingOption || "Standard",
        shape: selectedDeliverySpeed || "Rectangular",
        selectedOptions: selectedOptions,
        selectedDynamicAttributes: selectedDynamicAttributesArray,
        promoCodes: promoCodes || [],
        pincode: pincode.trim(),
        address: address.trim(),
        mobileNumber: mobileNumber.trim(),
        uploadedDesign: uploadedDesign,
        notes: orderNotes || "",
        advancePaid: 0,
        paymentStatus: "pending",
        paymentGatewayInvoiceId: null,
        paperGSM: orderDynamicAttributes.paperGSM || null,
        paperQuality: orderDynamicAttributes.paperQuality || null,
        laminationType: orderDynamicAttributes.laminationType || null,
        specialEffects: orderDynamicAttributes.specialEffects ? [orderDynamicAttributes.specialEffects] : [],
      };

      const token = localStorage.getItem("token");
      let response: Response;

      if (!token) {
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
        response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData),
        });
      }

      if (!response.ok) {
        let errorMessage = "Failed to create order. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;

          if (errorMessage.includes("No token provided") || errorMessage.includes("token")) {
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
              if (retryData.token) {
                localStorage.setItem("token", retryData.token);
                if (retryData.user) {
                  localStorage.setItem("user", JSON.stringify(retryData.user));
                }
              }
              const order = retryData.order;
              setShowPaymentModal(false);
              setIsProcessingPayment(false);

              if (retryData.isNewUser && retryData.tempPassword) {
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

      if (responseData.token) {
        localStorage.setItem("token", responseData.token);
        if (responseData.user) {
          localStorage.setItem("user", JSON.stringify(responseData.user));
        }
      }

      const newUserInfo = responseData.isNewUser && responseData.tempPassword
        ? { tempPassword: responseData.tempPassword }
        : null;

      const paymentToken = localStorage.getItem("token") || responseData.token;
      console.log("🔄 Step 4: Initializing payment...");
      console.log("📦 Order ID:", order._id || order.order?._id);
      console.log("💰 Amount:", order.totalPrice || order.priceSnapshot?.finalTotal);
      console.log("🔑 Token available:", !!paymentToken);

      try {
        const paymentResponse = await fetch(`${API_BASE_URL}/payment/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${paymentToken}`,
          },
          body: JSON.stringify({
            orderId: order._id || order.order?._id,
            amount: Math.round((order.totalPrice || order.priceSnapshot?.finalTotal || 0) * 100),
            currency: "INR",
            customerInfo: {
              name: customerName.trim(),
              email: customerEmail.trim(),
              phone: mobileNumber.trim(),
            },
          }),
        });

        if (!paymentResponse.ok) {
          const paymentError = await paymentResponse.json().catch(() => ({}));
          throw new Error(paymentError.message || "Failed to initialize payment");
        }

        const paymentData = await paymentResponse.json();

        const checkoutData = paymentData.checkout_data || paymentData.checkoutData;
        const transactionId = paymentData.transaction_id || paymentData.transactionId;

        console.log("✅ Payment initialized successfully:", paymentData);
        console.log("📊 checkoutData available:", !!checkoutData);
        console.log("🌐 Razorpay SDK loaded:", typeof window !== 'undefined' && !!(window as any).Razorpay);
        console.log("🌐 PayU Bolt SDK loaded:", typeof window !== 'undefined' && !!(window as any).bolt);

        const selectedGateway = paymentData.gateway || 'RAZORPAY';
        console.log(`💳 Payment gateway selected: ${selectedGateway}`);

        const isRedirectRequired = paymentData.redirect_required || false;

        console.log(`🔍 Redirect required: ${isRedirectRequired}`);
        console.log(`🔍 Checkout URL: ${paymentData.checkout_url}`);

        if (isRedirectRequired && paymentData.checkout_url && checkoutData) {
          console.log('🔄 Using redirect-based payment flow');
          console.log('📝 Checkout data:', checkoutData);

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = paymentData.checkout_url;

          Object.keys(checkoutData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = checkoutData[key];
            form.appendChild(input);
          });

          document.body.appendChild(form);
          console.log('✅ Redirect form created, submitting to:', paymentData.checkout_url);
          form.submit();

        } else if (selectedGateway === 'RAZORPAY' && typeof window !== 'undefined' && (window as any).Razorpay && checkoutData) {
          const rzp = new (window as any).Razorpay({
            key: checkoutData.key,
            amount: checkoutData.amount,
            currency: checkoutData.currency,
            name: "Print24",
            description: `Order #${order.orderNumber || ""}`,
            order_id: checkoutData.order_id,
            prefill: {
              name: customerName.trim(),
              email: customerEmail.trim(),
              contact: mobileNumber.trim(),
            },
            notes: {
              orderId: order._id || order.order?._id,
            },
            theme: {
              color: "#3B82F6",
            },
            handler: async (razorpayResponse: any) => {
              try {
                const verifyResponse = await fetch(`${API_BASE_URL}/payment/verify`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${paymentToken}`,
                  },
                  body: JSON.stringify({
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_order_id: razorpayResponse.razorpay_order_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                    transactionId: transactionId,
                  }),
                });

                if (verifyResponse.ok) {
                  setShowPaymentModal(false);
                  setIsProcessingPayment(false);

                  if (newUserInfo?.tempPassword) {
                    alert(`Account created successfully!\n\nYour temporary password: ${newUserInfo.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nPayment successful! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
                  } else {
                    alert(`Payment successful! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
                  }

                  navigate(`/order/${order._id || order.order?._id}`);
                } else {
                  throw new Error("Payment verification failed");
                }
              } catch (verifyError) {
                console.error('Payment verification failed:', verifyError);
                setShowPaymentModal(false);
                setIsProcessingPayment(false);
                alert(`Payment verification failed.\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nPlease contact support or retry payment from order details.`);
                navigate(`/order/${order._id || order.order?._id}`);
              }
            },
            modal: {
              ondismiss: () => {
                console.log('Payment modal dismissed by user');
                setShowPaymentModal(false);
                setIsProcessingPayment(false);
                alert(`Payment cancelled.\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nYour order is saved. You can complete payment from order details page.`);
                navigate(`/order/${order._id || order.order?._id}`);
              },
            },
          });

          rzp.on("payment.failed", (response: any) => {
            console.error('Razorpay payment failed:', response.error);
            setShowPaymentModal(false);
            setIsProcessingPayment(false);
            alert(`Payment failed: ${response.error.description || "Unknown error"}\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nYou can retry payment from order details page.`);
            navigate(`/order/${order._id || order.order?._id}`);
          });

          rzp.open();

        } else if ((selectedGateway === 'STRIPE' || selectedGateway === 'PHONEPE') && (paymentData.checkout_url || paymentData.checkoutUrl)) {
          const redirectUrl = paymentData.checkout_url || paymentData.checkoutUrl;
          console.log(`🔗 Redirecting to ${selectedGateway} checkout:`, redirectUrl);
          window.location.href = redirectUrl;

        } else {
          console.warn(`Payment SDK not loaded for ${selectedGateway}, showing order success`);
          setShowPaymentModal(false);
          setIsProcessingPayment(false);
          alert(`Order placed successfully! Order Number: ${order.orderNumber || "N/A"}\n\nPayment will be processed offline.`);
          navigate(`/order/${order._id || order.order?._id}`);
        }
      } catch (paymentError) {
        console.error("Payment initialization failed:", paymentError);
        setShowPaymentModal(false);
        setIsProcessingPayment(false);
        alert(`Order created but payment could not be initialized.\n\nOrder Number: ${order.orderNumber || "N/A"}\n\nPlease complete payment from your order details page.`);
        navigate(`/order/${order._id || order.order?._id}`);
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to process payment and create order. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-4 sm:py-8">
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
        
        .preview-container.texture-3::before {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        .preview-container.texture-4::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
          background-size: 6px 6px;
        }
        
        .preview-container.texture-5::before {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
        .preview-container.texture-6::before {
          background-image: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.03) 3px,
            rgba(0, 0, 0, 0.03) 6px
          );
        }
        
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
        
        .preview-container.texture-8::before {
          background-image: radial-gradient(circle, rgba(0, 0, 0, 0.03) 0.5px, transparent 0.5px);
          background-size: 4px 4px;
        }
        
        .preview-container.none .card-image {
          filter: saturate(0.9) contrast(0.95) !important;
        }
        
        .preview-container.small {
          transform: scale(0.8);
          transition: transform 0.3s ease, max-width 0.3s ease;
        }
        
        .preview-container.small .card-image {
          transform: scale(1);
        }
        
        .preview-container .card-image {
          max-width: 100%;
          max-height: 90vh;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          <BackButton
            onClick={() => {
              const isProductSameAsNested = productId === nestedSubCategoryId;
              const isProductSameAsSub = productId === subCategoryId;

              if (productId && nestedSubCategoryId && subCategoryId && categoryId && !isProductSameAsNested) {
                navigate(`/digital-print/${categoryId}/${subCategoryId}/${nestedSubCategoryId}`);
              } else if (productId && subCategoryId && categoryId && !isProductSameAsSub) {
                navigate(`/digital-print/${categoryId}/${subCategoryId}`);
              } else if (productId && categoryId) {
                navigate(`/digital-print/${categoryId}`);
              } else if (nestedSubCategoryId && subCategoryId && categoryId) {
                navigate(`/digital-print/${categoryId}/${subCategoryId}`);
              } else if (subCategoryId && categoryId) {
                navigate(`/digital-print/${categoryId}`);
              } else if (categoryId) {
                navigate("/digital-print");
              } else {
                navigate("/digital-print");
              }
              window.scrollTo(0, 0);
            }}
            fallbackPath={
              productId && nestedSubCategoryId && subCategoryId && categoryId && productId !== nestedSubCategoryId
                ? `/digital-print/${categoryId}/${subCategoryId}/${nestedSubCategoryId}`
                : productId && subCategoryId && categoryId && productId !== subCategoryId
                  ? `/digital-print/${categoryId}/${subCategoryId}`
                  : productId && categoryId
                    ? `/digital-print/${categoryId}`
                    : nestedSubCategoryId && subCategoryId && categoryId
                      ? `/digital-print/${categoryId}/${subCategoryId}`
                      : subCategoryId && categoryId
                        ? `/digital-print/${categoryId}`
                        : categoryId
                          ? `/digital-print/${categoryId}`
                          : "/digital-print"
            }
            label={
              (productId && subCategoryId && productId !== subCategoryId) || (productId && nestedSubCategoryId && productId !== nestedSubCategoryId)
                ? "Back to products"
                : productId && categoryId
                  ? "Back to Category"
                  : subCategoryId
                    ? "Back to Category"
                    : categoryId
                      ? "Back to Categories"
                      : "Back to Categories"
            }
            className="text-sm sm:text-base text-cream-600 hover:text-cream-900"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-cream-900" size={48} />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {pdpError && productId && (
          <div className="min-h-screen flex items-center justify-center bg-cream-50">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-cream-900 mb-2">Error Loading Product</h2>
              <p className="text-cream-700 mb-4">{pdpError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-4 mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3 text-red-700 shadow-lg z-50"
              role="alert"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold mb-1 text-red-900">Please complete the required fields:</p>
                <ul className="text-sm whitespace-pre-wrap font-sans list-disc list-inside space-y-1">
                  {validationError.split('\n').filter(line => line.trim()).map((error, idx) => (
                    <li key={idx} className="text-red-800">{error.replace(/^Please fill in all required fields:\n?/, '')}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="shrink-0 text-red-500 hover:text-red-700 transition-colors"
                aria-label="Close error message"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !error && !pdpLoading && !pdpError && (
          <>
            <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 min-h-[600px]">
              <div className="lg:w-1/2">
                <div className="lg:sticky lg:top-24 space-y-4">
                  <motion.div
                    className="bg-white p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 flex items-center justify-center min-h-[320px] sm:min-h-[420px] md:min-h-[520px] bg-cream-100/50"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {(() => {
                        let displayImage = selectedProduct?.image || selectedSubCategory?.image || "/Glossy.png";
                        let displayAlt = selectedProduct?.name || selectedSubCategory?.name || "Product Preview";

                        if (!displayImage || displayImage.trim() === "" || displayImage === "null" || displayImage === "undefined") {
                          displayImage = selectedSubCategory?.image || "/Glossy.png";
                        }

                        if (selectedProduct && selectedProduct.dynamicAttributes && userSelectedAttributes.size > 0) {
                          const sortedAttributes = [...selectedProduct.dynamicAttributes]
                            .filter(attr => attr.isEnabled)
                            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                          for (const attr of sortedAttributes) {
                            const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                            if (!attrType) continue;

                            if (!userSelectedAttributes.has(attrType._id)) continue;

                            const selectedValue = selectedDynamicAttributes[attrType._id];
                            if (!selectedValue) continue;

                            const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

                            const attributeValues = attr.customValues && attr.customValues.length > 0
                              ? attr.customValues
                              : attrType.attributeValues || [];

                            let foundImage = false;
                            for (const val of selectedValues) {
                              const selectedAttrValue = attributeValues.find((av) =>
                                av.value === val || av.value === String(val)
                              );

                              if (selectedAttrValue && selectedAttrValue.image && selectedAttrValue.image.trim() !== "") {
                                displayImage = selectedAttrValue.image;
                                displayAlt = `${attrType.attributeName} - ${selectedAttrValue.label}`;
                                foundImage = true;
                                break;
                              }
                            }

                            if (foundImage) {
                              break;
                            }
                          }
                        }

                        return (
                          <img
                            src={displayImage}
                            alt={displayAlt}
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== selectedSubCategory?.image && target.src !== "/Glossy.png") {
                                target.src = selectedSubCategory?.image || "/Glossy.png";
                              }
                            }}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                            }}
                          />
                        );
                      })()}
                    </div>
                  </motion.div>

                  {selectedProduct && (
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-cream-100 p-4 sm:p-5 md:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm sm:text-base font-semibold text-cream-900">
                          Order Summary
                        </h2>
                        <span className="text-xs text-cream-500">
                          Live pricing
                        </span>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-cream-800 mb-4">
                        <div className="flex justify-between">
                          <span className="text-cream-600">Product</span>
                          <span className="font-medium text-right line-clamp-1 ml-2">
                            {selectedProduct.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cream-600">Quantity</span>
                          <span className="font-medium">
                            {quantity.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <LocationDetector
                        onLocationDetected={(location) => {
                          console.log('📍 Location detected for pricing:', location);
                        }}
                        showUI={false}
                        autoDetect={true}
                      />

                      <ProductPriceBox
                        productId={selectedProduct._id}
                        quantity={quantity}
                        selectedDynamicAttributes={Object.entries(selectedDynamicAttributes)
                          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                          .map(([key, value]) => {
                            const attr = pdpAttributes.find(a => a._id === key);
                            const attrName = attr?.attributeName || key;

                            let displayValue = value;
                            if (attr?.attributeValues) {
                              const selectedVal = attr.attributeValues.find(v => v.value === value);
                              displayValue = selectedVal?.label || value;
                            }

                            return {
                              attributeType: key,
                              value: typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)
                                ? JSON.stringify(value)
                                : value,
                              name: attrName,
                              label: displayValue
                            };
                          })}
                        showBreakdown={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:w-1/2">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-cream-100 min-h-[600px] lg:min-h-[700px] flex flex-col">
                  {!selectedProduct ? (
                    <div>
                      <div className="mb-6 sm:mb-8 border-b border-cream-100 pb-4 sm:pb-6">
                        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-cream-900 mb-2">
                          {selectedSubCategory?.name || "Products"}
                        </h1>
                        <p className="text-sm sm:text-base text-cream-600">
                          {nestedSubCategories.length > 0
                            ? "Select a subcategory to view products."
                            : "Select a product to customize and place your order."}
                        </p>
                      </div>

                      {nestedSubCategories.length > 0 ? (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                          {nestedSubCategories.map((nestedSubCategory) => {
                            const nestedSubCategoryIdForLink = nestedSubCategory._id;
                            const imageUrl = nestedSubCategory.image || '/Glossy.png';

                            return (
                              <Link
                                key={nestedSubCategory._id}
                                to={categoryId && subCategoryId
                                  ? `/digital-print/${categoryId}/${subCategoryId}/${nestedSubCategoryIdForLink}`
                                  : categoryId
                                    ? `/digital-print/${categoryId}/${nestedSubCategoryIdForLink}`
                                    : `/digital-print/${nestedSubCategoryIdForLink}`
                                }
                                className="block w-full"
                                onClick={() => {
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                <div className="w-full p-4 sm:p-5 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 group">
                                  <div className="flex items-start gap-4">
                                    <div className="shrink-0 w-20 sm:w-24 h-20 sm:h-24 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                                      <img
                                        src={imageUrl}
                                        alt={nestedSubCategory.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      />
                                    </div>

                                    <div className="flex-1 flex flex-col min-w-0">
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                          {nestedSubCategory.name}
                                        </h3>
                                        <ArrowRight size={18} className="text-cream-400 group-hover:text-cream-600 group-hover:translate-x-1 transition-all shrink-0" />
                                      </div>

                                      {nestedSubCategory.description && (
                                        <div className="text-cream-600 text-xs sm:text-sm mb-2 leading-relaxed">
                                          <p className="line-clamp-2">{nestedSubCategory.description}</p>
                                        </div>
                                      )}

                                      <div className="mt-auto flex items-center text-cream-500 text-xs sm:text-sm font-medium">
                                        <span>View Products</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                          {products.length === 0 ? (
                            <div className="text-center py-12">
                              <p className="text-cream-600">No products available</p>
                            </div>
                          ) : (
                            products.map((product) => {
                              const descriptionList = product.descriptionArray && product.descriptionArray.length > 0
                                ? product.descriptionArray
                                : (product.description
                                  ? product.description.split('\n').filter(line => line.trim())
                                  : []);

                              const descriptionPoints: string[] = [];
                              for (const item of descriptionList) {
                                const cleanItem = item.replace(/<[^>]*>/g, '').trim();
                                if (cleanItem && !cleanItem.includes(':') && cleanItem.length > 10) {
                                  descriptionPoints.push(cleanItem);
                                  if (descriptionPoints.length >= 3) break;
                                }
                              }

                              if (descriptionPoints.length === 0 && descriptionList.length > 0) {
                                for (let i = 0; i < Math.min(3, descriptionList.length); i++) {
                                  const cleanItem = descriptionList[i].replace(/<[^>]*>/g, '').trim();
                                  if (cleanItem) {
                                    descriptionPoints.push(cleanItem);
                                  }
                                }
                              }

                              const shortDescription = descriptionPoints.slice(0, 3).join(' • ') || '';

                              const basePrice = product.basePrice || 0;
                              const displayPrice = basePrice < 1
                                ? (basePrice * 1000).toFixed(2)
                                : basePrice.toFixed(2);
                              const priceLabel = basePrice < 1 ? "per 1000 units" : "";

                              return (
                                <button
                                  key={product._id || product.id}
                                  data-product-select
                                  onClick={() => handleProductSelect(product)}
                                  className="w-full p-3 sm:p-4 rounded-xl border-2 border-cream-200 hover:border-cream-900 text-left transition-all duration-200 hover:bg-cream-50 group"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="font-serif text-base sm:text-lg font-bold text-cream-900 group-hover:text-cream-600 transition-colors flex-1">
                                      {product.name}
                                    </h3>
                                    <div className="text-right shrink-0">
                                      <div className="text-lg sm:text-xl font-bold text-cream-900">
                                        {formatPrice(parseFloat(displayPrice), 'INR')}
                                      </div>
                                      {priceLabel && (
                                        <div className="text-xs text-cream-500 mt-0.5">
                                          {priceLabel}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {shortDescription && (
                                    <div className="text-cream-600 text-xs sm:text-sm mb-2 leading-relaxed">
                                      <p className="line-clamp-3">{shortDescription}</p>
                                    </div>
                                  )}

                                  <div className="mt-2 flex items-center text-cream-500 text-xs sm:text-sm font-medium">
                                    <span>View Details & Customize</span>
                                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
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
                          <div className="mb-6 sm:mb-8 border-b border-cream-100 pb-4 sm:pb-6 relative">
                            <div className="flex items-start justify-between mb-2">
                              <BackButton
                                onClick={() => {
                                  if (productId && nestedSubCategoryId && subCategoryId && categoryId) {
                                    navigate(`/digital-print/${categoryId}/${subCategoryId}/${nestedSubCategoryId}`);
                                  } else if (productId && subCategoryId && categoryId) {
                                    navigate(`/digital-print/${categoryId}/${subCategoryId}`);
                                  } else if (productId && categoryId) {
                                    navigate(`/digital-print/${categoryId}`);
                                  } else if (nestedSubCategoryId && subCategoryId && categoryId) {
                                    navigate(`/digital-print/${categoryId}/${subCategoryId}`);
                                  } else if (subCategoryId && categoryId) {
                                    navigate(`/digital-print/${categoryId}`);
                                  } else if (categoryId) {
                                    navigate("/digital-print");
                                  } else {
                                    navigate("/digital-print");
                                  }
                                  window.scrollTo(0, 0);
                                }}
                                fallbackPath={
                                  productId && nestedSubCategoryId && subCategoryId && categoryId
                                    ? `/digital-print/${categoryId}/${subCategoryId}/${nestedSubCategoryId}`
                                    : productId && subCategoryId && categoryId
                                      ? `/digital-print/${categoryId}/${subCategoryId}`
                                      : productId && categoryId
                                        ? `/digital-print/${categoryId}`
                                        : nestedSubCategoryId && subCategoryId && categoryId
                                          ? `/digital-print/${categoryId}/${subCategoryId}`
                                          : subCategoryId && categoryId
                                            ? `/digital-print/${categoryId}`
                                            : categoryId
                                              ? `/digital-print/${categoryId}`
                                              : "/digital-print"
                                }
                                label={
                                  productId && subCategoryId
                                    ? "Back to Subcategory"
                                    : productId && categoryId
                                      ? "Back to Category"
                                      : subCategoryId
                                        ? "Back to Category"
                                        : categoryId
                                          ? "Back to Categories"
                                          : "Back to Categories"
                                }
                                className="text-sm text-cream-600 hover:text-cream-900 mb-2"
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div className="flex-1">
                                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-cream-900 mb-2">
                                  {selectedProduct.name}
                                </h1>

                                <button
                                  onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                                  className="mt-2 mb-4 px-4 py-2 bg-cream-100 hover:bg-cream-200 text-cream-900 rounded-lg border border-cream-300 text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <Info size={16} />
                                  Instructions
                                </button>

                                <AnimatePresence>
                                  {isInstructionsOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-4 mb-6 p-4 sm:p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h4 className="text-sm font-bold text-yellow-900 mb-3 flex items-center gap-2">
                                          <Info size={16} />
                                          Important Instructions - Please Read Carefully
                                        </h4>

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

                                          {(selectedProduct.additionalDesignCharge || selectedProduct.gstPercentage) && (
                                            <div>
                                              <p className="font-semibold text-yellow-900 mb-2">Additional Charges:</p>
                                              <div className="space-y-1 ml-4">
                                                {selectedProduct.additionalDesignCharge && selectedProduct.additionalDesignCharge > 0 && (
                                                  <p>• Additional Design Charge: <strong>{formatPrice(selectedProduct.additionalDesignCharge, 'INR')}</strong> (applied if design help is needed)</p>
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

                                <div className="text-sm sm:text-base text-cream-600 space-y-2">
                                  {(() => {
                                    if (selectedProduct.description) {
                                      const hasHTML = /<[a-z][\s\S]*>/i.test(selectedProduct.description);
                                      if (hasHTML) {
                                        return (
                                          <>
                                            <style>{`
                                              .product-description-html {
                                                color: #92400e;
                                                line-height: 1.6;
                                                white-space: normal;
                                              }
                                              .product-description-html b,
                                              .product-description-html strong {
                                                font-weight: 600;
                                                color: #7c2d12;
                                                display: inline;
                                              }
                                              .product-description-html > b:first-child,
                                              .product-description-html > strong:first-child {
                                                display: block;
                                                font-size: 1.1em;
                                                margin-bottom: 0.75rem;
                                                color: #7c2d12;
                                              }
                                              .product-description-html p,
                                              .product-description-html div {
                                                margin-bottom: 0.5rem;
                                                line-height: 1.6;
                                                color: #92400e;
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
                                              className="product-description-html text-cream-600"
                                              dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                                            />
                                          </>
                                        );
                                      }
                                    }

                                    if (selectedProduct.descriptionArray && Array.isArray(selectedProduct.descriptionArray) && selectedProduct.descriptionArray.length > 0) {
                                      const renderTextWithBold = (text: string) => {
                                        const parts = text.split(/(\*\*.*?\*\*)/g);
                                        return parts.map((part, idx) => {
                                          if (part.startsWith('**') && part.endsWith('**')) {
                                            const boldText = part.slice(2, -2);
                                            return <strong key={idx} className="font-bold text-cream-800">{boldText}</strong>;
                                          }
                                          return <span key={idx}>{part}</span>;
                                        });
                                      };

                                      const descriptionLines = [...selectedProduct.descriptionArray].reverse();
                                      return descriptionLines.map((desc, i) => {
                                        if (desc.includes(':')) {
                                          return (
                                            <div key={i} className="mt-3 first:mt-0">
                                              <p className="font-semibold text-cream-700 mb-1.5">
                                                {renderTextWithBold(desc)}
                                              </p>
                                            </div>
                                          );
                                        } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                          const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(cleanDesc)}</span>
                                            </p>
                                          );
                                        } else {
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(desc)}</span>
                                            </p>
                                          );
                                        }
                                      });
                                    } else if (selectedProduct.description) {
                                      const descriptionLines = selectedProduct.description.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                                      const renderTextWithBold = (text: string) => {
                                        const parts = text.split(/(\*\*.*?\*\*)/g);
                                        return parts.map((part, idx) => {
                                          if (part.startsWith('**') && part.endsWith('**')) {
                                            const boldText = part.slice(2, -2);
                                            return <strong key={idx} className="font-bold text-cream-800">{boldText}</strong>;
                                          }
                                          return <span key={idx}>{part}</span>;
                                        });
                                      };
                                      return descriptionLines.map((desc, i) => {
                                        if (desc.includes(':')) {
                                          return (
                                            <div key={i} className="mt-3 first:mt-0">
                                              <p className="font-semibold text-cream-700 mb-1.5">
                                                {renderTextWithBold(desc)}
                                              </p>
                                            </div>
                                          );
                                        } else if (desc.startsWith('→') || desc.startsWith('->') || desc.startsWith('•')) {
                                          const cleanDesc = desc.replace(/^[→•\-]+\s*/, '').trim();
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(cleanDesc)}</span>
                                            </p>
                                          );
                                        } else {
                                          return (
                                            <p key={i} className="flex items-start">
                                              <span className="mr-2 text-cream-500 mt-1">→</span>
                                              <span>{renderTextWithBold(desc)}</span>
                                            </p>
                                          );
                                        }
                                      });
                                    } else {
                                      return <p className="text-cream-500 italic">No description available</p>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <>
                            {(() => {
                              let sectionNum = 1;
                              const hasOptions = selectedProduct.options && selectedProduct.options.length > 0;
                              const hasPrintingOption = selectedProduct.filters?.printingOption && selectedProduct.filters.printingOption.length > 0;
                              const hasTextureType = selectedProduct.filters?.textureType && selectedProduct.filters.textureType.length > 0;
                              const hasDeliverySpeed = selectedProduct.filters?.deliverySpeed && selectedProduct.filters.deliverySpeed.length > 0;

                              return (
                                <>
                                  {hasOptions && (
                                    <div className="mb-6 sm:mb-8">
                                      <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                        {sectionNum++}. Product Options
                                      </label>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        {selectedProduct.options?.map((option, idx) => {
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
                                              className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                }`}
                                            >
                                              {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                  <Check size={18} className="text-cream-900" />
                                                </div>
                                              )}
                                              <div className="font-bold text-sm mb-1">{option.name}</div>
                                              {option.description && (
                                                <p className="text-xs text-cream-600 mt-1">
                                                  {option.description}
                                                </p>
                                              )}
                                              {option.priceAdd !== undefined && option.priceAdd !== 0 && (
                                                <p className="text-xs text-cream-700 mt-1 font-medium">
                                                  {option.priceAdd > 0 ? '+' : ''}{formatPrice(typeof option.priceAdd === 'number' ? option.priceAdd : parseFloat(String(option.priceAdd)), 'INR')} per 1000 units
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

                                  {hasPrintingOption && selectedProduct.filters.printingOption.length > 1 && (
                                    <div className="mb-6 sm:mb-8" data-section="printingOption">
                                      <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                        {sectionNum++}. Printing Option
                                      </label>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        {selectedProduct.filters.printingOption.map((option) => {
                                          const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                          let priceInfo = null;
                                          if (filterPricesEnabled && selectedProduct.filters?.printingOptionPrices) {
                                            const priceData = selectedProduct.filters.printingOptionPrices.find((p) => p.name === option);
                                            if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                              priceInfo = priceData.priceAdd;
                                            }
                                          }

                                          return (
                                            <button
                                              key={option}
                                              data-field="printingOption"
                                              onClick={() => setSelectedPrintingOption(option)}
                                              className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${selectedPrintingOption === option
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                }`}
                                            >
                                              {selectedPrintingOption === option && (
                                                <div className="absolute top-2 right-2">
                                                  <Check size={18} className="text-cream-900" />
                                                </div>
                                              )}
                                              <div className="font-bold text-sm">{option}</div>
                                              {priceInfo !== null && (
                                                <div className="text-xs text-cream-600 mt-1">
                                                  {priceInfo > 0 ? '+' : ''}{formatPrice(Math.abs(priceInfo), 'INR')} per 1000 units
                                                </div>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {hasTextureType && selectedProduct.filters.textureType && selectedProduct.filters.textureType.length > 1 && (
                                    <div className="mb-6 sm:mb-8">
                                      <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                        {sectionNum++}. Texture Type
                                      </label>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                        {selectedProduct.filters.textureType?.map((texture) => {
                                          const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                          let priceInfo = null;
                                          if (filterPricesEnabled && selectedProduct.filters?.textureTypePrices) {
                                            const priceData = selectedProduct.filters.textureTypePrices.find((p) => p.name === texture);
                                            if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                              priceInfo = priceData.priceAdd;
                                            }
                                          }

                                          return (
                                            <button
                                              key={texture}
                                              onClick={() => setSelectedTextureType(texture)}
                                              className={`p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 relative ${selectedTextureType === texture
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                }`}
                                            >
                                              {selectedTextureType === texture && (
                                                <div className="absolute top-1 right-1">
                                                  <Check size={16} className="text-cream-900" />
                                                </div>
                                              )}
                                              <div>{texture}</div>
                                              {priceInfo !== null && (
                                                <div className="text-xs text-cream-600 mt-1">
                                                  {priceInfo > 0 ? '+' : ''}{formatPrice(Math.abs(priceInfo), 'INR')}/1k
                                                </div>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {hasDeliverySpeed && selectedProduct.filters.deliverySpeed.length > 1 && (
                                    <div className="mb-6 sm:mb-8" data-section="deliverySpeed">
                                      <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                        {sectionNum++}. Delivery Speed
                                      </label>
                                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        {selectedProduct.filters.deliverySpeed.map((speed) => {
                                          const filterPricesEnabled = selectedProduct.filters?.filterPricesEnabled || false;
                                          let priceInfo = null;
                                          if (filterPricesEnabled && selectedProduct.filters?.deliverySpeedPrices) {
                                            const priceData = selectedProduct.filters.deliverySpeedPrices.find((p) => p.name === speed);
                                            if (priceData && priceData.priceAdd !== undefined && priceData.priceAdd !== 0) {
                                              priceInfo = priceData.priceAdd;
                                            }
                                          }

                                          return (
                                            <button
                                              key={speed}
                                              data-field="deliverySpeed"
                                              onClick={() => setSelectedDeliverySpeed(speed)}
                                              className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${selectedDeliverySpeed === speed
                                                ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                }`}
                                            >
                                              {selectedDeliverySpeed === speed && (
                                                <div className="absolute top-2 right-2">
                                                  <Check size={18} className="text-cream-900" />
                                                </div>
                                              )}
                                              <div className="font-bold text-sm">{speed}</div>
                                              {priceInfo !== null && (
                                                <div className="text-xs text-cream-600 mt-1">
                                                  {priceInfo > 0 ? '+' : ''}{formatPrice(Math.abs(priceInfo), 'INR')} per 1000 units
                                                </div>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mb-6 sm:mb-8">
                                    <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                      {sectionNum++}. Select Quantity
                                    </label>

                                    <div className="mb-3">
                                      <Select
                                        options={generateQuantities(selectedProduct).map((q: any) => ({
                                          value: q,
                                          label: q.toLocaleString()
                                        }))}
                                        value={quantity}
                                        onValueChange={(value) => setQuantity(Number(value))}
                                        placeholder="Select quantity"
                                        className="w-full"
                                      />
                                    </div>

                                    {(() => {
                                      let attributeQuantityInfo: any = null;
                                      let attributeName = '';

                                      if (isInitialized && pdpAttributes.length > 0) {
                                        for (const attr of pdpAttributes) {
                                          if (!attr.isVisible) continue;

                                          const selectedValue = selectedDynamicAttributes[attr._id];
                                          if (!selectedValue) continue;

                                          if (attr.isStepQuantity && attr.stepQuantities && attr.stepQuantities.length > 0) {
                                            attributeQuantityInfo = {
                                              type: 'STEP_WISE',
                                              stepQuantities: attr.stepQuantities
                                            };
                                            attributeName = attr.attributeName;
                                            break;
                                          }

                                          if (attr.isRangeQuantity && attr.rangeQuantities && attr.rangeQuantities.length > 0) {
                                            attributeQuantityInfo = {
                                              type: 'RANGE_WISE',
                                              rangeQuantities: attr.rangeQuantities
                                            };
                                            attributeName = attr.attributeName;
                                            break;
                                          }
                                        }
                                      }

                                      if (!attributeQuantityInfo && selectedProduct && selectedProduct.dynamicAttributes) {
                                        for (const attr of selectedProduct.dynamicAttributes) {
                                          if (!attr.isEnabled) continue;

                                          const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                                          if (!attrType) continue;

                                          const selectedValue = selectedDynamicAttributes[attrType._id];
                                          if (!selectedValue) continue;

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
                                            <div className="text-xs sm:text-sm text-cream-600 mb-2">
                                              <span className="font-medium">{attributeName}:</span> Available quantities: {stepQuantities.map((q: any) => q.toLocaleString()).join(", ")}
                                            </div>
                                          );
                                        } else if (attributeQuantityInfo.type === 'RANGE_WISE') {
                                          return (
                                            <div className="text-xs sm:text-sm text-cream-600 mb-2 space-y-1">
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
                                                        ({formatPrice(price, 'INR')})
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        }
                                      }

                                      const orderQuantity = selectedProduct.filters.orderQuantity;
                                      const quantityType = orderQuantity.quantityType || "SIMPLE";

                                      if (quantityType === "STEP_WISE" && orderQuantity.stepWiseQuantities && orderQuantity.stepWiseQuantities.length > 0) {
                                        return (
                                          <div className="text-xs sm:text-sm text-cream-600 mb-2">
                                            Available quantities: {orderQuantity.stepWiseQuantities.sort((a, b) => a - b).map(q => q.toLocaleString()).join(", ")}
                                          </div>
                                        );
                                      } else if (quantityType === "RANGE_WISE" && orderQuantity.rangeWiseQuantities && orderQuantity.rangeWiseQuantities.length > 0) {
                                        return (
                                          <div className="text-xs sm:text-sm text-cream-600 mb-2 space-y-1">
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
                                          <div className="text-xs sm:text-sm text-cream-600 mb-2">
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
                                          {selectedProduct.quantityDiscounts.map((discount, idx) => {
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

                                  {(() => {
                                    let attributesToRender: any[] = [];

                                    if (isInitialized && pdpAttributes.length > 0) {
                                      const ruleResult = applyAttributeRules({
                                        attributes: pdpAttributes,
                                        rules: pdpRules,
                                        selectedValues: { ...selectedDynamicAttributes } as Record<string, string | number | boolean | File | any[] | null>,
                                      });

                                      attributesToRender = ruleResult.attributes
                                        .filter((attr) => attr.isVisible)
                                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                                    } else if (selectedProduct.dynamicAttributes) {
                                      attributesToRender = selectedProduct.dynamicAttributes
                                        .filter((attr) => attr.isEnabled)
                                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                                    }

                                    return attributesToRender.length > 0 ? (
                                      <>
                                        {attributesToRender.map((attr) => {
                                          let attrType: any = null;
                                          let attributeValues: any[] = [];
                                          let attrId: string = '';
                                          let isRequired: boolean = false;
                                          let displayOrder: number = 0;

                                          if (isInitialized && pdpAttributes.length > 0) {
                                            attrId = attr._id;
                                            isRequired = attr.isRequired || false;
                                            displayOrder = attr.displayOrder || 0;
                                            attributeValues = (attr.allowedValues && attr.allowedValues.length > 0)
                                              ? (attr.attributeValues || []).filter((av: any) => attr.allowedValues!.includes(av.value))
                                              : (attr.attributeValues || []);

                                            attrType = {
                                              _id: attr._id,
                                              attributeName: attr.attributeName,
                                              inputStyle: attr.inputStyle,
                                              attributeValues: attributeValues,
                                              defaultValue: attr.defaultValue,
                                            };
                                          } else {
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

                                          const requiresMultipleOptions = ['DROPDOWN', 'RADIO', 'POPUP'].includes(attrType.inputStyle);

                                          if (requiresMultipleOptions) {
                                            if (attributeValues.length < 1) {
                                              return (
                                                <div key={attrId} className="mb-6 sm:mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                  <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
                                                    {sectionNum++}. {attrType.attributeName}
                                                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                                                  </label>
                                                  <p className="text-sm text-yellow-800">
                                                    This attribute is not available because it requires at least 2 options. Please contact support.
                                                  </p>
                                                </div>
                                              );
                                            }
                                          }

                                          const selectedValue = selectedDynamicAttributes[attrId];
                                          const selectedValueObj = attributeValues.find((av) => av.value === selectedValue);
                                          const hasSubAttributes = selectedValueObj?.hasSubAttributes === true;

                                          const subAttributesKey = `${attrId}:${selectedValue || ''}`;
                                          const availableSubAttributes = (hasSubAttributes && selectedValue)
                                            ? (pdpSubAttributes[subAttributesKey] || [])
                                            : [];

                                          return (
                                            <div key={attrId} className="mb-6 sm:mb-8">
                                              <label className="block text-xs sm:text-sm font-bold text-cream-900 mb-2 sm:mb-3 uppercase tracking-wider">
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
                                                          .filter((av) => av && av.value && av.label)
                                                          .map((av) => {
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
                                                          setUserSelectedAttributes(prev => new Set(prev).add(attrId));
                                                        }}
                                                        placeholder={`Select ${attrType.attributeName}`}
                                                        className="w-full"
                                                      />

                                                      {availableSubAttributes.length > 0 && (
                                                        <div className="mt-4">
                                                          <label className="block text-xs font-semibold text-cream-700 mb-2">
                                                            Select {selectedValueObj?.label || attrType.attributeName} Option:
                                                          </label>
                                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {availableSubAttributes.map((subAttr) => {
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
                                                                  }}
                                                                  className={`p-3 rounded-lg border text-left transition-all ${isSubAttrSelected
                                                                    ? "border-cream-900 bg-cream-50 ring-1 ring-cream-900"
                                                                    : "border-cream-200 hover:border-cream-400"
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
                                                                    <div className="text-xs text-cream-600 mt-1">
                                                                      {getSubAttrPriceDisplay()}
                                                                    </div>
                                                                  )}
                                                                </button>
                                                              );
                                                            })}
                                                          </div>
                                                        </div>
                                                      )}

                                                      {(() => {
                                                        const selectedValue = selectedDynamicAttributes[attrId];
                                                        if (!selectedValue) return null;

                                                        const selectedOption = attributeValues.find((av) => av.value === selectedValue);
                                                        if (!selectedOption || !selectedOption.description) return null;

                                                        const imagesRequiredMatch = selectedOption.description.match(/Images Required: (\d+)/);
                                                        const numberOfImagesRequired = imagesRequiredMatch ? parseInt(imagesRequiredMatch[1]) : 0;

                                                        if (numberOfImagesRequired <= 0) return null;

                                                        const imagesKey = `${attrId}_images`;
                                                        const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                                                          ? (selectedDynamicAttributes[imagesKey] as File[])
                                                          : [];

                                                        return (
                                                          <div className="mt-4 p-4 bg-cream-50 rounded-lg border border-cream-200">
                                                            <label className="block text-sm font-semibold text-cream-900 mb-3">
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
                                                                      className="flex-1 px-3 py-2 border border-cream-300 rounded-lg text-sm"
                                                                    />
                                                                    {file && (
                                                                      <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-cream-600 max-w-[150px] truncate">
                                                                          {file.name}
                                                                        </span>
                                                                        <button
                                                                          type="button"
                                                                          onClick={() => {
                                                                            const updatedImages = [...uploadedImages];
                                                                            updatedImages[index] = null as any;
                                                                            setSelectedDynamicAttributes({
                                                                              ...selectedDynamicAttributes,
                                                                              [imagesKey]: updatedImages
                                                                            });
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
                                                          const filteredValues = attributeValues.filter((av) => av && av.value && av.label);
                                                          setRadioModalData({
                                                            attributeId: attrId,
                                                            attributeName: attrType.attributeName,
                                                            attributeValues: filteredValues,
                                                            selectedValue: (selectedDynamicAttributes[attrId] as string) || null,
                                                            isRequired: isRequired,
                                                          });
                                                          setRadioModalOpen(true);
                                                        }}
                                                        className="w-full px-4 py-3 border-2 border-dashed border-cream-300 rounded-xl hover:border-cream-400 hover:bg-cream-50 transition-all duration-200 text-left flex items-center justify-between group"
                                                      >
                                                        <div className="flex-1">
                                                          <span className="text-sm font-medium text-cream-700 group-hover:text-cream-900">
                                                            {selectedDynamicAttributes[attrId]
                                                              ? attributeValues.find((av) => av.value === selectedDynamicAttributes[attrId])?.label || 'Select option'
                                                              : `Select ${attrType.attributeName}${isRequired ? ' *' : ''}`
                                                            }
                                                          </span>
                                                          {selectedDynamicAttributes[attrId] && (
                                                            <div className="text-xs text-cream-500 mt-1">
                                                              Click to change selection
                                                            </div>
                                                          )}
                                                        </div>
                                                        <ArrowRight size={18} className="text-cream-400 group-hover:text-cream-600 transition-colors" />
                                                      </button>

                                                      {(() => {
                                                        const selectedValue = selectedDynamicAttributes[attrId];
                                                        if (!selectedValue) return null;

                                                        const selectedOption = attributeValues.find((av) => av.value === selectedValue);
                                                        if (!selectedOption || !selectedOption.description) return null;

                                                        const imagesRequiredMatch = selectedOption.description.match(/Images Required: (\d+)/);
                                                        const numberOfImagesRequired = imagesRequiredMatch ? parseInt(imagesRequiredMatch[1]) : 0;

                                                        if (numberOfImagesRequired <= 0) return null;

                                                        const imagesKey = `${attrId}_images`;
                                                        const uploadedImages = Array.isArray(selectedDynamicAttributes[imagesKey])
                                                          ? (selectedDynamicAttributes[imagesKey] as File[])
                                                          : [];

                                                        return (
                                                          <div className="mt-4 p-4 bg-cream-50 rounded-lg border border-cream-200">
                                                            <label className="block text-sm font-semibold text-cream-900 mb-3">
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
                                                                      className="flex-1 px-3 py-2 border border-cream-300 rounded-lg text-sm"
                                                                    />
                                                                    {file && (
                                                                      <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-cream-600 max-w-[150px] truncate">
                                                                          {file.name}
                                                                        </span>
                                                                        <button
                                                                          type="button"
                                                                          onClick={() => {
                                                                            const updatedImages = [...uploadedImages];
                                                                            updatedImages[index] = null as any;
                                                                            setSelectedDynamicAttributes({
                                                                              ...selectedDynamicAttributes,
                                                                              [imagesKey]: updatedImages
                                                                            });
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
                                                      .filter((av) => av && av.value && av.label)
                                                      .map((av) => {
                                                        const getPriceDisplay = () => {
                                                          if (av.description) {
                                                            const priceImpactMatch = av.description.match(/Price Impact: ₹([\d.]+)/);
                                                            if (priceImpactMatch) {
                                                              const priceImpact = parseFloat(priceImpactMatch[1]) || 0;
                                                              if (priceImpact > 0) {
                                                                return `+₹${priceImpact.toFixed(2)}/unit`;
                                                              }
                                                            }
                                                          }
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
                                                              setUserSelectedAttributes(prev => new Set(prev).add(attrId));
                                                            }}
                                                            className={`p-4 rounded-xl border text-left transition-all duration-200 relative ${isSelected
                                                              ? "border-cream-900 bg-cream-50 text-cream-900 ring-1 ring-cream-900"
                                                              : "border-cream-200 text-cream-600 hover:border-cream-400 hover:bg-cream-50"
                                                              }`}
                                                          >
                                                            {isSelected && (
                                                              <div className="absolute top-2 right-2">
                                                                <Check size={18} className="text-cream-900" />
                                                              </div>
                                                            )}
                                                            {av.image && (
                                                              <div className="mb-2">
                                                                <img
                                                                  src={av.image}
                                                                  alt={av.label}
                                                                  className="w-full h-32 object-cover rounded-lg border border-cream-200"
                                                                />
                                                              </div>
                                                            )}
                                                            <div className="font-bold text-sm">{av.label}</div>
                                                            {getPriceDisplay() && (
                                                              <div className="text-xs text-cream-600 mt-1">
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
                                                      setUserSelectedAttributes(prev => new Set(prev).add(attrId));
                                                    }}
                                                    placeholder={`Enter ${attrType.attributeName}`}
                                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
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
                                                      setUserSelectedAttributes(prev => new Set(prev).add(attrId));
                                                    }}
                                                    placeholder={`Enter ${attrType.attributeName}`}
                                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
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
                                                      if (file) {
                                                        setUserSelectedAttributes(prev => new Set(prev).add(attrId));
                                                      }
                                                    }}
                                                    className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                                                    accept="*/*"
                                                  />
                                                  {attrType.fileRequirements && (
                                                    <p className="text-xs text-cream-600 mt-1">{attrType.fileRequirements}</p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </>
                                    ) : null;
                                  })()}

                                  {hasPermission && (
                                    <BulkOrderToggle
                                      orderMode={orderMode}
                                      setOrderMode={setOrderMode}
                                      setShowBulkWizard={setShowBulkWizard}
                                    />
                                  )}

                                  {orderMode === 'single' && (
                                    <>
                                      <div className="mt-4 pt-4 border-t border-cream-100">
                                        <button
                                          onClick={handlePlaceOrder}
                                          disabled={isProcessingPayment}
                                          className={`w-full py-4 sm:py-5 md:py-6 rounded-xl font-bold text-lg sm:text-xl md:text-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 min-h-[60px] sm:min-h-[70px] ${isProcessingPayment
                                            ? 'bg-cream-400 text-cream-700 cursor-not-allowed opacity-60'
                                            : 'bg-cream-900 text-cream-50 hover:bg-cream-800 active:bg-cream-700 cursor-pointer opacity-100'
                                            }`}
                                        >
                                          {isProcessingPayment ? (
                                            <>
                                              <Loader className="animate-spin" size={24} />
                                              <span>Processing Payment...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Check size={24} />
                                              <span>Place Order</span>
                                            </>
                                          )}
                                        </button>

                                        <div className="mt-4 text-center text-xs text-cream-500 flex items-center justify-center gap-2">
                                          <CreditCard size={14} /> Secure Payment & Data Protection
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </>
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

      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentAndOrder}
        productId={selectedProduct?._id || ''}
        productName={selectedProduct?.name || ''}
        quantity={quantity}
        selectedDynamicAttributes={Object.entries(selectedDynamicAttributes)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
          .map(([key, value]) => {
            const attr = pdpAttributes.find(a => a._id === key);
            const attrName = attr?.attributeName || key;

            let displayValue = value;
            if (attr?.attributeValues) {
              const selectedVal = attr.attributeValues.find(v => v.value === value);
              displayValue = selectedVal?.label || value;
            }

            return {
              attributeType: key,
              value: typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)
                ? JSON.stringify(value)
                : value,
              name: attrName,
              label: displayValue
            };
          })}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        pincode={pincode}
        setPincode={setPincode}
        address={address}
        setAddress={setAddress}
        mobileNumber={mobileNumber}
        setMobileNumber={setMobileNumber}
        estimatedDeliveryDate={estimatedDeliveryDate || undefined}
        deliveryLocationSource={deliveryLocationSource}
        onGetLocation={handleGetLocation}
        isGettingLocation={isGettingLocation}
        gstPercentage={selectedProduct?.gstPercentage || 18}
      />

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
              <div className="px-6 py-4 border-b border-cream-200 bg-linear-to-r from-cream-50 to-cream-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-cream-900">
                    Select {radioModalData.attributeName}
                  </h2>
                  {radioModalData.isRequired && (
                    <p className="text-xs text-red-500 mt-1">Required field</p>
                  )}
                </div>
                <button
                  onClick={() => setRadioModalOpen(false)}
                  className="p-2 hover:bg-cream-200 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-cream-700" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 justify-items-center">
                  {radioModalData.attributeValues.map((av) => {
                    const getPriceDisplay = () => {
                      if (av.description) {
                        const priceImpactMatch = av.description.match(/Price Impact: ₹([\d.]+)/);
                        if (priceImpactMatch) {
                          const priceImpact = parseFloat(priceImpactMatch[1]) || 0;
                          if (priceImpact > 0) {
                            return `+₹${priceImpact.toFixed(2)}/unit`;
                          }
                        }
                      }
                      if (!av.priceMultiplier || av.priceMultiplier === 1 || !selectedProduct) return null;
                      const basePrice = selectedProduct.basePrice || 0;
                      const pricePerUnit = basePrice * (av.priceMultiplier - 1);
                      if (Math.abs(pricePerUnit) < 0.01) return null;
                      return `+₹${pricePerUnit.toFixed(2)}/unit`;
                    };

                    const isSelected = radioModalData.selectedValue === av.value;

                    const valueSubAttributesKey = `${radioModalData.attributeId}:${av.value}`;
                    const valueSubAttributes = pdpSubAttributes[valueSubAttributesKey] || [];

                    return (
                      <motion.button
                        key={av.value}
                        type="button"
                        onClick={() => {
                          const newSelected = {
                            ...selectedDynamicAttributes,
                            [radioModalData.attributeId]: av.value
                          };
                          setSelectedDynamicAttributes(newSelected);
                          setUserSelectedAttributes(prev => new Set(prev).add(radioModalData.attributeId));

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

                          setRadioModalOpen(false);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-lg border-2 text-left transition-all duration-200 flex flex-col w-[140px] h-[140px] overflow-hidden ${isSelected
                          ? "border-cream-900 bg-cream-50 text-cream-900 ring-2 ring-cream-900 ring-offset-1"
                          : "border-cream-200 text-cream-700 hover:border-cream-400 hover:bg-cream-50 hover:shadow-md"
                          }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 bg-cream-900 text-white rounded-full p-1 shadow-lg z-10"
                          >
                            <Check size={12} />
                          </motion.div>
                        )}

                        {av.image && (
                          <div className="mb-1.5 overflow-hidden rounded border border-cream-200 bg-cream-50 shrink-0">
                            <img
                              src={av.image}
                              alt={av.label}
                              className="w-full h-[70px] object-cover transition-transform duration-200 hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 flex flex-col min-h-0">
                          <div className="font-semibold text-xs text-cream-900 leading-tight line-clamp-2">
                            {av.label}
                          </div>

                          {av.description && (
                            <p className="text-[10px] text-cream-600 line-clamp-2 leading-tight">
                              {av.description}
                            </p>
                          )}

                          {getPriceDisplay() && (
                            <div className="mt-auto pt-1 border-t border-cream-200 text-[10px] font-semibold text-cream-700 leading-tight">
                              {getPriceDisplay()}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-cream-200 bg-cream-50 flex items-center justify-between">
                <div className="text-sm text-cream-600">
                  {radioModalData.selectedValue ? (
                    <span>
                      Selected: <span className="font-semibold text-cream-900">
                        {radioModalData.attributeValues.find(av => av.value === radioModalData.selectedValue)?.label}
                      </span>
                    </span>
                  ) : (
                    <span>Please select an option</span>
                  )}
                </div>
                <button
                  onClick={() => setRadioModalOpen(false)}
                  className="px-6 py-2 bg-cream-900 text-white rounded-lg font-semibold hover:bg-cream-800 transition-colors"
                >
                  {radioModalData.selectedValue ? 'Done' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="px-6 py-4 border-b border-cream-200 bg-linear-to-r from-cream-50 to-cream-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-cream-900">
                    Select {subAttrModalData.parentLabel} Option
                  </h2>
                  <p className="text-xs text-cream-600 mt-1">
                    Additional options related to {subAttrModalData.parentLabel}
                  </p>
                </div>
                <button
                  onClick={() => setSubAttrModalOpen(false)}
                  className="p-2 hover:bg-cream-200 rounded-full transition-colors"
                  aria-label="Close sub-attribute modal"
                >
                  <X size={18} className="text-cream-700" />
                </button>
              </div>

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
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-lg border-2 text-left transition-all duration-200 flex flex-col w-[140px] h-[140px] overflow-hidden ${isSelected
                          ? "border-cream-900 bg-cream-50 text-cream-900 ring-2 ring-cream-900 ring-offset-1"
                          : "border-cream-200 text-cream-700 hover:border-cream-400 hover:bg-cream-50 hover:shadow-md"
                          }`}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 bg-cream-900 text-white rounded-full p-1 shadow-lg z-10"
                          >
                            <Check size={12} />
                          </motion.div>
                        )}

                        {subAttr.image && (
                          <div className="mb-1.5 overflow-hidden rounded border border-cream-200 bg-cream-50 shrink-0">
                            <img
                              src={subAttr.image}
                              alt={subAttr.label}
                              className="w-full h-[70px] object-cover transition-transform duration-200 hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 flex flex-col min-h-0">
                          <div className="font-semibold text-xs text-cream-900 leading-tight line-clamp-2">
                            {subAttr.label}
                          </div>

                          {getSubAttrPriceDisplay() && (
                            <div className="mt-auto pt-1 border-t border-cream-200 text-[10px] font-semibold text-cream-700 leading-tight">
                              {getSubAttrPriceDisplay()}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-cream-200 bg-cream-50 flex items-center justify-between">
                <div className="text-sm text-cream-600">
                  {subAttrModalData.selectedValue ? (
                    <span>
                      Selected:{" "}
                      <span className="font-semibold text-cream-900">
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
                  className="px-6 py-2 bg-cream-900 text-white rounded-lg font-semibold hover:bg-cream-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Wizard Modal */}
      {showBulkWizard && selectedProduct && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8">
                <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <p className="mt-4 text-cream-700">Loading bulk upload wizard...</p>
              </div>
            </div>
          }
        >
          <BulkOrderWizard
            isOpen={showBulkWizard}
            onClose={() => {
              setShowBulkWizard(false);
              setOrderMode('single');
            }}
            productId={selectedProduct._id}
            productName={selectedProduct.name}
            selectedQuantity={quantity}
            unitPrice={price}
            totalPrice={subtotal + gstAmount}
            uploadFields={
              // Default to 2 (front + back) for most printing products
              // This could be enhanced later with product-specific configuration
              2
            }
            selectedAttributes={{
              PrintingOption: selectedPrintingOption,
              productOptions: selectedProductOptions,
              DeliverySpeed: selectedDeliverySpeed,
              TextureType: selectedTextureType,
              dynamicAttributes: selectedDynamicAttributes,
              quantity: quantity,
            }}
            onSuccess={(bulkOrderId) => {
              console.log('Bulk order created:', bulkOrderId);
              setShowBulkWizard(false);
              setOrderMode('single');

              // Show success notification
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50';
              notification.innerHTML = `
                <div class="flex items-center gap-3">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <div>
                    <p class="font-semibold">Bulk Order Submitted!</p>
                    <p class="text-sm opacity-90">Order ID: ${bulkOrderId}</p>
                  </div>
                </div>
              `;
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 5000);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default GlossProductSelection;