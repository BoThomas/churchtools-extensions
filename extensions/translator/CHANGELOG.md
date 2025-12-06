# Changelog

All notable changes to this extension will be documented in this file.

## 2025-12-06 — ct-translator v1.3.1

Fixes an issue where switching between setting variants would not properly migrate language settings from the old format to the new format, causing invalid language warnings to appear until the page was reloaded. The migration now correctly applies when selecting any variant.

### Changes

- 0fe4626 fix(translator): add settings migration when changing variants

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/compare/2025-12-06-ct-translator-v1.3.0...2025-12-06-ct-translator-v1.3.1

---
## 2025-12-06 — ct-translator v1.3.0

New input/output languages - a lot of them!

### Changes

- 960cf20 feat(translator): adding a lot of input languages
- 6407eae feat(translator): update output languages with a lot of new entries
- 43f08ed feat(translator): refactor language settings to use string codes instead of objects
- 156a1a2 feat(translator): integrate language options from external JSON configuration
- 9c90166 feat(translator): add filtering option to language selection dropdowns

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/compare/2025-12-06-ct-translator-v1.2.0...2025-12-06-ct-translator-v1.3.0

---
## 2025-12-06 — ct-translator v1.2.0

Add chinese output languages

### Changes

- 00ffd67 feat(translator): add additional Chinese language options for output

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/compare/2025-12-06-ct-translator-v1.1.0...2025-12-06-ct-translator-v1.2.0

---
## 2025-12-06 — ct-translator v1.1.0

New chinese input languages

### Changes

- 2a480e7 feat(translator): add Chinese (Mandarin) and Chinese (Cantonese) to input languages
- 85e100d docs: reformat some images
- 770c1a3 docs: add screenshots to READMEs
- 5b67ddd docs: add new images

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/compare/2025-12-06-ct-translator-v1.0.0...2025-12-06-ct-translator-v1.1.0

---
## 2025-12-06 — ct-translator v1.0.0

🎤 Initial release of Translator!

### Changes

- 0f4b0f4 chore: reset for fresh releases
- cbed81e fix: update changelog, tag and release title format
- 7b134fe feat: add functions to get commits for multiple paths and workspace package dependencies in release
- 363e79f fix: ensure id comparison is done as numbers in getById method
- 9d44370 chore: update README files to deprecate Running Dinner extension and clarify BETA status of Running Dinner Groups
- 6515f6d chore: add download release links to each extensions README
- fd72357 chore: add extension keys to README files for better installation guidance
- 6f4c3fa chore(translator): release v1.0.2
- a492420 feat: shorter release notes for GitHub releases
- 4ba2a42 chore: reset changelog files
- 8df5943 feat: update .env.example files and add corresponding .env files for extension-keys
- 32cb00b feat: add type checking for selected extensions before release
- f31f48b feat: make routes view nice
- 62c5642 feat: synchronize local state with store for dinner groups and routes, and implement create/delete functionality in dinner group store
- 30f2314 feat: enhance DinnerGroupBuilder with improved layout and new DataTable for group management
- bcf4206 feat: add more prime vue volt components
- 0802dc0 feat: implement loading states for registration actions and enhance menu functionality
- c6fe6c4 feat: enhance GitHub release process with push confirmation and manual release instructions
- cf1cd4d chore(translator): release v1.0.1
- efcde04 feat: update release process to conditionally modify package.json and changelog
- 774249b feat: add option to keep current version during version bump
- 78f624a style: format release.js
- bc90029 chore(community-games): release v1.0.0
- ac71da6 feat: add release tool for managing extension releases and versioning
- 0f18fc0 feat: update extension names for consistency in package.json files
- eec7674 feat: update README files
- 86f0346 docs: remove outdated development and deployment instructions from README
- 329c2bb feat(package): update version for running-dinner and translator extensions
- 5277ec1 feat(translateview): add session ID check before updating current session and starting heartbeat
- 9e428a3 feat(confirm-dialog): enhance button labels with fallback options
- 7d1ca67 feat: enhance GameView and LobbyView with improved layout and current turn indicator
- c1e6aac feat: enhance Chip component with size and severity props for better customization
- 8cb0276 feat: update version to 1.0.0 and enhance description for speech-to-text functionality
- c52a5f9 feat: update createCustomDataValue to return created value and adjust PersistanceCategory.create method
- 234d7f8 feat: update TranslationSession status to include 'paused' and adjust session simulation logic
- 1819c3c feat: enhance session management with pause and resume functionality, including active and paused duration tracking
- 98f6b12 feat: enhance session clearing by deleting and recreating the category in TranslatorStore
- f8de225 feat: simplify session management and enhance error handling in TranslateView
- 9d73972 feat: add exclude patterns for dist and node_modules in TypeScript configurations
- 1888930 feat: enhance extension metadata with author and repository information
- c6bfeaa feat: add outlined style to buttons in ReportsView for improved visibility
- b56c4fd feat: enhance Controls section in TranslateView with Badge for status indication
- 08d4ea7 feat: update button layout in ReportsView for improved UI consistency
- 951e651 feat: enhance UI layout in ReportsView and SettingsView for better usability
- 20c1788 feat: refactor Azure API settings layout with Card components for improved UI
- 3fc46c0 feat: add version info plugin and extension information display in translator and running dinner extensions
- ddc8da6 feat: replace Button with SecondaryButton for adding dummy sessions in ReportsView
- 1e264de feat: implement setting variants management and update UI for variant selection
- ee85fc7 fix: update API terminology in SettingsView.vue for clarity
- 302a438 feat: implement API settings management in translator extension
- fc195db fix: remove unused dependencies from package.json and update pnpm-lock.yaml
- 1229845 feat: add shared styles package and integrate into running-dinner and translator extensions
- 8966357 fix: enhance layout styles in TranslateView.vue
- a0d5387 fix: update version in package.json and enhance presentation styles in PresentationView.vue
- 165ed98 fix: hide navigation element during presentation and restore on unmount
- 6e35af5 fix: remove max-width from ReportsView and TranslateView templates for consistent layout
- 931d1ba fix: build script
- 2273c55 chore: reformat
- a66aaca chore(turbo.json): add type-check dependency for improved type validation
- be55c5f feat(TranslatorStore): add loading state to improve user experience during initialization
- 45bf58c feat(DangerButton): add loading icon animation for improved user feedback
- 2411852 feat(TranslatorStore): implement batch deletion of sessions with delays to prevent rate limiting
- 9b7faaf feat(ReportsView): add button to generate 100 dummy sessions for testing
- cde7808 feat(ReportsView): integrate chart.js for visualizing daily usage breakdown
- 45a5323 feat(ReportsView): add session search input for improved filtering by user, email, language, or status
- 1d6c393 feat(TranslateView): refactor presentation controls layout for improved usability and clarity
- 449fa00 feat(DataTable): implement removable sorting and conditional row styling for improved usability
- e726951 feat(translator): enhance presentation styling by removing scrollbars
- 4241971 feat(translator): clear presentation data on start, pause, and recording to avoid stale content
- 61ee227 feat(translator): update Toast component import path and add new Toast component for enhanced notifications
- 6fee4bd feat(translator): add global ConfirmDialog and Toast components; implement clearAllSessions functionality with confirmation in ReportsView
- b5e891f feat(translator): update Fieldset components to use props for legends and toggleable state for improved UI interaction
- 40a91ce feat(translator): replace Button components with appropriate styled variants for better UI consistency
- 1bee865 feat(translator): add functionality to preserve Azure credentials when resetting settings and implement restore defaults with confirmation
- ce964d3 feat(translator): replace Chip component with custom state indicator for translation control
- 3aa9f6a feat(translator): add test mode functionality with Lorem Ipsum text generation
- f7b4947 feat(translator): implement recording management and storage event handling in presentation flow
- 08a334d feat(translator): enhance presentation management with storage event handling and cleanup
- 6935163 feat(translator): enhance TranslateView with popover help for input options
- 9b3cdbc feat(translator): enhance session management with heartbeat tracking and duration calculations
- 79a661b feat(translator): implement complete usage statistics and session management in ReportsView
- f676d69 feat: add config files to export churchtools KEY for running-dinner and translator extensions
- 81720c8 feat(translator): refactor translation options to use Fieldset and Select components
- 18ea107 feat: configure VITE_PORT for running-dinner and translator extensions
- 30d7ea0 feat(translator): enhance translator extension with presentation mode and UI improvements
- 1d12bf2 feat(translator): initial commit of ChurchTools Translator extension
- 1659afd fix: pass moduleId to createCustomDataCategory for category creation
- cb2a6c9 refactor: remove console log from getModule function
- dc0adea chore: update churchtools-client dependency to version 1.4.2
- bb31392 refactor: update key-value store documentation and API to require extension key
- ff3c8a4 some monorepo fixes
- 9dc5021 migrate to monorepo
- c7f37f7 init

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/commits/2025-12-06-ct-translator-v1.0.0
