# Changelog

All notable changes to this extension will be documented in this file.

## 2025-12-06 — ct-community-games v1.0.0

🎮 Initial release of Community Games!

### Changes

- 0f4b0f4 chore: reset for fresh releases
- cbed81e fix: update changelog, tag and release title format
- 7b134fe feat: add functions to get commits for multiple paths and workspace package dependencies in release
- 363e79f fix: ensure id comparison is done as numbers in getById method
- 2b0c046 fix: update fetchAllUsers to use getAllPages
- 6515f6d chore: add download release links to each extensions README
- fd72357 chore: add extension keys to README files for better installation guidance
- 871cc9f chore(community-games): release v1.0.1
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
- efcde04 feat: update release process to conditionally modify package.json and changelog
- 774249b feat: add option to keep current version during version bump
- 78f624a style: format release.js
- bc90029 chore(community-games): release v1.0.0
- ac71da6 feat: add release tool for managing extension releases and versioning
- 0f18fc0 feat: update extension names for consistency in package.json files
- eec7674 feat: update README files
- d2af364 feat: update local development environment configurations for Running Dinner and Community Games extensions
- b661e50 feat(games): Enhance voting mechanism to handle ties in move selection
- da73f91 feat(games): Implement move legality checks for Tic Tac Toe and Connect Four
- 9e428a3 feat(confirm-dialog): enhance button labels with fallback options
- 333b10d feat: update result class styling for game outcomes in LobbyView
- 7476f96 feat: update version to 0.1.1 and add refresh functionality in GameView and LobbyView
- 7e9a695 feat: update version to 0.1.0 in package.json
- 44a48cf feat: add Connect Four game support with game manager and canvas component
- 41f163f feat: improve board handling and click event clamping in TicTacToeCanvas
- 6b96a26 feat: replace divs with Chip components for team indicators and user status in GameView and LobbyView
- badec3d feat: update TicTacToeCanvas and GameView for improved player interaction and status display
- 7d1ca67 feat: enhance GameView and LobbyView with improved layout and current turn indicator
- 6d05202 feat: enhance game card in LobbyView with current turn indicator and improved layout
- cd1f3af feat: enhance game card display in LobbyView with user team indication and click hint
- 8c19e44 feat: simplify game display in LobbyView by removing unnecessary badge and updating teams column
- 4de4380 feat: enhance LobbyView with structured Fieldset and DataTable for active and finished games
- c1e6aac feat: enhance Chip component with size and severity props for better customization
- 52f225a feat: update turn indicators to specify player's team in GameView
- 96e3548 feat: enhance LobbyView layout and improve game display for active and finished games
- 6ed6e07 feat: add scrollable overflow to active and finished games sections in SettingsView
- b39c9aa feat: implement closeGame function to mark games as finished and update UI accordingly
- 65edf54 feat: add game management features to SettingsView with delete options for active and finished games
- 7b8e9d1 feat: change game status to active upon creation and update LobbyView to reflect game state
- 0f5c57c feat: implement automatic team assignment and update LobbyView to reflect team membership
- 08448d8 feat: implement GameManager and TicTacToeManager for improved game management
- 1cce4e0 feat: add initial Community Games extension with Tic Tac Toe functionality
- c52a5f9 feat: update createCustomDataValue to return created value and adjust PersistanceCategory.create method
- 1819c3c feat: enhance session management with pause and resume functionality, including active and paused duration tracking
- 98f6b12 feat: enhance session clearing by deleting and recreating the category in TranslatorStore
- 9d73972 feat: add exclude patterns for dist and node_modules in TypeScript configurations
- 1888930 feat: enhance extension metadata with author and repository information
- 3fc46c0 feat: add version info plugin and extension information display in translator and running dinner extensions
- 1229845 feat: add shared styles package and integrate into running-dinner and translator extensions
- 931d1ba fix: build script
- 2273c55 chore: reformat
- a66aaca chore(turbo.json): add type-check dependency for improved type validation
- 45bf58c feat(DangerButton): add loading icon animation for improved user feedback
- 449fa00 feat(DataTable): implement removable sorting and conditional row styling for improved usability
- 61ee227 feat(translator): update Toast component import path and add new Toast component for enhanced notifications
- 6935163 feat(translator): enhance TranslateView with popover help for input options
- 81720c8 feat(translator): refactor translation options to use Fieldset and Select components
- 1659afd fix: pass moduleId to createCustomDataCategory for category creation
- cb2a6c9 refactor: remove console log from getModule function
- dc0adea chore: update churchtools-client dependency to version 1.4.2
- bb31392 refactor: update key-value store documentation and API to require extension key
- ff3c8a4 some monorepo fixes
- 9dc5021 migrate to monorepo
- c7f37f7 init

**Full Changelog**: https://github.com/BoThomas/churchtools-extensions/commits/2025-12-06-ct-community-games-v1.0.0
