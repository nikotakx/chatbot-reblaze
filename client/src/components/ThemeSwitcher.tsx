import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun } from 'lucide-react';

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Static light mode indicator - theme switching disabled as requested
 */
export function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  return (
    <Button variant="ghost" size="icon" className={className} disabled>
      <Sun className="h-5 w-5" />
      <span className="sr-only">Light mode enabled</span>
    </Button>
  );
}

export default ThemeSwitcher;