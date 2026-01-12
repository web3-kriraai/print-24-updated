import React, { useState, useEffect } from 'react';
import './SmartViewMatrix.css';
import ConflictDetectionModal from './ConflictDetectionModal';

/**
 * SmartViewMatrix Component - Enhanced with Editing & Conflict Resolution
 * 
 * Features:
 * - 3-filter panel (Zone, Segment, Product)
 * - 5 dynamic view types
 * - Editable price grid with inline editing
 * - Conflict detection & resolution modal
 * - Save/Cancel with batch updates
 */

interface EditedCell {
  productId: string;
  segmentId?: string;
  zoneId?: string;
  originalPrice: number;
  newPrice: number;
}

interface AffectedItem {
  segment: {
    _id: string;
    name: string;
    code: string;
  };
  pricing: {
    masterPrice: number;
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

interface ConflictData {
  hasConflict: boolean;
  affectedCount: number;
  affectedItems: AffectedItem[];
  impactSummary: {
    product: {
      _id: string;
      name: string;
      sku: string;
    };
    updateLevel: string;
    currentMasterPrice: number;
    newPrice: number;
    totalAffectedItems: number;
    affectedSegments: string[];
  };
  resolutionOptions: ResolutionOption[];
}

const SmartViewMatrix: React.FC = () => {
  // Filter state
  const [filters, setFilters] = useState({
    zone: null as string | null,
    segment: null as string | null,
    product: null as string | null
  });

  // Data state
  const [viewData, setViewData] = useState<any>(null);
  const [viewType, setViewType] = useState('MASTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown options
  const [zones, setZones] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Editing state
  const [editedCells, setEditedCells] = useState<EditedCell[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Conflict Modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [pendingSave, setPendingSave] = useState<EditedCell | null>(null);

  useEffect(() => {
    loadDropdownOptions();
  }, []);

  useEffect(() => {
    fetchMatrixData();
    setEditedCells([]);
    setEditingCell(null);
  }, [filters]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const loadDropdownOptions = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No authentication token found. Please login to access admin pricing.');
        setError('Please login to access pricing administration');
        return;
      }

      const [zonesRes, segmentsRes, productsRes] = await Promise.all([
        fetch('/api/admin/pricing/geo-zones', { headers: getAuthHeaders() }),
        fetch('/api/admin/pricing/user-segments', { headers: getAuthHeaders() }),
        fetch('/api/admin/pricing/products', { headers: getAuthHeaders() })
      ]);

      // Check for authentication errors
      if (zonesRes.status === 401 || zonesRes.status === 403) {
        setError('Authentication failed. Please login as an admin.');
        return;
      }

      // Check for server errors
      if (!zonesRes.ok || !segmentsRes.ok || !productsRes.ok) {
        setError(`Server error: ${zonesRes.status}. Please check your connection or contact support.`);
        return;
      }

      const [zonesData, segmentsData, productsData] = await Promise.all([
        zonesRes.json(),
        segmentsRes.json(),
        productsRes.json()
      ]);

      // API returns: { zones: [...] }, { segments: [...] }, { products: [...] }
      // Also handle: { data: [...] } format for backward compatibility
      setZones(zonesData.zones || zonesData.data || []);
      setSegments(segmentsData.segments || segmentsData.data || []);
      setProducts(productsData.products || productsData.data || []);

      console.log('📋 Loaded dropdown options:', {
        zones: (zonesData.zones || zonesData.data || []).length,
        segments: (segmentsData.segments || segmentsData.data || []).length,
        products: (productsData.products || productsData.data || []).length
      });
    } catch (err) {
      console.error('Error loading dropdown options:', err);
      setError('Failed to load pricing data. Please check your connection and try again.');
    }
  };

  const fetchMatrixData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.zone) params.append('zone', filters.zone);
      if (filters.segment) params.append('segment', filters.segment);
      if (filters.product) params.append('product', filters.product);

      const response = await fetch(`/api/admin/pricing/smart-view?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setViewData(data.data);
        setViewType(data.data.viewType);
      } else {
        setError(data.error || 'Failed to load data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value || null
    }));
  };

  const clearFilters = () => {
    setFilters({ zone: null, segment: null, product: null });
  };

  const startEditing = (cellId: string, currentValue: number) => {
    setEditingCell(cellId);
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const confirmEdit = async (productId: string, segmentId?: string) => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      cancelEditing();
      return;
    }

    const originalEntry = viewData?.entries?.find((e: any) => e.productId === productId);
    const originalPrice = originalEntry?.basePrice || 0;

    if (newPrice === originalPrice) {
      cancelEditing();
      return;
    }

    const editedCell: EditedCell = {
      productId,
      segmentId: segmentId || filters.segment || undefined,
      zoneId: filters.zone || undefined,
      originalPrice,
      newPrice
    };

    await checkConflictsAndSave(editedCell);
    cancelEditing();
  };

  const checkConflictsAndSave = async (editedCell: EditedCell) => {
    try {
      const response = await fetch('/api/admin/pricing/detect-conflicts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          zoneId: editedCell.zoneId,
          segmentId: editedCell.segmentId,
          productId: editedCell.productId,
          newPrice: editedCell.newPrice
        })
      });

      const result = await response.json();

      if (result.success && result.data?.hasConflict) {
        setConflictData(result.data);
        setPendingSave(editedCell);
        setShowConflictModal(true);
      } else {
        addEditedCell(editedCell);
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
      addEditedCell(editedCell);
    }
  };

  const addEditedCell = (editedCell: EditedCell) => {
    setEditedCells(prev => {
      const existing = prev.findIndex(c =>
        c.productId === editedCell.productId &&
        c.segmentId === editedCell.segmentId &&
        c.zoneId === editedCell.zoneId
      );

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = editedCell;
        return updated;
      }
      return [...prev, editedCell];
    });
  };

  const handleConflictResolution = async (resolutionId: string) => {
    if (!pendingSave || !conflictData) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/pricing/resolve-conflict', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          resolutionId,
          newPrice: pendingSave.newPrice,
          oldPrice: pendingSave.originalPrice,
          zoneId: pendingSave.zoneId,
          segmentId: pendingSave.segmentId,
          productId: pendingSave.productId,
          updateLevel: 'ZONE'
        })
      });

      const result = await response.json();

      if (result.success) {
        setSaveSuccess(true);
        fetchMatrixData();
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setError(result.error || 'Failed to resolve conflict');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
      setShowConflictModal(false);
      setConflictData(null);
      setPendingSave(null);
    }
  };

  const saveAllChanges = async () => {
    if (editedCells.length === 0) return;

    setIsSaving(true);
    try {
      for (const cell of editedCells) {
        await fetch('/api/admin/pricing/virtual-price', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            productId: cell.productId,
            zoneId: cell.zoneId,
            segmentId: cell.segmentId,
            newPrice: cell.newPrice
          })
        });
      }

      setSaveSuccess(true);
      setEditedCells([]);
      fetchMatrixData();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setEditedCells([]);
    fetchMatrixData();
  };

  const hasUnsavedChanges = editedCells.length > 0;

  const renderEditableCell = (
    productId: string,
    price: number,
    segmentId?: string,
    cellKey?: string
  ) => {
    const key = cellKey || `${productId}-${segmentId || 'default'}`;
    const isEditing = editingCell === key;

    const editedCell = editedCells.find(c =>
      c.productId === productId &&
      (c.segmentId === segmentId || (!c.segmentId && !segmentId))
    );
    const displayPrice = editedCell ? editedCell.newPrice : price;
    const isModified = !!editedCell;

    if (isEditing) {
      return (
        <td key={key} className="price-cell editing">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmEdit(productId, segmentId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
            min="0"
            step="0.01"
          />
          <div className="edit-actions">
            <button onClick={() => confirmEdit(productId, segmentId)}>✓</button>
            <button onClick={cancelEditing}>✕</button>
          </div>
        </td>
      );
    }

    // Handle null or undefined prices
    if (displayPrice == null) {
      return (
        <td key={key} className="price-cell unavailable" title="Price not available">
          N/A
        </td>
      );
    }

    return (
      <td
        key={key}
        className={`price-cell editable ${isModified ? 'modified' : ''}`}
        onClick={() => startEditing(key, displayPrice)}
        title="Click to edit"
      >
        ₹{displayPrice.toFixed(2)}
        {isModified && <span className="modified-indicator">*</span>}
      </td>
    );
  };

  const getViewTitle = (vt: string) => {
    const titles: Record<string, string> = {
      'MASTER': '📘 Master Price Book',
      'ZONE': '🌍 Zone View (All Products × All Segments)',
      'GROUP_ZONE': '👥 Group Zone View (All Products)',
      'PRODUCT_ZONE': '📦 Product Zone View (All Segments)',
      'SINGLE_CELL': '🔍 Single Cell View (Detailed Breakdown)'
    };
    return titles[vt] || vt;
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading price data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state">
          <p>❌ Error: {error}</p>
          <button onClick={fetchMatrixData}>Retry</button>
        </div>
      );
    }

    if (!viewData) {
      return (
        <div className="empty-state">
          <p>Select filters to view pricing data</p>
        </div>
      );
    }

    switch (viewType) {
      case 'MASTER':
        return (
          <div className="master-view">
            <div className="view-info">
              <p><strong>Master Book:</strong> {viewData.masterBookName || 'Master Price Book'}</p>
              <p><strong>Total Products:</strong> {viewData.entries?.length || 0}</p>
            </div>
            <table className="price-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Base Price</th>
                  <th>Compare At</th>
                </tr>
              </thead>
              <tbody>
                {viewData.entries?.map((entry: any) => (
                  <tr key={entry.productId}>
                    <td>{entry.productName}</td>
                    {renderEditableCell(entry.productId, entry.basePrice, undefined, `master-${entry.productId}`)}
                    <td className="price">₹{entry.compareAtPrice || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'ZONE':
        return (
          <div className="zone-view">
            <div className="view-info">
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Products:</strong> {viewData.matrix?.length || 0}</p>
            </div>
            <div className="matrix-grid">
              <table className="price-table matrix-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    {Object.keys(viewData.matrix?.[0]?.segments || {}).map((segmentCode: string) => (
                      <th key={segmentCode}>{segmentCode}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewData.matrix?.map((row: any) => (
                    <tr key={row.productId} className={row.isAvailable === false ? 'unavailable-row' : ''}>
                      <td className="product-name">
                        {row.productName}
                        {row.isAvailable === false && <span className="unavailable-badge">🚫</span>}
                      </td>
                      {Object.entries(row.segments).map(([code, segData]: [string, any]) => {
                        // Handle both old format (number) and new format (object)
                        const priceValue = typeof segData === 'object' ? segData?.finalPrice : segData;
                        const isAvailable = typeof segData === 'object' ? segData?.isAvailable !== false : true;

                        if (!isAvailable || priceValue == null) {
                          return (
                            <td key={code} className="price-cell unavailable" title={row.availabilityReason || 'Not available'}>
                              N/A
                            </td>
                          );
                        }
                        return renderEditableCell(row.productId, priceValue, row.segmentIds?.[code], `zone-${row.productId}-${code}`);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'GROUP_ZONE':
        return (
          <div className="group-zone-view">
            <div className="view-info">
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segment:</strong> {viewData.segmentName}</p>
              <p><strong>Products:</strong> {viewData.prices?.length || 0}</p>
            </div>
            <table className="price-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Master Price</th>
                  <th>Final Price</th>
                  <th>Adjustments</th>
                </tr>
              </thead>
              <tbody>
                {viewData.prices?.map((price: any) => (
                  <tr key={price.productId}>
                    <td>{price.productName}</td>
                    <td className="price">₹{price.masterPrice}</td>
                    {renderEditableCell(price.productId, price.finalPrice, viewData.segmentId, `group-${price.productId}`)}
                    <td className="adjustments">{price.adjustments?.length || 0} adjustment(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'PRODUCT_ZONE':
        return (
          <div className="product-zone-view">
            <div className="view-info">
              <p><strong>Product:</strong> {viewData.productName}</p>
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segments:</strong> {viewData.prices?.length || 0}</p>
            </div>
            <table className="price-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Master Price</th>
                  <th>Final Price</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {viewData.prices?.map((price: any) => (
                  <tr key={price.segmentId}>
                    <td>{price.segmentName}</td>
                    <td className="price">₹{price.masterPrice}</td>
                    {renderEditableCell(viewData.productId, price.finalPrice, price.segmentId, `prod-${price.segmentId}`)}
                    <td className="discount">
                      {price.masterPrice > price.finalPrice
                        ? `${((1 - price.finalPrice / price.masterPrice) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'SINGLE_CELL':
        // Check availability first
        if (viewData.price?.isAvailable === false) {
          return (
            <div className="single-cell-view">
              <div className="view-info">
                <p><strong>Product:</strong> {viewData.productName}</p>
                <p><strong>Zone:</strong> {viewData.zoneName}</p>
                <p><strong>Segment:</strong> {viewData.segmentName}</p>
              </div>
              <div className="not-available-banner">
                <div className="not-available-icon">🚫</div>
                <h3>Product Not Available</h3>
                <p className="not-available-reason">{viewData.price?.availabilityReason || 'This product is not available in the selected zone'}</p>
              </div>
            </div>
          );
        }

        return (
          <div className="single-cell-view">
            <div className="view-info">
              <p><strong>Product:</strong> {viewData.productName}</p>
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segment:</strong> {viewData.segmentName}</p>
            </div>

            <div className="breakdown-card">
              <h4>💰 Price Breakdown</h4>

              <div className="breakdown-item base-price">
                <span>Master Price:</span>
                <strong>₹{viewData.price?.masterPrice?.toFixed(2)}</strong>
              </div>

              {/* Show each modifier with clear labels */}
              {viewData.price?.adjustments?.map((adj: any, idx: number) => {
                // Format modifier display
                const isModifier = adj.type === 'MODIFIER';
                const modifierLabel = isModifier
                  ? adj.modifierName
                  : `${adj.type} (${adj.bookName || 'Adjustment'})`;

                // Determine if increase or decrease
                const isIncrease = adj.modifierType === 'PERCENT_INC' || adj.modifierType === 'FLAT_INC' || adj.change > 0;
                const changeAmount = isModifier ? Math.abs(adj.change) : Math.abs(adj.value);
                const percentValue = isModifier ? adj.value : null;

                return (
                  <div key={idx} className={`breakdown-item modifier-item ${isIncrease ? 'increase' : 'decrease'}`}>
                    <span className="modifier-label">
                      {isModifier && adj.appliesTo === 'ZONE' && '🌍 '}
                      {isModifier && adj.appliesTo === 'SEGMENT' && '👥 '}
                      {isModifier && adj.appliesTo === 'PRODUCT' && '🏷️ '}
                      {isModifier && adj.appliesTo === 'GLOBAL' && '🌐 '}
                      {modifierLabel}
                      {percentValue !== null && ` (${isIncrease ? '+' : '-'}${percentValue}%)`}
                    </span>
                    <strong className={isIncrease ? 'positive' : 'negative'}>
                      {isIncrease ? '+' : '-'}₹{changeAmount?.toFixed(2)}
                    </strong>
                  </div>
                );
              })}

              <div className="breakdown-item total">
                <span>Final Price:</span>
                <strong className="final-price">₹{viewData.price?.finalPrice?.toFixed(2)}</strong>
              </div>

              {viewData.price?.modifiersApplied > 0 && (
                <div className="modifiers-summary">
                  <small>📊 {viewData.price.modifiersApplied} modifier(s) applied</small>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div>Unknown view type: {viewType}</div>;
    }
  };

  return (
    <div className="smart-view-matrix">
      <div className="matrix-header">
        <h2>📊 Smart View Matrix</h2>
        <p>Manage virtual price books with hierarchical pricing</p>
      </div>

      <div className="matrix-container">
        <div className="filter-panel">
          <h3>🔍 Filters</h3>

          <div className="filter-group">
            <label>Geo Zone</label>
            <select
              value={filters.zone || ''}
              onChange={(e) => handleFilterChange('zone', e.target.value)}
            >
              <option value="">All Zones</option>
              {zones.map((zone: any) => (
                <option key={zone._id} value={zone._id}>
                  {zone.name} ({zone.level})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>User Segment</label>
            <select
              value={filters.segment || ''}
              onChange={(e) => handleFilterChange('segment', e.target.value)}
            >
              <option value="">All Segments</option>
              {segments.map((segment: any) => (
                <option key={segment._id} value={segment._id}>
                  {segment.name || segment.code}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Product</label>
            <select
              value={filters.product || ''}
              onChange={(e) => handleFilterChange('product', e.target.value)}
            >
              <option value="">All Products</option>
              {products.map((product: any) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-clear" onClick={clearFilters}>
            Clear Filters
          </button>

          {hasUnsavedChanges && (
            <div className="unsaved-actions">
              <p className="unsaved-count">⚠️ {editedCells.length} unsaved change(s)</p>
              <button className="btn-save" onClick={saveAllChanges} disabled={isSaving}>
                {isSaving ? 'Saving...' : '💾 Save All'}
              </button>
              <button className="btn-discard" onClick={discardChanges} disabled={isSaving}>
                ✖ Discard
              </button>
            </div>
          )}

          {saveSuccess && <div className="save-success">✅ Changes saved!</div>}
        </div>

        <div className="matrix-content">
          <div className="view-header">
            <h3>{getViewTitle(viewType)}</h3>
            <span className="view-badge">{viewType}</span>
          </div>

          {renderView()}
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictData && (
        <ConflictDetectionModal
          conflict={conflictData}
          onResolve={handleConflictResolution}
          onCancel={() => {
            setShowConflictModal(false);
            setConflictData(null);
            setPendingSave(null);
          }}
        />
      )}
    </div>
  );
};

export default SmartViewMatrix;
