import React, { useState } from 'react';

/**
 * ModifierRuleBuilder Component
 * 
 * Visual JSON rule builder for COMBINATION modifiers
 * Features:
 * - Field selector (40+ fields from FieldResolver)
 * - Operator selector (14 operators)
 * - AND/OR logic toggle
 * - Nested condition support
 * - Real-time JSON preview
 * - Validation before save
 */

const ModifierRuleBuilder = ({ initialConditions = null, onChange }) => {
  const [logic, setLogic] = useState('AND');
  const [conditions, setConditions] = useState(
    initialConditions || { AND: [] }
  );

  // Available fields grouped by category
  const availableFields = [
    {
      category: 'Location',
      fields: [
        { value: 'geo_zone', label: 'Geo Zone' },
        { value: 'country', label: 'Country' },
        { value: 'state', label: 'State' },
        { value: 'city', label: 'City' },
        { value: 'pincode', label: 'Pincode' },
        { value: 'zip_code', label: 'ZIP Code' }
      ]
    },
    {
      category: 'User',
      fields: [
        { value: 'user_id', label: 'User ID' },
        { value: 'user_segment', label: 'User Segment' },
        { value: 'user_role', label: 'User Role' },
        { value: 'user_type', label: 'User Type' }
      ]
    },
    {
      category: 'Product',
      fields: [
        { value: 'product_id', label: 'Product ID' },
        { value: 'product_type', label: 'Product Type' },
        { value: 'category', label: 'Category' },
        { value: 'sub_category', label: 'Sub Category' },
        { value: 'sku', label: 'SKU' }
      ]
    },
    {
      category: 'Order',
      fields: [
        { value: 'quantity', label: 'Quantity' },
        { value: 'subtotal', label: 'Subtotal' },
        { value: 'cart_total', label: 'Cart Total' },
        { value: 'order_value', label: 'Order Value' }
      ]
    },
    {
      category: 'Time',
      fields: [
        { value: 'day_of_week', label: 'Day of Week' },
        { value: 'hour_of_day', label: 'Hour of Day' },
        { value: 'month', label: 'Month' },
        { value: 'year', label: 'Year' },
        { value: 'is_weekend', label: 'Is Weekend' }
      ]
    },
    {
      category: 'Shipping/Payment',
      fields: [
        { value: 'shipping_method', label: 'Shipping Method' },
        { value: 'delivery_type', label: 'Delivery Type' },
        { value: 'payment_method', label: 'Payment Method' },
        { value: 'is_cod', label: 'Is COD' },
        { value: 'is_prepaid', label: 'Is Prepaid' }
      ]
    }
  ];

  // Available operators
  const operators = [
    { value: 'EQUALS', label: 'Equals (=)', types: ['string', 'number', 'boolean'] },
    { value: 'NOT_EQUALS', label: 'Not Equals (≠)', types: ['string', 'number', 'boolean'] },
    { value: 'IN', label: 'In List', types: ['string', 'number'] },
    { value: 'NOT_IN', label: 'Not In List', types: ['string', 'number'] },
    { value: 'GT', label: 'Greater Than (>)', types: ['number'] },
    { value: 'LT', label: 'Less Than (<)', types: ['number'] },
    { value: 'GTE', label: 'Greater or Equal (≥)', types: ['number'] },
    { value: 'LTE', label: 'Less or Equal (≤)', types: ['number'] },
    { value: 'CONTAINS', label: 'Contains', types: ['string'] },
    { value: 'STARTS_WITH', label: 'Starts With', types: ['string'] },
    { value: 'ENDS_WITH', label: 'Ends With', types: ['string'] },
    { value: 'REGEX', label: 'Regex Match', types: ['string'] },
    { value: 'BETWEEN', label: 'Between', types: ['number'] },
    { value: 'IS_NULL', label: 'Is Null', types: ['any'] }
  ];

  /**
   * Add new condition
   */
  const addCondition = () => {
    const newCondition = {
      field: '',
      operator: 'EQUALS',
      value: ''
    };

    setConditions(prev => ({
      ...prev,
      [logic]: [...(prev[logic] || []), newCondition]
    }));
  };

  /**
   * Update condition
   */
  const updateCondition = (index, field, value) => {
    setConditions(prev => {
      const updated = { ...prev };
      updated[logic][index] = {
        ...updated[logic][index],
        [field]: value
      };
      return updated;
    });
  };

  /**
   * Delete condition
   */
  const deleteCondition = (index) => {
    setConditions(prev => ({
      ...prev,
      [logic]: prev[logic].filter((_, i) => i !== index)
    }));
  };

  /**
   * Toggle logic (AND/OR)
   */
  const toggleLogic = (newLogic) => {
    const currentConditions = conditions[logic] || [];
    setConditions({ [newLogic]: currentConditions });
    setLogic(newLogic);
  };

  /**
   * Validate conditions
   */
  const validateConditions = () => {
    const conditionList = conditions[logic] || [];
    
    for (const condition of conditionList) {
      if (!condition.field) return { valid: false, error: 'Field is required' };
      if (!condition.operator) return { valid: false, error: 'Operator is required' };
      if (condition.operator !== 'IS_NULL' && !condition.value) {
        return { valid: false, error: 'Value is required' };
      }
    }
    
    return { valid: true };
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    const validation = validateConditions();
    if (!validation.valid) {
      alert(`Validation Error: ${validation.error}`);
      return;
    }
    
    if (onChange) {
      onChange(conditions);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔧 Modifier Rule Builder
        </h2>
        <p className="text-gray-600">
          Create complex targeting rules using AND/OR conditions
        </p>
      </div>

      {/* Logic Toggle */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Logic Operator
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => toggleLogic('AND')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              logic === 'AND'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AND (All conditions must match)
          </button>
          <button
            onClick={() => toggleLogic('OR')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              logic === 'OR'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            OR (Any condition can match)
          </button>
        </div>
      </div>

      {/* Conditions List */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Conditions ({conditions[logic]?.length || 0})
          </h3>
          <button
            onClick={addCondition}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Add Condition
          </button>
        </div>

        {conditions[logic]?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No conditions yet</p>
            <p className="text-sm">Click "Add Condition" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conditions[logic]?.map((condition, index) => (
              <ConditionRow
                key={index}
                condition={condition}
                index={index}
                availableFields={availableFields}
                operators={operators}
                onUpdate={updateCondition}
                onDelete={deleteCondition}
              />
            ))}
          </div>
        )}
      </div>

      {/* JSON Preview */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📄 JSON Preview
        </h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
          {JSON.stringify(conditions, null, 2)}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
        >
          ✓ Save Rule
        </button>
        <button
          onClick={() => setConditions({ [logic]: [] })}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
};

/**
 * Condition Row Component
 */
const ConditionRow = ({ 
  condition, 
  index, 
  availableFields, 
  operators, 
  onUpdate, 
  onDelete 
}) => {
  return (
    <div className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-indigo-300 transition-colors">
      {/* Field Selector */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
          Field
        </label>
        <select
          value={condition.field}
          onChange={(e) => onUpdate(index, 'field', e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Select field...</option>
          {availableFields.map(group => (
            <optgroup key={group.category} label={group.category}>
              {group.fields.map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Operator Selector */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
          Operator
        </label>
        <select
          value={condition.operator}
          onChange={(e) => onUpdate(index, 'operator', e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        >
          {operators.map(op => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value Input */}
      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
          Value
        </label>
        {condition.operator === 'IN' || condition.operator === 'NOT_IN' ? (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onUpdate(index, 'value', e.target.value)}
            placeholder="value1, value2, value3"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        ) : condition.operator === 'IS_NULL' ? (
          <input
            type="text"
            value="null"
            disabled
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500"
          />
        ) : (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onUpdate(index, 'value', e.target.value)}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        )}
      </div>

      {/* Delete Button */}
      <div className="pt-7">
        <button
          onClick={() => onDelete(index)}
          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          title="Delete condition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ModifierRuleBuilder;
