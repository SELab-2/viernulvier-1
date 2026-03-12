/* eslint-disable */

/// <reference types="vite/client" />
/// *.vue files are not known by default so we have to declare them.

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
