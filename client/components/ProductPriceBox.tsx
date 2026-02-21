import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';
import { useUserContext } from '../lib/useUserContext';
import { formatPrice as formatCurrency, getCurrencySymbol } from '../utils/currencyUtils';

/**
 * ProductPriceBox Component
 *
 * Displays real-time pricing for a product with automatic updates
 * when quantity or attributes change.
 *
 * Features:
 * - Segment-based pricing (CORPORATE, PRINT_PARTNER, VIP, RETAIL)
 * - IP-based location detection
 * - Shows user segment and geo zone badges
 * - Price breakdown with modifiers
 * - Loading states & error handling
 */

interface ProductPriceBoxProps {
  productId: string;
  productName?: string;
  selectedDynamicAttributes?: any[];
  quantity?: number;
  showBreakdown?: boolean;
  numberOfDesigns?: number; // Multiplier for bulk orders
  onPriceChange?: (pricing: PricingData | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  hideDetails?: boolean;
  attributeCharges?: Array<{ name: string; label: string; charge: number; perUnitCharge?: number; isSubAttribute?: boolean }>;
  pincode?: string; // Explicit pincode override (from shipping/delivery selection)
  shippingCharge?: number; // Shipping charge to add to summary
}

interface PricingData {
  basePrice: number;
  totalPayable: number;
  subtotal: number;
  gstAmount: number;
  gstPercentage: number;
  appliedModifiers: any[];
  currency: string;
  calculatedAt: string;
  compareAtPrice?: number;
  quantity?: number;
}

interface PricingMeta {
  userSegment: string;
  userSegmentName: string;
  geoZone: string | null;
  pincode: string;
  detectedBy: string;
  isGuest: boolean;
  geoZoneHierarchy?: Array<{
    _id: string;
    name: string;
    level: string;
    code?: string;
  }>;
  usedZoneId?: string;
  usedZoneName?: string;
  usedZoneLevel?: string;
}

export default function ProductPriceBox({
  productId,
  productName,
  selectedDynamicAttributes = [],
  quantity = 1,
  showBreakdown = false,
  numberOfDesigns = 1,
  onPriceChange,
  onLoadingChange,
  hideDetails = false,
  attributeCharges = [],
  pincode: explicitPincode,
  shippingCharge,
}: ProductPriceBoxProps) {
  const onPriceChangeRef = useRef(onPriceChange);
  const onLoadingChangeRef = useRef(onLoadingChange);

  useEffect(() => {
    onPriceChangeRef.current = onPriceChange;
    onLoadingChangeRef.current = onLoadingChange;
  }, [onPriceChange, onLoadingChange]);

  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [pricingMeta, setPricingMeta] = useState<PricingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState<{ isNotAvailable: boolean; message: string }>({
    isNotAvailable: false,
    message: '',
  });

  const { context: userContext, loading: contextLoading } = useUserContext();

  useEffect(() => {
    const fetchPricing = async () => {
      if (contextLoading || !userContext) return;

      setLoading(true);
      onLoadingChangeRef.current?.(true);
      setError(null);

      console.log('💰 Fetching pricing with context:', {
        segment: userContext.segment.code,
        pincode: userContext.location.pincode,
        user: userContext.user.name,
      });

      try {
        const token = localStorage.getItem('token');

        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const formatAttributesForPricing = (attrs: any[]) => {
          if (!Array.isArray(attrs) || attrs.length === 0) return [];

          return attrs
            .map((attr) => ({
              type: attr.attributeType || attr.type,
              value: attr.value,
              attributeType: attr.attributeType || attr.type,
              attributeValue: attr.value,
            }))
            .filter((a) => a.value != null);
        };

        const body: any = {
          productId,
          selectedDynamicAttributes: formatAttributesForPricing(selectedDynamicAttributes),
          quantity,
          numberOfDesigns,
        };

        // Use explicit pincode prop if provided, otherwise fall back to userContext
        const resolvedPincode = explicitPincode || userContext.location.pincode;
        if (resolvedPincode) {
          body.pincode = resolvedPincode;
        }

        console.log('🚀 ProductPriceBox sending request:', {
          hasUserContext: !!userContext,
          pincode: userContext?.location?.pincode,
          bodyPincode: body.pincode,
          fullBody: body,
        });

        const response = await fetch(`${API_BASE_URL}/api/pricing/quote`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || `Server error: ${response.status}`;
          console.error('❌ Server error:', errorData);
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success) {
          setPricing(data.pricing);
          setPricingMeta(data.meta);
          if (onPriceChangeRef.current) onPriceChangeRef.current(data.pricing);

          console.log('\n' + '='.repeat(80));
          console.log('💰 PRICING API RESPONSE');
          console.log('='.repeat(80));
          console.log('\n👤 USER & SEGMENT:');
          console.log(`   Segment: ${data.meta.userSegmentName} (${data.meta.userSegment})`);
          console.log(`   Guest Mode: ${data.meta.isGuest ? 'YES' : 'NO'}`);
          console.log(`   Authenticated: ${data.meta.isAuthenticated ? 'YES ✅' : 'NO ❌'}`);
          console.log(`   Pricing Tier: ${data.meta.pricingTier}`);
          console.log('\n📍 LOCATION:');
          console.log(`   Pincode: ${data.meta.pincode}`);
          console.log(`   Geo Zone: ${data.meta.geoZone || 'Not mapped'}`);
          console.log(`   Detection Method: ${data.meta.detectedBy}`);
          if (data.meta.detectedBy === 'IP_DETECTION') {
            console.log(`   ⚠️  Location detected from IP address (not browser geolocation)`);
          } else {
            console.log(`   ✅ Location provided via request/localStorage`);
          }
          console.log('\n💵 PRICING:');
          const currSymbol = getCurrencySymbol(data.pricing.currency || 'INR');
          console.log(`   Base Price: ${currSymbol}${data.pricing.basePrice}`);
          console.log(`   Subtotal: ${currSymbol}${data.pricing.subtotal}`);
          console.log(`   GST (${data.pricing.gstPercentage}%): ${currSymbol}${data.pricing.gstAmount}`);
          console.log(`   Total Payable: ${currSymbol}${data.pricing.totalPayable}`);
          console.log(`   Modifiers Applied: ${data.meta.modifiersApplied}`);
          if (data.pricing.appliedModifiers?.length > 0) {
            console.log('\n🎯 MODIFIERS:');
            data.pricing.appliedModifiers.forEach((mod: any, i: number) => {
              const name = mod.reason || mod.source || mod.name || 'Modifier';
              const value = mod.value !== undefined ? mod.value : mod.applied || 0;
              const type = mod.modifierType || mod.type || 'FIXED';
              console.log(`   ${i + 1}. ${name}: ${value > 0 ? '+' : ''}${value} (${type})`);
            });
          }
          console.log('='.repeat(80) + '\n');
        } else if (data.isAvailable === false || data.errorCode === 'PRODUCT_NOT_AVAILABLE') {
          setNotAvailable({
            isNotAvailable: true,
            message: data.displayMessage || data.message || 'This product is not available in your region',
          });
          onPriceChangeRef.current?.(null);
          console.log('⚠️ Product Not Available:', data.message);
        } else {
          setError(data.error || data.message || 'Failed to calculate price');
          onPriceChangeRef.current?.(null);
        }
      } catch (err: any) {
        console.error('❌ ProductPriceBox: Error fetching pricing:', err);
        setError(err.message || 'Network error');
        onPriceChangeRef.current?.(null);
      } finally {
        setLoading(false);
        onLoadingChangeRef.current?.(false);
      }
    };

    if (productId) {
      fetchPricing();
    }
  }, [productId, JSON.stringify(selectedDynamicAttributes), quantity, userContext, contextLoading, explicitPincode]);

  const formatPrice = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      const currency = pricing?.currency || 'INR';
      return formatCurrency(0, currency);
    }
    const currency = pricing?.currency || 'INR';
    return formatCurrency(value, currency);
  };

  // Helper to calculate savings percentage
  const getSavingsPercentage = () => {
    if (!pricing?.compareAtPrice || !pricing?.totalPayable) return 0;
    if (pricing.compareAtPrice <= pricing.totalPayable) return 0;
    return Math.round(((pricing.compareAtPrice - pricing.totalPayable) / pricing.compareAtPrice) * 100);
  };

  if (contextLoading || loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-6 w-2/3 rounded bg-gray-200"></div>
        <div className="h-4 w-1/2 rounded bg-gray-100"></div>
        <div className="h-10 w-full rounded bg-gray-200"></div>
      </div>
    );
  }

  if (error) {

    const isMissingMasterPrice = error.toLowerCase().includes('no master price') || error.toLowerCase().includes('not found');

    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <span className="text-xl">💰</span>
        </div>
        <h3 className="text-lg font-semibold text-amber-800">
          {isMissingMasterPrice ? "Price is not given yet" : "Pricing Unavailable"}
        </h3>
        <p className="mt-1 text-sm text-amber-600">
          {isMissingMasterPrice
            ? "We are currently updating the pricing for this product. Please check back later."
            : error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-white border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notAvailable.isNotAvailable) {
    return (
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        {/* Colored header bar for visual emphasis */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-center text-sm font-medium text-white">
          Availability Alert
        </div>

        <div className="p-6 text-center">
          {/* Icon with subtle glow */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 shadow-inner">
            <svg
              className="h-7 w-7 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>

          {/* Main message */}
          <h3 className="text-lg font-semibold text-gray-900">Product Not Available</h3>
        </div>
      </div>
    );
  }

  if (!pricing) return null;

  // ------------------------------------------------------------
  // NEW UI – PREMIUM ORDER SUMMARY
  // ------------------------------------------------------------
  if (hideDetails) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Total Amount</p>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">
            {formatPrice(pricing.totalPayable * numberOfDesigns)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Order Summary</h3>
        <span className="text-xs font-medium text-amber-700/70 uppercase tracking-widest">Live estimate</span>
      </div>

      {/* Details List */}
      <div className="space-y-4 mb-6">
        {(() => {
          // Calculate total attribute charges from frontend-computed attribute pricing
          const totalAttrCharges = attributeCharges.reduce((sum, c) => sum + c.charge, 0);
          // Compute the adjusted subtotal, GST, and total including attribute charges
          const adjustedSubtotal = (pricing.subtotal * numberOfDesigns) + totalAttrCharges;
          const adjustedGst = Math.round((adjustedSubtotal * pricing.gstPercentage / 100 + Number.EPSILON) * 100) / 100;
          const adjustedTotal = Math.round((adjustedSubtotal + adjustedGst + Number.EPSILON) * 100) / 100;

          return (
            <>
              {/* Product Name */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Product</span>
                <span className="text-gray-900 font-semibold">{productName || "Product"}</span>
              </div>

              {/* Quantity */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Quantity</span>
                <span className="text-gray-900 font-semibold">{quantity.toLocaleString()}</span>
              </div>

              {/* Base Price per unit (final price after dynamic pricing modifiers) */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Base price (per unit)</span>
                <span className="text-gray-900 font-semibold">{formatPrice(pricing.subtotal / quantity)}</span>
              </div>

              {/* Dynamic Attributes / Options - sorted by displayOrder */}
              {selectedDynamicAttributes
                ?.filter((attr) => {
                  const val = attr.label || attr.value || attr.attributeValue;
                  if (typeof val === 'string' && (val.length > 50 || /^[0-9a-f]{24}$/i.test(val))) return false;
                  return val != null && val !== '' && val !== 'default' && val !== 'not-required';
                })
                .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
                .map((attr, index) => {
                  const attrName = attr.name || attr.attributeName || attr.type || attr.attributeType;
                  const attrValue = attr.label || attr.value || attr.attributeValue;
                  const isSubAttr = attr.isSubAttribute;

                  // Look up charge from attributeCharges prop (frontend-calculated)
                  const chargeEntry = attributeCharges.find(c => c.name === attrName);
                  const chargeAmount = chargeEntry?.charge || 0;
                  const perUnitChargeSource = chargeEntry?.perUnitCharge || 0;

                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span className={`text-gray-500 font-medium ${isSubAttr ? 'pl-4 flex items-center gap-1 text-[13px]' : ''}`}>
                        {isSubAttr && <span className="text-gray-300">└</span>}
                        {attrName}: {String(attrValue)}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {chargeAmount > 0 ? `+${formatPrice(chargeAmount)}` : formatPrice(0)}
                      </span>
                    </div>
                  );
                })}

              {/* Subtotal (API base × qty + attribute charges) */}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                <span className="text-gray-600 font-semibold">Subtotal</span>
                <span className="text-gray-900 font-semibold">{formatPrice(adjustedSubtotal)}</span>
              </div>

              {/* GST */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">GST ({pricing.gstPercentage}%)</span>
                <span className="text-gray-900 font-semibold">{formatPrice(adjustedGst)}</span>
              </div>

              {/* Shipment Charges */}
              {shippingCharge !== undefined && shippingCharge !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Shipment Charges</span>
                  <span className="text-gray-900 font-semibold">
                    {shippingCharge === 0 ? 'Free' : `+${formatPrice(shippingCharge)}`}
                  </span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Separator */}
      <div className="border-t border-gray-100 pt-6">
        {(() => {
          const totalAttrCharges = attributeCharges.reduce((sum, c) => sum + c.charge, 0);
          const adjustedSubtotal = (pricing.subtotal * numberOfDesigns) + totalAttrCharges;
          const adjustedGst = Math.round((adjustedSubtotal * pricing.gstPercentage / 100 + Number.EPSILON) * 100) / 100;
          const adjustedTotal = Math.round((adjustedSubtotal + adjustedGst + (shippingCharge || 0) + Number.EPSILON) * 100) / 100;
          return (
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-gray-900">Estimated Total Value</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(adjustedTotal)}
              </span>
            </div>
          );
        })()}
        <p className="text-[11px] text-gray-400 leading-relaxed max-w-[280px]">
          Final price may adjust slightly based on selected options and taxes at checkout.
        </p>
      </div>
    </div>
  );
}

// Optional: Export a simpler version for quick integration
export function SimpleProductPrice({ productId, quantity = 1 }: { productId: string; quantity?: number }) {
  return <ProductPriceBox productId={productId} quantity={quantity} showBreakdown={false} />;
}

// Optional: Export a detailed version with breakdown
export function DetailedProductPrice({ productId, selectedDynamicAttributes, quantity = 1 }: ProductPriceBoxProps) {
  return (
    <ProductPriceBox
      productId={productId}
      selectedDynamicAttributes={selectedDynamicAttributes}
      quantity={quantity}
      showBreakdown={true}
    />
  );
}