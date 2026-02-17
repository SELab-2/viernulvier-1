import { greet } from '../src/index';

test('greets the user', () => {
  expect(greet('World')).toBe('Hello, World');
});