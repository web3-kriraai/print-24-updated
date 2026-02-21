import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface FormFieldSchema {
    fieldId: string;
    label: string;
    fieldType: 'text' | 'number' | 'checkbox' | 'select' | 'textarea';
    placeholder?: string;
    helpText?: string;
    defaultValue?: any;
    options?: Array<{ label: string; value: string }>;
    validation?: {
        required?: boolean;
        min?: number;
        max?: number;
    };
}

interface FeatureConfigFormProps {
    schema: {
        fields: FormFieldSchema[];
    };
    currentConfig: any;
    onChange: (newConfig: any) => void;
}

const FeatureConfigForm: React.FC<FeatureConfigFormProps> = ({ schema, currentConfig, onChange }) => {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (!schema || !schema.fields) return;
        // Merge currentConfig with default values from schema
        const initialData = { ...currentConfig };
        schema.fields.forEach(field => {
            if (initialData[field.fieldId] === undefined && field.defaultValue !== undefined) {
                initialData[field.fieldId] = field.defaultValue;
            }
        });
        setFormData(initialData);
    }, [schema, currentConfig]);

    const handleChange = (fieldId: string, value: any) => {
        const updatedData = { ...formData, [fieldId]: value };
        setFormData(updatedData);
        onChange(updatedData);
    };
    if (!schema || !schema.fields) {
        return (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-sm text-amber-900">
                <Info className="flex-shrink-0 text-amber-600" size={18} />
                <p>This feature does not have a defined configuration schema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {schema.fields.map((field) => (
                <div key={field.fieldId} className="flex flex-col">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        {field.label}
                        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.fieldType === 'checkbox' ? (
                        <label className={`flex items-start p-4 border rounded-xl transition-all cursor-pointer ${formData[field.fieldId] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                            }`}>
                            <input
                                type="checkbox"
                                checked={!!formData[field.fieldId]}
                                onChange={(e) => handleChange(field.fieldId, e.target.checked)}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500 mt-0.5 border-gray-300 rounded"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-semibold text-gray-700">
                                    {formData[field.fieldId] ? 'Enabled' : 'Disabled'}
                                </span>
                                {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
                            </div>
                        </label>
                    ) : field.fieldType === 'select' ? (
                        <select
                            value={formData[field.fieldId] || ''}
                            onChange={(e) => handleChange(field.fieldId, e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="">Select option...</option>
                            {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    ) : field.fieldType === 'textarea' ? (
                        <textarea
                            value={formData[field.fieldId] || ''}
                            onChange={(e) => handleChange(field.fieldId, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    ) : (
                        <input
                            type={field.fieldType}
                            value={formData[field.fieldId] || ''}
                            onChange={(e) => handleChange(field.fieldId, field.fieldType === 'number' ? Number(e.target.value) : e.target.value)}
                            placeholder={field.placeholder}
                            min={field.validation?.min}
                            max={field.validation?.max}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    )}

                    {field.fieldType !== 'checkbox' && field.helpText && (
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                            <Info size={12} />
                            {field.helpText}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default FeatureConfigForm;
