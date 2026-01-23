import React from 'react';
import './PriceBreakdownModal.css';

/**
 * PriceBreakdownModal Component
 * 
 * Shows detailed price calculation breakdown in a modal
 */
const PriceBreakdownModal = ({ priceData, product, quantity, onClose }) => {
  if (!priceData?.pricing) return null;

  const { pricing, meta } = priceData;
  const { basePrice, appliedModifiers = [], gstAmount, gstPercentage, totalPayable } = pricing;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: pricing.currency || 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getModifierIcon = (source) => {
    const icons = {
      'SEGMENT': '👤',
      'ZONE': '📍',
      'PRODUCT': '🏷️',
      'GLOBAL': '🌍',
      'PROMO_CODE': '🎟️',
      'ATTRIBUTE': '⚙️'
    };
    return icons[source] || '✨';
  };

  const getModifierColor = (modifierType) => {
    // Check if it's a discount or surcharge
    if (modifierType.includes('DECRE') || modifierType === 'PERCENTAGE') {
      return '#10b981'; // Green for discounts
    }
    return '#f59e0b'; // Orange for surcharges
  };

  const getModifierLabel = (modifier) => {
    if (modifier.reason) return modifier.reason;

    const labels = {
      'PERCENTAGE': 'Percentage Discount',
      'FIXED_AMOUNT': 'Fixed Amount',
      'PERCENTAGE_UNIT': 'Per Unit Discount',
      'FIXED_AMOUNT_UNIT': 'Fixed Per Unit'
    };
    return labels[modifier.modifierType] || 'Adjustment';
  };

  return (
    <div className="price-breakdown-modal-overlay" onClick={onClose}>
      <div className="price-breakdown-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>💰 Price Breakdown</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Product Info */}
        <div className="product-info">
          <h3>{product?.name || 'Product'}</h3>
          <div className="product-meta">
            <span>📦 Quantity: {quantity}</span>
            {meta?.geoZone && <span>📍 Location: {meta.geoZone}</span>}
            {meta?.userSegment && <span>👤 Segment: {meta.userSegment}</span>}
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="breakdown-table">
          <div className="breakdown-row base">
            <div className="breakdown-label">
              <span className="label-icon">💵</span>
              Base Price (per unit)
            </div>
            <div className="breakdown-value">{formatCurrency(basePrice)}</div>
          </div>

          {/* Quantity multiplier */}
          {quantity > 1 && (
            <div className="breakdown-row">
              <div className="breakdown-label">
                <span className="label-icon">×</span>
                Quantity ({quantity} units)
              </div>
              <div className="breakdown-value">{formatCurrency(basePrice * quantity)}</div>
            </div>
          )}

          {/* Modifiers */}
          {appliedModifiers.length > 0 && (
            <div className="modifiers-section">
              <div className="section-title">Applied Adjustments</div>
              {appliedModifiers.map((modifier, index) => (
                <div key={index} className="breakdown-row modifier">
                  <div className="breakdown-label">
                    <span
                      className="modifier-icon"
                      style={{ color: getModifierColor(modifier.modifierType) }}
                    >
                      {getModifierIcon(modifier.source)}
                    </span>
                    <div className="modifier-details">
                      <div className="modifier-name">{getModifierLabel(modifier)}</div>
                      <div className="modifier-source">{modifier.source}</div>
                    </div>
                  </div>
                  <div
                    className="breakdown-value modifier-value"
                    style={{ color: getModifierColor(modifier.modifierType) }}
                  >
                    {modifier.value > 0 ? '+' : ''}
                    {modifier.modifierType?.includes('PERCENT') ? '' : '₹'}
                    {modifier.value}
                    {modifier.modifierType?.includes('PERCENT') ? '%' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtotal after modifiers */}
          <div className="breakdown-row subtotal">
            <div className="breakdown-label">
              <span className="label-icon">📊</span>
              Subtotal
            </div>
            <div className="breakdown-value">{formatCurrency(pricing.subtotal)}</div>
          </div>

          {/* GST */}
          <div className="breakdown-row gst">
            <div className="breakdown-label">
              <span className="label-icon">🏛️</span>
              GST ({gstPercentage}%)
            </div>
            <div className="breakdown-value">{formatCurrency(gstAmount)}</div>
          </div>

          {/* Total */}
          <div className="breakdown-row total">
            <div className="breakdown-label">
              <span className="label-icon">✅</span>
              <strong>Total</strong> Amount
            </div>
            <div className="breakdown-value total-amount">
              <strong>{formatCurrency(totalPayable)}</strong>
            </div>
          </div>
        </div>

        {/* User Context Info */}
        <div className="user-context-info">
          <h4>🎯 Your Pricing Context</h4>
          <div className="context-grid">
            <div className="context-item">
              <span className="context-label">User Segment:</span>
              <span className="context-value badge">{meta?.userSegment || 'RETAIL'}</span>
            </div>
            <div className="context-item">
              <span className="context-label">Pricing Tier:</span>
              <span className="context-value badge tier">Tier {meta?.pricingTier || 0}</span>
            </div>
            <div className="context-item">
              <span className="context-label">Location:</span>
              <span className="context-value">{meta?.geoZone || 'Not specified'}</span>
            </div>
            <div className="context-item">
              <span className="context-label">Authentication:</span>
              <span className="context-value">
                {meta?.isAuthenticated ? '✅ Logged In' : '👤 Guest'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <p className="footer-note">
            💡 <strong>Note:</strong> Prices are calculated in real-time based on your user profile and location.
            Different users may see different prices for the same product.
          </p>
          <div className="footer-actions">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdownModal;
