/**
 * Hook to ensure content only renders on client after hydration
 * Returns true only after component has mounted on client
 */
import { useState, useEffect } from 'react';

export function useClientOnly(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

