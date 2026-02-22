import type { FastifyInstance } from 'fastify';
import { expect, test, describe } from 'vitest';

export function basicTests(server: FastifyInstance) {
  describe('Root Route', () => {
    test('GET / should return hello world', async () => {
      // .inject() simulates a real HTTP request
      const response = await server.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ hello: 'world' });
    });
  });
}