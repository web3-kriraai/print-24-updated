import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({
  fallbackPath = '/',
  label = 'Back',
  className = '',
  onClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  // Track previous pathname - properly capture previous value before updating
  useEffect(() => {
    const currentPath = location.pathname;

    // On first render, just store current path
    if (previousPathRef.current === null) {
      previousPathRef.current = currentPath;
      return;
    }

    // Pathname changed - at this point previousPathRef.current still has the old pathname
    // We'll update it after a microtask so it's available for the current navigation check
    // but will be updated for the next navigation
    const updateTimer = setTimeout(() => {
      previousPathRef.current = currentPath;
    }, 0);

    return () => clearTimeout(updateTimer);
  }, [location.pathname]);

  const handleBack = () => {
    if (onClick) {
      onClick();
      // Scroll to top after custom onClick navigation
      if (typeof window !== 'undefined') {
        // Use setTimeout to ensure navigation completes before scrolling
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      }
      return;
    }

    // Check if there's navigation state (from Link or navigate with state)
    const hasState = location.state !== null && location.state !== undefined;

    // Check if browser history has entries (most reliable check - prioritize this)
    const hasHistory = typeof window !== 'undefined' && window.history.length > 1;

    // Check if we have a valid previous path that's different from current
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    const hasPreviousPath = previousPath && previousPath !== currentPath;

    // Can go back if we have browser history (most reliable), state, or previous path
    const canGoBack = hasHistory || hasState || hasPreviousPath;

    if (canGoBack) {
      navigate(-1);
    } else {
      // No history - navigate to fallback path
      navigate(fallbackPath);
    }

    // Scroll to top after navigation
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleBack();
      }}
      className={`flex items-center text-slate-500 hover:text-slate-700 transition-colors font-medium cursor-pointer ${className}`}
      type="button"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </button>
  );
};

export default BackButton;
