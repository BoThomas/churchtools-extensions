/// <reference types="vite/client" />
/// <reference types="@churchtools-extensions/build-tools/extension-info" />

interface ImportMetaEnv {
  readonly VITE_KEY: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_EXTERNAL_API_URL: string;
  readonly VITE_USERNAME: string;
  readonly VITE_PASSWORD: string;
  readonly VITE_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
