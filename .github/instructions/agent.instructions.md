---
applyTo: '**'
---

# ChurchTools Extensions

This monorepo contains extensions for [ChurchTools](https://church.tools/), a church management software. Extensions are Vue 3 applications that integrate with the ChurchTools platform using their API and Custom Module data storage.

## Important Notes

- **ChurchTools API**: Refer to `/docs/openapi.json` for API documentation
- **ChurchTools types**: Use types from `/packages/ct-utils/ct-types.d.ts` for API types
- **KV Store limits**: Be mindful of storage limits in the Custom Module data store

## Project Overview

### What is ChurchTools?

ChurchTools is a comprehensive church management software used by churches across Germany and beyond. It handles member management, group organization, events, services, and more.

### What are ChurchTools Extensions?

Extensions are web applications that extend ChurchTools' functionality. They:

- Run embedded in the ChurchTools web interface
- Use the ChurchTools API for data access (people, groups, etc.) as well as its authentication system
- Store extension-specific data in ChurchTools' Custom Module KV store
- Are styled to match the ChurchTools design language by using PrimeVue/Volt components

## Repository Structure

```
churchtools-extensions/
├── extensions/              # Individual extension applications
│   ├── translator/          # Real-time speech-to-text translation
│   ├── running-dinner/      # Running Dinner event management (standalone)
│   ├── running-dinner-groups/ # Running Dinner using CT groups integration
│   └── community-games/     # Interactive community games (TicTacToe, Connect4)
├── packages/                # Shared internal packages
│   ├── ct-utils/            # ChurchTools utilities (KV store, API types)
│   ├── persistance/         # Data persistence layer (PersistanceCategory class)
│   ├── prime-volt/          # Themed PrimeVue/Volt components
│   ├── build-tools/         # Packaging and version info plugins
│   └── shared-styles/       # Common CSS styles
├── certs/                   # Local HTTPS certificates (not committed)
├── docs/                    # General documentation
└── releases/                # Built extension packages
```

## Technology Stack

- **Framework**: Vue 3 with Composition API and `<script setup>`
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **Monorepo**: pnpm workspaces + Turborepo
- **State Management**: Pinia stores
- **UI Components**: PrimeVue/Volt via `@churchtools-extensions/prime-volt`
- **Styling**: Tailwind CSS
- **ChurchTools Client**: `@churchtools/churchtools-client`
- **Validation**: Zod schemas (where applicable)

## Coding Conventions

### Vue Components

1. **Use `<script setup>` syntax** - Always prefer Composition API with script setup
2. **Component naming**: PascalCase for component files (e.g., `DinnerCard.vue`)
3. **Props/Emits**: Use `defineProps` and `defineEmits` with TypeScript types
4. **Template structure**: `<template>`, `<script setup>`, `<style>` order

### TypeScript

1. **Strict typing**: Avoid `any` - define proper interfaces
2. **Types location**: Store shared types in `src/types/` directory
3. **Use Zod**: For runtime validation, define Zod schemas alongside TypeScript types

### State Management (Pinia)

1. **Store naming**: Use descriptive names matching the domain (e.g., `useRunningDinnerStore`)
2. **Store location**: `src/stores/` directory
3. **Async actions**: Handle loading and error states

### Imports

1. **Shared packages**: Import from workspace packages

   ```ts
   import { PersistanceCategory } from '@churchtools-extensions/persistance';
   import Button from '@churchtools-extensions/prime-volt/Button.vue';
   import { kvStore } from '@churchtools-extensions/ct-utils/kv-store';
   ```

2. **Path aliases**: Use `@/` for src-relative imports within extensions
   ```ts
   import { useMyStore } from '@/stores/myStore';
   ```

### UI Components

Always use atomic components from `@churchtools-extensions/prime-volt` rather than importing PrimeVue directly. This ensures consistent theming across all extensions.

Available components include:

- Button, SecondaryButton, ContrastButton, DangerButton
- Card, Dialog, ConfirmDialog
- InputText, InputNumber, Select, Multiselect, AutoComplete
- DataTable, Tabs/Tab/TabList/TabPanels, Listbox
- Badge, Chip, Message, ProgressBar
- DatePicker, Checkbox, RadioButton
- And more...

### Data Persistence

Use the `PersistanceCategory` class for storing extension data:

```ts
import { PersistanceCategory } from '@churchtools-extensions/persistance';

const category = await PersistanceCategory.init({
  extensionkey: 'my-extension',
  categoryShorty: 'items',
});

// CRUD operations
await category.create(data);
await category.list();
await category.get(id);
await category.update(id, data);
await category.delete(id);
```

## Development Workflow

1. **Install dependencies**: `pnpm install` from root
2. **Start dev server**: `pnpm dev --filter=<extension-name>`
3. **Build**: `pnpm build` or `turbo build --filter=<extension-name>`
4. **Package for deployment**: `pnpm deploy` in extension directory

## Common Patterns

### Loading States

```vue
<template>
  <div v-if="store.loading">Loading...</div>
  <div v-else-if="store.error">{{ store.error }}</div>
  <div v-else>
    <!-- Content -->
  </div>
</template>
```

### Extension Info Display

Use the version info plugin for displaying build information:

```vue
<script setup>
import extensionInfo from 'virtual:extension-info';
</script>
```
