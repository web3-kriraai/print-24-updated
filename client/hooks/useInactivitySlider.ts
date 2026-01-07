import { useEffect, useRef, useCallback } from 'react';

interface UseInactivitySliderOptions {
  containerId: string;
  interval?: number; // Time in milliseconds before slider auto-advances (default: 5000)
  slideInterval?: number; // Time between slides when auto-sliding (default: 3000)
  scrollAmount?: number; // Amount to scroll per slide (default: 150)
  onScroll?: (container: HTMLElement) => void; // Custom scroll function
}

/**
 * React hook for auto-sliding based on user inactivity
 * Automatically scrolls a container after a period of inactivity
 * Pauses when user interacts or hovers over the container
 */
export const useInactivitySlider = ({
  containerId,
  interval = 5000,
  slideInterval = 3000,
  scrollAmount = 150,
  onScroll,
}: UseInactivitySliderOptions) => {
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const lastInteractionTimeRef = useRef(Date.now());

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }
  }, []);

  // Start auto-sliding
  const startAutoSlide = useCallback(() => {
    if (isActiveRef.current) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    autoSlideIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        clearInterval(autoSlideIntervalRef.current!);
        autoSlideIntervalRef.current = null;
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;

      if (onScroll) {
        onScroll(container);
      } else {
        // Default scroll behavior
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;

        if (currentScroll >= maxScroll - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollTo({
            left: container.scrollLeft + scrollAmount,
            behavior: 'smooth',
          });
        }
      }
    }, slideInterval);
  }, [containerId, slideInterval, scrollAmount, onScroll]);

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    clearTimers();

    inactivityTimerRef.current = setTimeout(() => {
      startAutoSlide();
    }, interval);
  }, [interval, startAutoSlide, clearTimers]);

  // Reset inactivity timer (called on user interaction)
  const resetInactivityTimer = useCallback(() => {
    clearTimers();
    lastInteractionTimeRef.current = Date.now();
    startInactivityTimer();
  }, [startInactivityTimer, clearTimers]);

  // Pause auto-sliding (when user hovers)
  const pause = useCallback(() => {
    isActiveRef.current = true;
    clearTimers();
  }, [clearTimers]);

  // Resume auto-sliding (when user leaves)
  const resume = useCallback(() => {
    isActiveRef.current = false;
    startInactivityTimer();
  }, [startInactivityTimer]);

  // Setup event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Mouse events
    const handleMouseMove = () => resetInactivityTimer();
    const handleMouseDown = () => resetInactivityTimer();
    const handleClick = () => resetInactivityTimer();
    const handleMouseOver = () => resetInactivityTimer();

    // Keyboard events
    const handleKeyDown = () => resetInactivityTimer();
    const handleKeyUp = () => resetInactivityTimer();
    const handleKeyPress = () => resetInactivityTimer();

    // Touch events
    const handleTouchStart = () => resetInactivityTimer();
    const handleTouchMove = () => resetInactivityTimer();

    // Wheel events
    const handleWheel = () => resetInactivityTimer();

    // Container hover events
    const handleMouseEnter = () => {
      pause();
    };

    const handleMouseLeave = () => {
      resume();
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('wheel', handleWheel);

    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Start the inactivity timer
    startInactivityTimer();

    // Cleanup
    return () => {
      clearTimers();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('wheel', handleWheel);

      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [containerId, resetInactivityTimer, pause, resume, startInactivityTimer, clearTimers]);

  return {
    pause,
    resume,
    reset: resetInactivityTimer,
  };
};

