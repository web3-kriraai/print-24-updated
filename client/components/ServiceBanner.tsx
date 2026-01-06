import React from 'react';
import { Gift, Printer, Palette, Users, Package, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ServiceBanner.css';
import { Service } from '../types/serviceTypes';
import { API_BASE_URL } from '../lib/apiConfig';

interface ServiceBannerProps {
    service: Service;
}

const ServiceBanner: React.FC<ServiceBannerProps> = ({ service }) => {
    // Helper to select icon based on service name
    const getServiceIcon = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('gift')) return Gift;
        if (lowerName.includes('design')) return Palette;
        if (lowerName.includes('hire') || lowerName.includes('hiring')) return Users;
        if (lowerName.includes('pack')) return Package;
        if (lowerName.includes('print')) return Printer;
        return FileText; // Default icon
    };

    const IconComponent = getServiceIcon(service.name);

    // Generate dynamic styles based on service color
    const bannerStyle = {
        title: 'ORDER BOOK TODAY',
        subtitle: 'WIDE RANGE OF',
        highlight: `${service.name} SERVICES`.toUpperCase(),
        color: service.color || '#93357c',
        // Create a light gradient version of the color
        gradient: `linear-gradient(90deg, ${service.color}15 0%, ${service.color}05 50%, #ffffff 100%)`
    };

    // Construct image URL if it exists
    const bannerImageUrl = service.bannerImage
        ? (service.bannerImage.startsWith('http')
            ? service.bannerImage
            : `${API_BASE_URL}${service.bannerImage.startsWith('/') ? '' : '/'}${service.bannerImage}`)
        : null;

    if (bannerImageUrl) {
        console.log('Rendering Service Banner Image:', bannerImageUrl);
        return (
            <div className="service-banner-container relative w-full h-[350px] overflow-hidden">
                <motion.img
                    src={bannerImageUrl}
                    alt={`${service.name} Banner`}
                    className="w-full h-full object-fill"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
            </div>
        );
    }

    return (
        <div className="service-banner-container">
            <motion.div
                className="service-banner"
                style={{ background: bannerStyle.gradient }}
                animate={{ background: bannerStyle.gradient }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
            >
                {/* Decorative Background Dots */}
                <div className="banner-dots">
                    <motion.span
                        className="dot"
                        style={{ top: '15%', left: '8%', backgroundColor: service.color }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* ... (Keeping other dots with dynamic or variety colors? Let's just use service color and variants or hardcoded palette matching service color)
                         Actually, let's keep the colorful dots but maybe tint them?
                         Or just keep existing colorful dots for vibrancy.
                      */}
                    <motion.span
                        className="dot dot-orange"
                        style={{ top: '25%', left: '25%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    />
                    <motion.span
                        className="dot dot-yellow"
                        style={{ top: '10%', left: '40%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    />
                    <motion.span
                        className="dot dot-teal"
                        style={{ top: '30%', right: '35%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    />
                    <motion.span
                        className="dot"
                        style={{ top: '15%', right: '15%', backgroundColor: service.color }} // Dynamic
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                    />
                    <motion.span
                        className="dot dot-white"
                        style={{ top: '35%', left: '15%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}
                    />
                    <motion.span
                        className="dot"
                        style={{ bottom: '20%', left: '30%', backgroundColor: service.color }} // Dynamic
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                    />
                    <motion.span
                        className="dot dot-teal"
                        style={{ bottom: '25%', right: '25%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
                    />
                </div>

                {/* Left Side - Icon Graphics */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={service._id}
                        className="banner-left"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div className="icon-cluster">
                            <motion.div
                                className="cluster-icon"
                                style={{ backgroundColor: bannerStyle.color }}
                                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <IconComponent size={40} color="white" />
                            </motion.div>
                            <motion.div
                                className="cluster-icon secondary"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            >
                                <Printer size={24} color="#333" />
                            </motion.div>
                            <motion.div
                                className="cluster-icon secondary"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            >
                                <Palette size={24} color="#333" />
                            </motion.div>
                            <motion.div
                                className="cluster-icon secondary"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                            >
                                <Package size={24} color="#333" />
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Center-Right - Text Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={service._id + '-content'}
                        className="banner-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <motion.p
                            className="banner-subtitle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {bannerStyle.title}
                        </motion.p>
                        <motion.p
                            className="text-sm font-medium text-gray-600 mb-4 max-w-lg mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            {service.description}
                        </motion.p>
                        <motion.h2
                            className="banner-title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {bannerStyle.subtitle}<br />
                            <motion.span
                                className="banner-highlight"
                                style={{ color: bannerStyle.color }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                            >
                                {bannerStyle.highlight}
                            </motion.span>
                        </motion.h2>
                    </motion.div>
                </AnimatePresence>

                {/* Top-Right - Decorative Stripes */}
                <div className="banner-stripes">
                    <motion.div
                        className="stripe stripe-1"
                        style={{ backgroundColor: bannerStyle.color }}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    />
                    <motion.div
                        className="stripe stripe-2"
                        style={{ backgroundColor: '#0ab2b5' }} // Maybe keep or make dynamic
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    />
                    <motion.div
                        className="stripe stripe-3"
                        style={{ backgroundColor: '#f79a1c' }}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    />
                    <motion.div
                        className="stripe stripe-4"
                        style={{ backgroundColor: '#c9d729' }}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default ServiceBanner;
