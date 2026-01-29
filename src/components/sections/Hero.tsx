'use client';

import React, { useState, useCallback } from 'react';
import HolographicCard from '../custom/HolographicCard';
import { useApp } from '@/context/AppContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useResponsiveCardSize } from '@/hooks/useResponsiveCardSize';
import PositionAwareButton from '@/components/custom/PositionAwareButton';  // 🔥 NEW IMPORT
import RefinedChronicleButton from '@/components/custom/RefinedChronicleButton';  // 🔥 NEW IMPORT
import { cn } from '@/lib/utils';
function useMirroredImage(src: string, mirror: boolean) {
  const [mirroredSrc, setMirroredSrc] = useState<string>(src);

  React.useEffect(() => {
    if (!mirror) {
      setMirroredSrc(src);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setMirroredSrc(src);
        return;
      }

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
      setMirroredSrc(canvas.toDataURL());
    };
    
    image.onerror = () => setMirroredSrc(src);
    image.src = src;
  }, [src, mirror]);

  return mirroredSrc;
}

// 🔥 UPDATED INTERFACE - Added supportsPositionAware prop
interface HeroProps {
  defaultCardText?: string;
  onCardClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  supportsPositionAware?: boolean;  // 🔥 NEW PROP from LevelSelector
}

export default function Hero({ 
  defaultCardText = "イタリア", 
  onCardClick,
  supportsPositionAware = false  // 🔥 DEFAULT to false (RefinedChronicleButton)
}: HeroProps) {
  const { t, lang } = useApp();
  const isRTL = useIsRTL();
  const isHebrew = lang === 'he';
  
  const padding = isHebrew ? "0.6675rem 1.5875rem" : "0.6125rem 1.5rem";
  const mirroredImageSrc = useMirroredImage('card-image.webp', isHebrew);
  const { width: responsiveWidth, height: responsiveHeight } = useResponsiveCardSize(320, 480);
  
  const scrollToLevels = useCallback(() => {
    document.getElementById('level-selector')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleHolographicClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onCardClick?.(e);
  }, [onCardClick]);

  const cardTopText = isHebrew ? "איטליה" : defaultCardText;

  // 🔥 REPLACED useBrowserAwareButton hook with prop-based logic
  const buttonText = <span>{t('primary-cta-text')}</span>;
  const ButtonComponent = supportsPositionAware ? PositionAwareButton : RefinedChronicleButton;
  
  const buttonProps = supportsPositionAware 
    ? { 
        children: buttonText, 
        onClick: scrollToLevels, 
        buttonWidth: "fit-content" 
      }
    : { 
        children: buttonText, 
        onClick: scrollToLevels, 
        width: "fit-content",
        buttonHeight: '2.5rem',
        fontSize: '1rem',
        fontWeight: 500 
      };

  return (
    <section className="flex flex-col items-center justify-center lg:min-h-[min(calc(100vh-72px),1080px)] py-12 lg:py-24 gap-8 lg:gap-16 relative">
      <div className="absolute inset-0 bg-background -z-10" />
      
      <div className="w-full overflow-hidden max-w-[1296px] mx-auto px-6 md:px-10 flex flex-col items-center lg:grid lg:grid-cols-2 lg:items-center gap-8 lg:gap-16">
        {/* Text Content */}
        <div className="flex flex-col items-center text-center lg:text-left lg:items-start lg:justify-center order-1 w-full lg:max-w-md">
          <h1 className={`font-headline text-3xl md:text-[44px] lg:text-[64px] font-bold leading-10 mb-1 md:mb-4 lg:mb-6`}>
            {t('appName')}
          </h1>
          <p
            className={cn(
              "text-base sm:text-lg md:text-xl lg:text-[18px] text-muted-foreground max-w-md mb-8 lg:mb-12 mx-auto lg:mx-0",
              isRTL ? "lg:text-right" : "lg:text-left"
            )}
          >
            {t('appDescription')}
          </p>
          <div className="w-fit">
            {/* 🔥 Uses prop-based button decision */}
            <ButtonComponent {...buttonProps} />
          </div>
        </div>

        {/* Holographic Card */}
        <div className="flex justify-center my-[30px] items-center order-2 lg:justify-end lg:items-center w-full">
          <HolographicCard
            imageSrc={mirroredImageSrc}
            electricColor="#3C83F6"
            topText={cardTopText}
            topTextColor="hsl(var(--foreground))"
            textOverlayPadding={padding}
            topTextVertical={false}
            isRTL={isRTL}
            width={responsiveWidth}
            height={responsiveHeight}
            onClick={handleHolographicClick}
            enableDrag={false}
          />
        </div>
      </div>
    </section>
  );
}
