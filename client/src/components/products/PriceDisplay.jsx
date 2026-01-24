import React, { useState } from 'react';
import { useDynamicPricing } from '../../hooks/useDynamicPricing';
import PriceBreakdownModal from './PriceBreakdownModal';
import './PriceDisplay.css';

/**
 * PriceDisplay Component
 * 
 * Displays dynamic pricing for a product with user-specific discounts,
 * badges, and breakdown modal
 */
const PriceDisplay = ({
  product,
  quantity = 1,
  showBadges = true,
  showBreakdownLink = true,
  compact = false,
  className = '',
  // Optional: Pass external price data to avoid internal fetching
  priceData = null,
  loading: externalLoading = null,
  error: externalError = null
}) => {
  const { price: internalPrice, loading: internalLoading, error: internalError } = useDynamicPricing(
    product?._id,
    { quantity, skip: !!priceData }
  );

  const price = priceData || internalPrice;
  const loading = externalLoading !== null ? externalLoading : internalLoading;
  const error = externalError !== null ? externalError : internalError;
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (loading) {
    return (
      <div className={`price-display loading ${className}`}>
        <div className="price-skeleton">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`price-display error ${className}`}>
        <span className="price-error">Price unavailable</span>
        <small className="error-message">Try refreshing</small>
      </div>
    );
  }

  if (!price?.pricing) {
    return (
      <div className={`price-display empty ${className}`}>
        <span>Price not available</span>
      </div>
    );
  }

  const { compareAtPrice, totalPayable } = price.pricing;
  const hasDiscount = compareAtPrice > totalPayable;
  const discountAmount = hasDiscount ? compareAtPrice - totalPayable : 0;
  const discountPercentage = hasDiscount
    ? Math.round((discountAmount / compareAtPrice) * 100)
    : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: price.pricing.currency || 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const userSegment = price.meta?.userSegment;
  const isGuest = price.meta?.isAuthenticated === false;
  const pricingTier = price.meta?.pricingTier;

  return (
    <>
      <div className={`price-display ${compact ? 'compact' : ''} ${className}`}>
        {/* Original Price (strikethrough) */}
        {hasDiscount && !compact && (
          <div className="original-price">
            <span className="strikethrough">{formatCurrency(compareAtPrice)}</span>
            <span className="discount-badge">-{discountPercentage}%</span>
          </div>
        )}

        {/* Final Price */}
        <div className="final-price">
          <span className="currency-symbol">₹</span>
          <span className="amount">{totalPayable.toLocaleString('en-IN')}</span>
          {quantity > 1 && (
            <span className="per-unit">
              for {quantity} {product?.unit || 'units'}
            </span>
          )}
        </div>

        {/* Savings */}
        {hasDiscount && discountAmount > 0 && !compact && (
          <div className="savings">
            <span className="save-label">You save </span>
            <span className="save-amount">{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* Pricing Badges */}
        {showBadges && (
          <div className="pricing-badges">
            {userSegment === 'VIP' && (
              <span className="badge vip">
                <span className="badge-icon">👑</span>
                VIP PRICE
              </span>
            )}
            {pricingTier >= 2 && (
              <span className="badge tier">
                <span className="badge-icon">⚡</span>
                TIER {pricingTier}
              </span>
            )}
            {price.meta?.geoZone && (
              <span className="badge location">
                <span className="badge-icon">📍</span>
                {price.meta.geoZone}
              </span>
            )}
            {isGuest && (
              <span className="badge guest">
                <span className="badge-icon">👤</span>
                GUEST PRICING
              </span>
            )}
          </div>
        )}

        {/* Price Breakdown Link */}
        {showBreakdownLink && (
          <button
            className="breakdown-link"
            onClick={() => setShowBreakdown(true)}
            title="View price breakdown"
          >
            How is this price calculated?
          </button>
        )}

        {/* Context Info (debug) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="context-debug">
            <small>Segment: {userSegment} | Tier: {pricingTier} | Auth: {!isGuest ? 'Yes' : 'No'}</small>
          </div>
        )}
      </div>

      {/* Price Breakdown Modal */}
      {showBreakdown && (
        <PriceBreakdownModal
          priceData={price}
          product={product}
          quantity={quantity}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </>
  );
};

export default PriceDisplay;
