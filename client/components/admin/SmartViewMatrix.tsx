import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  Download,
  Filter,
  Search,
  XCircle,
  Globe,
  Users,
  Package,
  BookOpen,
  FileText,
  Edit3,
  Save,
  Trash2,
  AlertCircle,
  Loader,
  MoreVertical,
  Eye,
  EyeOff,
  DollarSign,
  Percent,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  Info,
  HelpCircle,
  Zap,
  Shield,
  Tag,
  MapPin,
  Layers,
  Grid,
  Table,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import ConflictDetectionModal from './ConflictDetectionModal';
import { AdminSearchableDropdown } from '../AdminSearchableDropdown';

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
  applyToAllSegments?: boolean;
}

interface ConflictData {
  hasConflict: boolean;
  affectedCount: number;
  conflicts: any[];
  impactSummary?: any;
  affectedItems?: any[];
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
    product: null as string | null,
  });

  // Data state
  const [viewData, setViewData] = useState<any>(null);
  const [viewType, setViewType] = useState('MASTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'product' | 'zone'>('product');

  // Dropdown options
  const [zones, setZones] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Editing state
  const [editedCells, setEditedCells] = useState<EditedCell[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [applyToAllSegments, setApplyToAllSegments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Conflict Modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadDropdownOptions();
  }, []);

  useEffect(() => {
    fetchMatrixData();
    setEditedCells([]);
    setEditingCell(null);
  }, [filters, pagination.page]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
        fetch('/api/admin/pricing/products', { headers: getAuthHeaders() }),
      ]);

      if (zonesRes.status === 401 || zonesRes.status === 403) {
        setError('Authentication failed. Please login as an admin.');
        return;
      }

      if (!zonesRes.ok || !segmentsRes.ok || !productsRes.ok) {
        setError('Server error. Please check your connection.');
        return;
      }

      const [zonesData, segmentsData, productsData] = await Promise.all([
        zonesRes.json(),
        segmentsRes.json(),
        productsRes.json(),
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

      const response = await fetch(`/api/admin/pricing/smart-view?${params}&page=${pagination.page}&limit=${pagination.limit}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setViewData(data.data);
        setViewType(data.data.viewType);
        if (data.data.pagination) {
          setPagination(prev => ({
            ...prev,
            totalCount: data.data.pagination.totalCount,
            totalPages: data.data.pagination.totalPages,
          }));
        }
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
    setFilters((prev) => ({
      ...prev,
      [filterName]: value || null,
    }));
  };

  const clearFilters = () => {
    setFilters({ zone: null, segment: null, product: null });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const startEditing = (cellId: string, currentValue: number) => {
    setEditingCell(cellId);
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
    setApplyToAllSegments(false);
  };

  const confirmEdit = (
    productId: string,
    productName: string,
    segmentId?: string
  ) => {
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
      const price = viewData.prices.find(
        (p: any) => p.productId === productId || p.segmentId === segmentId
      );
      originalPrice = price?.finalPrice || price?.masterPrice || 0;
    }

    if (newPrice === originalPrice) {
      cancelEditing();
      return;
    }

    const effectiveSegmentId = applyToAllSegments
      ? undefined
      : segmentId || filters.segment || undefined;

    const editedCell: EditedCell = {
      productId,
      productName,
      segmentId: effectiveSegmentId,
      zoneId: filters.zone || undefined,
      originalPrice,
      newPrice,
      applyToAllSegments,
    };

    setEditedCells((prev) => {
      const existing = prev.findIndex(
        (c) =>
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
    toast.success(`Price updated to ${newPrice.toFixed(2)}${applyText} (pending save)`);
  };

  const saveAllChanges = async () => {
    if (editedCells.length === 0) {
      toast('No changes to save', { icon: 'ℹ️' });
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading(`Saving ${editedCells.length} price changes...`);

    try {
      const priceUpdates = editedCells.map((cell) => ({
        productId: cell.productId,
        newPrice: cell.newPrice,
        segmentId: cell.applyToAllSegments ? undefined : cell.segmentId,
        zoneId: cell.zoneId,
        applyToAllSegments: cell.applyToAllSegments || false,
      }));

      const response = await fetch('/api/admin/pricing/smart-view/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filters: {
            zoneId: filters.zone,
            segmentId: filters.segment,
            productId: filters.product,
          },
          priceUpdates,
          resolutionStrategy: 'ASK',
        }),
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        if (result.requiresResolution) {
          setConflictData({
            hasConflict: true,
            affectedCount: result.data.conflictsDetected || 0,
            conflicts: result.data.conflicts || [],
            impactSummary: result.data.impactSummary,
            affectedItems: result.data.affectedItems,
            resolutionOptions: result.data.resolutionOptions || [
              {
                id: 'OVERWRITE',
                label: 'Force Overwrite',
                description: 'Delete all child overrides',
                impact: { warning: 'All child prices will be deleted' },
              },
              {
                id: 'PRESERVE',
                label: 'Preserve Children',
                description: 'Keep existing child prices',
                impact: { warning: 'Child prices remain unchanged' },
              },
              {
                id: 'RELATIVE',
                label: 'Relative Adjust',
                description: 'Apply proportional adjustment',
                impact: { warning: 'Child prices will be scaled' },
              },
            ],
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

  const handleConflictResolution = async (resolutionId: string) => {
    setIsSaving(true);
    const loadingToast = toast.loading(`Applying ${resolutionId} resolution...`);

    try {
      const priceUpdates = editedCells.map((cell) => ({
        productId: cell.productId,
        newPrice: cell.newPrice,
        segmentId: cell.segmentId,
        zoneId: cell.zoneId,
      }));

      const response = await fetch('/api/admin/pricing/smart-view/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filters: {
            zoneId: filters.zone,
            segmentId: filters.segment,
            productId: filters.product,
          },
          priceUpdates,
          resolutionStrategy: resolutionId,
        }),
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
    setEditedCells((prev) => prev.filter((c) => !(c.productId === productId && c.segmentId === segmentId)));
    toast('Change removed', { icon: '↩️' });
  };

  const hasUnsavedChanges = editedCells.length > 0;

  // Helper to get view title with icon
  const getViewTitle = (vt: string) => {
    const titles: Record<string, { text: string; icon: React.ReactNode }> = {
      MASTER: {
        text: 'Master Price Book',
        icon: <BookOpen className="w-5 h-5 text-indigo-500" />,
      },
      ZONE: {
        text: 'Zone View',
        icon: <Globe className="w-5 h-5 text-purple-500" />,
      },
      GROUP_ZONE: {
        text: 'Group Zone View',
        icon: <Users className="w-5 h-5 text-blue-500" />,
      },
      PRODUCT_ZONE: {
        text: 'Product Zone View',
        icon: <Package className="w-5 h-5 text-emerald-500" />,
      },
      SINGLE_CELL: {
        text: 'Single Cell View',
        icon: <Search className="w-5 h-5 text-amber-500" />,
      },
    };
    return titles[vt] || { text: vt, icon: <FileText className="w-5 h-5 text-gray-500" /> };
  };

  // Editable cell renderer
  const renderEditableCell = (
    productId: string,
    productName: string,
    price: number,
    segmentId?: string,
    cellKey?: string
  ) => {
    const key = cellKey || `${productId}-${segmentId || 'default'}`;
    const isEditing = editingCell === key;
    const editedCell = editedCells.find(
      (c) => c.productId === productId && c.segmentId === segmentId
    );
    const displayPrice = editedCell ? editedCell.newPrice : price;
    const isModified = !!editedCell;

    if (isEditing) {
      return (
        <td key={key} className="p-2 bg-blue-50/50 min-w-[150px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit(productId, productName, segmentId);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  autoFocus
                  min="0"
                  step="0.01"
                  className="w-full pl-6 pr-2 py-1.5 border-2 border-indigo-300 rounded-lg text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button
                onClick={() => confirmEdit(productId, productName, segmentId)}
                className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                title="Save"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={cancelEditing}
                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                title="Cancel"
              >
                <XCircle size={16} />
              </button>
            </div>
            {segmentId && filters.zone && (
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToAllSegments}
                  onChange={(e) => setApplyToAllSegments(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
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
        <td key={key} className="p-3 text-center text-gray-300" title="Price not available">
          —
        </td>
      );
    }

    return (
      <td
        key={key}
        className={`p-3 text-center font-mono cursor-pointer transition-all hover:bg-indigo-50 group relative ${isModified ? 'bg-amber-50/80' : ''
          }`}
        onClick={() => startEditing(key, displayPrice)}
        title="Click to edit"
      >
        <span className="text-gray-900">₹{displayPrice.toFixed(2)}</span>
        {isModified && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" title="Modified" />
        )}
        <Edit3
          size={14}
          className="absolute bottom-1 right-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </td>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg mb-4 w-1/3"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-2">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderView = () => {
    if (loading) {
      return renderSkeleton();
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50/30 rounded-2xl border border-red-100 p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-600 font-medium mb-4">Error: {error}</p>
          <button
            onClick={fetchMatrixData}
            className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCcw size={18} />
            Retry
          </button>
        </div>
      );
    }

    if (!viewData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50/50 rounded-2xl border border-gray-200 border-dashed p-8">
          <Filter className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Select filters to view pricing data</p>
        </div>
      );
    }

    switch (viewType) {
      case 'MASTER':
        return (
          <div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl mb-6 border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="font-bold text-xl text-gray-900">{viewData.masterBookName || 'Master Price Book'}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Package size={14} />
                    {pagination.totalCount || viewData.entries?.length || 0} total products
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm max-h-[70vh] overflow-y-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Base Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Compare At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.entries?.map((entry: any, idx: number) => (
                    <tr
                      key={entry.productId}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-indigo-50/50 transition-colors`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">{entry.productName}</td>
                      {renderEditableCell(
                        entry.productId,
                        entry.productName,
                        entry.basePrice,
                        undefined,
                        `master-${entry.productId}`
                      )}
                      <td className="px-6 py-4 text-right font-mono text-gray-600">
                        {entry.compareAtPrice ? `₹${entry.compareAtPrice}` : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalCount}</span> products
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="-rotate-90 w-4 h-4" />
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${pagination.page === pageNum
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                      return <span key={pageNum} className="text-gray-400">...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="-rotate-90 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'ZONE':
        return (
          <div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl mb-6 border border-purple-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="font-bold text-xl text-gray-900">{viewData.zoneName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Layers size={14} />
                    {viewData.matrix?.length || 0} products ×{' '}
                    {Object.keys(viewData.matrix?.[0]?.segments || {}).length || 0} segments
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200">
                      Product
                    </th>
                    {Object.keys(viewData.matrix?.[0]?.segments || {}).map((segmentCode: string) => (
                      <th key={segmentCode} className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {segmentCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.matrix?.map((row: any, idx: number) => (
                    <tr
                      key={row.productId}
                      className={`${row.isAvailable === false ? 'bg-red-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        } hover:bg-indigo-50/50 transition-colors`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-800 sticky left-0 bg-white border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          {row.productName}
                          {row.isAvailable === false && <AlertCircle size={16} className="text-red-500" />}
                        </div>
                      </td>
                      {Object.entries(row.segments).map(([code, segData]: [string, any]) => {
                        const priceValue = typeof segData === 'object' ? segData?.finalPrice : segData;
                        const isAvailable = typeof segData === 'object' ? segData?.isAvailable !== false : true;
                        const segId = row.segmentIds?.[code];

                        if (!isAvailable || priceValue == null) {
                          return (
                            <td key={code} className="px-6 py-4 text-center text-gray-300" title={row.availabilityReason || 'Not available'}>
                              —
                            </td>
                          );
                        }
                        return renderEditableCell(
                          row.productId,
                          row.productName,
                          priceValue,
                          segId,
                          `zone-${row.productId}-${code}`
                        );
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
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl mb-6 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Users size={24} />
                </div>
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500">Zone</p>
                    <p className="font-medium">{viewData.zoneName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Segment</p>
                    <p className="font-medium">{viewData.segmentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Products</p>
                    <p className="font-medium">{viewData.prices?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Master Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Final Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.prices?.map((price: any) => (
                    <tr key={price.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{price.productName}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{price.masterPrice}</td>
                      {renderEditableCell(
                        price.productId,
                        price.productName,
                        price.finalPrice,
                        viewData.segmentId,
                        `group-${price.productId}`
                      )}
                      <td className="px-6 py-4 text-gray-500 text-xs">{price.adjustments?.length || 0} adjustment(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'PRODUCT_ZONE':
        return (
          <div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl mb-6 border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Package size={24} />
                </div>
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500">Product</p>
                    <p className="font-medium">{viewData.productName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Zone</p>
                    <p className="font-medium">{viewData.zoneName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Segments</p>
                    <p className="font-medium">{viewData.prices?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Master Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Final Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Discount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewData.prices?.map((price: any) => (
                    <tr key={price.segmentId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium">{price.segmentName}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{price.masterPrice}</td>
                      {renderEditableCell(
                        viewData.productId,
                        viewData.productName,
                        price.finalPrice,
                        price.segmentId,
                        `prod-${price.segmentId}`
                      )}
                      <td className="px-6 py-4 text-right text-green-600 font-semibold">
                        {price.masterPrice > price.finalPrice ? (
                          <span className="flex items-center justify-end gap-1">
                            <ArrowDown size={14} />
                            {((1 - price.finalPrice / price.masterPrice) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'SINGLE_CELL':
        if (viewData.price?.isAvailable === false) {
          return (
            <div className="text-center py-16 bg-red-50/30 rounded-2xl border border-red-100">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Product Not Available</h3>
              <p className="text-gray-500">{viewData.price?.availabilityReason || 'This product is not available in the selected zone'}</p>
            </div>
          );
        }

        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl mb-6 border border-amber-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Search size={24} />
                </div>
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500">Product</p>
                    <p className="font-medium">{viewData.productName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Zone</p>
                    <p className="font-medium">{viewData.zoneName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Segment</p>
                    <p className="font-medium">{viewData.segmentName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold mb-6 pb-3 border-b flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-500" />
                Price Breakdown
              </h4>

              <div className="flex justify-between items-center py-4 border-b">
                <span className="text-gray-600 flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-400" />
                  Master Price:
                </span>
                {editingCell === 'single-cell-master' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border-2 border-indigo-300 rounded-lg px-3 py-1.5 bg-white">
                      <span className="text-gray-500 mr-1">₹</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            confirmEdit(filters.product!, viewData.productName, filters.segment || undefined);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="w-24 outline-none font-mono"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => confirmEdit(filters.product!, viewData.productName, filters.segment || undefined)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="Save"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      title="Cancel"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <strong className="font-mono text-lg">₹{viewData.price?.masterPrice?.toFixed(2)}</strong>
                    <button
                      onClick={() => startEditing('single-cell-master', viewData.price?.masterPrice || 0)}
                      className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                      title="Edit master price"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {viewData.price?.adjustments?.map((adj: any, idx: number) => {
                const isModifier = adj.type === 'MODIFIER';
                const isIncrease = adj.modifierType === 'PERCENT_INC' || adj.modifierType === 'FLAT_INC' || adj.change > 0;
                const changeAmount = isModifier ? Math.abs(adj.change) : Math.abs(adj.value);

                const getSourceLabel = () => {
                  if (adj.type === 'ZONE_BOOK') return 'Zone Price Book';
                  if (adj.type === 'SEGMENT_BOOK') return 'Segment Price Book';
                  if (!isModifier) return adj.type;

                  if (adj.appliesTo === 'GLOBAL') return 'Global Modifier';
                  if (adj.appliesTo === 'ZONE') return 'Zone Modifier';
                  if (adj.appliesTo === 'SEGMENT') return 'Segment Modifier';
                  if (adj.appliesTo === 'PRODUCT') return 'Product Modifier';
                  if (adj.appliesTo === 'ATTRIBUTE') return 'Attribute Modifier';
                  if (adj.appliesTo === 'COMBINATION') return 'Combination Modifier';
                  return 'Modifier';
                };

                return (
                  <div
                    key={idx}
                    className={`py-4 border-b last:border-b-0 ${isIncrease ? 'bg-green-50/30' : 'bg-red-50/30'} px-3 rounded-lg my-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {isIncrease ? <ArrowUp size={14} className="text-green-600" /> : <ArrowDown size={14} className="text-red-600" />}
                          {adj.modifierName || adj.type}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isIncrease ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                          >
                            <Tag size={10} />
                            {getSourceLabel()}
                          </span>
                          {isModifier && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              {adj.modifierType?.includes('PERCENT') ? <Percent size={10} /> : <DollarSign size={10} />}
                              {adj.value}
                              {adj.modifierType?.includes('PERCENT') ? '%' : ''} {adj.modifierType?.includes('INC') ? 'increase' : 'decrease'}
                            </span>
                          )}
                        </div>
                      </div>
                      <strong className={`font-mono text-lg ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncrease ? '+' : '-'}₹{changeAmount?.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center py-5 mt-4 border-t-2 border-indigo-200 bg-indigo-50/30 -mx-6 px-6 rounded-b-2xl">
                <span className="text-lg font-semibold flex items-center gap-2">
                  <Zap size={18} className="text-indigo-600" />
                  Final Price:
                </span>
                <strong className="text-2xl font-mono text-indigo-600">₹{viewData.price?.finalPrice?.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-8 text-center text-gray-500">Unknown view type: {viewType}</div>;
    }
  };

  return (
    <div className="bg-gray-50/30 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0 lg:gap-6 p-4 lg:p-6">
        {/* Filter Sidebar */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-sm h-fit lg:sticky lg:top-6">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Settings size={16} className="text-indigo-500" />
              Configuration
            </h3>
            <p className="text-xs text-gray-500 mt-1">Refine your matrix view filters</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Zone Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                <MapPin size={14} className="text-purple-500" />
                Geo Zone
              </label>
              <AdminSearchableDropdown
                label="All Zones"
                options={zones.map((zone: any) => ({
                  value: zone._id,
                  label: `${zone.name} (${zone.level})`,
                }))}
                value={filters.zone || ''}
                onChange={(val) => handleFilterChange('zone', val as string)}
                searchPlaceholder="Search zones..."
              />
            </div>

            {/* Segment Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                <Users size={14} className="text-blue-500" />
                User Segment
              </label>
              <AdminSearchableDropdown
                label="All Segments"
                options={segments.map((segment: any) => ({
                  value: segment._id,
                  label: segment.name || segment.code,
                }))}
                value={filters.segment || ''}
                onChange={(val) => handleFilterChange('segment', val as string)}
                searchPlaceholder="Search segments..."
              />
            </div>

            {/* Product Filter */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                <Package size={14} className="text-emerald-500" />
                Product
              </label>
              <AdminSearchableDropdown
                label="All Products"
                options={products.map((product: any) => ({
                  value: product._id,
                  label: product.name,
                }))}
                value={filters.product || ''}
                onChange={(val) => handleFilterChange('product', val as string)}
                searchPlaceholder="Search products by name..."
              />
            </div>

            {/* Clear All Filters */}
            <button
              onClick={clearFilters}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw size={16} />
              Clear Filters
            </button>

            {/* Unsaved Changes */}
            {hasUnsavedChanges && (
              <div className="pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 mb-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle size={14} />
                    Unsaved Changes ({editedCells.length})
                  </p>
                  <p className="text-xs text-amber-600 mt-1">You have modified prices in this view.</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={saveAllChanges}
                    disabled={isSaving}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={discardChanges}
                    className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-white hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Discard All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-6 lg:p-8">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {getViewTitle(viewType).icon}
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{getViewTitle(viewType).text}</h3>
                </div>
                <p className="text-gray-500 text-sm">Pricing matrix data based on hierarchical calculation</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Grid size={14} />
                  {viewType}
                </span>
                {hasUnsavedChanges && (
                  <span className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <AlertCircle size={14} />
                    Pending Changes
                  </span>
                )}
              </div>
            </div>

            <div className="matrix-content-wrapper">{renderView()}</div>
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
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