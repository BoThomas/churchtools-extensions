/// <reference types="vite/client" />
/// <reference types="@churchtools-extensions/build-tools/extension-info" />

// Type declaration for importing .vue Single File Components
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
