import React, { createContext, useContext, ReactNode } from 'react';
import { TimelineTheme } from '../types';
import { defaultTheme } from './defaultTheme';

interface ThemeContextValue {
  theme: TimelineTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

import { DeepPartial } from '../types';

interface ThemeProviderProps {
  children: ReactNode;
  theme?: DeepPartial<TimelineTheme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  theme: customTheme 
}) => {
  // Deep merge custom theme with default theme
  const theme: TimelineTheme = React.useMemo(() => ({
    ...defaultTheme,
    ...customTheme,
    clipColors: {
      ...defaultTheme.clipColors,
      ...customTheme?.clipColors,
    },
    fonts: {
      ...defaultTheme.fonts,
      ...customTheme?.fonts,
    },
  }), [customTheme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): TimelineTheme => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    // Return default theme if no provider is found
    return defaultTheme;
  }
  
  return context.theme;
};

// Export defaultTheme for external use
export { defaultTheme };