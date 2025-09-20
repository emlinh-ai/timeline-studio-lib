import { TimelineTheme } from '../types';

export const defaultTheme: TimelineTheme = {
  primaryColor: '#007acc',
  backgroundColor: '#1e1e1e',
  trackBackgroundColor: '#2d2d30',
  clipBorderRadius: '4px',
  clipColors: {
    video: '#4a90e2',
    audio: '#7ed321',
    text: '#f5a623',
    overlay: '#bd10e0',
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monospace: '"SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
  },
};