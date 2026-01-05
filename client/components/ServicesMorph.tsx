import React, { useEffect, useState, useRef } from 'react';
import './ServicesMorph.css';
import {
    Gift,
    Printer,
    PenTool,
    User,
    Package,
    BookOpen,
    Settings,
    MapPin,
    Monitor,
    Calculator
} from 'lucide-react';

interface ServicesMorphProps {
    onServiceSelect?: (serviceId: string) => void;
}

const ServicesMorph: React.FC<ServicesMorphProps> = ({ onServiceSelect }) => {
    const [hasMorphed, setHasMorphed] = useState(false);
    const stickyBarRef = useRef<HTMLDivElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Define services data to map over for cleaner JSX
    const services = [
        { id: 'gifting', title: 'GIFTING SOLUTIONS', intro: 'Looking for...', desc: 'Personalized gifts', bg: 'bg-pink', icon: Gift, textCol: 'text-pink' },
        { id: 'printing', title: 'PRINTING SOLUTIONS', intro: 'Looking for...', desc: 'Premium printing services', bg: 'bg-lime', icon: Printer, textCol: 'text-lime' },
        { id: 'design', title: 'CREATE DESIGN', intro: null, desc: 'Customize designs online', bg: 'bg-orange', icon: PenTool, textCol: 'text-orange' },
        { id: 'hire', title: 'HIRE A DESIGNER', intro: null, desc: 'Professional designers', bg: 'bg-teal', icon: User, textCol: 'text-teal' },
        { id: 'packaging', title: 'PACKAGING SOLUTIONS', intro: null, desc: 'Enhance your products', bg: 'bg-teal', icon: Package, textCol: 'text-teal' },
        { id: 'magazine', title: 'PRINT INDUSTRY MAGAZINE', intro: null, desc: 'Latest trends & insights', bg: 'bg-purple', icon: BookOpen, textCol: 'text-purple' },
        { id: 'machines', title: 'BUY & SELL MACHINES', intro: null, desc: 'Marketplace for machines', bg: 'bg-coral', icon: Settings, textCol: 'text-coral' },
        { id: 'find', title: 'FIND A PRINTER', intro: null, desc: 'Printers near you', bg: 'bg-lime', icon: MapPin, textCol: 'text-lime' },
        { id: 'software', title: 'ORDER SOFTWARE', intro: null, desc: 'Managing printing orders', bg: 'bg-pink', icon: Monitor, textCol: 'text-pink' },
        { id: 'calc', title: 'GSM CALCULATOR', intro: null, desc: 'Easy calculation tool', bg: 'bg-orange', icon: Calculator, textCol: 'text-orange' },
    ];

    useEffect(() => {
        const handleScroll = () => {
            const triggerPoint = 200; // Fixed scroll amount to trigger animation as per user request

            if (window.scrollY > triggerPoint && !hasMorphed) {
                triggerMorph();
                setHasMorphed(true);
                // Auto-scroll to banner when morph triggers, as per "use auto scroll smooth when first uto scroll so it come to banner"
                scrollToBanner();
            } else if (window.scrollY < triggerPoint && hasMorphed) {
                resetMorph();
                setHasMorphed(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMorphed]);

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
                    // Do NOT set display:none, just keep it invisible to preserve layout height
                    // card.classList.add('displaynone'); 
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
            // card.classList.remove('displaynone');
        });

        // Remove any stuck clones
        document.querySelectorAll('.morph-clone').forEach(el => el.remove());
    };

    const scrollToBanner = () => {
        // Wait for state update/DOM render
        setTimeout(() => {
            const banner = document.querySelector('.service-banner');
            if (banner) {
                const bannerRect = banner.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const bannerAbsoluteTop = bannerRect.top + scrollTop;

                // Banner should appear just below sticky nav (60px) with some padding
                // The sticky nav height in CSS is 60px
                const stickyNavHeight = 60;
                const padding = 20;

                const targetScroll = bannerAbsoluteTop - stickyNavHeight - padding;

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
                    {services.map(service => (
                        <a
                            key={service.id}
                            href="#"
                            className={`sub-nav-link ${service.textCol}`}
                            data-target={service.id}
                            onClick={(e) => {
                                e.preventDefault();
                                if (onServiceSelect) {
                                    onServiceSelect(service.id);
                                    scrollToBanner();
                                }
                            }}
                        >
                            <service.icon size={16} style={{ marginRight: '8px' }} />
                            {service.title.split(' ')[0]}
                        </a>
                    ))}
                </div>
            </div>

            <div className="hero-wrapper">
                <h1 className="hero-title">OUR SERVICES</h1>
                <p className="hero-subtitle">Login Type - Printers / Agent</p>

                <div className="services-grid" id="gridContainer" ref={gridContainerRef}>
                    {services.map(service => (
                        <div
                            key={service.id}
                            className={`card ${service.bg}`}
                            data-target={service.id}
                            onClick={() => {
                                // Update the selected service first
                                if (onServiceSelect) {
                                    onServiceSelect(service.id);
                                    scrollToBanner();
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            {service.intro && <span className="card-intro">{service.intro}</span>}
                            <h3 className="card-title">{service.title}</h3>
                            {service.desc && <p className="card-desc">{service.desc}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ServicesMorph;
