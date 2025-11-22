<template>
  <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-if="store.activeGames.length === 0"
      class="col-span-full text-center text-surface-500"
    >
      No active games found. Create one in Settings!
    </div>

    <Card
      v-for="game in store.activeGames"
      :key="game.id"
      class="relative overflow-hidden"
    >
      <template #title>
        <div class="flex justify-between items-start">
          <span>{{ game.name }}</span>
          <Badge :value="game.status" :severity="getSeverity(game.status)" />
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
            <div class="font-bold text-red-600 dark:text-red-400">Red Team</div>
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
</script>
