## Plan: Monorepo Migration with Turborepo

You're migrating from a single app with loosely coupled packages to a proper pnpm + Turborepo monorepo. The key challenge is that your packages aren't proper npm packages yet, and your import paths expect symlinks that don't exist. We'll fix the structure, create proper packages with `package.json` files, set up workspace references, configure Turborepo, and wire everything together.

### Steps

1. **Create workspace foundation** by adding `pnpm-workspace.yaml` at root defining `extensions/*` and `packages/*`, then create `turbo.json` with build/dev/deploy tasks configured for the ChurchTools deployment workflow.

2. **Add `package.json` files to packages** — create proper package configs for `@churchtools-extensions/ct-utils`, `@churchtools-extensions/persistance`, and `@churchtools-extensions/prime-volt` with correct dependencies (PrimeVue, Vue, Pinia, tailwind-merge, @churchtools/churchtools-client).

3. **Consolidate root tooling** by moving `prettier` and shared devDependencies from `extensions/running-dinner/package.json` to root `package.json`, adding shared TypeScript config at root, and updating running-dinner to reference workspace packages via `workspace:*` protocol.

4. **Fix import paths in running-dinner** by updating all imports from `@/api/persistance`, `@/utils/`, `@/volt/` to proper package imports like `@churchtools-extensions/persistance`, `@churchtools-extensions/ct-utils`, `@churchtools-extensions/prime-volt`, and updating `vite.config.ts` to remove unnecessary aliases.

5. **Update build configuration** by adding TypeScript project references in package `tsconfig.json` files with `composite: true`, updating `extensions/running-dinner/tsconfig.json` to reference workspace packages, and ensuring Turborepo task dependencies are correct for build order.

6. **Verify and document** by running `pnpm install` to link workspace packages, testing `turbo dev` and `turbo build`, confirming the `scripts/package.js` deployment still works, and updating README with monorepo structure and commands.

### Further Considerations

1. **Package naming strategy** — I suggest `@churchtools-extensions/` scope for consistency. Should packages be private or published? Recommendation: keep `"private": true` unless you plan to publish to npm.

2. **Shared certs directory** — Currently `vite.config.ts` references `../../certs/`. Should we keep certs at root or move to each extension? Recommendation: keep at root and update relative path in vite configs.

3. **TypeScript strictness** — Do you want consistent strict TypeScript settings across all packages, or should packages have flexibility? Recommendation: shared base `tsconfig.base.json` with strict settings, packages can extend and loosen if needed.

4. **Future extensions structure** — When you add the second app, will it share the same ChurchTools deployment pattern (build → ZIP → releases)? Should we create shared build utilities? Recommendation: extract common deploy logic to a shared package if patterns match.
