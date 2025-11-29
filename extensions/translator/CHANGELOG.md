# Changelog


## ct-translator v1.0.1 — 2025-11-29

🎤 Initial release of Translator!

### Changes

- 0f18fc0 feat: update extension names for consistency in package.json files
- eec7674 feat: update README files
- 86f0346 docs: remove outdated development and deployment instructions from README
- 329c2bb feat(package): update version for running-dinner and translator extensions
- 5277ec1 feat(translateview): add session ID check before updating current session and starting heartbeat
- 8cb0276 feat: update version to 1.0.0 and enhance description for speech-to-text functionality
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
- a66aaca chore(turbo.json): add type-check dependency for improved type validation
- be55c5f feat(TranslatorStore): add loading state to improve user experience during initialization
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

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/commits/ct-translator@1.0.1
