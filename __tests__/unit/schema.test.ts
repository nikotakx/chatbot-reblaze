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
        question: 'How do I use the API?',
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        // Missing question field
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('question');
      }
    });

    it('should reject empty question', () => {
      const invalidInput = {
        question: '',
        sessionId: '12345'
      };
      
      const result = askQuestionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshRepositorySchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        repositoryId: 1
      };
      
      const result = refreshRepositorySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        repositoryId: 'not-a-number'
      };
      
      const result = refreshRepositorySchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});