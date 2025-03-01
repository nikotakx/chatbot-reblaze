import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { 
  askQuestionSchema,
  refreshRepositorySchema
} from '../../shared/schema';

describe('Schema Validation', () => {
  describe('askQuestionSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        message: 'How do I use the API?',
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        // Missing message field
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('message');
      }
    });

    it('should reject empty message', () => {
      const invalidInput = {
        message: '',
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshRepositorySchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        url: 'https://github.com/example/repo',
        branch: 'main'
      };
      
      const result = refreshRepositorySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        url: 'not-a-url',
        branch: 'main'
      };
      
      const result = refreshRepositorySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});