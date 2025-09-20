/**
 * Responsive utilities for Timeline component
 * Handles breakpoints, screen size detection, and responsive calculations
 */

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 768,   // 0-767px
  tablet: 1024,  // 768-1023px
  desktop: 1024  // 1024px+
};

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

/**
 * Get current screen size based on window width
 */
export function getScreenSize(width: number, breakpoints: ResponsiveBreakpoints = DEFAULT_BREAKPOINTS): ScreenSize {
  if (width < breakpoints.mobile) {
    return 'mobile';
  } else if (width < breakpoints.tablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Responsive configuration for different screen sizes
 */
export interface ResponsiveConfig {
  trackHeight: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  clipMinWidth: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  timeRulerHeight: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  timeInterval: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  fontSize: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  headerHeight: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  controlsSize: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  trackHeight: {
    mobile: 40,
    tablet: 50,
    desktop: 60
  },
  clipMinWidth: {
    mobile: 20,
    tablet: 30,
    desktop: 40
  },
  timeRulerHeight: {
    mobile: 25,
    tablet: 30,
    desktop: 35
  },
  timeInterval: {
    mobile: 10, // 10 second intervals on mobile
    tablet: 5,  // 5 second intervals on tablet
    desktop: 1  // 1 second intervals on desktop
  },
  fontSize: {
    mobile: '10px',
    tablet: '11px',
    desktop: '12px'
  },
  headerHeight: {
    mobile: 50,
    tablet: 60,
    desktop: 70
  },
  controlsSize: {
    mobile: '28px',
    tablet: '32px',
    desktop: '36px'
  }
};

/**
 * Get responsive value based on current screen size
 */
export function getResponsiveValue<T>(
  values: { mobile: T; tablet: T; desktop: T },
  screenSize: ScreenSize
): T {
  return values[screenSize];
}

/**
 * Calculate responsive time interval based on zoom and screen size
 */
export function getResponsiveTimeInterval(
  pixelsPerSecond: number,
  zoom: number,
  screenSize: ScreenSize,
  config: ResponsiveConfig = DEFAULT_RESPONSIVE_CONFIG
): number {
  const baseInterval = getResponsiveValue(config.timeInterval, screenSize);
  const scaledPixelsPerSecond = pixelsPerSecond * zoom;
  
  // Adjust interval based on available space
  if (screenSize === 'mobile') {
    if (scaledPixelsPerSecond < 10) return baseInterval * 6; // 60 second intervals
    if (scaledPixelsPerSecond < 20) return baseInterval * 3; // 30 second intervals
    if (scaledPixelsPerSecond < 40) return baseInterval * 2; // 20 second intervals
    return baseInterval; // 10 second intervals
  } else if (screenSize === 'tablet') {
    if (scaledPixelsPerSecond < 15) return baseInterval * 4; // 20 second intervals
    if (scaledPixelsPerSecond < 30) return baseInterval * 2; // 10 second intervals
    return baseInterval; // 5 second intervals
  } else {
    // Desktop - more granular intervals
    if (scaledPixelsPerSecond < 20) return 10;
    if (scaledPixelsPerSecond < 50) return 5;
    if (scaledPixelsPerSecond < 100) return 2;
    return baseInterval; // 1 second intervals
  }
}

/**
 * Hook to detect screen size changes
 */
import { useState, useEffect } from 'react';

export function useScreenSize(breakpoints: ResponsiveBreakpoints = DEFAULT_BREAKPOINTS): {
  screenSize: ScreenSize;
  width: number;
  height: number;
} {
  const [dimensions, setDimensions] = useState(() => {
    // Safe default for SSR
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        screenSize: 'desktop' as ScreenSize
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      screenSize: getScreenSize(width, breakpoints)
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({
        width,
        height,
        screenSize: getScreenSize(width, breakpoints)
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Initial call to set correct dimensions
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoints]);

  return dimensions;
}

/**
 * Hook to get responsive configuration values
 */
export function useResponsiveConfig(
  config: ResponsiveConfig = DEFAULT_RESPONSIVE_CONFIG
): {
  screenSize: ScreenSize;
  trackHeight: number;
  clipMinWidth: number;
  timeRulerHeight: number;
  timeInterval: number;
  fontSize: string;
  headerHeight: number;
  controlsSize: string;
} {
  const { screenSize } = useScreenSize();
  
  return {
    screenSize,
    trackHeight: getResponsiveValue(config.trackHeight, screenSize),
    clipMinWidth: getResponsiveValue(config.clipMinWidth, screenSize),
    timeRulerHeight: getResponsiveValue(config.timeRulerHeight, screenSize),
    timeInterval: getResponsiveValue(config.timeInterval, screenSize),
    fontSize: getResponsiveValue(config.fontSize, screenSize),
    headerHeight: getResponsiveValue(config.headerHeight, screenSize),
    controlsSize: getResponsiveValue(config.controlsSize, screenSize)
  };
}

/**
 * Calculate responsive pixels per second based on screen size
 */
export function getResponsivePixelsPerSecond(
  basePixelsPerSecond: number,
  screenSize: ScreenSize
): number {
  switch (screenSize) {
    case 'mobile':
      return basePixelsPerSecond * 0.6; // Reduce for mobile
    case 'tablet':
      return basePixelsPerSecond * 0.8; // Slightly reduce for tablet
    case 'desktop':
    default:
      return basePixelsPerSecond; // Full scale for desktop
  }
}

/**
 * Get responsive CSS media queries
 */
export function getMediaQueries(breakpoints: ResponsiveBreakpoints = DEFAULT_BREAKPOINTS) {
  return {
    mobile: `@media (max-width: ${breakpoints.mobile - 1}px)`,
    tablet: `@media (min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
    desktop: `@media (min-width: ${breakpoints.tablet}px)`
  };
}