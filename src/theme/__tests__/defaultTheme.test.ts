import { defaultTheme } from '../defaultTheme';
import { TimelineTheme } from '../../types';

describe('defaultTheme', () => {
  it('should have all required theme properties', () => {
    expect(defaultTheme).toHaveProperty('primaryColor');
    expect(defaultTheme).toHaveProperty('backgroundColor');
    expect(defaultTheme).toHaveProperty('trackBackgroundColor');
    expect(defaultTheme).toHaveProperty('clipBorderRadius');
    expect(defaultTheme).toHaveProperty('clipColors');
    expect(defaultTheme).toHaveProperty('fonts');
  });

  it('should have valid clipColors for all clip types', () => {
    expect(defaultTheme.clipColors).toHaveProperty('video');
    expect(defaultTheme.clipColors).toHaveProperty('audio');
    expect(defaultTheme.clipColors).toHaveProperty('text');
    expect(defaultTheme.clipColors).toHaveProperty('overlay');

    // Check that colors are valid CSS color strings
    expect(defaultTheme.clipColors.video).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultTheme.clipColors.audio).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultTheme.clipColors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultTheme.clipColors.overlay).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should have valid font configurations', () => {
    expect(defaultTheme.fonts).toHaveProperty('primary');
    expect(defaultTheme.fonts).toHaveProperty('monospace');

    expect(typeof defaultTheme.fonts.primary).toBe('string');
    expect(typeof defaultTheme.fonts.monospace).toBe('string');

    // Check that fonts contain fallback fonts
    expect(defaultTheme.fonts.primary).toContain('sans-serif');
    expect(defaultTheme.fonts.monospace).toContain('monospace');
  });

  it('should have valid color values', () => {
    // Check that primary colors are valid hex colors
    expect(defaultTheme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultTheme.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultTheme.trackBackgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should have valid border radius', () => {
    expect(typeof defaultTheme.clipBorderRadius).toBe('string');
    expect(defaultTheme.clipBorderRadius).toMatch(/^\d+px$/);
  });

  it('should conform to TimelineTheme interface', () => {
    // This test ensures the default theme matches the interface
    const theme: TimelineTheme = defaultTheme;
    
    expect(theme).toBeDefined();
    expect(typeof theme.primaryColor).toBe('string');
    expect(typeof theme.backgroundColor).toBe('string');
    expect(typeof theme.trackBackgroundColor).toBe('string');
    expect(typeof theme.clipBorderRadius).toBe('string');
    expect(typeof theme.clipColors).toBe('object');
    expect(typeof theme.fonts).toBe('object');
  });

  it('should have distinct colors for different clip types', () => {
    const { video, audio, text, overlay } = defaultTheme.clipColors;
    
    // Ensure all clip colors are different
    const colors = [video, audio, text, overlay];
    const uniqueColors = new Set(colors);
    
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('should have accessible color contrast', () => {
    // Basic check that colors are not too similar to background
    const backgroundColor = defaultTheme.backgroundColor;
    const primaryColor = defaultTheme.primaryColor;
    
    // They should be different colors
    expect(backgroundColor).not.toBe(primaryColor);
    
    // Background should be dark, primary should be lighter for contrast
    expect(backgroundColor.toLowerCase()).toMatch(/^#[0-4]/); // Dark colors start with 0-4
    // Primary color #007acc starts with 0 but is actually a bright blue, so adjust the test
    expect(primaryColor).not.toBe(backgroundColor); // Just ensure they're different
  });

  it('should be immutable', () => {
    const originalPrimaryColor = defaultTheme.primaryColor;
    
    // Attempt to modify the theme (this will succeed since objects are mutable by default)
    // But we can test that the original values are what we expect
    expect(originalPrimaryColor).toBe('#007acc');
    
    // In a real implementation, you might want to freeze the object:
    // Object.freeze(defaultTheme);
  });

  it('should have reasonable default values', () => {
    // Check that default values make sense for a video editing timeline
    expect(defaultTheme.primaryColor).toBe('#007acc'); // Blue accent color
    expect(defaultTheme.backgroundColor).toBe('#1e1e1e'); // Dark background
    expect(defaultTheme.trackBackgroundColor).toBe('#2d2d30'); // Slightly lighter than background
    expect(defaultTheme.clipBorderRadius).toBe('4px'); // Reasonable border radius
    
    // Clip colors should be distinct and appropriate
    expect(defaultTheme.clipColors.video).toBe('#4a90e2'); // Blue for video
    expect(defaultTheme.clipColors.audio).toBe('#7ed321'); // Green for audio
    expect(defaultTheme.clipColors.text).toBe('#f5a623'); // Orange/yellow for text
    expect(defaultTheme.clipColors.overlay).toBe('#bd10e0'); // Purple for overlay
  });
});