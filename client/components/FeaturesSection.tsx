import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Tag } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';
import { ScrollVelocityContainer, ScrollVelocityRow } from './ui/scroll-based-velocity';

interface Feature {
    _id?: string;
    icon: string;
    iconImage?: string;
    iconShape?: 'circle' | 'square' | 'rounded';
    iconBackgroundColor?: string;
    title: string;
    description: string;
    color: string;
    displayOrder?: number;
    isVisible?: boolean;
}

// Removed hardcoded iconMap in favor of dynamic lookup

const FeaturesSection: React.FC = () => {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/features`);
            if (response.ok) {
                const data = await response.json();
                // Filter visible features and sort by display order
                const visibleFeatures = data
                    .filter((f: Feature) => f.isVisible)
                    .sort((a: Feature, b: Feature) => (a.displayOrder || 0) - (b.displayOrder || 0));
                setFeatures(visibleFeatures);
            }
        } catch (error) {
            console.error('Error fetching features:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || features.length === 0) {
        return null;
    }

    const midPoint = Math.ceil(features.length / 2);
    const secondRowFeatures = [...features.slice(midPoint), ...features.slice(0, midPoint)];

    return (
        <section className="py-12 bg-white">
            <div className="container mx-auto px-4">
                <ScrollVelocityContainer className="w-full">
                    <ScrollVelocityRow baseVelocity={1} direction={1} className="py-4">
                        {features.map((feature, index) => {
                            const IconComponent = (LucideIcons as any)[feature.icon] || Tag;
                            // Determine styles based on configuration
                            const containerClass = `w-14 h-14 flex items-center justify-center flex-shrink-0 ${feature.iconImage && feature.iconShape
                                ? feature.iconShape === 'circle' ? 'rounded-full' : feature.iconShape === 'rounded' ? 'rounded-lg' : 'rounded-none'
                                : feature.iconImage ? '' : 'rounded-full'
                                }`;

                            const containerStyle = {
                                backgroundColor: feature.iconImage
                                    ? (feature.iconShape ? feature.iconBackgroundColor : 'transparent')
                                    : `${feature.color}15`
                            };

                            return (
                                <div
                                    key={feature._id || index}
                                    className="inline-flex flex-row items-center text-left py-6 px-5 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 gap-4 w-[320px] mx-4"
                                    style={{ height: '120px' }}
                                >
                                    <div
                                        className={containerClass}
                                        style={containerStyle}
                                    >
                                        {feature.iconImage ? (
                                            <img
                                                src={feature.iconImage}
                                                alt={feature.title}
                                                className="w-7 h-7 object-contain"
                                            />
                                        ) : (
                                            <IconComponent
                                                className="w-7 h-7"
                                                style={{ color: feature.color }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-800 text-base mb-1 truncate">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 white-space-normal">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </ScrollVelocityRow>
                    <ScrollVelocityRow baseVelocity={1} direction={-1} className="py-4">
                        {secondRowFeatures.map((feature, index) => {
                            const IconComponent = (LucideIcons as any)[feature.icon] || Tag;
                            // Determine styles based on configuration
                            const containerClass = `w-14 h-14 flex items-center justify-center flex-shrink-0 ${feature.iconImage && feature.iconShape
                                ? feature.iconShape === 'circle' ? 'rounded-full' : feature.iconShape === 'rounded' ? 'rounded-lg' : 'rounded-none'
                                : feature.iconImage ? '' : 'rounded-full'
                                }`;

                            const containerStyle = {
                                backgroundColor: feature.iconImage
                                    ? (feature.iconShape ? feature.iconBackgroundColor : 'transparent')
                                    : `${feature.color}15`
                            };

                            return (
                                <div
                                    key={feature._id || index}
                                    className="inline-flex flex-row items-center text-left py-6 px-5 bg-gray-50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 gap-4 w-[320px] mx-4"
                                    style={{ height: '120px' }}
                                >
                                    <div
                                        className={containerClass}
                                        style={containerStyle}
                                    >
                                        {feature.iconImage ? (
                                            <img
                                                src={feature.iconImage}
                                                alt={feature.title}
                                                className="w-7 h-7 object-contain"
                                            />
                                        ) : (
                                            <IconComponent
                                                className="w-7 h-7"
                                                style={{ color: feature.color }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-800 text-base mb-1 truncate">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 whitespace-normal">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </ScrollVelocityRow>
                </ScrollVelocityContainer>
            </div>
        </section>
    );
};

export default FeaturesSection;
