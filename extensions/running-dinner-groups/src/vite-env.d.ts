/// <reference types="vite/client" />
/// <reference types="@churchtools-extensions/build-tools/extension-info" />

// Type declaration for importing .vue Single File Components
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_KEY: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_EXTERNAL_API_URL: string;
  readonly VITE_USERNAME: string;
  readonly VITE_PASSWORD: string;
  readonly VITE_PORT: string;
  readonly VITE_EMAIL_MODE?: 'console' | 'churchtools';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
