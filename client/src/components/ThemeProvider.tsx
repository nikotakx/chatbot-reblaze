import React, { createContext, ReactNode, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLight: boolean;
  isDark: boolean;
  isSystem: boolean;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Simplified ThemeProvider that always uses light theme
 * Theme switching functionality has been disabled as requested
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Always use light mode
  const theme: Theme = 'light';
  
  // Use React's useEffect hook to manipulate the DOM after render
  React.useEffect(() => {
    // Set light mode on document
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    
    // Store the setting in local storage
    localStorage.setItem('theme', 'light');
  }, []);
  
  // Dummy setTheme function that does nothing
  const setTheme = (_theme: Theme) => {
    // This is a no-op as we're always using light mode
    localStorage.setItem('theme', 'light');
  };

  const value = {
    theme,
    setTheme,
    isLight: true,
    isDark: false,
    isSystem: false
  };

  return (
    <ThemeContext.Provider value={value}>
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