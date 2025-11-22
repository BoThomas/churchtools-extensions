<template>
  <div class="p-4 space-y-6">
    <!-- Active Games Section -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Active Games</h2>
      <div
        v-if="store.activeGames.length === 0"
        class="text-center text-surface-500 py-8"
      >
        No active games found. Create one in Settings!
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          v-for="game in store.activeGames"
          :key="game.id"
          class="relative overflow-hidden"
        >
          <template #title>
            <div class="flex justify-between items-start">
              <span>{{ game.name }}</span>
              <Badge
                :value="game.status"
                :severity="getSeverity(game.status)"
              />
            </div>
          </template>
          <template #subtitle>
            {{ game.type }}
          </template>
          <template #content>
            <div class="flex justify-between gap-4 mb-4">
              <div
                class="flex-1 p-2 bg-red-100 dark:bg-red-900/20 rounded text-center"
              >
                <div class="font-bold text-red-600 dark:text-red-400">
                  Red Team
                </div>
                <div class="text-2xl">{{ game.teams.red.length }}</div>
                <div
                  v-if="isUserInTeam(game, 'red')"
                  class="mt-2 text-sm font-semibold text-red-600 dark:text-red-400"
                >
                  You're on this team!
                </div>
              </div>
              <div
                class="flex-1 p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-center"
              >
                <div class="font-bold text-blue-600 dark:text-blue-400">
                  Blue Team
                </div>
                <div class="text-2xl">{{ game.teams.blue.length }}</div>
                <div
                  v-if="isUserInTeam(game, 'blue')"
                  class="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
                >
                  You're on this team!
                </div>
              </div>
            </div>

            <div class="text-center">
              <Button
                label="Go to Game"
                severity="secondary"
                @click="$emit('select-game', game.id)"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Past Games Section -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Past Games</h2>
      <div
        v-if="store.finishedGames.length === 0"
        class="text-center text-surface-500 py-8"
      >
        No finished games yet.
      </div>

      <div v-else class="space-y-3 max-h-96 overflow-y-auto">
        <Card
          v-for="game in store.finishedGames"
          :key="game.id"
          class="relative overflow-hidden"
        >
          <template #title>
            <div class="flex justify-between items-start">
              <span>{{ game.name }}</span>
              <Badge
                v-if="game.winner"
                :value="`${game.winner.toUpperCase()} WON`"
                :severity="game.winner === 'red' ? 'danger' : 'info'"
              />
              <Badge v-else value="NO WINNER" severity="secondary" />
            </div>
          </template>
          <template #content>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-surface-500 dark:text-surface-400"
                  >Your Team:</span
                >
                <Badge
                  v-if="getUserTeam(game)"
                  :value="getUserTeam(game)!.toUpperCase()"
                  :severity="getUserTeam(game) === 'red' ? 'danger' : 'info'"
                />
                <span
                  v-else
                  class="text-surface-400 dark:text-surface-500 italic"
                  >Spectator</span
                >
              </div>
              <div class="flex justify-between items-center">
                <span class="text-surface-500 dark:text-surface-400"
                  >Result:</span
                >
                <span
                  v-if="game.winner && getUserTeam(game)"
                  :class="
                    game.winner === getUserTeam(game)
                      ? 'text-green-600 dark:text-green-400 font-semibold'
                      : 'text-red-600 dark:text-red-400'
                  "
                >
                  {{ game.winner === getUserTeam(game) ? 'Victory' : 'Defeat' }}
                </span>
                <span
                  v-else
                  class="text-surface-400 dark:text-surface-500 italic"
                  >{{ game.winner ? 'Not Playing' : 'Draw' }}</span
                >
              </div>
              <div class="flex justify-between items-center">
                <span class="text-surface-500 dark:text-surface-400"
                  >Teams:</span
                >
                <span class="text-xs">
                  Red: {{ game.teams.red.length }} | Blue:
                  {{ game.teams.blue.length }}
                </span>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGamesStore, type Game } from '../stores/games';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';

const store = useGamesStore();

defineEmits(['select-game']);

function getSeverity(status: string) {
  switch (status) {
    case 'lobby':
      return 'info';
    case 'active':
      return 'success';
    case 'finished':
      return 'secondary';
    default:
      return 'info';
  }
}

function isUserInTeam(game: Game, team: 'red' | 'blue') {
  if (!store.currentUser) return false;
  return game.teams[team].includes(store.currentUser.id);
}

function getUserTeam(game: Game): 'red' | 'blue' | null {
  if (!store.currentUser) return null;
  if (game.teams.red.includes(store.currentUser.id)) return 'red';
  if (game.teams.blue.includes(store.currentUser.id)) return 'blue';
  return null;
}
</script>
