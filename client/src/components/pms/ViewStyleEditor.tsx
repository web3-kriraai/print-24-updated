import React from 'react';
import { ThemeOverrides } from '../../types/pms.types';

interface ViewStyleEditorProps {
    themeOverrides: ThemeOverrides;
    onChange: (overrides: ThemeOverrides) => void;
}

export const ViewStyleEditor: React.FC<ViewStyleEditorProps> = ({
    themeOverrides,
    onChange,
}) => {
    const updateColor = (key: string, value: string) => {
        onChange({
            ...themeOverrides,
            colors: {
                ...themeOverrides.colors,
                [key]: value,
            },
        });
    };

    const updateTypography = (key: string, value: string) => {
        onChange({
            ...themeOverrides,
            typography: {
                ...themeOverrides.typography,
                [key]: value,
            },
        });
    };

    const updateLayout = (key: string, value: string) => {
        onChange({
            ...themeOverrides,
            layout: {
                ...themeOverrides.layout,
                [key]: value,
            },
        });
    };

    const updateCustomCSS = (value: string) => {
        onChange({
            ...themeOverrides,
            customCSS: value,
        });
    };

    return (
        <div className="space-y-6">
            {/* Colors Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Primary Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={themeOverrides.colors?.primary || '#3B82F6'}
                                onChange={(e) => updateColor('primary', e.target.value)}
                                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={themeOverrides.colors?.primary || '#3B82F6'}
                                onChange={(e) => updateColor('primary', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#3B82F6"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Secondary Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={themeOverrides.colors?.secondary || '#10B981'}
                                onChange={(e) => updateColor('secondary', e.target.value)}
                                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={themeOverrides.colors?.secondary || '#10B981'}
                                onChange={(e) => updateColor('secondary', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#10B981"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Accent Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={themeOverrides.colors?.accent || '#F59E0B'}
                                onChange={(e) => updateColor('accent', e.target.value)}
                                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={themeOverrides.colors?.accent || '#F59E0B'}
                                onChange={(e) => updateColor('accent', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#F59E0B"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={themeOverrides.colors?.background || '#FFFFFF'}
                                onChange={(e) => updateColor('background', e.target.value)}
                                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={themeOverrides.colors?.background || '#FFFFFF'}
                                onChange={(e) => updateColor('background', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#FFFFFF"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Text Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={themeOverrides.colors?.text || '#1F2937'}
                                onChange={(e) => updateColor('text', e.target.value)}
                                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={themeOverrides.colors?.text || '#1F2937'}
                                onChange={(e) => updateColor('text', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                placeholder="#1F2937"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Typography Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Typography</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Font Family
                        </label>
                        <input
                            type="text"
                            value={themeOverrides.typography?.fontFamily || 'Inter, sans-serif'}
                            onChange={(e) => updateTypography('fontFamily', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Inter, sans-serif"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Font Size
                        </label>
                        <input
                            type="text"
                            value={themeOverrides.typography?.fontSize || '16px'}
                            onChange={(e) => updateTypography('fontSize', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="16px"
                        />
                    </div>
                </div>
            </div>

            {/* Layout Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Border Radius
                        </label>
                        <input
                            type="text"
                            value={themeOverrides.layout?.borderRadius || '8px'}
                            onChange={(e) => updateLayout('borderRadius', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="8px"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Spacing Unit
                        </label>
                        <input
                            type="text"
                            value={themeOverrides.layout?.spacing || '1rem'}
                            onChange={(e) => updateLayout('spacing', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1rem"
                        />
                    </div>
                </div>
            </div>

            {/* Custom CSS Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom CSS</h3>
                <textarea
                    value={themeOverrides.customCSS || ''}
                    onChange={(e) => updateCustomCSS(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="/* Add custom CSS here */&#10;.my-custom-class {&#10;  color: #333;&#10;}"
                />
                <p className="text-sm text-gray-500 mt-2">
                    Add custom CSS rules to override or extend the theme styles
                </p>
            </div>

            {/* Live Preview */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                <div
                    className="p-6 rounded-lg border-2 border-gray-200"
                    style={{
                        backgroundColor: themeOverrides.colors?.background || '#FFFFFF',
                        color: themeOverrides.colors?.text || '#1F2937',
                        fontFamily: themeOverrides.typography?.fontFamily || 'Inter, sans-serif',
                        fontSize: themeOverrides.typography?.fontSize || '16px',
                        borderRadius: themeOverrides.layout?.borderRadius || '8px',
                    }}
                >
                    <h4
                        className="font-bold mb-2"
                        style={{ color: themeOverrides.colors?.primary || '#3B82F6' }}
                    >
                        Preview Heading
                    </h4>
                    <p className="mb-4">
                        This is a preview of how your theme will look. The text uses the configured
                        colors and typography settings.
                    </p>
                    <div className="flex gap-2">
                        <button
                            className="px-4 py-2 rounded"
                            style={{
                                backgroundColor: themeOverrides.colors?.primary || '#3B82F6',
                                color: '#FFFFFF',
                                borderRadius: themeOverrides.layout?.borderRadius || '8px',
                            }}
                        >
                            Primary Button
                        </button>
                        <button
                            className="px-4 py-2 rounded"
                            style={{
                                backgroundColor: themeOverrides.colors?.secondary || '#10B981',
                                color: '#FFFFFF',
                                borderRadius: themeOverrides.layout?.borderRadius || '8px',
                            }}
                        >
                            Secondary Button
                        </button>
                        <button
                            className="px-4 py-2 rounded"
                            style={{
                                backgroundColor: themeOverrides.colors?.accent || '#F59E0B',
                                color: '#FFFFFF',
                                borderRadius: themeOverrides.layout?.borderRadius || '8px',
                            }}
                        >
                            Accent Button
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
