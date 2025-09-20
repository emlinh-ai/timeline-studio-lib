/**
 * Tests for responsive utilities
 */

import {
  getScreenSize,
  getResponsiveValue,
  getResponsiveTimeInterval,
  getResponsivePixelsPerSecond,
  DEFAULT_BREAKPOINTS,
  DEFAULT_RESPONSIVE_CONFIG
} from '../responsive';

describe('Responsive Utilities', () => {
  describe('getScreenSize', () => {
    it('should return mobile for widths below mobile breakpoint', () => {
      expect(getScreenSize(500)).toBe('mobile');
      expect(getScreenSize(767)).toBe('mobile');
    });

    it('should return tablet for widths between mobile and tablet breakpoints', () => {
      expect(getScreenSize(768)).toBe('tablet');
      expect(getScreenSize(900)).toBe('tablet');
      expect(getScreenSize(1023)).toBe('tablet');
    });

    it('should return desktop for widths at or above desktop breakpoint', () => {
      expect(getScreenSize(1024)).toBe('desktop');
      expect(getScreenSize(1920)).toBe('desktop');
    });

    it('should work with custom breakpoints', () => {
      const customBreakpoints = {
        mobile: 600,
        tablet: 900,
        desktop: 900
      };

      expect(getScreenSize(500, customBreakpoints)).toBe('mobile');
      expect(getScreenSize(700, customBreakpoints)).toBe('tablet');
      expect(getScreenSize(1000, customBreakpoints)).toBe('desktop');
    });
  });

  describe('getResponsiveValue', () => {
    const testValues = {
      mobile: 40,
      tablet: 50,
      desktop: 60
    };

    it('should return mobile value for mobile screen size', () => {
      expect(getResponsiveValue(testValues, 'mobile')).toBe(40);
    });

    it('should return tablet value for tablet screen size', () => {
      expect(getResponsiveValue(testValues, 'tablet')).toBe(50);
    });

    it('should return desktop value for desktop screen size', () => {
      expect(getResponsiveValue(testValues, 'desktop')).toBe(60);
    });
  });

  describe('getResponsiveTimeInterval', () => {
    it('should return appropriate intervals for mobile', () => {
      expect(getResponsiveTimeInterval(100, 0.1, 'mobile')).toBe(30); // Very zoomed out
      expect(getResponsiveTimeInterval(100, 0.2, 'mobile')).toBe(20); // Zoomed out
      expect(getResponsiveTimeInterval(100, 0.4, 'mobile')).toBe(10); // Medium zoom
      expect(getResponsiveTimeInterval(100, 1, 'mobile')).toBe(10); // Normal zoom
    });

    it('should return appropriate intervals for tablet', () => {
      expect(getResponsiveTimeInterval(100, 0.1, 'tablet')).toBe(20); // Very zoomed out
      expect(getResponsiveTimeInterval(100, 0.3, 'tablet')).toBe(5); // Zoomed out
      expect(getResponsiveTimeInterval(100, 1, 'tablet')).toBe(5); // Normal zoom
    });

    it('should return appropriate intervals for desktop', () => {
      expect(getResponsiveTimeInterval(100, 0.1, 'desktop')).toBe(10); // Very zoomed out
      expect(getResponsiveTimeInterval(100, 0.5, 'desktop')).toBe(2); // Zoomed out
      expect(getResponsiveTimeInterval(100, 1, 'desktop')).toBe(1); // Medium zoom
      expect(getResponsiveTimeInterval(100, 2, 'desktop')).toBe(1); // Zoomed in
    });

    it('should work with custom config', () => {
      const customConfig = {
        ...DEFAULT_RESPONSIVE_CONFIG,
        timeInterval: {
          mobile: 20,
          tablet: 10,
          desktop: 2
        }
      };

      expect(getResponsiveTimeInterval(100, 1, 'mobile', customConfig)).toBe(20);
      expect(getResponsiveTimeInterval(100, 1, 'tablet', customConfig)).toBe(10);
      expect(getResponsiveTimeInterval(100, 1, 'desktop', customConfig)).toBe(2);
    });
  });

  describe('getResponsivePixelsPerSecond', () => {
    it('should reduce pixels per second for mobile', () => {
      expect(getResponsivePixelsPerSecond(100, 'mobile')).toBe(60);
    });

    it('should slightly reduce pixels per second for tablet', () => {
      expect(getResponsivePixelsPerSecond(100, 'tablet')).toBe(80);
    });

    it('should keep full pixels per second for desktop', () => {
      expect(getResponsivePixelsPerSecond(100, 'desktop')).toBe(100);
    });
  });

  describe('DEFAULT_RESPONSIVE_CONFIG', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('trackHeight');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('clipMinWidth');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('timeRulerHeight');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('timeInterval');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('fontSize');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('headerHeight');
      expect(DEFAULT_RESPONSIVE_CONFIG).toHaveProperty('controlsSize');
    });

    it('should have mobile values smaller than desktop values', () => {
      expect(DEFAULT_RESPONSIVE_CONFIG.trackHeight.mobile).toBeLessThan(
        DEFAULT_RESPONSIVE_CONFIG.trackHeight.desktop
      );
      expect(DEFAULT_RESPONSIVE_CONFIG.clipMinWidth.mobile).toBeLessThan(
        DEFAULT_RESPONSIVE_CONFIG.clipMinWidth.desktop
      );
      expect(DEFAULT_RESPONSIVE_CONFIG.timeRulerHeight.mobile).toBeLessThan(
        DEFAULT_RESPONSIVE_CONFIG.timeRulerHeight.desktop
      );
    });

    it('should have tablet values between mobile and desktop', () => {
      expect(DEFAULT_RESPONSIVE_CONFIG.trackHeight.tablet).toBeGreaterThan(
        DEFAULT_RESPONSIVE_CONFIG.trackHeight.mobile
      );
      expect(DEFAULT_RESPONSIVE_CONFIG.trackHeight.tablet).toBeLessThan(
        DEFAULT_RESPONSIVE_CONFIG.trackHeight.desktop
      );
    });
  });

  describe('DEFAULT_BREAKPOINTS', () => {
    it('should have correct breakpoint values', () => {
      expect(DEFAULT_BREAKPOINTS.mobile).toBe(768);
      expect(DEFAULT_BREAKPOINTS.tablet).toBe(1024);
      expect(DEFAULT_BREAKPOINTS.desktop).toBe(1024);
    });
  });
});