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

### 2. Release Tool (`ct-release`)

An interactive CLI tool for releasing extensions with proper versioning, changelogs, and GitHub releases.

**Usage:**

```bash
# From monorepo root
pnpm release
```

**Features:**

- **Multi-select**: Release multiple extensions in one session
- **Commit history**: Shows commits since last release for each extension
- **Semver bumping**: Choose patch/minor/major version bump
- **Git integration**: Creates commits and annotated tags (`<pkg-name>@<version>`)
- **Changelog generation**: Automatically creates/updates `CHANGELOG.md`
- **GitHub releases**: Optionally creates GitHub releases with ZIP attachments
- **Push control**: Choose whether to push commits and tags

**Prerequisites:**

- [GitHub CLI](https://cli.github.com/) (`gh`) for creating GitHub releases (optional)
  ```bash
  brew install gh
  gh auth login
  ```

**Tag format:** `<package-name>@<version>` (e.g., `ct-translator@1.0.2`)

**Release workflow:**

1. Select extensions to release
2. For each extension:
   - View commits since last release
   - Choose version bump (patch/minor/major)
   - Enter release summary
   - Automatically: bump version, commit, tag, build, update changelog
3. Optionally create GitHub releases
4. Optionally push commits and tags

### 3. Version Info Plugin

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
