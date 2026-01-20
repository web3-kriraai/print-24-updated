import React, { useEffect, useState, useRef } from 'react';
import './ServicesMorph.css';
import * as Icons from 'lucide-react';
import { useLogo, useScrollSettings, useFontSettings } from '../hooks/useSiteSettings';

import type { Service } from '../types/serviceTypes';

interface ServicesMorphProps {
    onServiceSelect?: (serviceId: string) => void;
    services: Service[];
    selectedServiceId?: string;
}

const ServicesMorph: React.FC<ServicesMorphProps> = ({ onServiceSelect, services, selectedServiceId }) => {
    const [hasMorphed, setHasMorphed] = useState(false);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const navLinksRef = useRef<HTMLDivElement>(null);
    const { logo } = useLogo();
    const { scrollSettings } = useScrollSettings();
    const { fontSettings } = useFontSettings();

    // Auto-scroll nav links to show selected service
    useEffect(() => {
        if (selectedServiceId && navLinksRef.current) {
            const activeButton = navLinksRef.current.querySelector(`[data-target="${selectedServiceId}"]`) as HTMLElement;
            if (activeButton) {
                // Scroll the button into view with smooth animation
                activeButton.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [selectedServiceId]);

    // Icon mapping based on service name or explicit icon field
    const getServiceIcon = (service: Service): any => {
        // Prioritize navbarIcon if valid, otherwise use icon
        let rawIconName = service.navbarIcon;
        let iconName = rawIconName?.trim();

        if (!iconName) {
            rawIconName = service.icon;
            iconName = rawIconName?.trim();
        }

        if (iconName) {
            // Dynamically get icon component from lucide-react
            const IconComponent = (Icons as any)[iconName];
            if (IconComponent) {
                return IconComponent;
            }
            console.warn(`DEBUG ServicesMorph: Icon not found for name "${iconName}" (raw: "${rawIconName}")`);
            // Fallback to Printer if icon name not found
            return Icons.Printer;
        }

        // Fallback to name-based logic for backward compatibility
        const name = service.name.toLowerCase();
        if (name.includes('gift')) return Icons.Gift;
        if (name.includes('print')) return Icons.Printer;
        if (name.includes('design')) return Icons.PenTool;
        if (name.includes('hire')) return Icons.Users;
        if (name.includes('package') || name.includes('packaging')) return Icons.Package;
        if (name.includes('magazine')) return Icons.BookOpen;
        if (name.includes('machine')) return Icons.Settings;
        if (name.includes('find')) return Icons.MapPin;
        if (name.includes('software')) return Icons.Monitor;
        if (name.includes('calc')) return Icons.Calculator;
        return Icons.Printer; // Default
    };

    // Track user interaction for page load scroll
    const userInteractedRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            userInteractedRef.current = true; // Mark as interacted on scroll

            // Only trigger morph if sticky nav is enabled
            if (!scrollSettings.stickyNavEnabled) return;

            const triggerPoint = 200; // Fixed scroll amount to trigger animation

            if (window.scrollY > triggerPoint && !hasMorphed) {
                triggerMorph();
                setHasMorphed(true);
                // Auto-scroll to banner when morph triggers (if enabled)
                if (scrollSettings.scrollToTopOnNavClick) {
                    scrollToBanner();
                }
            } else if (window.scrollY < triggerPoint && hasMorphed) {
                resetMorph();
                setHasMorphed(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasMorphed]);

    // Initial auto-scroll timer effect
    useEffect(() => {
        // Skip if page auto-scroll is disabled OR if settings haven't loaded yet
        if (scrollSettings.pageAutoScrollEnabled === false) {
            console.log('[Auto-Scroll] Disabled by user');
            return;
        }
        
        // Only proceed if explicitly enabled (true) or using default (undefined = true)
        if (scrollSettings.pageAutoScrollEnabled !== true && scrollSettings.pageAutoScrollEnabled !== undefined) {
            console.log('[Auto-Scroll] Not enabled, skipping');
            return;
        }

        console.log('[Auto-Scroll] Enabled, setting timer with delay:', scrollSettings.pageAutoScrollDelay || 2000);
        
        const timer = setTimeout(() => {
            // Only auto-scroll if user hasn't scrolled manually yet and we are at the top
            if (!userInteractedRef.current && window.scrollY < 50) {
                const scrollAmount = scrollSettings.pageAutoScrollAmount || 250;
                console.log('[Auto-Scroll] Executing scroll to:', scrollAmount);
                window.scrollTo({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
            } else {
                console.log('[Auto-Scroll] Skipped - user already interacted or page not at top');
            }
        }, scrollSettings.pageAutoScrollDelay || 2000);

        return () => clearTimeout(timer);
    }, [scrollSettings.pageAutoScrollEnabled, scrollSettings.pageAutoScrollDelay, scrollSettings.pageAutoScrollAmount]);

    const triggerMorph = () => {
        if (!stickyBarRef.current || !gridContainerRef.current) return;

        // 1. Hide the main navbar with transition
        const mainNav = document.querySelector('nav');
        if (mainNav) {
            (mainNav as HTMLElement).style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
            (mainNav as HTMLElement).style.opacity = '0';
            (mainNav as HTMLElement).style.visibility = 'hidden';
            (mainNav as HTMLElement).style.pointerEvents = 'none';
        }

        // 2. Show the nav container (so we can calculate destinations)
        stickyBarRef.current.style.visibility = 'visible';

        // 3. Loop through each card to create a clone
        const cards = gridContainerRef.current.querySelectorAll('.card');

        cards.forEach((card) => {
            const targetId = card.getAttribute('data-target');
            const targetLink = stickyBarRef.current?.querySelector(`[data-target="${targetId}"]`);

            if (targetLink) {
                // A. Get Coordinates
                const startRect = card.getBoundingClientRect();
                const endRect = targetLink.getBoundingClientRect();

                // B. Create Clone
                const clone = document.createElement('div');
                clone.classList.add('morph-clone');

                // Match style of original card (Background color)
                const computedStyle = window.getComputedStyle(card);
                clone.style.backgroundColor = computedStyle.backgroundColor;

                // Set initial position (where the card is NOW)
                clone.style.top = startRect.top + 'px';
                clone.style.left = startRect.left + 'px';
                clone.style.width = startRect.width + 'px';
                clone.style.height = startRect.height + 'px';

                document.body.appendChild(clone);

                // C. Hide Original Card
                card.classList.add('invisible');

                // D. Animate to New Position (Next Frame)
                requestAnimationFrame(() => {
                    clone.style.top = endRect.top + 'px';
                    clone.style.left = endRect.left + 'px';
                    clone.style.width = endRect.width + 'px';
                    clone.style.height = endRect.height + 'px';
                    clone.style.borderRadius = '0px'; // Square off corners for nav
                });

                // E. Cleanup after animation ends
                setTimeout(() => {
                    clone.remove(); // Remove the flying box
                }, 600); // Match CSS transition time
            }
        });

        // 4. Show the Sticky Bar Text
        stickyBarRef.current.classList.add('visible');
    };

    const resetMorph = () => {
        if (!stickyBarRef.current || !gridContainerRef.current) return;

        // Show the main navbar again
        const mainNav = document.querySelector('nav');
        if (mainNav) {
            (mainNav as HTMLElement).style.opacity = '1';
            (mainNav as HTMLElement).style.visibility = 'visible';
            (mainNav as HTMLElement).style.pointerEvents = 'auto';
        }

        // Hide sticky bar
        stickyBarRef.current.classList.remove('visible');
        stickyBarRef.current.style.visibility = 'hidden';

        // Show original cards again
        const cards = gridContainerRef.current.querySelectorAll('.card');
        cards.forEach(card => {
            card.classList.remove('invisible');
        });

        // Remove any stuck clones
        document.querySelectorAll('.morph-clone').forEach(el => el.remove());
    };

    const scrollToBanner = () => {
        // Wait for state update/DOM render
        setTimeout(() => {
            // Try both possible banner selectors
            const banner = document.querySelector('.service-banner-container') ||
                document.querySelector('.service-banner');

            if (banner) {
                const bannerRect = banner.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const bannerAbsoluteTop = bannerRect.top + scrollTop;

                // Get sticky nav height dynamically for responsive support
                const stickyNav = stickyBarRef.current;
                const stickyNavHeight = stickyNav ? stickyNav.offsetHeight : 60;

                const targetScroll = bannerAbsoluteTop - stickyNavHeight;

                window.scrollTo({
                    top: targetScroll,
                    behavior: scrollSettings.smoothScrollEnabled ? 'smooth' : 'auto'
                });
            }
        }, 100);
    };

    return (
        <div className="services-morph-container">
            {/* Sticky Sub Nav - Only render if enabled in admin settings */}
            {scrollSettings.stickyNavEnabled && (
            <div className="sticky-sub-nav" id="stickyBar" ref={stickyBarRef}>
                {/* Logo on the left */}
                <div className="sticky-nav-logo-container">
                    <img src={logo} alt="P24 Logo" className="sticky-nav-logo" />
                </div>

                {/* Service Links */}
                <div className="sticky-nav-links" ref={navLinksRef} style={{ gap: '8px', padding: '8px 12px' }}>
                    {services.map(service => {
                        const Icon = getServiceIcon(service);
                        const isActive = selectedServiceId === service._id;
                        return (
                            <a
                                key={service._id}
                                href="#"
                                className={`sub-nav-link ${isActive ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: isActive ? '#ffffff' : service.color,
                                    color: isActive ? service.color : '#ffffff',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    margin: '0 2px',
                                    boxShadow: isActive 
                                        ? `0 4px 15px ${service.color}40, inset 0 0 0 2px ${service.color}` 
                                        : `0 2px 8px ${service.color}30`,
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    fontWeight: fontSettings.navbarNameFontWeight || '600',
                                    letterSpacing: '0.3px',
                                    fontSize: fontSettings.navbarNameFontSize || '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    textWrap: 'nowrap',
                                    minWidth: '140px',
                                    maxWidth: '160px',
                                    flex: '0 0 auto'
                                }}
                                data-target={service._id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (onServiceSelect) {
                                        onServiceSelect(service._id);
                                        scrollToBanner();
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)';
                                        e.currentTarget.style.boxShadow = `0 6px 20px ${service.color}50`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = `0 2px 8px ${service.color}30`;
                                    }
                                }}
                            >
                                <Icon size={16} style={{ marginRight: '6px' }} />
                                {service.navbarName || service.name}
                            </a>
                        );
                    })}
                </div>
            </div>
            )}

            <div className="hero-wrapper">
                <h1 className="hero-title py-5">OUR SERVICES</h1>

                <div className="services-grid" id="gridContainer" ref={gridContainerRef}>
                    {services.map(service => (
                        <div
                            key={service._id}
                            className="card"
                            style={{ backgroundColor: service.color }}
                            data-target={service._id}
                            onClick={() => {
                                // Update the selected service first
                                if (onServiceSelect) {
                                    onServiceSelect(service._id);
                                    scrollToBanner();
                                }
                            }}
                        >
                            <span 
                                className="card-intro"
                                style={{
                                    fontSize: fontSettings.cardIntroFontSize,
                                    fontWeight: fontSettings.cardIntroFontWeight
                                }}
                            >
                                We Offer...
                            </span>
                            <h3 
                                className="card-title text-white"
                                style={{
                                    fontSize: fontSettings.cardTitleFontSize,
                                    fontWeight: fontSettings.cardTitleFontWeight
                                }}
                            >
                                {service.name}
                            </h3>
                            <p 
                                className="card-desc text-white/90"
                                style={{
                                    fontSize: fontSettings.cardDescFontSize,
                                    fontWeight: fontSettings.cardDescFontWeight
                                }}
                            >
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ServicesMorph;
