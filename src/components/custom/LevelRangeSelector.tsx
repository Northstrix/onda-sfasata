'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LevelRangeSelectorProps {
  levelRanges: { value: string; label: string }[];
  activeTab: string;
  setActiveTab: (value: string) => void;
  /** New: mimic footer’s onNavigate callback (e.g. to propagate `'level-selector'`) */
  onNavigate: (target: string) => void;
}

export default function LevelRangeSelector({
  levelRanges,
  activeTab,
  setActiveTab,
  onNavigate,
}: LevelRangeSelectorProps) {
  const { direction, t } = useApp();
  const isRTL = useIsRTL();
  const isMobile = useIsMobile();

  const currentIndex = levelRanges.findIndex((r) => r.value === activeTab);

  const triggerChange = (newValue: string) => {
    setActiveTab(newValue);
    // Fire same-style callback as footer’s nav item click
    onNavigate?.('level-selector');
  };

  const goNext = () => {
    const next = (currentIndex + 1) % levelRanges.length;
    triggerChange(levelRanges[next].value);
  };

  const goPrev = () => {
    const prev = (currentIndex - 1 + levelRanges.length) % levelRanges.length;
    triggerChange(levelRanges[prev].value);
  };

  return (
    <div className="flex justify-center w-full">
      <div
        className={cn(
          'inline-flex items-center gap-3 mt-8 p-2 rounded-md select-none w-auto',
          'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] shadow-sm',
          isRTL && 'flex-row-reverse',
          isMobile ? 'gap-2 mt-6 p-1.5' : 'gap-3 mt-8 p-2'
        )}
        dir={direction}
      >
        {/* Prev */}
        <button
          onClick={isRTL ? goNext : goPrev}
          aria-label={isRTL ? 'Next range' : 'Previous range'}
          className={cn(
            'rounded-[var(--radius)] transition-all duration-200 ease-in-out bg-transparent hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]',
            isMobile ? 'p-1.5' : 'p-2'
          )}
        >
          <ChevronLeft className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
        </button>

        {/* Range list */}
        <div className={cn('inline-flex items-center w-auto', isMobile ? 'gap-2' : 'gap-3')}>
          <span
            className={cn(
              'font-semibold whitespace-nowrap',
              isMobile ? 'text-xs' : 'text-sm md:text-base'
            )}
          >
            {t('levels')}
          </span>

          <ul
            className={cn(
              'inline-flex flex-wrap items-center justify-center w-auto',
              isMobile ? 'gap-1' : 'gap-2'
            )}
          >
            {levelRanges.map((r) => (
              <li
                key={r.value}
                onClick={() => triggerChange(r.value)}
                className={cn(
                  'cursor-pointer rounded-[var(--radius)] font-medium whitespace-nowrap transition-colors ease-in-out',
                  isMobile
                    ? 'px-2 py-1 text-xs duration-200'
                    : 'px-3 py-1.5 text-sm duration-300',
                  activeTab === r.value
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]'
                )}
              >
                {r.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Next */}
        <button
          onClick={isRTL ? goPrev : goNext}
          aria-label={isRTL ? 'Previous range' : 'Next range'}
          className={cn(
            'rounded-[var(--radius)] transition-all duration-200 ease-in-out bg-transparent hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]',
            isMobile ? 'p-1' : 'p-1.5'
          )}
        >
          <ChevronRight className={cn(isMobile ? 'h-4 w-4' : 'h-5 w-5')} />
        </button>
      </div>
    </div>
  );
}
