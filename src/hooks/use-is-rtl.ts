'use client';

import { useApp } from '@/context/AppContext';

/**
 * A client-side hook that determines if the current language
 * is right-to-left (e.g., Hebrew).
 */
export function useIsRTL(): boolean {
  const { lang } = useApp();
  return lang === 'he';
}
