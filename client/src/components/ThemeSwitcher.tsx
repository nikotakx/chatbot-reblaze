import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Component for switching between light, dark and system themes
 */
export function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState('system');
  
  // Simple theme toggle implementation for now
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };
  
  // Choose the icon to display based on the current theme
  const Icon = theme === 'light' ? Sun : Moon;
  
  return (
    <Button variant="ghost" size="icon" className={className} onClick={toggleTheme}>
      <Icon className="h-5 w-5" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default ThemeSwitcher;