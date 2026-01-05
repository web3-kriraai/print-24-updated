import React from 'react';
import { Gift, Printer, Palette, Users, Package, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ServiceBanner.css';

interface ServiceBannerProps {
    selectedService: string;
}

const ServiceBanner: React.FC<ServiceBannerProps> = ({ selectedService }) => {
    const bannerContent: Record<string, {
        title: string;
        subtitle: string;
        highlight: string;
        color: string;
        gradient: string;
        icon: React.ElementType;
    }> = {
        gifting: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'GIFTING SERVICES',
            color: '#ed0887',
            gradient: 'linear-gradient(90deg, #fce4ec 0%, #f8bbd0 50%, #ffffff 100%)',
            icon: Gift
        },
        printing: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'PRINTING SERVICES',
            color: '#93357c',
            gradient: 'linear-gradient(90deg, #f3e5f5 0%, #e1bee7 50%, #ffffff 100%)',
            icon: Printer
        },
        design: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'CREATIVE DESIGN SERVICES',
            color: '#c9d729',
            gradient: 'linear-gradient(90deg, #f9fbe7 0%, #f0f4c3 50%, #ffffff 100%)',
            icon: Palette
        },
        hire: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'HIRING SERVICES',
            color: '#f79a1c',
            gradient: 'linear-gradient(90deg, #fff3e0 0%, #ffe0b2 50%, #ffffff 100%)',
            icon: Users
        },
        packaging: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'PACKAGING SERVICES',
            color: '#0ab2b5',
            gradient: 'linear-gradient(90deg, #e0f7fa 0%, #b2ebf2 50%, #ffffff 100%)',
            icon: Package
        },
        print: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlight: 'PRINT SERVICES',
            color: '#e63737',
            gradient: 'linear-gradient(90deg, #ffebee 0%, #ffcdd2 50%, #ffffff 100%)',
            icon: FileText
        }
    };

    const content = bannerContent[selectedService] || bannerContent.printing;
    const IconComponent = content.icon;

    return (
        <div className="service-banner-container">
            <motion.div
                className="service-banner"
                style={{ background: content.gradient }}
                animate={{ background: content.gradient }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
            >
                {/* Decorative Background Dots */}
                <div className="banner-dots">
                    <motion.span
                        className="dot dot-pink"
                        style={{ top: '15%', left: '8%' }}
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
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
                        className="dot dot-lime"
                        style={{ top: '15%', right: '15%' }}
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
                        className="dot dot-pink"
                        style={{ bottom: '20%', left: '30%' }}
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
                        key={selectedService}
                        className="banner-left"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div className="icon-cluster">
                            <motion.div
                                className="cluster-icon"
                                style={{ backgroundColor: content.color }}
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
                        key={selectedService + '-content'}
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
                            {content.title}
                        </motion.p>
                        <motion.h2
                            className="banner-title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {content.subtitle}<br />
                            <motion.span
                                className="banner-highlight"
                                style={{ color: content.color }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                            >
                                {content.highlight}
                            </motion.span>
                        </motion.h2>
                    </motion.div>
                </AnimatePresence>

                {/* Top-Right - Decorative Stripes */}
                <div className="banner-stripes">
                    <motion.div
                        className="stripe stripe-1"
                        style={{ backgroundColor: '#ed0887' }}
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    />
                    <motion.div
                        className="stripe stripe-2"
                        style={{ backgroundColor: '#0ab2b5' }}
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
