import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ConflictDetectionModal from './ConflictDetectionModal';

/**
 * SmartViewMatrix Component - Refactored with Tailwind & react-hot-toast
 * 
 * Features:
 * - 3-filter panel (Zone, Segment, Product)
 * - 5 dynamic view types
 * - Editable price grid with inline editing
 * - Batch save with conflict detection & resolution
 * - Uses react-hot-toast for notifications
 */

interface EditedCell {
  productId: string;
  productName?: string;
  segmentId?: string;
  zoneId?: string;
  originalPrice: number;
  newPrice: number;
  applyToAllSegments?: boolean; // If true, update zone book (all segments); if false, update zone+segment book
}

interface ConflictData {
  hasConflict: boolean;
  affectedCount: number;
  conflicts: any[];
  resolutionOptions: Array<{
    id: string;
    label: string;
    description: string;
    impact: any;
  }>;
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

  // Editing state - now supports multiple edited cells
  const [editedCells, setEditedCells] = useState<EditedCell[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [applyToAllSegments, setApplyToAllSegments] = useState(false); // Checkbox state for "apply to all segments"
  const [isSaving, setIsSaving] = useState(false);

  // Conflict Modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

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
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to access pricing administration');
        return;
      }

      const [zonesRes, segmentsRes, productsRes] = await Promise.all([
        fetch('/api/admin/pricing/geo-zones', { headers: getAuthHeaders() }),
        fetch('/api/admin/pricing/user-segments', { headers: getAuthHeaders() }),
        fetch('/api/admin/pricing/products', { headers: getAuthHeaders() })
      ]);

      if (zonesRes.status === 401 || zonesRes.status === 403) {
        setError('Authentication failed. Please login as an admin.');
        return;
      }

      if (!zonesRes.ok || !segmentsRes.ok || !productsRes.ok) {
        setError(`Server error. Please check your connection.`);
        return;
      }

      const [zonesData, segmentsData, productsData] = await Promise.all([
        zonesRes.json(),
        segmentsRes.json(),
        productsRes.json()
      ]);

      setZones(zonesData.zones || zonesData.data || []);
      setSegments(segmentsData.segments || segmentsData.data || []);
      setProducts(productsData.products || productsData.data || []);
    } catch (err) {
      console.error('Error loading dropdown options:', err);
      setError('Failed to load pricing data.');
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
    setApplyToAllSegments(false); // Reset checkbox on cancel
  };

  // Add edited cell to batch (no immediate save, just queue up for batch save)
  const confirmEdit = (productId: string, productName: string, segmentId?: string) => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      cancelEditing();
      return;
    }

    // Find original price from view data
    let originalPrice = 0;
    if (viewData?.entries) {
      const entry = viewData.entries.find((e: any) => e.productId === productId);
      originalPrice = entry?.basePrice || 0;
    } else if (viewData?.matrix) {
      const row = viewData.matrix.find((r: any) => r.productId === productId);
      if (row && segmentId && row.segments) {
        const segData = Object.values(row.segments)[0] as any;
        originalPrice = typeof segData === 'object' ? segData.finalPrice : segData;
      }
    } else if (viewData?.prices) {
      const price = viewData.prices.find((p: any) => p.productId === productId || p.segmentId === segmentId);
      originalPrice = price?.finalPrice || price?.masterPrice || 0;
    }

    if (newPrice === originalPrice) {
      cancelEditing();
      return;
    }

    const editedCell: EditedCell = {
      productId,
      productName,
      segmentId: applyToAllSegments ? undefined : (segmentId || filters.segment || undefined), // If apply to all, don't set segmentId
      zoneId: filters.zone || undefined,
      originalPrice,
      newPrice,
      applyToAllSegments // Store the flag
    };

    // Add or update in editedCells array
    setEditedCells(prev => {
      // When applyToAllSegments changes, we need different matching logic
      const existing = prev.findIndex(c =>
        c.productId === editedCell.productId &&
        c.zoneId === editedCell.zoneId &&
        c.applyToAllSegments === editedCell.applyToAllSegments &&
        (editedCell.applyToAllSegments || c.segmentId === editedCell.segmentId)
      );

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = editedCell;
        return updated;
      }
      return [...prev, editedCell];
    });

    cancelEditing();
    const applyText = applyToAllSegments ? ' (all segments)' : '';
    toast.success(`Price updated to ₹${newPrice.toFixed(2)}${applyText} (pending save)`);
  };

  // Batch save all edited cells with conflict detection
  const saveAllChanges = async () => {
    if (editedCells.length === 0) {
      toast('No changes to save', { icon: 'ℹ️' });
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading(`Saving ${editedCells.length} price changes...`);

    try {
      // Convert edited cells to price updates - include segmentId/zoneId and applyToAllSegments for each cell
      const priceUpdates = editedCells.map(cell => ({
        productId: cell.productId,
        newPrice: cell.newPrice,
        segmentId: cell.applyToAllSegments ? undefined : cell.segmentId, // If apply to all, don't specify segment
        zoneId: cell.zoneId,
        applyToAllSegments: cell.applyToAllSegments || false // Flag to update zone book instead of zone+segment
      }));

      // Call the Smart View update API with ASK strategy to check for conflicts
      const response = await fetch('/api/admin/pricing/smart-view/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filters: {
            zoneId: filters.zone,
            segmentId: filters.segment,
            productId: filters.product
          },
          priceUpdates,
          resolutionStrategy: 'ASK' // First check for conflicts
        })
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        if (result.requiresResolution) {
          // Show conflict modal for batch resolution
          setConflictData({
            hasConflict: true,
            affectedCount: result.data.conflictsDetected || 0,
            conflicts: result.data.conflicts || [],
            resolutionOptions: result.data.resolutionOptions || [
              { id: 'OVERWRITE', label: 'Force Overwrite', description: 'Delete all child overrides', impact: { warning: 'All child prices will be deleted' } },
              { id: 'PRESERVE', label: 'Preserve Children', description: 'Keep existing child prices', impact: { warning: 'Child prices remain unchanged' } },
              { id: 'RELATIVE', label: 'Relative Adjust', description: 'Apply proportional adjustment', impact: { warning: 'Child prices will be scaled' } }
            ]
          });
          setShowConflictModal(true);
        } else {
          toast.success(`✅ Successfully updated ${result.data.updatedCount} price(s)!`);
          setEditedCells([]);
          fetchMatrixData();
        }
      } else {
        toast.error(result.error || 'Failed to save changes');
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle conflict resolution for batch save
  const handleConflictResolution = async (resolutionId: string) => {
    setIsSaving(true);
    const loadingToast = toast.loading(`Applying ${resolutionId} resolution...`);

    try {
      const priceUpdates = editedCells.map(cell => ({
        productId: cell.productId,
        newPrice: cell.newPrice,
        segmentId: cell.segmentId,
        zoneId: cell.zoneId
      }));

      const response = await fetch('/api/admin/pricing/smart-view/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filters: {
            zoneId: filters.zone,
            segmentId: filters.segment,
            productId: filters.product
          },
          priceUpdates,
          resolutionStrategy: resolutionId
        })
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(`✅ ${result.data.updatedCount} prices updated with ${resolutionId} strategy!`);
        setEditedCells([]);
        fetchMatrixData();
      } else {
        toast.error(result.error || 'Failed to apply resolution');
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to apply resolution');
    } finally {
      setIsSaving(false);
      setShowConflictModal(false);
      setConflictData(null);
    }
  };

  const discardChanges = () => {
    setEditedCells([]);
    toast('Changes discarded', { icon: '🗑️' });
  };

  const removeEditedCell = (productId: string, segmentId?: string) => {
    setEditedCells(prev => prev.filter(c =>
      !(c.productId === productId && c.segmentId === segmentId)
    ));
    toast('Change removed', { icon: '↩️' });
  };

  const hasUnsavedChanges = editedCells.length > 0;

  const renderEditableCell = (
    productId: string,
    productName: string,
    price: number,
    segmentId?: string,
    cellKey?: string
  ) => {
    const key = cellKey || `${productId}-${segmentId || 'default'}`;
    const isEditing = editingCell === key;

    // Strictly match by productId AND segmentId (use strict equality)
    // If segmentId is undefined vs a string, they should NOT match
    const editedCell = editedCells.find(c =>
      c.productId === productId && c.segmentId === segmentId
    );
    const displayPrice = editedCell ? editedCell.newPrice : price;
    const isModified = !!editedCell;

    if (isEditing) {
      return (
        <td key={key} className="p-2 bg-blue-50" colSpan={applyToAllSegments && segmentId ? 5 : 1}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit(productId, productName, segmentId);
                  if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
                min="0"
                step="0.01"
                className="w-20 px-2 py-1 border-2 border-indigo-500 rounded text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => confirmEdit(productId, productName, segmentId)}
                className="w-7 h-7 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600"
              >
                ✓
              </button>
              <button
                onClick={cancelEditing}
                className="w-7 h-7 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            </div>
            {/* Only show "Apply to all segments" checkbox when editing a segment cell in Zone View */}
            {segmentId && filters.zone && (
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToAllSegments}
                  onChange={(e) => setApplyToAllSegments(e.target.checked)}
                  className="w-3 h-3 text-indigo-600 rounded cursor-pointer"
                />
                <span className={applyToAllSegments ? 'text-indigo-600 font-medium' : ''}>
                  Apply to all segments
                </span>
              </label>
            )}
          </div>
        </td>
      );
    }

    if (displayPrice == null) {
      return (
        <td key={key} className="p-3 text-center text-gray-400" title="Price not available">
          N/A
        </td>
      );
    }

    return (
      <td
        key={key}
        className={`p-3 text-center font-mono cursor-pointer transition-colors hover:bg-indigo-50 ${isModified ? 'bg-amber-100 border-l-4 border-amber-500' : ''
          }`}
        onClick={() => startEditing(key, displayPrice)}
        title="Click to edit"
      >
        ₹{displayPrice.toFixed(2)}
        {isModified && <span className="text-amber-500 font-bold ml-1">*</span>}
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
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p>Loading price data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-red-500 mb-4">❌ Error: {error}</p>
          <button
            onClick={fetchMatrixData}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!viewData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <p>Select filters to view pricing data</p>
        </div>
      );
    }

    switch (viewType) {
      case 'MASTER':
        return (
          <div>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl mb-6 border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xl">📦</div>
                <div>
                  <p className="font-bold text-gray-900">{viewData.masterBookName || 'Master Price Book'}</p>
                  <p className="text-sm text-gray-500">{viewData.entries?.length || 0} products</p>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Base Price</th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Compare At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.entries?.map((entry: any, idx: number) => (
                    <tr key={entry.productId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/50 transition-colors`}>
                      <td className="px-5 py-4 font-medium text-gray-800">{entry.productName}</td>
                      {renderEditableCell(entry.productId, entry.productName, entry.basePrice, undefined, `master-${entry.productId}`)}
                      <td className="px-5 py-4 text-right font-mono text-gray-600">
                        {entry.compareAtPrice ? `₹${entry.compareAtPrice}` : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'ZONE':
        return (
          <div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl mb-6 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl">🌍</div>
                <div>
                  <p className="font-bold text-gray-900">{viewData.zoneName}</p>
                  <p className="text-sm text-gray-500">{viewData.matrix?.length || 0} products × {Object.keys(viewData.matrix?.[0]?.segments || {}).length || 0} segments</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200">Product</th>
                    {Object.keys(viewData.matrix?.[0]?.segments || {}).map((segmentCode: string) => (
                      <th key={segmentCode} className="px-5 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">{segmentCode}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.matrix?.map((row: any, idx: number) => (
                    <tr key={row.productId} className={`${row.isAvailable === false ? 'bg-red-50 opacity-70' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-indigo-50/50 transition-colors`}>
                      <td className="px-5 py-4 font-medium text-gray-800 sticky left-0 bg-white border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          {row.productName}
                          {row.isAvailable === false && <span className="text-red-500">🚫</span>}
                        </div>
                      </td>
                      {Object.entries(row.segments).map(([code, segData]: [string, any]) => {
                        const priceValue = typeof segData === 'object' ? segData?.finalPrice : segData;
                        const isAvailable = typeof segData === 'object' ? segData?.isAvailable !== false : true;

                        if (!isAvailable || priceValue == null) {
                          return (
                            <td key={code} className="px-5 py-4 text-center text-gray-300" title={row.availabilityReason || 'Not available'}>
                              —
                            </td>
                          );
                        }
                        return renderEditableCell(row.productId, row.productName, priceValue, row.segmentIds?.[code], `zone-${row.productId}-${code}`);
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
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segment:</strong> {viewData.segmentName}</p>
              <p><strong>Products:</strong> {viewData.prices?.length || 0}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Product</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Master Price</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Final Price</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Adjustments</th>
                </tr>
              </thead>
              <tbody>
                {viewData.prices?.map((price: any) => (
                  <tr key={price.productId} className="border-b hover:bg-gray-50">
                    <td className="p-3">{price.productName}</td>
                    <td className="p-3 font-mono">₹{price.masterPrice}</td>
                    {renderEditableCell(price.productId, price.productName, price.finalPrice, viewData.segmentId, `group-${price.productId}`)}
                    <td className="p-3 text-gray-500 text-xs">{price.adjustments?.length || 0} adjustment(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'PRODUCT_ZONE':
        return (
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><strong>Product:</strong> {viewData.productName}</p>
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segments:</strong> {viewData.prices?.length || 0}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Segment</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Master Price</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Final Price</th>
                  <th className="p-3 text-left font-semibold text-gray-600 uppercase text-xs border-b-2">Discount</th>
                </tr>
              </thead>
              <tbody>
                {viewData.prices?.map((price: any) => (
                  <tr key={price.segmentId} className="border-b hover:bg-gray-50">
                    <td className="p-3">{price.segmentName}</td>
                    <td className="p-3 font-mono">₹{price.masterPrice}</td>
                    {renderEditableCell(viewData.productId, viewData.productName, price.finalPrice, price.segmentId, `prod-${price.segmentId}`)}
                    <td className="p-3 text-green-600 font-semibold">
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
        if (viewData.price?.isAvailable === false) {
          return (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🚫</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Product Not Available</h3>
              <p className="text-gray-500">{viewData.price?.availabilityReason || 'This product is not available in the selected zone'}</p>
            </div>
          );
        }

        return (
          <div className="max-w-xl mx-auto">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><strong>Product:</strong> {viewData.productName}</p>
              <p><strong>Zone:</strong> {viewData.zoneName}</p>
              <p><strong>Segment:</strong> {viewData.segmentName}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <h4 className="text-lg font-semibold mb-4 pb-3 border-b">💰 Price Breakdown</h4>

              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Master Price:</span>
                <strong className="font-mono">₹{viewData.price?.masterPrice?.toFixed(2)}</strong>
              </div>

              {viewData.price?.adjustments?.map((adj: any, idx: number) => {
                const isModifier = adj.type === 'MODIFIER';
                const isIncrease = adj.modifierType === 'PERCENT_INC' || adj.modifierType === 'FLAT_INC' || adj.change > 0;
                const changeAmount = isModifier ? Math.abs(adj.change) : Math.abs(adj.value);

                return (
                  <div key={idx} className={`flex justify-between items-center py-3 border-b ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{adj.modifierName || adj.type}</span>
                    <strong className="font-mono">
                      {isIncrease ? '+' : '-'}
                      {adj.modifierType?.includes('PERCENT') ? '' : '₹'}
                      {changeAmount?.toFixed(2)}
                      {adj.modifierType?.includes('PERCENT') ? '%' : ''}
                    </strong>
                  </div>
                );
              })}

              <div className="flex justify-between items-center py-4 mt-2 border-t-2 border-indigo-500">
                <span className="text-lg font-semibold">Final Price:</span>
                <strong className="text-xl font-mono text-indigo-600">₹{viewData.price?.finalPrice?.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unknown view type: {viewType}</div>;
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
            📊
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Smart View Matrix</h2>
            <p className="text-gray-500">Manage virtual price books with hierarchical pricing</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Enhanced Filter Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit lg:sticky lg:top-6">
          {/* Filter Panel Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>
            <p className="text-xs text-gray-500 mt-1">Select filters to load pricing data</p>
          </div>

          <div className="p-5 space-y-5">
            {/* Zone Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Geo Zone
              </label>
              <select
                value={filters.zone || ''}
                onChange={(e) => handleFilterChange('zone', e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-gray-700"
              >
                <option value="">All Zones</option>
                {zones.map((zone: any) => (
                  <option key={zone._id} value={zone._id}>
                    {zone.name} ({zone.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Segment Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                User Segment
              </label>
              <select
                value={filters.segment || ''}
                onChange={(e) => handleFilterChange('segment', e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-gray-700"
              >
                <option value="">All Segments</option>
                {segments.map((segment: any) => (
                  <option key={segment._id} value={segment._id}>
                    {segment.name || segment.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Product
              </label>
              <select
                value={filters.product || ''}
                onChange={(e) => handleFilterChange('product', e.target.value)}
                className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-gray-700"
              >
                <option value="">All Products</option>
                {products.map((product: any) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={clearFilters}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Filters
            </button>
          </div>

          {/* Unsaved Changes Panel */}
          {hasUnsavedChanges && (
            <div className="border-t-2 border-amber-200 bg-amber-50/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center text-lg">
                  ⚠️
                </div>
                <div>
                  <p className="font-bold text-amber-800">{editedCells.length} Unsaved Change{editedCells.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-amber-600">Click save to apply</p>
                </div>
              </div>

              {/* List edited items */}
              <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
                {editedCells.map((cell, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{cell.productName || cell.productId}</p>
                      {cell.applyToAllSegments && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">All Segments</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-700 font-semibold">₹{cell.newPrice.toFixed(2)}</span>
                      <button
                        onClick={() => removeEditedCell(cell.productId, cell.segmentId)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <button
                  onClick={saveAllChanges}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save All Changes</>
                  )}
                </button>
                <button
                  onClick={discardChanges}
                  disabled={isSaving}
                  className="w-full py-3 border-2 border-red-400 text-red-600 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
                >
                  ✖ Discard All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Matrix Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Matrix Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{getViewTitle(viewType)}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {viewData?.matrix?.length || viewData?.entries?.length || viewData?.prices?.length || 0} items
              </p>
            </div>
            <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm">
              {viewType}
            </span>
          </div>

          {/* Matrix Body */}
          <div className="p-6">
            {renderView()}
          </div>
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
          }}
        />
      )}
    </div>
  );
};

export default SmartViewMatrix;
