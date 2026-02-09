import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, MapPin, Loader, Truck, AlertCircle, Package, Mail, Phone, User, MapPinned, Calendar, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductPriceBox from '../../components/ProductPriceBox';
import courierApi, { CourierServiceability } from '../../lib/courierApi';

// Courier option type
interface CourierOption {
    courierId: number;
    courierName: string;
    estimatedDays: number;
    rate: number;
    codCharges?: number;
    freightCharge?: number;
    etd?: string;
}


interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentData: any) => Promise<void>;
    productId: string;
    productName: string;
    quantity: number;
    selectedDynamicAttributes: Array<{
        attributeType: string;
        value: any;
        name?: string;
        label?: any;
    }>;
    customerName: string;
    setCustomerName: (value: string) => void;
    customerEmail: string;
    setCustomerEmail: (value: string) => void;
    pincode: string;
    setPincode: (value: string) => void;
    address: string;
    setAddress: (value: string) => void;
    mobileNumber: string;
    setMobileNumber: (value: string) => void;
    estimatedDeliveryDate?: string;
    deliveryLocationSource?: string;
    onGetLocation: () => void;
    isGettingLocation: boolean;
    gstPercentage?: number;
    // New props for full order processing
    selectedProduct: any;
    frontDesignFile: File | null;
    frontDesignPreview: string;
    backDesignFile: File | null;
    backDesignPreview: string;
    rawSelectedDynamicAttributes: Record<string, any>;
    pdpSubAttributes: Record<string, any[]>;
    selectedProductOptions: string[];
    selectedPrintingOption: string;
    selectedDeliverySpeed: string;
    promoCodes: string[];
    orderNotes: string;
    price: number;
    gstAmount: number;
    // Shipping cost props
    shippingCost: number;
    onShippingChange?: (cost: number, courier: CourierOption | null) => void;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    productId,
    productName,
    quantity,
    selectedDynamicAttributes,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    pincode,
    setPincode,
    address,
    setAddress,
    mobileNumber,
    setMobileNumber,
    estimatedDeliveryDate,
    deliveryLocationSource,
    onGetLocation,
    isGettingLocation,
    gstPercentage = 18,
    // Destructure new props
    selectedProduct,
    frontDesignFile,
    frontDesignPreview,
    backDesignFile,
    backDesignPreview,
    rawSelectedDynamicAttributes,
    pdpSubAttributes,
    selectedProductOptions,
    selectedPrintingOption,
    selectedDeliverySpeed,
    promoCodes,
    orderNotes,
    price,
    gstAmount,
    shippingCost,
    onShippingChange
}) => {
    const navigate = useNavigate();
    let baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    // Ensure URL ends with /api to avoid 404 errors
    if (!baseUrl.endsWith('/api')) {
        baseUrl += '/api';
    }
    const API_BASE_URL = baseUrl;
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Courier/shipping state
    const [courierLoading, setCourierLoading] = useState(false);
    const [courierError, setCourierError] = useState<string | null>(null);
    const [serviceability, setServiceability] = useState<CourierServiceability | null>(null);
    const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);

    // Free shipping threshold
    const FREE_SHIPPING_THRESHOLD = 999;
    const isFreeShipping = price >= FREE_SHIPPING_THRESHOLD;

    // Use refs for stable callback references
    const onShippingChangeRef = React.useRef(onShippingChange);
    const lastCheckedPincodeRef = React.useRef<string>('');
    const isFreeShippingRef = React.useRef(isFreeShipping);

    // Update refs when values change
    React.useEffect(() => {
        onShippingChangeRef.current = onShippingChange;
    }, [onShippingChange]);

    React.useEffect(() => {
        isFreeShippingRef.current = isFreeShipping;
    }, [isFreeShipping]);

    // Check courier serviceability when pincode changes
    const checkServiceability = useCallback(async (pincodeToCheck: string) => {
        if (!pincodeToCheck || pincodeToCheck.length !== 6) {
            setServiceability(null);
            setSelectedCourier(null);
            if (onShippingChangeRef.current) onShippingChangeRef.current(0, null);
            return;
        }

        // Prevent duplicate calls for same pincode
        if (lastCheckedPincodeRef.current === pincodeToCheck) {
            return;
        }
        lastCheckedPincodeRef.current = pincodeToCheck;

        setCourierLoading(true);
        setCourierError(null);

        try {
            const result = await courierApi.checkServiceability(
                '395006', // Pickup pincode (Surat)
                pincodeToCheck,
                0.5, // Weight estimate
                'PREPAID'
            );

            setServiceability(result);

            if (!result.available) {
                setCourierError(result.message || 'Delivery not available for this pincode');
                setSelectedCourier(null);
                if (onShippingChangeRef.current) onShippingChangeRef.current(0, null);
            } else if (result.recommendedCourier) {
                // Auto-select recommended courier
                const courier = result.recommendedCourier as CourierOption;
                setSelectedCourier(courier);
                const shippingRate = isFreeShippingRef.current ? 0 : courier.rate;
                if (onShippingChangeRef.current) onShippingChangeRef.current(shippingRate, courier);
            }
        } catch (err: any) {
            setCourierError(err.message || 'Failed to check serviceability');
            setServiceability(null);
            setSelectedCourier(null);
            if (onShippingChangeRef.current) onShippingChangeRef.current(0, null);
            // Reset last checked so user can retry
            lastCheckedPincodeRef.current = '';
        } finally {
            setCourierLoading(false);
        }
    }, []); // No dependencies - uses refs

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (pincode && pincode.length === 6) {
                checkServiceability(pincode);
            }
        }, 800); // Increased debounce time

        return () => clearTimeout(debounceTimer);
    }, [pincode, checkServiceability]);

    // Handle courier selection
    const handleCourierSelect = (courier: CourierOption) => {
        setSelectedCourier(courier);
        const shippingRate = isFreeShipping ? 0 : courier.rate;
        if (onShippingChange) onShippingChange(shippingRate, courier);
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Helper function for auth headers
    const getAuthHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    });

    const handlePaymentAndOrder = async () => {
        console.log("🚀 Starting handlePaymentAndOrder", { API_BASE_URL });
        // Validate product and design first
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

        // Validate required dynamic attributes
        if (selectedProduct?.dynamicAttributes) {
            for (const attr of selectedProduct.dynamicAttributes) {
                if (attr.isRequired && attr.isEnabled) {
                    const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                    if (attrType) {
                        const value = rawSelectedDynamicAttributes[attrType._id];
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                            setPaymentError(`${attrType.attributeName} is required.`);
                            return;
                        }
                    }
                }
            }
        }

        // Validate delivery information
        if (!validateFields()) return;

        setIsProcessing(true);
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
                // Read file directly to ensure valid base64 data
                const reader = new FileReader();
                const frontImageData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data:image/... prefix
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

            // Legacy for backward compatibility
            const orderDynamicAttributes: any = {};

            for (const key of Object.keys(rawSelectedDynamicAttributes)) {
                const value = rawSelectedDynamicAttributes[key];
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
                                        const uploadedImages = Array.isArray(rawSelectedDynamicAttributes[imagesKey])
                                            ? (rawSelectedDynamicAttributes[imagesKey] as File[]).filter((f: any) => f !== null)
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
                                        const uploadedImages = Array.isArray(rawSelectedDynamicAttributes[imagesKey])
                                            ? (rawSelectedDynamicAttributes[imagesKey] as File[]).filter((f: any) => f !== null)
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
                finish: selectedPrintingOption || "Standard",
                shape: selectedDeliverySpeed || "Rectangular",
                selectedOptions: selectedOptions,
                selectedDynamicAttributes: selectedDynamicAttributesArray,
                // MANDATORY FIX: Remove client-calculated price, add promoCodes
                promoCodes: promoCodes || [],

                // Include selected courier with estimated delivery days from Shiprocket
                selectedCourier: selectedCourier ? {
                    courierId: selectedCourier.courierId,
                    courierName: selectedCourier.courierName,
                    estimatedDays: selectedCourier.estimatedDays,
                    rate: selectedCourier.rate
                } : null,

                // Delivery information collected at checkout
                pincode: pincode.trim(),
                address: address.trim(),
                mobileNumber: mobileNumber.trim(),
                uploadedDesign: uploadedDesign,
                notes: orderNotes || "",
                // Payment information - payment not required
                advancePaid: 0,
                paymentStatus: "pending",
                paymentGatewayInvoiceId: null,
                // Legacy product specifications
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
                console.log("📝 Creating order with account...", { url: `${API_BASE_URL}/orders/create-with-account`, body: orderDataWithAccount });
                response = await fetch(`${API_BASE_URL}/orders/create-with-account`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(orderDataWithAccount),
                });
            } else {
                // User is authenticated - use regular endpoint
                console.log("📝 Creating order (authenticated)...", {
                    url: `${API_BASE_URL}/orders`,
                    hasUploadedDesign: !!orderData.uploadedDesign,
                    hasFrontImage: !!orderData.uploadedDesign?.frontImage,
                    frontImageDataLength: orderData.uploadedDesign?.frontImage?.data?.length || 0,
                    quantity: orderData.quantity,
                    productId: orderData.productId,
                    pincode: orderData.pincode,
                    hasAddress: !!orderData.address,
                    hasMobileNumber: !!orderData.mobileNumber,
                    selectedCourier: orderData.selectedCourier,
                    finish: orderData.finish,
                    shape: orderData.shape,
                });
                response = await fetch(`${API_BASE_URL}/orders`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData),
                });
            }
            console.log("📥 Order API response status:", response.status, response.statusText);
            if (!response.ok) {
                let errorMessage = "Failed to create order. Please try again.";
                try {
                    const errorData = await response.json();
                    console.error("❌ Order creation failed - Server error:", errorData);
                    errorMessage = errorData.error || errorMessage;
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
                    console.error("❌ Order creation failed - Raw response:", responseText);
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
            // Store temp password info for display after payment
            const newUserInfo = responseData.isNewUser && responseData.tempPassword
                ? { tempPassword: responseData.tempPassword }
                : null;

            // Step 4: Initialize Payment via Payment Gateway API
            const paymentToken = localStorage.getItem("token") || responseData.token;
            console.log("🔄 Step 4: Initializing payment...");

            try {
                console.log("💳 Initializing payment...", { url: `${API_BASE_URL}/payment/initialize` });
                const paymentResponse = await fetch(`${API_BASE_URL}/payment/initialize`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${paymentToken}`,
                    },
                    body: JSON.stringify({
                        orderId: order._id || order.order?._id,
                        amount: Math.round((order.totalPrice || order.priceSnapshot?.finalTotal || 0) * 100), // Convert to paise
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
                const selectedGateway = paymentData.gateway || 'RAZORPAY';
                const isRedirectRequired = paymentData.redirect_required || false;

                if (isRedirectRequired && paymentData.checkout_url && checkoutData) {
                    // =========== REDIRECT-BASED PAYMENT (PayU, PhonePe) ===========

                    // Create form and submit to payment gateway
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = paymentData.checkout_url;
                    // Add all checkout data as hidden form fields
                    Object.keys(checkoutData).forEach(key => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = checkoutData[key];
                        form.appendChild(input);
                    });
                    document.body.appendChild(form);
                    form.submit();
                } else if (selectedGateway === 'RAZORPAY' && typeof window !== 'undefined' && (window as any).Razorpay && checkoutData) {
                    // =========== RAZORPAY POPUP CHECKOUT ===========
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
                            // Payment successful - verify with backend
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
                                    onClose(); // Close modal
                                    setIsProcessing(false);
                                    // Show success message
                                    if (newUserInfo?.tempPassword) {
                                        alert(`Account created successfully!\n\nYour temporary password: ${newUserInfo.tempPassword}\n\nPlease save this password. You can change it after logging in.\n\nPayment successful! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
                                    } else {
                                        alert(`Payment successful! Order Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}`);
                                    }
                                    // Redirect to order details page
                                    navigate(`/order/${order._id || order.order?._id}`);
                                } else {
                                    throw new Error("Payment verification failed");
                                }
                            } catch (verifyError) {
                                console.error('Payment verification failed:', verifyError);
                                onClose();
                                setIsProcessing(false);
                                alert(`Payment verification failed.\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nPlease contact support or retry payment from order details.`);
                                navigate(`/order/${order._id || order.order?._id}`);
                            }
                        },
                        modal: {
                            ondismiss: () => {
                                console.log('Payment modal dismissed by user');
                                onClose();
                                setIsProcessing(false);
                                alert(`Payment cancelled.\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nYour order is saved. You can complete payment from order details page.`);
                                navigate(`/order/${order._id || order.order?._id}`);
                            },
                        },
                    });
                    rzp.on("payment.failed", (response: any) => {
                        console.error('Razorpay payment failed:', response.error);
                        onClose();
                        setIsProcessing(false);
                        alert(`Payment failed: ${response.error.description || "Unknown error"}\n\nOrder Number: ${order.orderNumber || order.order?.orderNumber || "N/A"}\n\nYou can retry payment from order details page.`);
                        navigate(`/order/${order._id || order.order?._id}`);
                    });
                    // Open Razorpay checkout
                    rzp.open();
                } else if ((selectedGateway === 'STRIPE' || selectedGateway === 'PHONEPE') && (paymentData.checkout_url || paymentData.checkoutUrl)) {
                    // =========== OTHER REDIRECT-BASED CHECKOUT (Stripe/PhonePe) ===========
                    const redirectUrl = paymentData.checkout_url || paymentData.checkoutUrl;
                    window.location.href = redirectUrl;
                } else {
                    // Fallback - no SDK loaded or unknown gateway
                    console.warn(`Payment SDK not loaded for ${selectedGateway}, showing order success`);
                    onClose();
                    setIsProcessing(false);
                    alert(`Order placed successfully! Order Number: ${order.orderNumber || "N/A"}\n\nPayment will be processed offline.`);
                    navigate(`/order/${order._id || order.order?._id}`);
                }
            } catch (paymentError) {
                // Payment initialization failed - order is created but not paid
                console.error("Payment initialization failed:", paymentError);
                onClose();
                setIsProcessing(false);
                alert(`Order created but payment could not be initialized.\n\nOrder Number: ${order.orderNumber || "N/A"}\n\nPlease complete payment from your order details page.`);
                navigate(`/order/${order._id || order.order?._id}`);
            }
        } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Failed to process payment and create order. Please try again.");
            setIsProcessing(false);
        }
    };


    const validateFields = (): boolean => {
        if (!customerName || customerName.trim().length === 0) {
            setPaymentError("Please enter your full name.");
            return false;
        }
        if (!customerEmail || customerEmail.trim().length === 0) {
            setPaymentError("Please enter your email address.");
            return false;
        }
        if (!pincode || pincode.length !== 6) {
            setPaymentError("Please enter a valid 6-digit pincode.");
            return false;
        }
        if (!address || address.trim().length === 0) {
            setPaymentError("Please enter your complete delivery address.");
            return false;
        }
        if (!mobileNumber || mobileNumber.length !== 10) {
            setPaymentError("Please enter a valid 10-digit mobile number.");
            return false;
        }
        return true;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
                onClick={() => !isProcessing && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
                    data-payment-modal
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 border-b border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl">
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Complete Your Order</h3>
                                    <p className="text-blue-100 text-sm mt-0.5">Secure checkout powered by SSL encryption</p>
                                </div>
                            </div>
                            {!isProcessing && (
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                                >
                                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid lg:grid-cols-5 gap-6 p-6">
                            {/* Left Column - Form */}
                            <div className="lg:col-span-3 space-y-5">
                                {/* Error Alert */}
                                {paymentError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-red-900 text-sm">Payment Error</p>
                                            <p className="text-red-700 text-sm mt-1">{paymentError}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Delivery Information Section */}
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Truck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Delivery Information</h4>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-500" />
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => {
                                                    setCustomerName(e.target.value);
                                                    if (paymentError) setPaymentError(null);
                                                }}
                                                placeholder="Enter your full name"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Email and Phone */}
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={customerEmail}
                                                    onChange={(e) => {
                                                        setCustomerEmail(e.target.value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="your@email.com"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    Mobile <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={mobileNumber}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setMobileNumber(value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="10-digit number"
                                                    maxLength={10}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Pincode */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <MapPinned className="w-4 h-4 text-gray-500" />
                                                Pincode <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={pincode}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setPincode(value);
                                                    if (paymentError) setPaymentError(null);
                                                }}
                                                placeholder="6-digit pincode"
                                                maxLength={6}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Shipping Estimate - Appears after valid pincode */}
                                        {pincode && pincode.length === 6 && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
                                                <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100 bg-white/50">
                                                    <Truck className="w-5 h-5 text-blue-600" />
                                                    <h4 className="text-sm font-bold text-gray-900">Shipping Options</h4>
                                                    <span className="ml-auto px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                                                        {pincode}
                                                    </span>
                                                </div>

                                                <div className="p-4">
                                                    {/* Loading State */}
                                                    {courierLoading && (
                                                        <div className="flex items-center justify-center py-4">
                                                            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                                                            <span className="ml-2 text-sm text-gray-600">Checking delivery options...</span>
                                                        </div>
                                                    )}

                                                    {/* Error State */}
                                                    {!courierLoading && courierError && (
                                                        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm font-medium text-red-800">Delivery Not Available</p>
                                                                <p className="text-xs text-red-600 mt-1">{courierError}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Success - Available Couriers */}
                                                    {!courierLoading && serviceability?.available && (
                                                        <div className="space-y-3">
                                                            {/* Free Shipping Badge */}
                                                            {isFreeShipping && (
                                                                <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg border border-green-200">
                                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                                    <span className="text-sm font-semibold text-green-800">🎉 Free Shipping Applied!</span>
                                                                </div>
                                                            )}

                                                            {/* Recommended Courier */}
                                                            {serviceability.recommendedCourier && (
                                                                <div
                                                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedCourier?.courierId === (serviceability.recommendedCourier as CourierOption).courierId
                                                                        ? 'border-green-500 bg-green-50'
                                                                        : 'border-gray-200 bg-white hover:border-green-300'
                                                                        }`}
                                                                    onClick={() => handleCourierSelect(serviceability.recommendedCourier as CourierOption)}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Recommended</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="font-bold text-gray-900">{(serviceability.recommendedCourier as CourierOption).courierName}</p>
                                                                            <div className="flex items-center gap-3 mt-1">
                                                                                <span className="flex items-center gap-1 text-sm text-gray-600">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    {(serviceability.recommendedCourier as CourierOption).estimatedDays} days
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            {isFreeShipping ? (
                                                                                <div>
                                                                                    <p className="text-sm text-gray-400 line-through">{formatCurrency((serviceability.recommendedCourier as CourierOption).rate)}</p>
                                                                                    <p className="text-lg font-bold text-green-600">FREE</p>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-lg font-bold text-green-700">
                                                                                    {formatCurrency((serviceability.recommendedCourier as CourierOption).rate)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Free Shipping Threshold Info */}
                                                            {!isFreeShipping && (
                                                                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                                                    <Package className="w-4 h-4 text-yellow-600" />
                                                                    <span className="text-xs text-yellow-700">
                                                                        Add ₹{(FREE_SHIPPING_THRESHOLD - price).toFixed(0)} more for free shipping
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                Complete Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <textarea
                                                    value={address}
                                                    onChange={(e) => {
                                                        setAddress(e.target.value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="House no., Building, Street, Area, Landmark..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400 resize-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={onGetLocation}
                                                    disabled={isGettingLocation}
                                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                                    title="Auto-detect location"
                                                >
                                                    {isGettingLocation ? (
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MapPin className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                Your address is encrypted and secure
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Section */}
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-green-50 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Payment Method</h4>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            // Use the new integrated handler
                                            await handlePaymentAndOrder();
                                            /*
                                            // Old Logic
                                            if (!validateFields()) return;
                                            setIsProcessing(true);
                                            setPaymentError(null);
                                            try {
                                                await onConfirm({
                                                    customerName,
                                                    customerEmail,
                                                    pincode,
                                                    address,
                                                    mobileNumber
                                                });
                                            } catch (error) {
                                                setPaymentError(error instanceof Error ? error.message : 'Order creation failed. Please try again.');
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                            */
                                        }}
                                        disabled={isProcessing}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Processing Order...
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-5 h-5" />
                                                Confirm Order
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Your order will be created and you can complete payment
                                    </p>
                                </div>
                            </div>

                            {/* Right Column - Summary */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Order Summary */}
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-0">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Package className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Order Summary</h4>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Product</p>
                                            <p className="font-bold text-gray-900">{productName}</p>
                                        </div>

                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Quantity</p>
                                            <p className="font-bold text-gray-900">{quantity.toLocaleString()} units</p>
                                        </div>

                                        {selectedDynamicAttributes.length > 0 && (
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <p className="text-sm font-semibold text-gray-600 mb-2">Customizations</p>
                                                <div className="space-y-1.5">
                                                    {selectedDynamicAttributes.map((attr, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                                            <span className="text-blue-600">•</span>
                                                            <div>
                                                                <span className="text-gray-600">{attr.name}:</span>
                                                                <span className="font-semibold text-gray-900 ml-1">{attr.label || attr.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Pricing */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                                            <ProductPriceBox
                                                productId={productId}
                                                quantity={quantity}
                                                selectedDynamicAttributes={selectedDynamicAttributes}
                                                showBreakdown={true}
                                            />
                                        </div>

                                        {/* Estimated Delivery */}
                                        {estimatedDeliveryDate && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-green-900 text-sm">Estimated Delivery</p>
                                                        <p className="text-green-700 font-semibold mt-1">{estimatedDeliveryDate}</p>
                                                        {deliveryLocationSource && (
                                                            <p className="text-xs text-green-600 mt-1">{deliveryLocationSource}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Security Badge */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-8 h-8 text-blue-600" />
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Secure Payment</p>
                                            <p className="text-xs text-gray-600 mt-0.5">256-bit SSL encryption • PCI DSS compliant</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PaymentConfirmationModal;
