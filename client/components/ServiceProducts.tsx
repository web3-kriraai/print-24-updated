import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface ProductItem {
    name: string;
    image: string;
    link: string;
}

interface ServiceSection {
    title: string;
    subtitle: string;
    items: ProductItem[];
    color: string;
}

interface ServiceData {
    mainTitle: string;
    description: string;
    sections: ServiceSection[];
}

interface ServiceProductsProps {
    selectedService: string;
}

const ServiceProducts: React.FC<ServiceProductsProps> = ({ selectedService }) => {
    const [data, setData] = useState<ServiceData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Hardcoded fallback/templates for non-printing services (or as structure base)
    const SERVICE_DESCRIPTIONS: Record<string, { title: string, desc: string }> = {
        printing: {
            title: "PRINTING SERVICES",
            desc: "Wide range of printing services at low cost with committed turnout time. Like visiting cards, pamphlets, stationery etc."
        },
        gifting: {
            title: "GIFTING SOLUTIONS",
            desc: "Personalized corporate and personal gifts for every occasion."
        },
        design: {
            title: "CREATIVE DESIGN",
            desc: "Professional design services for your brand identity."
        }
    };

    useEffect(() => {
        const fetchAndProcessCategories = async () => {
            setLoading(true);
            try {
                // Fetch all categories
                const response = await fetch(`${API_BASE_URL_WITH_API}/categories`);
                if (!response.ok) throw new Error('Failed to fetch categories');

                const allCategories = await response.json();

                // Helper to shuffle array
                const shuffleArray = (array: any[]) => {
                    const newArray = [...array];
                    for (let i = newArray.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
                    }
                    return newArray;
                };

                // Prepare Data Structure
                const currentServiceInfo = SERVICE_DESCRIPTIONS[selectedService] || SERVICE_DESCRIPTIONS['printing'];
                let sections: ServiceSection[] = [];

                if (selectedService === 'printing') {
                    // Filter for Digital Printing categories
                    const digitalCategories = allCategories.filter((c: any) =>
                        c.type === 'Digital'
                    ).map((c: any) => ({
                        name: c.name,
                        image: c.image || '/images/products/placeholder.jpg',
                        link: `/digital-print/${c._id}` // Link to category page
                    }));

                    // Filter for Bulk Printing categories
                    const bulkCategories = allCategories.filter((c: any) =>
                        c.type === 'Bulk'
                    ).map((c: any) => ({
                        name: c.name,
                        image: c.image || '/images/products/placeholder.jpg',
                        link: `/digital-print/${c._id}` // Link to category page
                    }));

                    // Randomize and Slice
                    const randomDigital = shuffleArray(digitalCategories).slice(0, 7);
                    const randomBulk = shuffleArray(bulkCategories).slice(0, 7);

                    sections = [
                        {
                            title: "DIGITAL PRINTING",
                            subtitle: "Best For Low Quantity Printing",
                            color: "#93357c",
                            items: randomDigital
                        },
                        {
                            title: "BULK PRINTING SERVICE",
                            subtitle: "For Large Volume Printing – Offset, Screen and more",
                            color: "#93357c",
                            items: randomBulk
                        }
                    ];
                } else if (selectedService === 'gifting') {
                    // Placeholder logic: If you have a 'Gifting' type in categories, filter here.
                    sections = [
                        {
                            title: "CORPORATE GIFTS",
                            subtitle: "Premium gifts for clients and employees",
                            color: "#ed0887",
                            items: [] // Populate if data exists
                        },
                        {
                            title: "PERSONALIZED GIFTS",
                            subtitle: "Make it special with custom prints",
                            color: "#ed0887",
                            items: []
                        }
                    ];
                } else if (selectedService === 'design') {
                    sections = [
                        {
                            title: "BRAND IDENTITY",
                            subtitle: "Logos, visiting cards, and more",
                            color: "#c9d729",
                            items: []
                        }
                    ];
                }

                setData({
                    mainTitle: currentServiceInfo.title,
                    description: currentServiceInfo.desc,
                    sections: sections
                });

            } catch (error) {
                console.error("Error fetching service categories:", error);
                // Fallback to empty state
                setData({
                    mainTitle: SERVICE_DESCRIPTIONS[selectedService]?.title || "SERVICES",
                    description: "Could not load categories.",
                    sections: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessCategories();
    }, [selectedService]);

    if (loading || !data) {
        return (
            <div className="w-full bg-white py-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Main Header */}
                <div className="text-center mb-12">
                    <motion.h2
                        key={data.mainTitle}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-4xl font-bold uppercase mb-4"
                        style={{ color: data.sections[0]?.color || '#333' }}
                    >
                        {data.mainTitle}
                    </motion.h2>
                    <motion.p
                        key={data.description}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-gray-600 text-lg max-w-3xl mx-auto"
                    >
                        {data.description}
                    </motion.p>
                </div>

                {/* Sections */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedService}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {data.sections.map((section, index) => (
                            <div key={index} className="mb-16 last:mb-0">

                                {/* Section Header */}
                                <div className="mb-8">
                                    <div
                                        className="inline-block px-8 py-3 rounded-r-full text-white font-bold text-lg uppercase shadow-md mb-2"
                                        style={{ backgroundColor: section.color }}
                                    >
                                        {section.title}
                                    </div>
                                    <div className="px-8 py-2 bg-gray-200 text-gray-700 font-medium inline-block rounded-r-full text-sm">
                                        {section.subtitle}
                                    </div>
                                </div>

                                {/* Products Grid */}
                                {section.items.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 justify-items-center">
                                        {section.items.map((item, itemIndex) => (
                                            <Link to={item.link} key={itemIndex} className="group flex flex-col items-center text-center w-full">
                                                <div className="relative mb-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-4 border-white ring-1 ring-gray-100">
                                                    {/* Image Container */}
                                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                        {item.image && !item.image.includes('placeholder') ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs p-2">{item.name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-800 uppercase group-hover:text-pink-600 transition-colors">
                                                    {item.name}
                                                </h4>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 italic">
                                        No categories available in this section.
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>

            </div>
        </div>
    );
};

export default ServiceProducts;
