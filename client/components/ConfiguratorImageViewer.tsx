import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useProductConfigurator from '@/hooks/useProductConfigurator';

/**
 * ConfiguratorImageViewer
 * 
 * Displays the configurator image based on current attribute selections.
 * Features:
 * - Smooth crossfade transitions between images
 * - Loading indicator during image resolution
 * - Fallback image display
 * - Zoom on hover option
 */

interface ConfiguratorImageViewerProps {
    product: {
        _id: string;
        name: string;
        image: string;
        configuratorSettings?: {
            isConfiguratorEnabled: boolean;
            defaultConfiguratorImage?: string;
            enablePreloading?: boolean;
        };
    };
    selections: Record<string, string>;
    className?: string;
    showZoom?: boolean;
}

export default function ConfiguratorImageViewer({
    product,
    selections,
    className = '',
    showZoom = true,
}: ConfiguratorImageViewerProps) {
    const {
        configuratorImage,
        isLoading,
        isFallback,
        error,
        updateSelections,
        preloadedCount,
    } = useProductConfigurator(product);

    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

    // Update image when selections change
    useEffect(() => {
        updateSelections(selections);
    }, [selections, updateSelections]);

    // Handle mouse move for zoom effect
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!showZoom) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePosition({ x, y });
    };

    return (
        <div
            className={`relative overflow-hidden bg-gray-100 rounded-xl ${showZoom ? 'cursor-zoom-in' : ''} ${className}`}
            style={{ aspectRatio: '4/3' }}
            onMouseEnter={() => showZoom && setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Image */}
            <AnimatePresence mode="wait">
                <motion.img
                    key={configuratorImage}
                    src={configuratorImage || product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-200 ease-out"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={
                        isZoomed
                            ? {
                                transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                                transform: 'scale(1.5)',
                            }
                            : undefined
                    }
                />
            </AnimatePresence>

            {/* Fallback Indicator */}
            {isFallback && !isLoading && (
                <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Preview Image
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white px-3 py-2 rounded-lg text-xs text-center">
                    ⚠️ {error}
                </div>
            )}

            {/* Preload Counter (development only) */}
            {process.env.NODE_ENV === 'development' && preloadedCount > 0 && (
                <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-[10px]">
                    {preloadedCount} preloaded
                </div>
            )}
        </div>
    );
}

/**
 * Utility: Get selections from attribute form state
 * Converts form state to the format expected by the configurator
 */
export function extractSelectionsFromForm(
    formState: Record<string, any>,
    configuratorAttributeNames: string[]
): Record<string, string> {
    const selections: Record<string, string> = {};

    for (const attrName of configuratorAttributeNames) {
        const systemName = attrName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const value = formState[attrName] || formState[systemName];

        if (value) {
            selections[systemName] = String(value);
        }
    }

    return selections;
}
