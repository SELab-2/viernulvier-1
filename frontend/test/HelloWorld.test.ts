import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import App from '@/App.vue';

test('renders the welcome message', () => {
  // Mount the component
  const wrapper = mount(App);

  // Check if specific text exists in the HTML
  expect(wrapper.text()).toContain('Vite + Vue');
});

test('increments count when button is clicked', async () => {
  const wrapper = mount(App);

  // Find the button and click it
  const button = wrapper.find('button');
  await button.trigger('click');

  expect(button.text()).toContain('count is 1');
});
