import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useThemeContext } from '../../../client/src/components/ThemeProvider';

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, isLight } = useThemeContext();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <span data-testid="is-light">{isLight.toString()}</span>
    </div>
  );
};

describe('ThemeProvider', () => {
  it('provides light theme by default', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(screen.getByTestId('is-light')).toHaveTextContent('true');
  });

  it('wraps its children properly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child-element">Child content</div>
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByTestId('child-element')).toHaveTextContent('Child content');
  });
});