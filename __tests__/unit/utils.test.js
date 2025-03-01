// Simple test for utility functions

const { cn } = require('../../client/src/lib/utils');

describe('Utility Functions', () => {
  describe('cn function', () => {
    it('should concatenate class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional class names', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should filter out falsy values', () => {
      const result = cn('base', null, undefined, false, 0, '', 'extra');
      expect(result).toBe('base extra');
    });
  });
});