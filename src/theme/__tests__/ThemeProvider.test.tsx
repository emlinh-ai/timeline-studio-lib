import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme, defaultTheme } from '../ThemeProvider';
import { TimelineTheme } from '../../types';

// Helper function to convert hex to RGB for testing
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Test component that uses the theme hook
const TestComponent: React.FC = () => {
  const theme = useTheme();
  
  return (
    <div
      data-testid="themed-component"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.primaryColor,
        fontFamily: theme.fonts.primary
      }}
    >
      <div data-testid="video-color" style={{ color: theme.clipColors.video }}>
        Video
      </div>
      <div data-testid="audio-color" style={{ color: theme.clipColors.audio }}>
        Audio
      </div>
      <div data-testid="text-color" style={{ color: theme.clipColors.text }}>
        Text
      </div>
      <div data-testid="overlay-color" style={{ color: theme.clipColors.overlay }}>
        Overlay
      </div>
    </div>
  );
};

describe('ThemeProvider', () => {
  it('should provide default theme when no custom theme is provided', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const component = screen.getByTestId('themed-component');
    const computedStyle = window.getComputedStyle(component);

    expect(computedStyle.backgroundColor).toBe(hexToRgb(defaultTheme.backgroundColor));
    expect(computedStyle.color).toBe(hexToRgb(defaultTheme.primaryColor));
    expect(computedStyle.fontFamily).toBe(defaultTheme.fonts.primary);
  });

  it('should apply custom theme when provided', () => {
    const customTheme: Partial<TimelineTheme> = {
      primaryColor: '#ff0000',
      backgroundColor: '#000000',
      clipColors: {
        video: '#ff6b6b',
        audio: '#4ecdc4',
        text: '#45b7d1',
        overlay: '#96ceb4'
      }
    };

    render(
      <ThemeProvider theme={customTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    const component = screen.getByTestId('themed-component');
    const computedStyle = window.getComputedStyle(component);

    expect(computedStyle.backgroundColor).toBe(hexToRgb('#000000'));
    expect(computedStyle.color).toBe(hexToRgb('#ff0000'));

    // Check clip colors
    const videoElement = screen.getByTestId('video-color');
    const audioElement = screen.getByTestId('audio-color');
    const textElement = screen.getByTestId('text-color');
    const overlayElement = screen.getByTestId('overlay-color');

    expect(window.getComputedStyle(videoElement).color).toBe(hexToRgb('#ff6b6b'));
    expect(window.getComputedStyle(audioElement).color).toBe(hexToRgb('#4ecdc4'));
    expect(window.getComputedStyle(textElement).color).toBe(hexToRgb('#45b7d1'));
    expect(window.getComputedStyle(overlayElement).color).toBe(hexToRgb('#96ceb4'));
  });

  it('should merge custom theme with default theme', () => {
    const partialCustomTheme: Partial<TimelineTheme> = {
      primaryColor: '#ff0000',
      clipColors: {
        video: '#ff6b6b'
      } as any // Partial clipColors
    };

    render(
      <ThemeProvider theme={partialCustomTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    const component = screen.getByTestId('themed-component');
    const computedStyle = window.getComputedStyle(component);

    // Custom values should be applied
    expect(computedStyle.color).toBe(hexToRgb('#ff0000'));
    
    // Default values should be preserved for non-overridden properties
    expect(computedStyle.backgroundColor).toBe(hexToRgb(defaultTheme.backgroundColor));
    expect(computedStyle.fontFamily).toBe(defaultTheme.fonts.primary);

    // Partial clipColors should merge with defaults
    const videoElement = screen.getByTestId('video-color');
    const audioElement = screen.getByTestId('audio-color');
    
    expect(window.getComputedStyle(videoElement).color).toBe(hexToRgb('#ff6b6b')); // Custom
    expect(window.getComputedStyle(audioElement).color).toBe(hexToRgb(defaultTheme.clipColors.audio)); // Default
  });

  it('should handle nested theme providers', () => {
    const outerTheme: Partial<TimelineTheme> = {
      primaryColor: '#ff0000',
      backgroundColor: '#000000'
    };

    const innerTheme: Partial<TimelineTheme> = {
      primaryColor: '#00ff00'
    };

    render(
      <ThemeProvider theme={outerTheme}>
        <div data-testid="outer-component">
          <TestComponent />
          <ThemeProvider theme={innerTheme}>
            <div data-testid="inner-component">
              <TestComponent />
            </div>
          </ThemeProvider>
        </div>
      </ThemeProvider>
    );

    const outerComponents = screen.getAllByTestId('themed-component');
    const outerComponent = outerComponents[0];
    const innerComponent = outerComponents[1];

    // Outer component should use outer theme
    expect(window.getComputedStyle(outerComponent).color).toBe(hexToRgb('#ff0000'));
    expect(window.getComputedStyle(outerComponent).backgroundColor).toBe(hexToRgb('#000000'));

    // Inner component should use merged inner theme
    expect(window.getComputedStyle(innerComponent).color).toBe(hexToRgb('#00ff00'));
    // Inner theme provider creates its own context, so it uses default background
    expect(window.getComputedStyle(innerComponent).backgroundColor).toBe(hexToRgb(defaultTheme.backgroundColor));
  });

  it('should return default theme when useTheme is called outside provider', () => {
    const ComponentWithoutProvider: React.FC = () => {
      const theme = useTheme();
      
      return (
        <div data-testid="no-provider-component" style={{ color: theme.primaryColor }}>
          No Provider
        </div>
      );
    };

    render(<ComponentWithoutProvider />);

    const component = screen.getByTestId('no-provider-component');
    const computedStyle = window.getComputedStyle(component);

    expect(computedStyle.color).toBe(hexToRgb(defaultTheme.primaryColor));
  });

  it('should handle theme updates', () => {
    const TestWrapper: React.FC = () => {
      const [customTheme, setCustomTheme] = React.useState<Partial<TimelineTheme>>({
        primaryColor: '#ff0000'
      });

      return (
        <div>
          <button
            data-testid="change-theme"
            onClick={() => setCustomTheme({ primaryColor: '#00ff00' })}
          >
            Change Theme
          </button>
          <ThemeProvider theme={customTheme}>
            <TestComponent />
          </ThemeProvider>
        </div>
      );
    };

    render(<TestWrapper />);

    const component = screen.getByTestId('themed-component');
    const changeButton = screen.getByTestId('change-theme');

    // Initial theme
    expect(window.getComputedStyle(component).color).toBe(hexToRgb('#ff0000'));

    // Change theme
    act(() => {
      changeButton.click();
    });

    // Updated theme
    expect(window.getComputedStyle(component).color).toBe(hexToRgb('#00ff00'));
  });

  it('should preserve font configurations in merged theme', () => {
    const customTheme: Partial<TimelineTheme> = {
      fonts: {
        primary: 'Custom Font, sans-serif'
      } as any // Partial fonts
    };

    render(
      <ThemeProvider theme={customTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    const component = screen.getByTestId('themed-component');
    const computedStyle = window.getComputedStyle(component);

    expect(computedStyle.fontFamily).toBe('Custom Font, sans-serif');
  });

  it('should handle empty theme object', () => {
    render(
      <ThemeProvider theme={{}}>
        <TestComponent />
      </ThemeProvider>
    );

    const component = screen.getByTestId('themed-component');
    const computedStyle = window.getComputedStyle(component);

    // Should use all default values
    expect(computedStyle.backgroundColor).toBe(hexToRgb(defaultTheme.backgroundColor));
    expect(computedStyle.color).toBe(hexToRgb(defaultTheme.primaryColor));
    expect(computedStyle.fontFamily).toBe(defaultTheme.fonts.primary);
  });
});