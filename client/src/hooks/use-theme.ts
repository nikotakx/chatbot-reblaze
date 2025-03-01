import { useState, useEffect } from "react";

type Theme = 'light' | 'dark' | 'system';

/**
 * Hook for managing the theme preference
 * 
 * @returns Theme management utilities
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    // Return saved theme, or default to system
    return savedTheme || 'system';
  });

  // Apply theme changes to document and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all existing theme classes
    root.classList.remove('light', 'dark');
    
    // Update localStorage
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      // Apply system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      // Apply user preference
      root.classList.add(theme);
    }
  }, [theme]);

  // Listen for system theme changes if using system preference
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Update theme when system preference changes
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    
    // Add event listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Initial check
    handleChange();
    
    // Clean up
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    isLight: theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches),
    isDark: theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    isSystem: theme === 'system'
  };
}

export default useTheme;