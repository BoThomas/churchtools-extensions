# Changelog

All notable changes to this extension will be documented in this file.

## 2025-12-22 — ct-translator v1.4.0

Doing the things better!

### Changes

- 8c6b494 feat(translator): implement fieldset state management
- 820aa53 feat(translator): enhance scrolling behavior in operator preview
- a3b5b49 style(translator): enhance placeholder styling in operator preview
- df33ac8 feat(translator): implement operator preview based on test preview
- 332bf69 chore(translator): reformat
- 2bda09d feat(translator): implement cleanup of stale sessions in localStorage
- 5550b6f feat(translator): optimize implementation of sliding window and approach for sending translation updates to the presentation view
- 688fe5e feat(translator): implement sliding window for finalized paragraphs to prevent memory exhaustion (WIP)
- d652c21 feat(translator): add language usage statistics and charts
- d91609b feat(translator): add start hint overlay in presentation mode
- 9abb182 fix(translator): address TypeScript ignore comments and improve message formatting in TranslationControlPanel
- 2dce8f2 docs(translator): update e2e testing README for Playwright integration
- 5aecc08 test(translator): enhance E2E tests for split-screen and multi-window presentations
- 015a5fa test: update test output configurations
- 12c3818 test(translator): add e2e tests for translation test
- 4aae044 test(translator): fix multi-window E2E test
- da70d58 test(translator): implement comprehensive E2E tests for presentation styling options
- de110f8 test(translator): fix testHelper bug, better settings-flow test
- ba84f71 refactor(translator): streamline E2E test setup by introducing helper functions for API configuration and tab navigation
- 003aaca test(translator): consolidate and enhance E2E tests for presentation modes
- 135d5e4 test(translator): add utility functions for configuring translation and add test presentation tests
- 57b5fbd test(translator): enhance cleanup and cross-window communication in E2E tests
- 0366cbb test(translator): add browser-compatible mock for Azure Speech SDK and update E2E test setup
- 5a07f95 test(translator): fix most of multi-window E2E tests
- e7d3869 test(translator): enhance E2E tests with cleanup utilities
- 3b598db test(translator): integrate real ChurchTools API for E2E tests and add authentication/cleanup utilities
- b618a37 test(translator): add end-to-end tests for multi-window mode, presentation mode, settings flow, and test mode WIP
- c8ab99f test(translator): integrate Playwright for E2E testing in Translator extension WIP
- 2627fba refactor(tests): rename test:ui script to test:gui
- b65f182 refactor(translator): remove unused vitest integration config file
- bf4d4f3 refactor(translator): replace setTimeout with waitUntil for speedy tests
- bf1b13d fix(translator): add environment in vitest.config.ts
- e8d0751 test(translator): enhance integration tests with complete KV store mock and fix other issues
- 9b13d37 feat: add mock implementation for kv-store with in-memory storage
- 319313a refactor(translator): remove redundant test scripts and test combine test configs
- 1e3a5c5 test(translator): add integration tests for settings persistence, translation workflow, and variant management (WIP)
- 7ef5b46 fix(translator): add validation for variant names, prevent deletion of Default variant, fix duration calculation
- d8d7aa9 test(translator): enhance mock data and setup utilities for testing
- d5d18ef docs(translator): document integration and ui testing plan
- c35925f feat(translator): add unit tests for translation state management, captioning service, session logger, and language helpers
- 0a508eb feat(translator): add Vitest configuration and testing scripts
- 4966270 feat(translator): enhance language validation and error handling in forms (#7)
- 9512f0a Add browser compatibility warning for translator presentation mode (#6)
- e7a5634 style(translator): enhance fullscreen instructions
- 098ac7f refactor(translator): add LanguageConfig type
- e775b74 refactor(translator): major refactoring of TranslateView.vue to use composables, reducing complexity and improving maintainability
- 9a45c22 feat(translator): add info message for popup blocker in multi-window mode
- 0938771 docs(translator): add documentation for current features and future enhancements
- 0dc3c4c feat(translator): replace dummy user data with negative IDs to avoid collisions and only show dummy button in dev
- 2d65ca5 feat(translator): display selected language in fullscreen instructions and extend auto-dismiss duration
- ff16545 feat(translator): add feature to show input language in presentation
- c79cdf9 feat(translator): add scroll functionality for test output containers
- fe58bd3 style(translator): adjust language header and start test presentation icon
- 692f556 feat(translator): enhance presentation start flow
- cf5c74a feat(translator): WIP move testing to settings
- fb21e6f feat(translator): implement session-based management for multi-window presentations and add multi window support
- ea48273 feat(translator): implement multi-language presentation modes with split-screen
- b9e9a73 feat(translator): add country flag emoji polyfill for better cross-platform support
- 597887f feat(translator): multi-language support in logger and reports + more usage of flags instead of language keys
- 6d55db5 feat(translator): support multiple output languages in captioning and translation services
- 5f9b426 fix: use cross-platform archiver for deploy script instead of zip command
- bec5b7a docs(build-tools): clarify date-prefixed tag format and git integration
- e432808 docs: update README to reflect Microsoft Foundry branding

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/compare/2025-12-06-ct-translator-v1.3.1...2025-12-22-ct-translator-v1.4.0

---
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
