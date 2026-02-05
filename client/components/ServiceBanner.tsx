import React from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ServiceBanner.css';
import { Service } from '../types/serviceTypes';
import { API_BASE_URL } from '../lib/apiConfig';
import ServiceBannerCarousel from './ServiceBannerCarousel';

interface ServiceBannerProps {
    service: Service;
}

const ServiceBanner: React.FC<ServiceBannerProps> = ({ service }) => {
    // Helper to select icon based on service icon field or name
    const getServiceIcon = (service: Service) => {
        const rawIconName = service.bannerConfig?.mainIcon || service.icon;
        const iconName = rawIconName?.trim();

        if (iconName) {
            // Dynamically get icon component from lucide-react
            const IconComponent = (Icons as any)[iconName];
            if (IconComponent) {
                return IconComponent;
            }
            // Fallback to Printer if icon not found
            return Icons.Printer;
        }

        // Fallback to name-based logic
        const lowerName = service.name.toLowerCase();
        if (lowerName.includes('gift')) return Icons.Gift;
        if (lowerName.includes('design')) return Icons.Palette;
        if (lowerName.includes('hire') || lowerName.includes('hiring')) return Icons.Users;
        if (lowerName.includes('pack')) return Icons.Package;
        if (lowerName.includes('print')) return Icons.Printer;
        return Icons.FileText; // Default icon
    };

    const IconComponent = getServiceIcon(service);

    // Get banner configuration with defaults
    const bannerConfig = service.bannerConfig || {
        title: 'ORDER BOOK TODAY',
        subtitle: 'WIDE RANGE OF',
        highlightText: '',
        textSection1: '',
        textSection2: '',
        textSection3: '',
        textSection4: '',
        primaryColor: '',
        secondaryColor: '#0ab2b5',
        accentColor: '#f79a1c',
        showIcons: true,
        iconPositions: [],
        mainIcon: '',
        secondaryIcons: [],
        decorativeElements: [],
        colorPalette: [],
    };

    // Generate dynamic styles based on service color and banner config
    const bannerStyle = {
        title: bannerConfig.title,
        subtitle: bannerConfig.subtitle,
        highlight: (bannerConfig.highlightText || `${service.name} SERVICES`).toUpperCase(),
        color: bannerConfig.primaryColor || service.color || '#93357c',
        secondaryColor: bannerConfig.secondaryColor,
        accentColor: bannerConfig.accentColor,
        // Create a light gradient version of the color
        gradient: `linear-gradient(90deg, ${bannerConfig.primaryColor || service.color}15 0%, ${bannerConfig.primaryColor || service.color}05 50%, #ffffff 100%)`
    };

    // Check if we have multiple banners
    const hasMultipleBanners = service.banners && service.banners.length > 0;

    // Construct single banner image URL if it exists (for backwards compatibility)
    const singleBannerImageUrl = service.bannerImage
        ? (service.bannerImage.startsWith('http')
            ? service.bannerImage
            : `${API_BASE_URL}${service.bannerImage.startsWith('/') ? '' : '/'}${service.bannerImage}`)
        : null;

    // PRIORITY LOGIC:
    // 1. If multiple banners exist, use the carousel
    // 2. Otherwise, if single bannerImage exists, use that
    // 3. Otherwise, render the default banner design

    if (hasMultipleBanners) {
        console.log('Rendering Service Banner Carousel with', service.banners.length, 'banners');
        // Render carousel WITH text and graphics overlay
        // Images as background, text/icons on top
    }

    // For both carousel and single banner - show overlay with text if not using default
    if (hasMultipleBanners || singleBannerImageUrl) {
        const backgroundImage = hasMultipleBanners ? null : singleBannerImageUrl;
        console.log(hasMultipleBanners ? 'Rendering carousel with overlay' : 'Rendering single banner with overlay');

        return (
            <div className="service-banner-container relative w-full h-[350px] overflow-hidden">
                {/* Background: Carousel or Static Image */}
                {hasMultipleBanners ? (
                    <div className="absolute inset-0 z-0">
                        <ServiceBannerCarousel
                            banners={service.banners}
                            autoSlideDuration={service.autoSlideDuration || 5000}
                            fallbackImage={singleBannerImageUrl || undefined}
                            className="w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0">
                        <motion.img
                            src={backgroundImage!}
                            alt={`${service.name} Banner`}
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6 }}
                        />
                    </div>
                )}

                {/* Overlay: Gradient for text readability - Only show if enableOverlap is true */}
                {bannerConfig.enableOverlap && (
                    <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/40 via-black/20 to-transparent"></div>
                )}


                {/* Overlay: Banner Content (Text, Icons, Graphics) */}
                <div className="absolute inset-0 z-20">
                    <motion.div
                        className="service-banner h-full relative"
                        style={{ background: 'transparent' }}
                    >
                        {/* Left Side - Icon Graphics - Only show if enableOverlap is true */}
                        {bannerConfig.enableOverlap && (
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
                                        {/* Secondary Icons */}
                                        {bannerConfig.secondaryIcons && bannerConfig.secondaryIcons.length > 0 ? (
                                            bannerConfig.secondaryIcons.map((secIcon, idx) => {
                                                const SecIconComponent = (Icons as any)[secIcon.icon] || Icons.Printer;
                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        className="cluster-icon secondary"
                                                        animate={{ y: [0, -5, 0] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 + (idx * 0.2) }}
                                                    >
                                                        <SecIconComponent size={secIcon.size || 24} color="#333" />
                                                    </motion.div>
                                                );
                                            })
                                        ) : (
                                            <>
                                                <motion.div
                                                    className="cluster-icon secondary"
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                                >
                                                    <Icons.Printer size={24} color="#333" />
                                                </motion.div>
                                                <motion.div
                                                    className="cluster-icon secondary"
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                                >
                                                    <Icons.Palette size={24} color="#333" />
                                                </motion.div>
                                                <motion.div
                                                    className="cluster-icon secondary"
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                                                >
                                                    <Icons.Package size={24} color="#333" />
                                                </motion.div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}


                        {/* Center-Right - Text Content - Only show if enableOverlap is true */}
                        {bannerConfig.enableOverlap && (
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
                                        className="banner-subtitle text-white drop-shadow-lg"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        {bannerConfig.textSection1 || bannerConfig.title || 'ORDER BOOK TODAY'}
                                    </motion.p>

                                    <motion.p
                                        className="text-sm font-medium text-white/90 mb-4 max-w-lg mx-auto drop-shadow-md"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {bannerConfig.textSection2 || service.serviceDescription || service.description}
                                    </motion.p>

                                    <motion.h2
                                        className="banner-title text-white drop-shadow-xl"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        {bannerConfig.textSection3 || bannerConfig.subtitle || 'WIDE RANGE OF'}<br />

                                        <motion.span
                                            className="banner-highlight drop-shadow-lg"
                                            style={{ color: bannerStyle.color, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                        >
                                            {bannerConfig.textSection4 || bannerConfig.highlightText || service.serviceHeading || `${service.name} SERVICES`}
                                        </motion.span>
                                    </motion.h2>
                                </motion.div>
                            </AnimatePresence>
                        )}


                        {/* Top-Right - Decorative Stripes - Only show if enableOverlap is true */}
                        {bannerConfig.enableOverlap && bannerConfig.showIcons && (
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
                                    style={{ backgroundColor: bannerStyle.secondaryColor }}
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 0.9 }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                />
                                <motion.div
                                    className="stripe stripe-3"
                                    style={{ backgroundColor: bannerStyle.accentColor }}
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 0.9 }}
                                    transition={{ duration: 0.6, delay: 0.3 }}
                                />
                                <motion.div
                                    className="stripe stripe-4"
                                    style={{ backgroundColor: bannerConfig.colorPalette?.[0]?.color || '#c9d729' }}
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 0.9 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                />
                            </div>
                        )}
                    </motion.div>
                </div>
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
                {/* Decorative Background Elements - Dynamic */}
                {bannerConfig.showIcons && bannerConfig.decorativeElements && bannerConfig.decorativeElements.length > 0 ? (
                    <div className="banner-dots">
                        {bannerConfig.decorativeElements.map((element, index) => {
                            const shapeStyles: React.CSSProperties = {
                                position: 'absolute',
                                top: element.top,
                                bottom: element.bottom,
                                left: element.left,
                                right: element.right,
                                width: `${element.size}px`,
                                height: `${element.size}px`,
                                backgroundColor: element.color,
                            };

                            // Different shapes
                            if (element.shape === 'circle') {
                                shapeStyles.borderRadius = '50%';
                            } else if (element.shape === 'square') {
                                shapeStyles.borderRadius = '0';
                            } else if (element.shape === 'triangle') {
                                // Triangle using border trick
                                return (
                                    <motion.div
                                        key={index}
                                        style={{
                                            position: 'absolute',
                                            top: element.top,
                                            bottom: element.bottom,
                                            left: element.left,
                                            right: element.right,
                                            width: 0,
                                            height: 0,
                                            borderLeft: `${element.size / 2}px solid transparent`,
                                            borderRight: `${element.size / 2}px solid transparent`,
                                            borderBottom: `${element.size}px solid ${element.color}`,
                                        }}
                                        animate={
                                            element.animation === 'float' ? { y: [0, -10, 0] } :
                                                element.animation === 'pulse' ? { scale: [1, 1.1, 1] } :
                                                    element.animation === 'spin' ? { rotate: [0, 360] } : {}
                                        }
                                        transition={{
                                            duration: element.animation === 'spin' ? 8 : 3,
                                            repeat: element.animation !== 'none' ? Infinity : 0,
                                            ease: "easeInOut",
                                            delay: index * 0.2
                                        }}
                                    />
                                );
                            } else if (element.shape === 'star') {
                                // Star shape using clip-path
                                shapeStyles.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                            } else if (element.shape === 'hexagon') {
                                shapeStyles.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                            }

                            return (
                                <motion.span
                                    key={index}
                                    className="dot"
                                    style={shapeStyles}
                                    animate={
                                        element.animation === 'float' ? { y: [0, -10, 0] } :
                                            element.animation === 'pulse' ? { scale: [1, 1.1, 1] } :
                                                element.animation === 'spin' ? { rotate: [0, 360] } : {}
                                    }
                                    transition={{
                                        duration: element.animation === 'spin' ? 8 : 3,
                                        repeat: element.animation !== 'none' ? Infinity : 0,
                                        ease: "easeInOut",
                                        delay: index * 0.2
                                    }}
                                />
                            );
                        })}
                    </div>
                ) : bannerConfig.showIcons ? (
                    // Fallback to default dots if no decorative elements configured, using defaultShape
                    <div className="banner-dots">
                        {[
                            { top: '15%', left: '8%', color: bannerStyle.color, delay: 0 },
                            { top: '25%', left: '25%', color: bannerStyle.accentColor, delay: 0.2 },
                            { top: '10%', left: '40%', color: bannerStyle.secondaryColor, delay: 0.4 },
                            { top: '30%', right: '35%', color: bannerStyle.secondaryColor, delay: 0.6 },
                            { top: '15%', right: '15%', color: bannerStyle.color, delay: 0.8 },
                            { top: '35%', left: '15%', color: 'white', className: 'dot-white', delay: 1.0 },
                            { bottom: '20%', left: '30%', color: bannerStyle.color, delay: 1.2 },
                            { bottom: '25%', right: '25%', color: bannerStyle.secondaryColor, delay: 1.4 }
                        ].map((dot, index) => {
                            const shape = bannerConfig.defaultShape || 'circle';
                            const isRandom = shape === 'random';
                            const currentShape = isRandom
                                ? ['circle', 'square', 'triangle', 'star', 'hexagon'][Math.floor(Math.random() * 5)]
                                : shape;

                            const size = bannerConfig.defaultShapeSize || 12;
                            const commonStyle: React.CSSProperties = {
                                position: 'absolute',
                                top: dot.top,
                                bottom: dot.bottom,
                                left: dot.left,
                                right: dot.right,
                                width: `${size}px`,
                                height: `${size}px`,
                                backgroundColor: dot.color === 'white' ? 'rgba(255,255,255,0.2)' : dot.color,
                            };

                            if (currentShape === 'circle') {
                                commonStyle.borderRadius = '50%';
                            } else if (currentShape === 'square') {
                                commonStyle.borderRadius = '0';
                            } else if (currentShape === 'triangle') {
                                return (
                                    <motion.div
                                        key={index}
                                        style={{
                                            position: 'absolute',
                                            top: dot.top,
                                            bottom: dot.bottom,
                                            left: dot.left,
                                            right: dot.right,
                                            width: 0,
                                            height: 0,
                                            borderLeft: `${size / 2}px solid transparent`,
                                            borderRight: `${size / 2}px solid transparent`,
                                            borderBottom: `${size}px solid ${dot.color === 'white' ? 'rgba(255,255,255,0.2)' : dot.color}`,
                                        }}
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: dot.delay }}
                                    />
                                );
                            } else if (currentShape === 'star') {
                                commonStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                            } else if (currentShape === 'hexagon') {
                                commonStyle.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                            }

                            return (
                                <motion.span
                                    key={index}
                                    className={`dot ${dot.className || ''}`}
                                    style={commonStyle}
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: dot.delay }}
                                />
                            );
                        })}
                    </div>
                ) : null}

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
                            {/* Secondary Icons from Config */}
                            {bannerConfig.secondaryIcons && bannerConfig.secondaryIcons.length > 0 ? (
                                bannerConfig.secondaryIcons.map((secIcon, idx) => {
                                    const SecIconComponent = (Icons as any)[secIcon.icon] || Icons.Printer;
                                    return (
                                        <motion.div
                                            key={idx}
                                            className="cluster-icon secondary"
                                            animate={{ y: [0, -5, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 + (idx * 0.2) }}
                                        >
                                            <SecIconComponent size={secIcon.size || 24} color="#333" />
                                        </motion.div>
                                    );
                                })
                            ) : (
                                /* Fallback if no secondary icons configured */
                                <>
                                    <motion.div
                                        className="cluster-icon secondary"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                    >
                                        <Icons.Printer size={24} color="#333" />
                                    </motion.div>
                                    <motion.div
                                        className="cluster-icon secondary"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                    >
                                        <Icons.Palette size={24} color="#333" />
                                    </motion.div>
                                    <motion.div
                                        className="cluster-icon secondary"
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                                    >
                                        <Icons.Package size={24} color="#333" />
                                    </motion.div>
                                </>
                            )}
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
                        {/* Text Section 1 - Top subtitle */}
                        <motion.p
                            className="banner-subtitle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {bannerConfig.textSection1 || bannerConfig.title || 'ORDER BOOK TODAY'}
                        </motion.p>

                        {/* Text Section 2 - Service description */}
                        <motion.p
                            className="text-sm font-medium text-gray-600 mb-4 max-w-lg mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            {bannerConfig.textSection2 || service.serviceDescription || service.description}
                        </motion.p>

                        {/* Text Section 3 - Main heading */}
                        <motion.h2
                            className="banner-title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {bannerConfig.textSection3 || bannerConfig.subtitle || 'WIDE RANGE OF'}<br />

                            {/* Text Section 4 - Highlighted service name */}
                            <motion.span
                                className="banner-highlight"
                                style={{ color: bannerStyle.color }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                            >
                                {bannerConfig.textSection4 || bannerConfig.highlightText || service.serviceHeading || `${service.name} SERVICES`}
                            </motion.span>
                        </motion.h2>
                    </motion.div>
                </AnimatePresence>

                {/* Top-Right - Decorative Stripes */}
                {bannerConfig.showIcons && (
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
                            style={{ backgroundColor: bannerStyle.secondaryColor }}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 0.9 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        />
                        <motion.div
                            className="stripe stripe-3"
                            style={{ backgroundColor: bannerStyle.accentColor }}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 0.9 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        />
                        <motion.div
                            className="stripe stripe-4"
                            style={{ backgroundColor: bannerConfig.colorPalette?.[0]?.color || '#c9d729' }}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 0.9 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        />
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ServiceBanner;
