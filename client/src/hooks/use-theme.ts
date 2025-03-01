import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Hook for managing the theme preference
 * 
 * @returns Theme management utilities
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get the theme from localStorage
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    // Return the stored theme if it's valid, otherwise default to 'system'
    return storedTheme && ['light', 'dark', 'system'].includes(storedTheme)
      ? storedTheme
      : 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Update the resolved theme based on system preference if theme is 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateResolvedTheme = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(theme === 'system' ? systemTheme : theme as 'light' | 'dark');
    };

    updateResolvedTheme();
    mediaQuery.addEventListener('change', updateResolvedTheme);
    
    return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [theme]);

  // Update the document with the current theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    isLight: resolvedTheme === 'light',
    isDark: resolvedTheme === 'dark',
    isSystem: theme === 'system'
  };
}