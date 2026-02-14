import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';
import { useUserContext } from '../lib/useUserContext';
import { formatPrice as formatCurrency, getCurrencySymbol } from '../src/utils/currencyUtils';

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
  selectedDynamicAttributes?: any[];
  quantity?: number;
  showBreakdown?: boolean;
  numberOfDesigns?: number; // Multiplier for bulk orders
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
  // NEW: Zone hierarchy data
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
  selectedDynamicAttributes = [],
  quantity = 1,
  showBreakdown = false,
  numberOfDesigns = 1,
}: ProductPriceBoxProps) {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [pricingMeta, setPricingMeta] = useState<PricingMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState<{ isNotAvailable: boolean; message: string }>({ isNotAvailable: false, message: '' });

  // Get user context (segment + location)
  const { context: userContext, loading: contextLoading } = useUserContext();

  useEffect(() => {
    const fetchPricing = async () => {
      // Wait for context to load
      if (contextLoading || !userContext) {
        return;
      }

      setLoading(true);
      setError(null);

      console.log('💰 Fetching pricing with context:', {
        segment: userContext.segment.code,
        pincode: userContext.location.pincode,
        user: userContext.user.name
      });

      try {
        // Get auth token if exists
        const token = localStorage.getItem('token');

        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Format attributes for backend consumption
        const formatAttributesForPricing = (attrs: any[]) => {
          if (!Array.isArray(attrs) || attrs.length === 0) return [];

          return attrs.map(attr => ({
            type: attr.attributeType || attr.type,
            value: attr.value,
            attributeType: attr.attributeType || attr.type,
            attributeValue: attr.value
          })).filter(a => a.value != null);
        };

        const body: any = {
          productId,
          selectedDynamicAttributes: formatAttributesForPricing(selectedDynamicAttributes),
          quantity,
          numberOfDesigns, // For bulk orders - backend multiplies quantity × numberOfDesigns
        };

        // Use pincode from context (IP-detected or user profile)
        if (userContext.location.pincode) {
          body.pincode = userContext.location.pincode;
        }

        console.log('🚀 ProductPriceBox sending request:', {
          hasUserContext: !!userContext,
          pincode: userContext?.location?.pincode,
          bodyPincode: body.pincode,
          fullBody: body
        });

        const response = await fetch(`${API_BASE_URL}/api/pricing/quote`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          // Try to get error message from response
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || `Server error: ${response.status}`;
          console.error('❌ Server error:', errorData);
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.success) {
          setPricing(data.pricing);
          setPricingMeta(data.meta);

          // Enhanced logging for user information
          console.log('\\n' + '='.repeat(80));
          console.log('💰 PRICING API RESPONSE');
          console.log('='.repeat(80));

          console.log('\\n👤 USER & SEGMENT:');
          console.log(`   Segment: ${data.meta.userSegmentName} (${data.meta.userSegment})`);
          console.log(`   Guest Mode: ${data.meta.isGuest ? 'YES' : 'NO'}`);
          console.log(`   Authenticated: ${data.meta.isAuthenticated ? 'YES ✅' : 'NO ❌'}`);
          console.log(`   Pricing Tier: ${data.meta.pricingTier}`);

          console.log('\\n📍 LOCATION:');
          console.log(`   Pincode: ${data.meta.pincode}`);
          console.log(`   Geo Zone: ${data.meta.geoZone || 'Not mapped'}`);
          console.log(`   Detection Method: ${data.meta.detectedBy}`);
          if (data.meta.detectedBy === 'IP_DETECTION') {
            console.log(`   ⚠️  Location detected from IP address (not browser geolocation)`);
          } else {
            console.log(`   ✅ Location provided via request/localStorage`);
          }

          console.log('\\n💵 PRICING:');
          const currSymbol = getCurrencySymbol(data.pricing.currency || 'INR');
          console.log(`   Base Price: ${currSymbol}${data.pricing.basePrice}`);
          console.log(`   Subtotal: ${currSymbol}${data.pricing.subtotal}`);
          console.log(`   GST (${data.pricing.gstPercentage}%): ${currSymbol}${data.pricing.gstAmount}`);
          console.log(`   Total Payable: ${currSymbol}${data.pricing.totalPayable}`);
          console.log(`   Modifiers Applied: ${data.meta.modifiersApplied}`);

          if (data.pricing.appliedModifiers?.length > 0) {
            console.log('\\n🎯 MODIFIERS:');
            data.pricing.appliedModifiers.forEach((mod: any, i: number) => {
              const name = mod.reason || mod.source || mod.name || 'Modifier';
              const value = mod.value !== undefined ? mod.value : (mod.applied || 0);
              const type = mod.modifierType || mod.type || 'FIXED';
              console.log(`   ${i + 1}. ${name}: ${value > 0 ? '+' : ''}${value} (${type})`);
            });
          }

          console.log('='.repeat(80) + '\\n');
        } else if (data.isAvailable === false || data.errorCode === 'PRODUCT_NOT_AVAILABLE') {
          // Product is blocked in this region
          setNotAvailable({
            isNotAvailable: true,
            message: data.displayMessage || data.message || 'This product is not available in your region'
          });
          console.log('⚠️ Product Not Available:', data.message);
        } else {
          setError(data.error || data.message || 'Failed to calculate price');
        }
      } catch (err: any) {
        console.error('❌ ProductPriceBox: Error fetching pricing:', err);
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchPricing();
    }
  }, [productId, JSON.stringify(selectedDynamicAttributes), quantity, userContext, contextLoading]);

  const formatPrice = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      const currency = pricing?.currency || 'INR';
      return formatCurrency(0, currency);
    }
    const currency = pricing?.currency || 'INR';
    return formatCurrency(value, currency);
  };

  if (contextLoading || loading) {
    return (
      <div className="price-box loading animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-24"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-box error">
        <div className="text-red-500 text-sm mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
          <span className="font-bold">⚠️ Error:</span> {error}
          <button
            onClick={() => window.location.reload()}
            className="underline ml-2 hover:text-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Product not available in this region
  if (notAvailable.isNotAvailable) {
    return (
      <div className="price-box not-available">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-amber-800">Product Not Available</h3>
            <p className="text-amber-700 text-sm">{notAvailable.message}</p>
            {userContext?.location?.geoZone?.name && (
              <p className="text-xs text-amber-600 mt-1">
                📍 Your region: <strong>{userContext.location.geoZone.name}</strong>
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Please check other products or contact support for availability
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!pricing) {
    return null;
  }

  return (
    <div className="price-box">
      {/* Professional E-commerce Order Summary - Matches Page Design */}
      {!showBreakdown && (
        <div className="space-y-3">
          {/* Selected Options - Clean Card */}
          {selectedDynamicAttributes && selectedDynamicAttributes.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">Selected Options:</div>
              <div className="space-y-2">
                {selectedDynamicAttributes
                  .filter((attr: any) => {
                    const val = attr.value || attr.attributeValue;
                    if (typeof val === 'string' && (val.length > 30 || /^[0-9a-f]{24}$/i.test(val))) {
                      return false;
                    }
                    return val != null && val !== '';
                  })
                  .map((attr: any, index: number) => {
                    const attrName = attr.name || attr.attributeName || attr.type || attr.attributeType || 'Option';
                    const rawValue = attr.label || attr.value || attr.attributeValue;

                    // Safely handle different value types (especially File objects)
                    let attrValue: React.ReactNode = String(rawValue || '');

                    const isFile = rawValue instanceof File ||
                      (typeof rawValue === 'object' && rawValue !== null &&
                        (Object.prototype.toString.call(rawValue) === '[object File]' ||
                          ('name' in rawValue && 'size' in rawValue)));

                    if (isFile) {
                      attrValue = (rawValue as any).name;
                    } else if (typeof rawValue === 'object' && rawValue !== null) {
                      attrValue = rawValue.label || rawValue.name || JSON.stringify(rawValue);
                    } else {
                      attrValue = String(rawValue || '');
                    }

                    return (
                      <div key={index} className="flex justify-between items-center text-sm py-1.5 px-2 rounded hover:bg-gray-50 transition-colors">
                        <span className="text-gray-600 font-medium">{attrName}</span>
                        <span className="font-semibold text-gray-900">{attrValue}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Price Breakdown - Professional Card Layout */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Unit Price */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Unit Price</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(pricing.subtotal / quantity)}</span>
              </div>
            </div>

            {/* Subtotal */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal</span>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-0.5">
                    × {quantity.toLocaleString()} units
                    {numberOfDesigns > 1 && ` × ${numberOfDesigns} designs`}
                  </div>
                  <div className="text-base font-bold text-gray-900">{formatPrice(pricing.subtotal * numberOfDesigns)}</div>
                </div>
              </div>
            </div>

            {/* GST */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">GST ({pricing.gstPercentage}%)</span>
                <span className="text-base font-bold text-gray-900">{formatPrice(pricing.gstAmount * numberOfDesigns)}</span>
              </div>
            </div>

            {/* Total Payable - Highlighted Section */}
            <div className="px-5 py-4 bg-gradient-to-br from-green-500 to-emerald-600">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wide mb-0.5">Total Amount</div>
                  <div className="text-xs text-white/90">Inclusive of all taxes</div>
                </div>
                <div className="text-3xl font-bold text-white">{formatPrice(pricing.totalPayable * numberOfDesigns)}</div>
              </div>
            </div>
          </div>

          {/* Zone Hierarchy Display REMOVED as per user request to hide internal pricing logic */}

          {/* Footer Info */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div>Price for {quantity.toLocaleString()} units</div>
            {pricing.calculatedAt && new Date(pricing.calculatedAt).toString() !== 'Invalid Date' && (
              <div>Calculated at {new Date(pricing.calculatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Breakdown (only when showBreakdown=true) */}
      {showBreakdown && (
        <>
          {/* Main Price Display */}
          <div className="price-main flex items-baseline gap-2">
            {pricing.compareAtPrice && pricing.compareAtPrice > pricing.totalPayable && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(pricing.compareAtPrice)}
              </span>
            )}
            <span className="text-3xl font-bold text-blue-900">
              {formatPrice(pricing.totalPayable)}
            </span>
          </div>

          {/* User Context Badges */}
          {userContext && (
            <div className="mt-3 p-3 bg-linear-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-600 font-medium">Pricing for:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                  👤 {userContext.segment.name}
                </span>
                {userContext.location.geoZone.name && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">
                    📍 {userContext.location.geoZone.name}
                  </span>
                )}
                {userContext.location.pincode && (
                  <span className="text-xs text-gray-500">({userContext.location.pincode})</span>
                )}
              </div>

              {/* Detection method (for transparency) */}
              {userContext.location.detectionMethod === 'IP_DETECTION' && (
                <div className="mt-2 text-xs text-gray-600 italic flex items-center gap-1">
                  <span>🌍 Location detected from your IP address</span>
                </div>
              )}

              {userContext.user.isGuest && (
                <div className="mt-2 text-xs text-blue-700 font-medium">
                  💡 Login to unlock special pricing for your account
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Price Breakdown */}
      {showBreakdown && (
        <div className="price-breakdown mt-4 space-y-2 border-t border-gray-200 pt-4">
          {/* Pricing Waterfall Section */}
          <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-lg p-4 mb-3">
            <div className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span>💎</span>
              <span>PRICING WATERFALL</span>
            </div>

            {/* Master Price */}
            <div className="flex justify-between text-sm mb-2 py-1 border-b border-blue-100">
              <span className="text-gray-700 flex items-center gap-1">
                <span className="text-blue-500">①</span> Master Price:
              </span>
              <span className="font-semibold text-gray-900">{formatPrice(pricing.basePrice)}</span>
            </div>

            {/* Zone Override (if any) */}
            {pricing.appliedModifiers?.some((m: any) => m.type === 'ZONE_BOOK') && (
              <div className="flex justify-between text-sm mb-2 py-1 border-b border-green-100 bg-green-50/50 px-2 rounded">
                <span className="text-gray-700 flex items-center gap-1">
                  <span className="text-green-600">②</span> Zone Override:
                  <span className="text-xs text-green-700 font-medium">
                    ({pricing.appliedModifiers.find((m: any) => m.type === 'ZONE_BOOK')?.source || 'Zone Book'})
                  </span>
                </span>
                <span className="font-semibold text-green-700">
                  {formatPrice(pricing.appliedModifiers.find((m: any) => m.type === 'ZONE_BOOK')?.afterPrice || pricing.basePrice)}
                </span>
              </div>
            )}

            {/* Segment Override (if any) */}
            {pricing.appliedModifiers?.some((m: any) => m.type === 'SEGMENT_BOOK') && (
              <div className="flex justify-between text-sm mb-2 py-1 border-b border-purple-100 bg-purple-50/50 px-2 rounded">
                <span className="text-gray-700 flex items-center gap-1">
                  <span className="text-purple-600">③</span> Segment Override:
                  <span className="text-xs text-purple-700 font-medium">
                    ({pricing.appliedModifiers.find((m: any) => m.type === 'SEGMENT_BOOK')?.source || 'Segment Book'})
                  </span>
                </span>
                <span className="font-semibold text-purple-700">
                  {formatPrice(pricing.appliedModifiers.find((m: any) => m.type === 'SEGMENT_BOOK')?.afterPrice || pricing.basePrice)}
                </span>
              </div>
            )}

            {/* Modifiers Applied */}
            {pricing.appliedModifiers?.filter((m: any) => m.type === 'MODIFIER').length > 0 && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>④</span> Price Modifiers Applied:
                </div>
                {pricing.appliedModifiers
                  ?.filter((m: any) => m.type === 'MODIFIER')
                  .map((mod: any, idx: number) => {
                    let label = mod.name || mod.source || mod.modifierName;
                    if (mod.modifierType === 'PERCENT_DEC') label += ` (${mod.value}% off)`;
                    if (mod.modifierType === 'PERCENT_INC') label += ` (+${mod.value}%)`;
                    const modCurrSymbol = getCurrencySymbol(pricing.currency || 'INR');
                    if (mod.modifierType === 'FLAT_DEC') label += ` (-${modCurrSymbol}${mod.value})`;
                    if (mod.modifierType === 'FLAT_INC') label += ` (+${modCurrSymbol}${mod.value})`;

                    const change = mod.change || mod.applied || 0;

                    return (
                      <div key={idx} className="flex justify-between text-xs mb-1 pl-2 py-1">
                        <span className="text-gray-600">{label}:</span>
                        <span className={change >= 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {change >= 0 ? '+' : ''}{formatPrice(change)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Final Unit Price (Calculated) */}
          <div className="flex justify-between font-medium text-gray-800 border-b border-dashed border-gray-200 pb-2">
            <span>Final Unit Price:</span>
            <span>{formatPrice(pricing.subtotal / quantity)}</span>
          </div>

          {/* Totals Section */}
          <div className="flex justify-between text-gray-600 pt-2">
            <span>Subtotal ({quantity} units):</span>
            <span>{formatPrice(pricing.subtotal)}</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>GST ({pricing.gstPercentage}%):</span>
            <span>{formatPrice(pricing.gstAmount)}</span>
          </div>

          <div className="flex justify-between text-xl font-bold text-blue-900 border-t border-gray-300 pt-3 mt-2">
            <span>Total Payable:</span>
            <span>{formatPrice(pricing.totalPayable)}</span>
          </div>
        </div>
      )}

      {/* Quantity Display */}
      {quantity > 1 && (
        <div className="price-note mt-2 text-sm text-gray-500">
          Price for {quantity} units
        </div>
      )}

      {/* Cache Info (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          Calculated at: {new Date(pricing.calculatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// Optional: Export a simpler version for quick integration
export function SimpleProductPrice({ productId, quantity = 1 }: { productId: string; quantity?: number }) {
  return (
    <ProductPriceBox
      productId={productId}
      quantity={quantity}
      showBreakdown={false}
    />
  );
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
