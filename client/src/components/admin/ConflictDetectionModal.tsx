import React, { useState } from 'react';
import './ConflictDetectionModal.css';
import './ConflictDetectionModal.css';

/**
 * ConflictDetectionModal Component
 * 
 * Shows pricing conflicts and resolution options when admin tries to override a price
 * Features:
 * - Conflict details display
 * - 3 resolution options (Overwrite, Preserve, Relative)
 * - Impact preview
 * - Confirmation workflow
 */

const ConflictDetectionModal = ({ 
  conflict, 
  onResolve, 
  onCancel 
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!conflict) return null;

  const { conflicts, resolutionOptions } = conflict;

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
  const getOptionIcon = (optionId) => {
    const icons = {
      'OVERWRITE': '⚡',
      'PRESERVE': '🛡️',
      'RELATIVE': '📐'
    };
    return icons[optionId] || '📝';
  };

  /**
   * Get color for resolution option
   */
  const getOptionColor = (optionId) => {
    const colors = {
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
          <h2>⚠️ Pricing Conflict Detected</h2>
          <button className="btn-close" onClick={onCancel}>×</button>
        </div>

        {/* Conflict Details */}
        <div className="conflict-details">
          <div className="conflict-summary">
            <p className="conflict-message">
              You are trying to set a new price, but there are <strong>{conflicts.length}</strong> existing override(s) that conflict with this change.
            </p>
          </div>

          {/* Conflict List */}
          <div className="conflict-list">
            <h4>Existing Overrides:</h4>
            {conflicts.map((conf, idx) => (
              <div key={idx} className="conflict-item">
                <div className="conflict-item-header">
                  <span className="conflict-type-badge">{conf.type}</span>
                  <span className="conflict-book">{conf.priceBookName}</span>
                </div>
                <div className="conflict-item-details">
                  <div className="price-comparison">
                    <div className="price-old">
                      <label>Current Price:</label>
                      <strong>₹{conf.existingPrice}</strong>
                    </div>
                    <div className="price-arrow">→</div>
                    <div className="price-new">
                      <label>New Price:</label>
                      <strong>₹{conf.newPrice}</strong>
                    </div>
                  </div>
                  <div className="price-diff">
                    <span className={conf.priceDifference > 0 ? 'positive' : 'negative'}>
                      {conf.priceDifference > 0 ? '+' : ''}₹{conf.priceDifference}
                    </span>
                    <span className="percentage">
                      ({conf.percentageDifference > 0 ? '+' : ''}{conf.percentageDifference}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Options */}
        <div className="resolution-options">
          <h4>Choose Resolution Strategy:</h4>
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
                  <p className="option-impact">
                    <strong>Impact:</strong> {option.impact}
                  </p>
                </div>
                {selectedOption === option.id && (
                  <div className="option-checkmark">✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        {selectedOption && (
          <div className="resolution-preview">
            <h4>Preview:</h4>
            <div className="preview-content">
              {renderPreview(selectedOption, conflicts, resolutionOptions)}
            </div>
          </div>
        )}

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

/**
 * Render preview based on selected option
 */
const renderPreview = (optionId, conflicts, options) => {
  const option = options.find(opt => opt.id === optionId);
  
  switch (optionId) {
    case 'OVERWRITE':
      return (
        <div className="preview-overwrite">
          <p className="preview-warning">
            ⚠️ This will <strong>delete {conflicts.length} existing override(s)</strong> and apply the new price globally.
          </p>
          <ul className="preview-list">
            {conflicts.map((conf, idx) => (
              <li key={idx} className="deleted">
                ❌ {conf.priceBookName}: ₹{conf.existingPrice} → <strong>DELETED</strong>
              </li>
            ))}
          </ul>
        </div>
      );
      
    case 'PRESERVE':
      return (
        <div className="preview-preserve">
          <p className="preview-info">
            ✅ This will create a new override while <strong>keeping all {conflicts.length} existing override(s)</strong>.
          </p>
          <ul className="preview-list">
            {conflicts.map((conf, idx) => (
              <li key={idx} className="preserved">
                🛡️ {conf.priceBookName}: ₹{conf.existingPrice} → <strong>PRESERVED</strong>
              </li>
            ))}
          </ul>
        </div>
      );
      
    case 'RELATIVE':
      return (
        <div className="preview-relative">
          <p className="preview-info">
            📐 This will <strong>adjust all {conflicts.length} override(s) proportionally</strong> to maintain price ratios.
          </p>
          <ul className="preview-list">
            {conflicts.map((conf, idx) => {
              const ratio = conf.existingPrice / (conf.newPrice - conf.priceDifference);
              const newAdjustedPrice = Math.round(conf.newPrice * ratio);
              return (
                <li key={idx} className="adjusted">
                  📐 {conf.priceBookName}: ₹{conf.existingPrice} → <strong>₹{newAdjustedPrice}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      );
      
    default:
      return null;
  }
};

export default ConflictDetectionModal;
