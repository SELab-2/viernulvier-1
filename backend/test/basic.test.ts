import { expect, test, describe } from 'vitest';
import { app } from '@/index.js';

describe('Root Route', () => {
  test('GET / should return hello world', async () => {
    // .inject() simulates a real HTTP request
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ hello: 'world' });
  });
});