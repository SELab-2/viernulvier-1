// src/utils.test.ts
import { describe, it, expect } from 'vitest';
import { add } from './utils';

describe('Boilerplate Test', () => {
  it('should pass a simple math check', () => {
    expect(add(2, 2)).toBe(4);
  });
});