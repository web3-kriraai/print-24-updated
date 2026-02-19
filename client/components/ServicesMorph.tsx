import React, { useEffect, useState, useRef } from 'react';
import './ServicesMorph.css';
import * as Icons from 'lucide-react';
import { useLogo, useScrollSettings, useFontSettings, useNavbarSettings } from '../hooks/useSiteSettings';

import type { Service } from '../types/serviceTypes';

interface ServicesMorphProps {
    onServiceSelect?: (serviceId: string) => void;
    services: Service[];
    selectedServiceId?: string;
}

const ServicesMorph: React.FC<ServicesMorphProps> = ({ onServiceSelect, services, selectedServiceId }) => {
    const [hasMorphed, setHasMorphed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const navLinksRef = useRef<HTMLDivElement>(null);
    const { logo } = useLogo();
    const { scrollSettings } = useScrollSettings();
    const { fontSettings } = useFontSettings();
    const { navbarSettings } = useNavbarSettings();

    // Delayed visibility animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500); // 0.5 second delay

        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll nav links to show selected service
    useEffect(() => {
        if (selectedServiceId && navLinksRef.current) {
            const activeButton = navLinksRef.current.querySelector(`[data-target="${selectedServiceId}"]`) as HTMLElement;
            if (activeButton) {
                // Scroll the button into view with instant animation
                activeButton.scrollIntoView({
                    behavior: 'auto',
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

    // Track user interaction, scroll direction, and animation state
    const userInteractedRef = useRef(false);
    const lastScrollTopRef = useRef(0);
    const isAnimatingRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const direction = currentScrollY < lastScrollTopRef.current ? 'up' : 'down';
            lastScrollTopRef.current = currentScrollY;

            userInteractedRef.current = true; // Mark as interacted on scroll

            // Only trigger morph if sticky nav is enabled and not already animating
            if (!scrollSettings.stickyNavEnabled || isAnimatingRef.current) return;

            // Trigger points for morph animation
            const morphThreshold = 300; // Base threshold
            const shortScrollResetThreshold = 450; // Higher threshold for "short scroll up" sensitivity

            if (currentScrollY > morphThreshold && !hasMorphed && direction === 'down') {
                isAnimatingRef.current = true;
                triggerMorph();
                setHasMorphed(true);
                setIsVisible(false);
                if (scrollSettings.scrollToTopOnNavClick) {
                    jumpToBanner();
                }
                // Lock for slightly longer than CSS transition (1s)
                setTimeout(() => { isAnimatingRef.current = false; }, 800);
            }
            else if (hasMorphed && (currentScrollY < morphThreshold - 50 || (direction === 'up' && currentScrollY < shortScrollResetThreshold))) {
                isAnimatingRef.current = true;
                // Important: Reset morph logic handles its own visibility/transition flow
                resetMorph();
                setHasMorphed(false);
                // setIsVisible(true); // Moved inside resetMorph for better sync

                // Auto-scroll to top on reverse morph if moving up
                if (direction === 'up' || currentScrollY < 100) {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }

                // Lock for slightly longer than reverse CSS transition
                setTimeout(() => { isAnimatingRef.current = false; }, 800);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hasMorphed]);

    // Cleanup effect to ensure navbar is restored when component unmounts
    useEffect(() => {
        return () => {
            // Restore navbar visibility when leaving the page (unmounting)
            const mainNav = document.querySelector('nav');
            if (mainNav) {
                (mainNav as HTMLElement).style.opacity = '1';
                (mainNav as HTMLElement).style.visibility = 'visible';
                (mainNav as HTMLElement).style.pointerEvents = 'auto';
                // Also reset transition to avoid potentially unwanted effects on re-entry
                setTimeout(() => {
                    if (mainNav) (mainNav as HTMLElement).style.transition = '';
                }, 300);
            }
        };
    }, []);

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
            // Check session storage to see if we're already scrolling to a banner
            const hasSelectedService = !!sessionStorage.getItem("selectedServiceId");

            // Only auto-scroll if user hasn't scrolled manually yet, we are at top, and NO service is pre-selected
            if (!userInteractedRef.current && window.scrollY < 50 && !hasSelectedService) {
                const scrollAmount = scrollSettings.pageAutoScrollAmount || 250;
                console.log('[Auto-Scroll] Executing scroll to:', scrollAmount);
                window.scrollTo({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
            } else {
                console.log('[Auto-Scroll] Skipped - user already interacted, page not at top, or service selected');
            }
        }, scrollSettings.pageAutoScrollDelay || 2000);

        return () => clearTimeout(timer);
    }, [scrollSettings.pageAutoScrollEnabled, scrollSettings.pageAutoScrollDelay, scrollSettings.pageAutoScrollAmount]);

    const triggerMorph = () => {
        if (!stickyBarRef.current || !gridContainerRef.current) return;

        // 0. Cleanup
        document.querySelectorAll('.morph-clone').forEach(el => el.remove());

        const mainNav = document.querySelectorAll('nav');
        mainNav.forEach(nav => {
            (nav as HTMLElement).style.transition = 'opacity 0.4s ease';
            (nav as HTMLElement).style.opacity = '0';
            (nav as HTMLElement).style.visibility = 'hidden';
            (nav as HTMLElement).style.pointerEvents = 'none';
        });

        // 2. Prepare grid for capture
        const stickyBar = stickyBarRef.current;
        const gridContainer = gridContainerRef.current;
        stickyBar.style.visibility = 'visible';

        // 3. Morph Cards -> Nav Links
        const cards = gridContainer.querySelectorAll('.card');
        cards.forEach((card) => {
            const targetId = card.getAttribute('data-target');
            const targetLink = stickyBar.querySelector(`[data-target="${targetId}"]`) as HTMLElement;

            if (targetLink) {
                const startRect = card.getBoundingClientRect();
                const endRect = targetLink.getBoundingClientRect();

                const clone = document.createElement('div');
                clone.classList.add('morph-clone');

                const startStyle = window.getComputedStyle(card);
                const endStyle = window.getComputedStyle(targetLink);

                clone.style.backgroundColor = startStyle.backgroundColor;
                clone.style.top = startRect.top + 'px';
                clone.style.left = startRect.left + 'px';
                clone.style.width = startRect.width + 'px';
                clone.style.height = startRect.height + 'px';
                clone.style.borderRadius = '10px';

                document.body.appendChild(clone);

                card.classList.add('invisible');

                requestAnimationFrame(() => {
                    clone.style.top = endRect.top + 'px';
                    clone.style.left = endRect.left + 'px';
                    clone.style.width = endRect.width + 'px';
                    clone.style.height = endRect.height + 'px';
                    clone.style.borderRadius = '8px';
                    clone.style.backgroundColor = endStyle.backgroundColor;
                });

                setTimeout(() => {
                    if (clone.parentNode) clone.remove();
                }, 700);
            }
        });

        stickyBar.classList.add('visible');
    };

    const resetMorph = () => {
        if (!stickyBarRef.current || !gridContainerRef.current) return;

        // 0. Cleanup any lingering clones
        document.querySelectorAll('.morph-clone').forEach(el => el.remove());

        // 1. Show main nav with transition
        const mainNav = document.querySelectorAll('nav');
        mainNav.forEach(nav => {
            (nav as HTMLElement).style.transition = 'opacity 0.6s ease, visibility 0.6s ease';
            (nav as HTMLElement).style.opacity = '1';
            (nav as HTMLElement).style.visibility = 'visible';
            (nav as HTMLElement).style.pointerEvents = 'auto';
        });

        const stickyBar = stickyBarRef.current;
        const gridContainer = gridContainerRef.current;

        // 2. Coordinate Stability: Strip transforms to get final rest positions 
        // We do this while the grid is STILL invisible to avoid the blink
        const originalTransition = gridContainer.style.transition;
        const originalTransform = gridContainer.style.transform;

        // Temporarily hide grid completely if it wasn't already
        gridContainer.style.transition = 'none';
        gridContainer.style.transform = 'translateY(0)';
        void gridContainer.offsetHeight; // Force reflow

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // 3. Morph Nav Links -> Cards
        const cards = gridContainer.querySelectorAll('.card');

        // Sync the grid visibility with the start of the morph animation
        // This prevents the "blink" by ensuring the container is ready 
        // but its children (the actual cards) are invisible and handled by clones
        setIsVisible(true);

        cards.forEach((card) => {
            const targetId = card.getAttribute('data-target');
            const navLink = stickyBar.querySelector(`[data-target="${targetId}"]`) as HTMLElement;

            if (navLink) {
                const startRect = navLink.getBoundingClientRect();
                const endRect = card.getBoundingClientRect();

                const clone = document.createElement('div');
                clone.classList.add('morph-clone', 'absolute');

                const startStyle = window.getComputedStyle(navLink);
                const endStyle = window.getComputedStyle(card);

                clone.style.backgroundColor = startStyle.backgroundColor;
                clone.style.top = (startRect.top + scrollTop) + 'px';
                clone.style.left = (startRect.left + scrollLeft) + 'px';
                clone.style.width = startRect.width + 'px';
                clone.style.height = startRect.height + 'px';
                clone.style.borderRadius = '8px';
                clone.style.zIndex = '10001';

                document.body.appendChild(clone);

                // Ensure card is ready but hidden
                card.classList.add('invisible');

                requestAnimationFrame(() => {
                    clone.style.top = (endRect.top + scrollTop) + 'px';
                    clone.style.left = (endRect.left + scrollLeft) + 'px';
                    clone.style.width = endRect.width + 'px';
                    clone.style.height = endRect.height + 'px';
                    clone.style.borderRadius = '10px';
                    clone.style.backgroundColor = endStyle.backgroundColor;
                });

                // Smoothly fade out clone and reveal card
                setTimeout(() => {
                    clone.classList.add('fading-out');
                    // Sync card reveal with clone fade
                    card.classList.remove('invisible');
                    setTimeout(() => {
                        if (clone.parentNode) clone.remove();
                    }, 150);
                }, 700); // Matched with 0.7s CSS transition duration
            } else {
                card.classList.remove('invisible');
            }
        });

        // 4. Restore grid state and trigger its own entry
        // We ensure it starts from the 'hidden' transform and opacity
        // to trigger a synchronous transition with the clones
        gridContainer.style.transform = 'translateY(20px)';
        gridContainer.style.opacity = '0';
        void gridContainer.offsetHeight; // Force reflow

        gridContainer.style.transition = originalTransition;
        gridContainer.style.transform = ''; // Let CSS (.visible) take over
        gridContainer.style.opacity = '';

        // 5. Hide Sticky Bar
        stickyBar.classList.remove('visible');
        setTimeout(() => {
            if (stickyBar) stickyBar.style.visibility = 'hidden';
        }, 700);
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

    // Separate function for instant jump to banner (no smooth scroll)
    const jumpToBanner = () => {
        // Wait for state update/DOM render
        setTimeout(() => {
            const banner = document.querySelector('.service-banner-container') ||
                document.querySelector('.service-banner');

            if (banner) {
                const bannerRect = banner.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const bannerAbsoluteTop = bannerRect.top + scrollTop;

                const stickyNav = stickyBarRef.current;
                const stickyNavHeight = stickyNav ? stickyNav.offsetHeight : 60;

                const targetScroll = bannerAbsoluteTop - stickyNavHeight;

                window.scrollTo({
                    top: targetScroll,
                    behavior: 'auto' // Instant jump
                });
            }
        }, 10); // Shorter delay for instant jump
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
                    <div className="sticky-nav-links" ref={navLinksRef} style={{ gap: navbarSettings.itemGap || '8px', padding: '8px 12px' }}>
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
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        margin: '0',
                                        boxShadow: isActive
                                            ? `0 2px 4px rgba(0,0,0,0.15), 0 6px 16px -4px ${service.color}60, 0 4px 8px -2px ${service.color}40, inset 0 0 0 2px ${service.color}25, inset 0 3px 10px ${service.color}20`
                                            : '0 1px 3px rgba(0,0,0,0.1)',
                                        transform: 'scale(1)',
                                        transition: 'all 0.2s ease',
                                        fontWeight: isActive ? '700' : (fontSettings.navbarNameFontWeight || '500'),
                                        letterSpacing: '0.3px',
                                        fontSize: fontSettings.navbarNameFontSize || '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        textWrap: 'nowrap',
                                        width: navbarSettings.itemWidth || '150px',
                                        flex: '0 0 auto',
                                        borderBottom: isActive ? `4px solid ${service.color}` : 'none',
                                        paddingBottom: isActive ? '4px' : '8px'
                                    }}
                                    data-target={service._id}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onServiceSelect) {
                                            onServiceSelect(service._id);
                                            jumpToBanner();
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

                <div
                    className={`services-grid ${isVisible ? 'visible' : ''}`}
                    id="gridContainer"
                    ref={gridContainerRef}
                >
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
                                    jumpToBanner();
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
                            {service.description && (
                                <p
                                    className="card-desc text-white/90"
                                    style={{
                                        fontSize: fontSettings.cardDescFontSize,
                                        fontWeight: fontSettings.cardDescFontWeight
                                    }}
                                >
                                    {service.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ServicesMorph;
