/**
 * SSR-safe hook that runs only on client
 * Use this instead of useEffect for layout effects that need to run before paint
 */
import { useEffect, useLayoutEffect } from 'react';

export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

