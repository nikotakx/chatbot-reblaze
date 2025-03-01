import React from 'react';
import { useThemeContext } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Component for switching between light, dark and system themes
 */
export function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme, isLight, isDark, isSystem } = useThemeContext();
  
  // Choose the icon to display based on the current theme
  const Icon = isLight ? Sun : isDark ? Moon : Monitor;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Icon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          {isLight && !isSystem && <span className="ml-auto text-xs opacity-70">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          {isDark && !isSystem && <span className="ml-auto text-xs opacity-70">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          {isSystem && <span className="ml-auto text-xs opacity-70">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;