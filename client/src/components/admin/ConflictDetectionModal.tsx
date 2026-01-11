import React, { useState } from 'react';
import './ConflictDetectionModal.css';

/**
 * ConflictDetectionModal Component - Enhanced Version
 * 
 * Shows pricing conflicts with detailed impact information
 * Features:
 * - Product and zone context
 * - Affected items table with current vs new prices
 * - Price differences in ₹ and %
 * - 3 resolution options with detailed impact previews
 * - Visual indicators for price increases/decreases
 */

interface AffectedItem {
  segment?: {
    _id: string;
    name: string;
    code: string;
  };
  priceBook?: {
    _id?: string;
    name: string;
  };
  zone?: {
    _id?: string;
    name: string;
  };
  pricing: {
    masterPrice?: number;
    currentPrice?: number;
    currentEffectivePrice?: number;
    newZonePrice: number;
    priceDifference: number;
    percentageDifference: string;
    direction: 'increase' | 'decrease';
  };
}

interface ResolutionOption {
  id: string;
  label: string;
  description: string;
  impact: {
    itemsDeleted?: number;
    itemsPreserved?: number;
    itemsAdjusted?: number;
    newUniformPrice?: number;
    basePrice?: number;
    warning: string;
    preview?: Array<{
      segment: string;
      currentPrice: number;
      newPrice: number;
      difference: number;
    }>;
  };
}

interface ConflictModalProps {
  conflict: {
    // Support both old and new format
    hasConflict?: boolean;
    hasConflicts?: boolean;
    
    // New format properties
    affectedCount?: number;
    affectedItems?: AffectedItem[];
    impactSummary?: {
      product: {
        _id?: string;
        name: string;
        sku: string;
      };
      updateLevel: string;
      currentMasterPrice: number;
      newPrice: number;
      totalAffectedItems: number;
      affectedSegments: string[];
    };
    
    // Old format properties (for backward compatibility)
    conflicts?: Array<{
      type: string;
      existingPrice: number;
      newPrice: number;
      priceDifference: number;
      percentageDifference: string;
      priceBookId?: string;
      priceBookName?: string;
      zoneName?: string;
      segmentName?: string;
      zone?: any;
      segment?: any;
      product?: any;  // Added for old format
    }>;
    
    // Payload from frontend (contains productId, newPrice, etc.)
    payload?: {
      productId?: string;
      newPrice?: number;
      zoneId?: string;
      segmentId?: string;
      product?: any;
    };
    
    resolutionOptions: ResolutionOption[];
  };
  onResolve: (optionId: string) => Promise<void>;
  onCancel: () => void;
}

const ConflictDetectionModal: React.FC<ConflictModalProps> = ({ 
  conflict, 
  onResolve, 
  onCancel 
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug logging
  console.log('📊 ConflictDetectionModal received data:', {
    conflict,
    hasConflicts: conflict?.hasConflicts,
    hasConflict: conflict?.hasConflict,
    conflictsArray: conflict?.conflicts,
    payload: conflict?.payload
  });

  // Handle both old and new API formats
  const hasConflict = conflict?.hasConflict || conflict?.hasConflicts;
  if (!conflict || !hasConflict) return null;

  // Check if using old format (conflicts array) or new format (affectedItems)
  const isOldFormat = conflict.conflicts && !conflict.affectedItems;
  
  console.log('🔄 Using format:', isOldFormat ? 'OLD' : 'NEW');
  
  // Transform old format to new format if needed
  let affectedItems = conflict.affectedItems || [];
  let impactSummary = conflict.impactSummary;
  
  if (isOldFormat && conflict.conflicts) {
    // Convert old conflicts to affectedItems format
    affectedItems = conflict.conflicts.map((c: any) => ({
      priceBook: { name: c.priceBookName || 'Unknown' },
      zone: c.zone ? { name: c.zoneName || 'Zone' } : null,
      segment: c.segment ? { name: c.segmentName || 'Segment' } : null,
      pricing: {
        currentPrice: c.existingPrice,
        newZonePrice: c.newPrice,
        priceDifference: c.priceDifference,
        // percentageDifference is already a string with or without %, normalize it
        percentageDifference: String(c.percentageDifference).includes('%') 
          ? c.percentageDifference 
          : c.percentageDifference + '%',
        direction: c.priceDifference > 0 ? 'increase' : 'decrease'
      }
    })) as any; // Cast to any for compatibility
    
    // Create a basic impact summary for old format
    // Product details come from the API response now
    const productDetails = (conflict as any).product || conflict.payload?.product;
    
    impactSummary = {
      product: {
        _id: productDetails?._id || conflict.payload?.productId || 'unknown',
        name: productDetails?.name || 'Product',
        sku: productDetails?.sku || ''
      },
      updateLevel: 'ZONE',
      currentMasterPrice: conflict.conflicts[0]?.existingPrice || 0,
      newPrice: conflict.conflicts[0]?.newPrice || 0,
      totalAffectedItems: conflict.conflicts.length,
      affectedSegments: []
    };
    
    console.log('✅ Transformed data:', { affectedItems, impactSummary });
  }
  
  const resolutionOptions = conflict.resolutionOptions || [];
  
  // Ensure impactSummary always has a valid value
  if (!impactSummary) {
    console.warn('⚠️ impactSummary is undefined! Creating default...');
    const productDetails = (conflict as any).product || conflict.payload?.product;
    impactSummary = {
      product: {
        _id: productDetails?._id || conflict.payload?.productId || 'unknown',
        name: productDetails?.name || 'Product',
        sku: productDetails?.sku || ''
      },
      updateLevel: 'ZONE',
      currentMasterPrice: conflict.conflicts?.[0]?.existingPrice || 0,
      newPrice: conflict.conflicts?.[0]?.newPrice || conflict.payload?.newPrice || 0,
      totalAffectedItems: conflict.conflicts?.length || 0,
      affectedSegments: []
    };
  }
  
  console.log('🎨 Final render data:', {
    productName: impactSummary?.product?.name,
    currentPrice: impactSummary?.currentMasterPrice,
    newPrice: impactSummary?.newPrice,
    affectedItemsCount: affectedItems?.length
  });

  /**
   * Handle resolution confirmation
   */
  const handleConfirm = async () => {
    if (!selectedOption) return;

    setLoading(true);
    try {
      await onResolve(selectedOption);
    } catch (error) {
      console.error('Resolution error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get icon for resolution option
   */
  const getOptionIcon = (optionId: string) => {
    const icons: Record<string, string> = {
      'OVERWRITE': '⚡',
      'PRESERVE': '🛡️',
      'RELATIVE': '📐'
    };
    return icons[optionId] || '📝';
  };

  /**
   * Get color for resolution option
   */
  const getOptionColor = (optionId: string) => {
    const colors: Record<string, string> = {
      'OVERWRITE': '#dc2626',
      'PRESERVE': '#10b981',
      'RELATIVE': '#4f46e5'
    };
    return colors[optionId] || '#666';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>⚠️ Pricing Conflicts Detected</h2>
            <p className="modal-subtitle">
              {impactSummary?.product?.name || 'Product'} {impactSummary?.product?.sku ? `(${impactSummary.product.sku})` : ''}
            </p>
          </div>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>

        {/* Impact Summary */}
        <div className="impact-summary-section">
          <div className="summary-card">
            <div className="summary-item">
              <label>Master Price:</label>
              <strong>₹{(impactSummary?.currentMasterPrice || 0).toFixed(2)}</strong>
            </div>
            <div className="summary-arrow">→</div>
            <div className="summary-item">
              <label>New Price:</label>
              <strong className="text-primary">₹{(impactSummary?.newPrice || 0).toFixed(2)}</strong>
            </div>
          </div>
          <div className="affected-count-badge">
            {impactSummary?.totalAffectedItems || 0} segment{(impactSummary?.totalAffectedItems || 0) !== 1 ? 's' : ''} with custom pricing
          </div>
        </div>

        {/* Affected Items Table */}
        <div className="affected-items-section">
          <h4>📊 Impact on Existing Prices:</h4>
          <div className="affected-table-wrapper">
            <table className="affected-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Current Price</th>
                  <th>New Zone Price</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {affectedItems.map((item, idx) => {
                  const currentPrice = item.pricing?.currentPrice || item.pricing?.currentEffectivePrice || 0;
                  const isIncrease = item.pricing?.direction === 'increase';
                  
                  return (
                    <tr key={idx}>
                      <td className="segment-name">
                        {item.priceBook ? (
                          <div>
                            <strong>📚 {item.priceBook.name}</strong>
                            {item.zone && <div style={{fontSize: '0.85em', color: '#666'}}>Zone: {item.zone.name}</div>}
                            {item.segment && <div style={{fontSize: '0.85em', color: '#666'}}>Segment: {item.segment.name}</div>}
                          </div>
                        ) : item.segment ? (
                          <>
                            <strong>{item.segment.name}</strong>
                            {item.segment.code && <small className="segment-code">{item.segment.code}</small>}
                          </>
                        ) : (
                          <strong>Unknown</strong>
                        )}
                      </td>
                      <td className="price-current">
                        ₹{currentPrice.toFixed(2)}
                      </td>
                      <td className="price-new">
                        ₹{(item.pricing?.newZonePrice || 0).toFixed(2)}
                      </td>
                      <td className={`price-diff ${isIncrease ? 'increase' : 'decrease'}`}>
                        <span className="diff-amount">
                          {isIncrease ? '+' : ''}₹{(item.pricing?.priceDifference || 0).toFixed(2)}
                        </span>
                        <span className="diff-percent">
                          ({isIncrease ? '+' : ''}{item.pricing?.percentageDifference || '0%'})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="resolution-options">
          <h4>🎯 Choose Resolution Strategy:</h4>
          <div className="options-grid">
            {resolutionOptions.map((option) => (
              <div
                key={option.id}
                className={`option-card ${selectedOption === option.id ? 'selected' : ''}`}
                onClick={() => setSelectedOption(option.id)}
                style={{
                  borderColor: selectedOption === option.id ? getOptionColor(option.id) : '#e0e0e0'
                }}
              >
                <div className="option-icon" style={{ background: getOptionColor(option.id) }}>
                  {getOptionIcon(option.id)}
                </div>
                <div className="option-content">
                  <h5>{option.label}</h5>
                  <p className="option-description">{option.description}</p>
                  
                  
                  {/* Show preview for RELATIVE option */}
                  {option.id === 'RELATIVE' && option.impact.preview && option.impact.preview.length > 0 && (
                    <div className="option-preview">
                      <strong>Preview:</strong>
                      <ul>
                        {option.impact.preview.map((item, i) => (
                          <li key={i}>
                            <span className="preview-segment">{item.segment}:</span>
                            <span className="preview-prices">
                              ₹{item.currentPrice.toFixed(2)} → ₹{item.newPrice.toFixed(2)}
                            </span>
                            <span className="preview-diff">
                              ({item.difference > 0 ? '+' : ''}₹{item.difference.toFixed(2)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {selectedOption === option.id && (
                  <div className="option-checkmark">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button 
            className="btn-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={!selectedOption || loading}
            style={{
              background: selectedOption ? getOptionColor(selectedOption) : '#ccc'
            }}
          >
            {loading ? 'Applying...' : 'Apply Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictDetectionModal;
