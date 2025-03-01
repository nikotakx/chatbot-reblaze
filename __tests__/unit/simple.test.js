// Simple test file to check Jest configuration

describe('Basic functionality', () => {
  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should concatenate strings correctly', () => {
    expect('hello' + ' ' + 'world').toBe('hello world');
  });
});