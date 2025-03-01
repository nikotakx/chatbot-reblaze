import React, { createContext, useContext, ReactNode } from 'react';
import useTheme from '@/hooks/use-theme';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLight: boolean;
  isDark: boolean;
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provides theme context to the application
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue = useTheme();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context
 */
export function useThemeContext() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
}