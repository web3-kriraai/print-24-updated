import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';
import { useUserContext } from '../lib/useUserContext';

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
}

export default function ProductPriceBox({
  productId,
  selectedDynamicAttributes = [],
  quantity = 1,
  showBreakdown = false
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

        const body: any = {
          productId,
          selectedDynamicAttributes,
          quantity,
        };

        // Use pincode from context (IP-detected or user profile)
        if (userContext.location.pincode) {
          body.pincode = userContext.location.pincode;
        }

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
          console.log(`   Base Price: ₹${data.pricing.basePrice}`);
          console.log(`   Subtotal: ₹${data.pricing.subtotal}`);
          console.log(`   GST (${data.pricing.gstPercentage}%): ₹${data.pricing.gstAmount}`);
          console.log(`   Total Payable: ₹${data.pricing.totalPayable}`);
          console.log(`   Modifiers Applied: ${data.meta.modifiersApplied}`);

          if (data.pricing.appliedModifiers?.length > 0) {
            console.log('\\n🎯 MODIFIERS:');
            data.pricing.appliedModifiers.forEach((mod: any, i: number) => {
              console.log(`   ${i + 1}. ${mod.name}: ${mod.applied > 0 ? '+' : ''}${mod.applied} (${mod.type})`);
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
      return '₹0.00';
    }
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

      {/* User Context Badges (NEW) */}
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
                    if (mod.modifierType === 'FLAT_DEC') label += ` (-₹${mod.value})`;
                    if (mod.modifierType === 'FLAT_INC') label += ` (+₹${mod.value})`;

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
