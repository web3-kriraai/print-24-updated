/**
 * =========================================================================
 * LIVE PRICE PREVIEW - PRODUCTION-READY VERSION
 * =========================================================================
 * 
 * CRITICAL FIXES APPLIED:
 * 1. ✅ Uses /api/pricing/resolve (canonical API)
 * 2. ✅ Aborts in-flight requests (prevents race conditions)
 * 3. ✅ Proper pricingKey mapping from sub-attributes
 * 4. ✅ Error handling
 * 5. ✅ Debouncing
 */

import { useState, useEffect, useRef } from 'react';

// Add this to your GlossProductSelection component state
let priceController: AbortController | null = null;

/**
 * Fetch live price preview from backend
 * 
 * IMPORTANT: Uses /api/pricing/resolve (canonical API)
 * NOT /api/modifiers/preview (admin-only)
 */
export const fetchLivePricePreview = async (
    selectedProduct: any,
    quantity: number,
    selectedDynamicAttributes: any,
    promoCodes: string[],
    pincode: string,
    API_BASE_URL: string,
    setLivePrice: (data: any) => void,
    setIsPriceLoading: (loading: boolean) => void,
    setPriceError: (error: string | null) => void,
    setPrice: (price: number) => void,
    setGstAmount: (gst: number) => void
) => {
    if (!selectedProduct || !quantity || quantity <= 0) {
        setLivePrice(null);
        return;
    }

    // 🔴 FIX 2: Abort previous request to prevent race conditions
    if (priceController) {
        priceController.abort();
    }
    priceController = new AbortController();

    setIsPriceLoading(true);
    setPriceError(null);

    try {
        // Prepare dynamic attributes with CORRECT pricingKey mapping
        const processedAttributes = [];

        for (const key of Object.keys(selectedDynamicAttributes)) {
            // Skip image keys
            if (key.includes('_images')) continue;

            const value = selectedDynamicAttributes[key];
            if (!value) continue;

            // Check if this is a sub-attribute (format: attrId__parentValue)
            if (key.includes('__')) {
                const [attrId, parentValue] = key.split('__');

                // 🔴 FIX 3: Get pricingKey from SUB-ATTRIBUTE, not parent
                // Find the sub-attribute to get its pricingKey
                const subAttributesKey = `${attrId}:${parentValue}`;
                const pdpSubAttributes = (window as any).pdpSubAttributes || {};
                const subAttributes = pdpSubAttributes[subAttributesKey] || [];
                const selectedSubAttr = subAttributes.find((sa: any) => sa.value === value);

                if (selectedSubAttr && selectedSubAttr.pricingKey) {
                    processedAttributes.push({
                        attributeType: attrId,
                        value: value,
                        pricingKey: selectedSubAttr.pricingKey // ✅ From sub-attribute
                    });
                }
            } else {
                // Regular attribute
                const productAttr = selectedProduct.dynamicAttributes?.find(
                    (attr: any) => {
                        const attrType = typeof attr.attributeType === 'object' ? attr.attributeType : null;
                        return attrType?._id === key;
                    }
                );

                if (productAttr) {
                    const attrType = typeof productAttr.attributeType === 'object' ? productAttr.attributeType : null;
                    if (attrType) {
                        // Check if there's a custom value with pricingKey
                        const customValues = productAttr.customValues || [];
                        const defaultValues = attrType.attributeValues || [];
                        const allValues = customValues.length > 0 ? customValues : defaultValues;

                        const selectedValue = allValues.find((av: any) => av.value === value);
                        const pricingKey = selectedValue?.pricingKey || attrType.pricingKey || null;

                        processedAttributes.push({
                            attributeType: attrType._id,
                            value: value,
                            pricingKey: pricingKey
                        });
                    }
                }
            }
        }

        // 🔴 FIX 1: Use canonical pricing API
        const token = localStorage.getItem('token');
        const headers: any = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/pricing/resolve`, {
            method: 'POST',
            headers,
            signal: priceController.signal, // ✅ Abort signal
            body: JSON.stringify({
                productId: selectedProduct._id,
                quantity: parseInt(quantity.toString()),
                pincode: pincode || '110001',
                selectedDynamicAttributes: processedAttributes,
                promoCodes: promoCodes || []
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch price');
        }

        const data = await response.json();

        // Update state with backend-calculated price
        setLivePrice(data);
        setPrice(data.subtotal);
        setGstAmount(data.gstAmount);

    } catch (err: any) {
        // Ignore abort errors (expected when user types fast)
        if (err.name === 'AbortError') {
            return;
        }

        console.error('Price preview error:', err);
        setPriceError(err instanceof Error ? err.message : 'Failed to calculate price');
    } finally {
        setIsPriceLoading(false);
    }
};

/**
 * useEffect hook for auto-updating price
 * 
 * Add this to your component:
 */
export const useLivePricePreview = (
    selectedProduct: any,
    quantity: number,
    selectedDynamicAttributes: any,
    promoCodes: string[],
    pincode: string,
    API_BASE_URL: string,
    setLivePrice: (data: any) => void,
    setIsPriceLoading: (loading: boolean) => void,
    setPriceError: (error: string | null) => void,
    setPrice: (price: number) => void,
    setGstAmount: (gst: number) => void
) => {
    useEffect(() => {
        // Debounce to avoid too many API calls
        const timer = setTimeout(() => {
            fetchLivePricePreview(
                selectedProduct,
                quantity,
                selectedDynamicAttributes,
                promoCodes,
                pincode,
                API_BASE_URL,
                setLivePrice,
                setIsPriceLoading,
                setPriceError,
                setPrice,
                setGstAmount
            );
        }, 500); // Wait 500ms after last change

        return () => {
            clearTimeout(timer);
            // Cleanup: abort any pending request
            if (priceController) {
                priceController.abort();
                priceController = null;
            }
        };
    }, [
        selectedProduct?._id,
        quantity,
        JSON.stringify(selectedDynamicAttributes), // Deep comparison
        JSON.stringify(promoCodes), // Deep comparison
        pincode
    ]);
};
