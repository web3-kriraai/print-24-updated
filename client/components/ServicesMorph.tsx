import React, { useEffect, useState, useRef } from 'react';
import './ServicesMorph.css';
import * as Icons from 'lucide-react';

import type { Service } from '../types/serviceTypes';

interface ServicesMorphProps {
    onServiceSelect?: (serviceId: string) => void;
    services: Service[];
}

const ServicesMorph: React.FC<ServicesMorphProps> = ({ onServiceSelect, services }) => {
    const [hasMorphed, setHasMorphed] = useState(false);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);

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

    // Track user interaction for auto-scroll behavior
    const userInteractedRef = useRef(false);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset inactivity timer
    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }

        // Set new 2-minute inactivity timer
        inactivityTimerRef.current = setTimeout(() => {
            // After 2 minutes of inactivity, scroll to banner
            if (hasMorphed) {
                scrollToBanner();
            }
        }, 120000); // 2 minutes = 120000ms
    };

    useEffect(() => {
        const handleScroll = () => {
            userInteractedRef.current = true; // Mark as interacted on scroll
            resetInactivityTimer(); // Reset the 2-minute timer

            const triggerPoint = 200; // Fixed scroll amount to trigger animation

            if (window.scrollY > triggerPoint && !hasMorphed) {
                triggerMorph();
                setHasMorphed(true);
                // Auto-scroll to banner when morph triggers
                scrollToBanner();
            } else if (window.scrollY < triggerPoint && hasMorphed) {
                resetMorph();
                setHasMorphed(false);
            }
        };

        const handleClick = () => {
            resetInactivityTimer(); // Reset the 2-minute timer on any click
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('click', handleClick);

        // Start the initial inactivity timer
        resetInactivityTimer();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('click', handleClick);
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [hasMorphed]);

    // Initial auto-scroll timer effect
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only auto-scroll if user hasn't scrolled manually yet and we are at the top
            if (!userInteractedRef.current && window.scrollY < 50) {
                window.scrollTo({
                    top: 250, // Enough to trigger the 200px threshold
                    behavior: 'smooth'
                });
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

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
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    return (
        <div className="services-morph-container">
            {/* Sticky Sub Nav */}
            <div className="sticky-sub-nav" id="stickyBar" ref={stickyBarRef}>
                {/* Logo on the left */}
                <div className="sticky-nav-logo-container">
                    <img src="/logo.svg" alt="P24 Logo" className="sticky-nav-logo" />
                </div>

                {/* Service Links */}
                <div className="sticky-nav-links">
                    {services.map(service => {
                        const Icon = getServiceIcon(service);
                        return (
                            <a
                                key={service._id}
                                href="#"
                                className="sub-nav-link"
                                style={{ color: service.color }}
                                data-target={service._id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    resetInactivityTimer(); // Reset timer on service selection
                                    if (onServiceSelect) {
                                        onServiceSelect(service._id);
                                        scrollToBanner();
                                    }
                                }}
                            >
                                <Icon size={16} style={{ marginRight: '8px' }} />
                                {service.name.split(' ')[0]}
                            </a>
                        );
                    })}
                </div>
            </div>

            <div className="hero-wrapper">
                <h1 className="hero-title">OUR SERVICES</h1>
                <p className="hero-subtitle">Login Type - Printers / Agent</p>

                <div className="services-grid" id="gridContainer" ref={gridContainerRef}>
                    {services.map(service => (
                        <div
                            key={service._id}
                            className="card"
                            style={{ backgroundColor: service.color }}
                            data-target={service._id}
                            onClick={() => {
                                resetInactivityTimer(); // Reset timer on card click
                                // Update the selected service first
                                if (onServiceSelect) {
                                    onServiceSelect(service._id);
                                    scrollToBanner();
                                }
                            }}
                        >
                            <span className="card-intro">We Offer...</span>
                            <h3 className="card-title text-white">{service.name}</h3>
                            <p className="card-desc text-white/90">{service.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ServicesMorph;
