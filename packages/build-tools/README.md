# ChurchTools Build Tools

Centralized build and packaging tools for ChurchTools extensions in this monorepo.

## Features

### 1. Extension Packaging (`ct-package`)

Creates a production-ready ZIP archive of your extension for deployment to ChurchTools.

**Usage:**

```bash
pnpm deploy
```

This command:

- Builds your extension
- Reads version info from `package.json`
- Gets the current git commit hash
- Creates a ZIP file in the `releases/` directory at the monorepo root
- Names the file: `<extension-name>-v<version>-<git-hash>.zip`

### 2. Version Info Plugin

A Vite plugin that automatically injects version and build information into your extension at build time.

**Setup:**

1. Add the plugin to your `vite.config.ts`:

```typescript
import { versionInfoPlugin } from '@churchtools-extensions/build-tools/version-info-plugin';

export default defineConfig({
  plugins: [
    // ... other plugins
    versionInfoPlugin(),
  ],
});
```

2. Add the TypeScript reference to your `vite-env.d.ts`:

```typescript
/// <reference types="@churchtools-extensions/build-tools/extension-info" />
```

3. Import and use the version info in your Vue components:

```typescript
import extensionInfo from 'virtual:extension-info';

console.log(extensionInfo.name); // Extension name from package.json
console.log(extensionInfo.version); // Version from package.json
console.log(extensionInfo.description); // Description from package.json
console.log(extensionInfo.gitHash); // Short git commit hash
console.log(extensionInfo.gitBranch); // Current git branch
console.log(extensionInfo.buildDate); // ISO timestamp of the build
```

**Available Information:**

- `name`: Extension name from `package.json`
- `version`: Version from `package.json`
- `description`: Description from `package.json`
- `gitHash`: Short git commit hash (7 characters)
- `gitBranch`: Current git branch name
- `buildDate`: ISO 8601 timestamp when the extension was built

**Example Usage in Vue:**

```vue
<template>
  <div>
    <p>Version: {{ extensionInfo.version }}</p>
    <p>Build: {{ extensionInfo.gitHash }}</p>
    <p>Built on: {{ new Date(extensionInfo.buildDate).toLocaleString() }}</p>
  </div>
</template>

<script setup lang="ts">
import extensionInfo from 'virtual:extension-info';
</script>
```
