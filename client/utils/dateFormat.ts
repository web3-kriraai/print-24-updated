/**
 * Date formatting utilities for SSR compatibility
 * Ensures consistent formatting between server and client
 */

/**
 * Format date consistently for SSR
 * Uses placeholder on server, formats on client
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (typeof window === 'undefined') {
    // Server: return placeholder or ISO format
    return 'Loading...';
  }
  
  // Client: format with consistent locale
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format date with time for SSR
 */
export function formatDateTime(dateString: string): string {
  if (typeof window === 'undefined') {
    return 'Loading...';
  }
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date for delivery (weekday, month, day)
 */
export function formatDeliveryDate(daysFromNow: number): string {
  if (typeof window === 'undefined') {
    return 'Loading...';
  }
  
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with state for SSR compatibility
 * Returns formatted date and loading state
 */
export function useFormattedDate(dateString: string | null, options?: Intl.DateTimeFormatOptions): { formatted: string; isLoading: boolean } {
  const [formatted, setFormatted] = React.useState<string>('Loading...');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !dateString) {
      setIsLoading(false);
      return;
    }

    try {
      const date = new Date(dateString);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
      });
      setFormatted(formattedDate);
      setIsLoading(false);
    } catch (error) {
      console.error('Error formatting date:', error);
      setFormatted('Invalid date');
      setIsLoading(false);
    }
  }, [dateString, JSON.stringify(options)]);

  return { formatted, isLoading };
}

// Import React for the hook
import React from 'react';

