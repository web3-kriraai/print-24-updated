import React, { useState, useEffect } from 'react';
import { Plus, X, Save, AlertCircle, Search, Edit2, Trash2, MapPin, Package, Calendar, Users, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { AdminSearchableDropdown } from '../../AdminSearchableDropdown';

/**
 * =========================================================================
 * MODIFIER RULE BUILDER
 * =========================================================================
 * 
 * Purpose: Create and edit price modifiers (dynamic pricing rules)
 * 
 * Features:
 * - Scope selection (GLOBAL/ZONE/SEGMENT/PRODUCT/ATTRIBUTE)
 * - Modifier type (PERCENT_INC/PERCENT_DEC/FLAT_INC/FLAT_DEC)
 * - Conditional fields based on scope
 * - Priority and validity configuration
 */

interface PriceModifier {
    _id?: string;
    appliesTo: 'GLOBAL' | 'ZONE' | 'SEGMENT' | 'PRODUCT' | 'ATTRIBUTE' | 'COMBINATION';
    modifierType: 'PERCENT_INC' | 'PERCENT_DEC' | 'FLAT_INC' | ' FLAT_DEC';
    value: number;
    geoZone?: string;
    userSegment?: string;
    product?: string;
    attributeType?: string;
    attributeValue?: string;
    minQuantity?: number;
    maxQuantity?: number;
    validFrom?: string;
    validTo?: string;
    priority: number;
    isActive: boolean;
    isStackable: boolean;
    reason: string;
    conditions?: any; // For COMBINATION rules
}

interface ConditionRow {
    id: string;
    field: string;
    operator: string;
    value: string;
}

const AVAILABLE_FIELDS = [
    { value: 'geo_zone', label: 'Geo Zone', type: 'select', optionsSrc: 'zones' },
    { value: 'user_segment', label: 'User Segment', type: 'select', optionsSrc: 'segments' },
    { value: 'category', label: 'Product Category', type: 'select', optionsSrc: 'categories' },
    { value: 'product_id', label: 'Specific Product', type: 'select', optionsSrc: 'products' },
    { value: 'quantity', label: 'Cart Quantity', type: 'number' },
    { value: 'order_value', label: 'Order Value', type: 'number' },
    {
        value: 'day_of_week', label: 'Day of Week (0-6)', type: 'select', options: [
            { value: '0', label: 'Sunday' },
            { value: '1', label: 'Monday' },
            { value: '5', label: 'Friday' },
            { value: '6', label: 'Saturday' }
        ]
    },
];

const OPERATORS = [
    { value: 'EQUALS', label: 'Equals (=)' },
    { value: 'NOT_EQUALS', label: 'Not Equals (!=)' },
    { value: 'GT', label: 'Greater Than (>)' },
    { value: 'LT', label: 'Less Than (<)' },
    { value: 'GTE', label: 'Greater/Equal (>=)' },
    { value: 'LTE', label: 'Less/Equal (<=)' },
    { value: 'IN', label: 'In List (comma separated)' },
    { value: 'CONTAINS', label: 'Contains Text' },
];

interface GeoZone {
    _id: string;
    name: string;
}

interface UserSegment {
    _id: string;
    name: string;
    code: string;
}

interface Product {
    _id: string;
    name: string;
}

interface AttributeType {
    _id: string;
    attributeName: string;
}

interface Category {
    _id: string;
    name: string;
    slug?: string;
}

export const ModifierRuleBuilder: React.FC = () => {
    const [modifiers, setModifiers] = useState<PriceModifier[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingModifier, setEditingModifier] = useState<PriceModifier | null>(null);
    const [loading, setLoading] = useState(false);

    // Lookup data
    const [geoZones, setGeoZones] = useState<GeoZone[]>([]);
    const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Rule Builder State
    const [ruleRows, setRuleRows] = useState<ConditionRow[]>([]);
    const [ruleLogic, setRuleLogic] = useState<'AND' | 'OR'>('AND');

    // Form state
    const [formData, setFormData] = useState<Partial<PriceModifier>>({
        appliesTo: 'GLOBAL',
        modifierType: 'PERCENT_DEC',
        value: 0,
        priority: 0,
        isActive: true,
        isStackable: true,
        reason: '',
    });

    // Validation errors state
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchModifiers();
        fetchLookupData();
    }, []);

    const fetchModifiers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/price-modifiers', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const data = await response.json();
            setModifiers(data.modifiers || []);
        } catch (error) {
            console.error('Failed to fetch modifiers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLookupData = async () => {
        try {
            const [zonesRes, segmentsRes, productsRes, attrsRes, categoriesRes] = await Promise.all([
                fetch('/api/admin/pricing/geo-zones', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch('/api/admin/pricing/user-segments', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch('/api/admin/pricing/products', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch('/api/admin/pricing/attribute-types', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch('/api/admin/pricing/categories', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
            ]);

            const [zones, segments, products, attrs, cats] = await Promise.all([
                zonesRes.json(),
                segmentsRes.json(),
                productsRes.json(),
                attrsRes.json(),
                categoriesRes.json(),
            ]);

            setGeoZones(zones.zones || []);
            setUserSegments(segments.segments || []);
            setProducts(products.products || []);
            setAttributeTypes(attrs.attributeTypes || []);
            setCategories(cats.categories || []);
        } catch (error) {
            console.error('Failed to fetch lookup data:', error);
        }
    };

    const handleSubmit = async () => {
        // ========== VALIDATION ==========
        const errors: Record<string, string> = {};

        // 1. Required field: Value
        if (formData.value === undefined || formData.value === null || String(formData.value).trim() === '') {
            errors.value = 'Value is required';
        } else {
            const numValue = Number(formData.value);

            // 2. Value must be a valid number
            if (isNaN(numValue)) {
                errors.value = 'Value must be a valid number';
            } else {
                // 3. Value range validation based on modifier type
                if (formData.modifierType.includes('PERCENT')) {
                    // Percentage must be between 0 and 100
                    if (numValue < 0 || numValue > 100) {
                        errors.value = 'Percentage value must be between 0 and 100';
                    }
                } else {
                    // Flat amount must be positive
                    if (numValue < 0) {
                        errors.value = 'Flat amount must be a positive number';
                    }
                }
            }
        }

        // 4. Priority validation
        if (formData.priority === undefined || formData.priority === null || String(formData.priority).trim() === '') {
            errors.priority = 'Priority is required';
        } else if (Number(formData.priority) < 0) {
            errors.priority = 'Priority must be 0 or higher';
        }

        // 5. Reason/Description validation
        if (!formData.reason || formData.reason.trim() === '') {
            errors.reason = 'Reason/Description is required';
        }

        // 6. Date validation
        if (formData.validFrom && formData.validTo) {
            const fromDate = new Date(formData.validFrom);
            const toDate = new Date(formData.validTo);

            if (toDate <= fromDate) {
                errors.validTo = 'Valid To date must be after Valid From date';
            }
        }

        // 7. Quantity validation
        if (formData.minQuantity !== undefined && formData.minQuantity < 0) {
            errors.minQuantity = 'Min Quantity cannot be negative';
        }
        if (formData.maxQuantity !== undefined && formData.maxQuantity < 0) {
            errors.maxQuantity = 'Max Quantity cannot be negative';
        }
        if (formData.minQuantity !== undefined && formData.maxQuantity !== undefined) {
            if (formData.maxQuantity > 0 && formData.minQuantity > formData.maxQuantity) {
                errors.maxQuantity = 'Max Quantity must be greater than or equal to Min Quantity';
            }
        }

        // 8. Scope-specific validation
        if (formData.appliesTo === 'ZONE' && !formData.geoZone) {
            errors.geoZone = 'Geo Zone is required when scope is ZONE';
        }
        if (formData.appliesTo === 'SEGMENT' && !formData.userSegment) {
            errors.userSegment = 'User Segment is required when scope is SEGMENT';
        }
        if (formData.appliesTo === 'PRODUCT' && !formData.product) {
            errors.product = 'Product is required when scope is PRODUCT';
        }
        if (formData.appliesTo === 'ATTRIBUTE') {
            if (!formData.attributeType) {
                errors.attributeType = 'Attribute Type is required when scope is ATTRIBUTE';
            }
            if (!formData.attributeValue) {
                errors.attributeValue = 'Attribute Value is required when scope is ATTRIBUTE';
            }
        }

        // If there are validation errors, show them and stop
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear validation errors
        setValidationErrors({});

        // ========== SUBMIT ==========
        try {
            const url = editingModifier
                ? `/api/admin/price-modifiers/${editingModifier._id}`
                : '/api/admin/price-modifiers';

            const response = await fetch(url, {
                method: editingModifier ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                alert(editingModifier ? 'Modifier updated successfully!' : 'Modifier created successfully!');
                fetchModifiers();
                setShowCreateModal(false);
                setEditingModifier(null);
                setFormData({
                    appliesTo: 'GLOBAL',
                    modifierType: 'PERCENT_DEC',
                    value: 0,
                    priority: 0,
                    isActive: true,
                    isStackable: true,
                    reason: '',
                    conditions: null
                });
                setRuleRows([]); // Reset rules
            } else {
                alert('Error: ' + (data.message || 'Failed to save modifier'));
            }
        } catch (error) {
            console.error('Failed to save modifier:', error);
            alert('Failed to save modifier. Please try again.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this modifier?')) return;

        try {
            const response = await fetch(`/api/admin/price-modifiers/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                fetchModifiers();
            }
        } catch (error) {
            console.error('Failed to delete modifier:', error);
        }
    };

    const openEditModal = (modifier: PriceModifier) => {
        setEditingModifier(modifier);
        setFormData({
            ...modifier,
            validFrom: modifier.validFrom ? new Date(modifier.validFrom).toISOString().split('T')[0] : undefined,
            validTo: modifier.validTo ? new Date(modifier.validTo).toISOString().split('T')[0] : undefined,
        });

        // Parse existing conditions into rows
        if (modifier.appliesTo === 'COMBINATION' && modifier.conditions) {
            const rows: ConditionRow[] = [];

            // Detect logic type (AND or OR)
            const detectedLogic = modifier.conditions.OR ? 'OR' : 'AND';
            setRuleLogic(detectedLogic);

            // Helper to process a condition node
            const processNode = (node: any) => {
                if (node.AND) {
                    node.AND.forEach((child: any) => processNode(child));
                } else if (node.OR) {
                    node.OR.forEach((child: any) => processNode(child));
                } else if (node.field) {
                    rows.push({
                        id: Math.random().toString(36).substr(2, 9),
                        field: node.field,
                        operator: node.operator,
                        value: Array.isArray(node.value) ? node.value.join(',') : String(node.value)
                    });
                }
            };

            processNode(modifier.conditions);
            if (rows.length === 0) {
                // Default empty row
                rows.push({ id: '1', field: 'geo_zone', operator: 'EQUALS', value: '' });
            }
            setRuleRows(rows);
        } else {
            setRuleRows([]);
            setRuleLogic('AND'); // Reset to default
        }

        setShowCreateModal(true);
    };

    // Rule Builder Handlers
    const addRuleRow = () => {
        setRuleRows([...ruleRows, {
            id: Math.random().toString(36).substr(2, 9),
            field: 'geo_zone',
            operator: 'EQUALS',
            value: ''
        }]);
    };

    const removeRuleRow = (id: string) => {
        setRuleRows(ruleRows.filter(r => r.id !== id));
    };

    const updateRuleRow = (id: string, field: keyof ConditionRow, val: string) => {
        const newRows = ruleRows.map(r => r.id === id ? { ...r, [field]: val } : r);
        setRuleRows(newRows);

        // Update formData.conditions automatically
        updateConditionsJson(newRows);
    };

    const updateConditionsJson = (rows: ConditionRow[]) => {
        if (rows.length === 0) {
            setFormData(prev => ({ ...prev, conditions: null }));
            return;
        }

        const conditions = rows.map(r => {
            let val: any = r.value;
            // Type conversion based on operator/field could happen here
            // For now, keep as string or array for IN
            if (r.operator === 'IN') {
                val = r.value.split(',').map(s => s.trim());
            } else if (!isNaN(Number(r.value)) && r.value !== '') {
                val = Number(r.value);
            }

            return {
                field: r.field,
                operator: r.operator,
                value: val
            };
        });

        // Wrap in AND or OR based on selected logic
        // Backend JSONRuleEvaluator handles both AND and OR at top level
        setFormData(prev => ({
            ...prev,
            conditions: { [ruleLogic]: conditions }
        }));
    };

    const getScopeColor = (scope: string) => {
        const colors: Record<string, string> = {
            GLOBAL: 'bg-purple-100 text-purple-800',
            ZONE: 'bg-blue-100 text-blue-800',
            SEGMENT: 'bg-green-100 text-green-800',
            PRODUCT: 'bg-orange-100 text-orange-800',
            ATTRIBUTE: 'bg-pink-100 text-pink-800',
        };
        return colors[scope] || 'bg-gray-100 text-gray-800';
    };

    const getModifierTypeIcon = (type: string) => {
        if (type.includes('INC')) return '↑';
        if (type.includes('DEC')) return '↓';
        return '•';
    };

    return (
        <div className="p-0">

            {/* Actions Bar */}
            <div className="mb-6 bg-white border-b border-gray-100 p-6 flex flex-wrap gap-4 justify-between items-center">
                <button
                    onClick={() => {
                        setEditingModifier(null);
                        setFormData({
                            appliesTo: 'GLOBAL',
                            modifierType: 'PERCENT_DEC',
                            value: 0,
                            priority: 0,
                            isActive: true,
                            isStackable: true,
                            reason: '',
                            conditions: null
                        });
                        setRuleRows([{ id: '1', field: 'geo_zone', operator: 'EQUALS', value: '' }]);
                        setShowCreateModal(true);
                    }}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                >
                    <Plus size={20} />
                    New Modifier Rule
                </button>

                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find rules by reason or scope..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Modifiers List */}
            <div className="p-6">
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30">
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-[0.15em]">
                            Active Strategy Matrix
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm text-gray-500 font-medium">Analyzing pricing strategies...</p>
                            </div>
                        ) : modifiers.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="p-4 bg-gray-50 rounded-full inline-block mb-4">
                                    <AlertCircle size={32} className="text-gray-300" />
                                </div>
                                <h3 className="text-gray-900 font-bold text-lg">No active modifiers</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Create a pricing rule to start adjusting costs dynamically across your platform.</p>
                            </div>
                        ) : (
                            modifiers.map((modifier) => (
                                <div
                                    key={modifier._id}
                                    className="p-6 hover:bg-gray-50/50 transition-colors group relative"
                                >
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getScopeColor(modifier.appliesTo).replace('bg-', 'text-').replace('-100', '-700')} border-current/20 ${getScopeColor(modifier.appliesTo)}`}>
                                                    {modifier.appliesTo}
                                                </span>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white rounded-lg">
                                                    <span className="text-indigo-400 font-bold">{getModifierTypeIcon(modifier.modifierType)}</span>
                                                    <span className="text-sm font-bold tracking-tight">
                                                        {modifier.modifierType.includes('PERCENT') ? `${modifier.value}%` : `₹${modifier.value}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md uppercase tracking-widest">
                                                    Priority {modifier.priority}
                                                </div>
                                                {!modifier.isActive && (
                                                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase tracking-widest rounded-md">
                                                        Disabled
                                                    </span>
                                                )}
                                                {modifier.isStackable && (
                                                    <span className="px-2.5 py-1 bg-teal-50 text-teal-600 border border-teal-100 text-[10px] font-bold uppercase tracking-widest rounded-md">
                                                        Stackable
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{modifier.reason || 'Unnamed Pricing Rule'}</h3>

                                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                {modifier.geoZone && (
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                        <MapPin size={14} className="text-gray-300" />
                                                        {(modifier.geoZone as any).name || modifier.geoZone}
                                                    </div>
                                                )}
                                                {modifier.userSegment && (
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                        <Users size={14} className="text-gray-300" />
                                                        {(modifier.userSegment as any).name || modifier.userSegment}
                                                    </div>
                                                )}
                                                {modifier.product && (
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                        <Package size={14} className="text-gray-300" />
                                                        {(modifier.product as any).name || modifier.product}
                                                    </div>
                                                )}
                                                {modifier.validFrom && (
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100/50">
                                                        <Calendar size={14} className="text-indigo-400" />
                                                        {new Date(modifier.validFrom).toLocaleDateString()} - {modifier.validTo ? new Date(modifier.validTo).toLocaleDateString() : 'Forever'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(modifier)}
                                                className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-50 border border-gray-100 rounded-xl transition-all"
                                                title="Edit Rule"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => modifier._id && handleDelete(modifier._id)}
                                                className="w-10 h-10 flex items-center justify-center text-rose-600 hover:bg-rose-50 border border-gray-100 rounded-xl transition-all"
                                                title="Remove Rule"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-semibold">
                                {editingModifier ? 'Edit' : 'Create'} Price Modifier
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Scope Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Applies To (Scope) *
                                </label>
                                <select
                                    value={formData.appliesTo}
                                    onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="GLOBAL">Global (All Products)</option>
                                    <option value="ZONE">Geo Zone</option>
                                    <option value="SEGMENT">User Segment</option>
                                    <option value="PRODUCT">Specific Product</option>
                                    <option value="ATTRIBUTE">Product Attribute</option>
                                    <option value="COMBINATION">Combination Rule (Advanced)</option>
                                </select>
                            </div>

                            {/* Conditional Fields Based on Scope */}
                            {formData.appliesTo === 'ZONE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Geo Zone *
                                    </label>
                                    <AdminSearchableDropdown
                                        label="Select a zone..."
                                        options={geoZones.map((zone) => ({
                                            value: zone._id,
                                            label: zone.name
                                        }))}
                                        value={formData.geoZone || ''}
                                        onChange={(val) => setFormData({ ...formData, geoZone: val as string })}
                                        searchPlaceholder="Search zones..."
                                    />
                                </div>
                            )}

                            {formData.appliesTo === 'SEGMENT' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        User Segment *
                                    </label>
                                    <AdminSearchableDropdown
                                        label="Select a segment..."
                                        options={userSegments.map((segment) => ({
                                            value: segment._id,
                                            label: `${segment.name} (${segment.code})`
                                        }))}
                                        value={formData.userSegment || ''}
                                        onChange={(val) => setFormData({ ...formData, userSegment: val as string })}
                                        searchPlaceholder="Search segments..."
                                    />
                                </div>
                            )}

                            {formData.appliesTo === 'PRODUCT' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product *
                                    </label>
                                    <AdminSearchableDropdown
                                        label="Select a product..."
                                        options={products.map((product) => ({
                                            value: product._id,
                                            label: product.name
                                        }))}
                                        value={formData.product || ''}
                                        onChange={(val) => setFormData({ ...formData, product: val as string })}
                                        searchPlaceholder="Search products..."
                                    />
                                </div>
                            )}

                            {formData.appliesTo === 'ATTRIBUTE' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Attribute Type *
                                        </label>
                                        <select
                                            value={formData.attributeType || ''}
                                            onChange={(e) => setFormData({ ...formData, attributeType: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select an attribute...</option>
                                            {attributeTypes.map((attr) => (
                                                <option key={attr._id} value={attr._id}>
                                                    {attr.attributeName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Attribute Value
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.attributeValue || ''}
                                            onChange={(e) => setFormData({ ...formData, attributeValue: e.target.value })}
                                            placeholder="e.g., GLOSSY, A4, etc."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Leave empty to apply to all values of this attribute
                                        </p>
                                    </div>
                                </>
                            )}

                            {formData.appliesTo === 'COMBINATION' && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {/* Logic Toggle */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Logic Operator
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setRuleLogic('AND'); updateConditionsJson(ruleRows); }}
                                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${ruleLogic === 'AND'
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                AND (All must match)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setRuleLogic('OR'); updateConditionsJson(ruleRows); }}
                                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${ruleLogic === 'OR'
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                OR (Any can match)
                                            </button>
                                        </div>
                                    </div>

                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rule Conditions ({ruleLogic === 'AND' ? 'ALL must match' : 'ANY can match'})
                                    </label>

                                    <div className="space-y-3">
                                        {ruleRows.map((row) => (
                                            <div key={row.id} className="flex gap-2 items-start">
                                                <select
                                                    value={row.field}
                                                    onChange={(e) => updateRuleRow(row.id, 'field', e.target.value)}
                                                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                >
                                                    {AVAILABLE_FIELDS.map(f => (
                                                        <option key={f.value} value={f.value}>{f.label}</option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={row.operator}
                                                    onChange={(e) => updateRuleRow(row.id, 'operator', e.target.value)}
                                                    className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                >
                                                    {OPERATORS.map(op => (
                                                        <option key={op.value} value={op.value}>{op.label}</option>
                                                    ))}
                                                </select>

                                                {/* Dynamic Input based on field type? For now simpler text/select */}
                                                <div className="flex-1">
                                                    {AVAILABLE_FIELDS.find(f => f.value === row.field)?.optionsSrc === 'zones' ? (
                                                        <select
                                                            value={row.value}
                                                            onChange={(e) => updateRuleRow(row.id, 'value', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="">Select Zone</option>
                                                            {geoZones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                                                        </select>
                                                    ) : AVAILABLE_FIELDS.find(f => f.value === row.field)?.optionsSrc === 'segments' ? (
                                                        <select
                                                            value={row.value}
                                                            onChange={(e) => updateRuleRow(row.id, 'value', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="">Select Segment</option>
                                                            {userSegments.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                                        </select>
                                                    ) : AVAILABLE_FIELDS.find(f => f.value === row.field)?.optionsSrc === 'categories' ? (
                                                        <select
                                                            value={row.value}
                                                            onChange={(e) => updateRuleRow(row.id, 'value', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="">Select Category</option>
                                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                                        </select>
                                                    ) : AVAILABLE_FIELDS.find(f => f.value === row.field)?.optionsSrc === 'products' ? (
                                                        <select
                                                            value={row.value}
                                                            onChange={(e) => updateRuleRow(row.id, 'value', e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="">Select Product</option>
                                                            {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={row.value}
                                                            onChange={(e) => updateRuleRow(row.id, 'value', e.target.value)}
                                                            placeholder="Value"
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                        />
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => removeRuleRow(row.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                    title="Remove Condition"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={addRuleRow}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Condition
                                    </button>
                                </div>
                            )}

                            {/* Modifier Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Modifier Type *
                                </label>
                                <select
                                    value={formData.modifierType}
                                    onChange={(e) => setFormData({ ...formData, modifierType: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="PERCENT_INC">Percentage Increase (+%)</option>
                                    <option value="PERCENT_DEC">Percentage Decrease (-%)</option>
                                    <option value="FLAT_INC">Flat Amount Increase (+₹)</option>
                                    <option value="FLAT_DEC">Flat Amount Decrease (-₹)</option>
                                </select>
                            </div>

                            {/* Value */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Value *
                                </label>
                                <input
                                    type="number"
                                    value={formData.value || ''}
                                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                    placeholder={formData.modifierType?.includes('PERCENT') ? '10' : '500'}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.value ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.value ? (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.value}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formData.modifierType?.includes('PERCENT')
                                            ? 'Enter percentage (e.g., 10 for 10%)'
                                            : 'Enter flat amount (e.g., 500 for ₹500)'}
                                    </p>
                                )}
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <input
                                    type="number"
                                    value={formData.priority || 0}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.priority ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.priority ? (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.priority}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Higher priority modifiers are applied first
                                    </p>
                                )}
                            </div>

                            {/* Quantity Constraints */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Min Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minQuantity || ''}
                                        onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || undefined })}
                                        placeholder="No minimum"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.minQuantity ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {validationErrors.minQuantity && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {validationErrors.minQuantity}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxQuantity || ''}
                                        onChange={(e) => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || undefined })}
                                        placeholder="No maximum"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.maxQuantity ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {validationErrors.maxQuantity && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {validationErrors.maxQuantity}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valid From
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validFrom || ''}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valid To
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validTo || ''}
                                        onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.validTo ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {validationErrors.validTo && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {validationErrors.validTo}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason / Description *
                                </label>
                                <textarea
                                    value={formData.reason || ''}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="e.g., Summer Sale 2024, Corporate Bulk Discount, etc."
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${validationErrors.reason ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.reason && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationErrors.reason}
                                    </p>
                                )}
                            </div>

                            {/* Stacking Controls - Enhanced */}
                            <div className="stacking-controls space-y-4 bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Modifier Behavior</h4>

                                <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">✅ Active</span>
                                        <p className="text-xs text-gray-500 mt-1">Modifier is currently enabled and will be applied</p>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-green-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.isStackable}
                                        onChange={(e) => {
                                            const isStackable = e.target.checked;
                                            setFormData({
                                                ...formData,
                                                isStackable,
                                                // If enabling stackable, disable exclusive (they're mutually exclusive)
                                            });
                                        }}
                                        className="w-5 h-5 text-green-600 mt-0.5"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">✅ Allow Stacking</span>
                                        <p className="text-xs text-gray-500 mt-1">Can combine with other modifiers (e.g., 5% + 10% = 15%)</p>
                                    </div>
                                </label>

                                {/* Help Text */}
                                {formData.isStackable && (
                                    <div className="info-badge bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-xs text-blue-800 flex items-start gap-2">
                                            <span className="text-base">ℹ️</span>
                                            <span>Stackable modifiers can be combined. If a user qualifies for multiple stackable modifiers, all will be applied sequentially.</span>
                                        </p>
                                    </div>
                                )}

                                {!formData.isStackable && (
                                    <div className="warning-badge bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-xs text-yellow-800 flex items-start gap-2">
                                            <span className="text-base">⚠️</span>
                                            <span>Non-stackable modifiers will be applied based on priority. Only the highest priority modifier will be used.</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingModifier ? 'Update' : 'Create'} Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModifierRuleBuilder;
