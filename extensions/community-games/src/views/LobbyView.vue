<template>
  <div class="space-y-6 p-4">
    <!-- Active Games Section -->
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-bolt"></i>
          <span class="font-semibold">Active Games</span>
        </div>
      </template>

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
            <span>{{ game.name }}</span>
          </template>
          <template #subtitle>
            {{ game.type }}
          </template>
          <template #content>
            <div class="flex justify-between gap-4 mb-4">
              <div class="flex-1 text-center">
                <div
                  class="font-semibold text-sm mb-2 text-red-600 dark:text-red-400"
                >
                  Red Team
                </div>
                <Chip
                  :label="String(game.teams.red.length)"
                  severity="danger"
                  size="small"
                />
                <div
                  v-if="isUserInTeam(game, 'red')"
                  class="mt-2 text-xs font-semibold text-red-600 dark:text-red-400"
                >
                  You're on this team!
                </div>
              </div>
              <div class="flex-1 text-center">
                <div
                  class="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400"
                >
                  Blue Team
                </div>
                <Chip
                  :label="String(game.teams.blue.length)"
                  severity="info"
                  size="small"
                />
                <div
                  v-if="isUserInTeam(game, 'blue')"
                  class="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400"
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
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-history"></i>
          <span class="font-semibold">Past Games</span>
        </div>
      </template>

      <DataTable
        :value="store.finishedGames"
        dataKey="id"
        stripedRows
        removableSort
        responsiveLayout="scroll"
      >
        <template #empty>
          <Message severity="secondary" icon="pi pi-clock" class="w-full">
            No finished games yet.
          </Message>
        </template>

        <Column field="name" header="Game" sortable>
          <template #body="{ data }">
            <div class="font-semibold">{{ data.name }}</div>
            <div class="text-xs text-surface-500">{{ data.type }}</div>
          </template>
        </Column>

        <Column header="Teams" style="width: 10rem">
          <template #body="{ data }">
            <div class="flex flex-col text-xs">
              <span>Red: {{ data.teams.red.length }}</span>
              <span>Blue: {{ data.teams.blue.length }}</span>
            </div>
          </template>
        </Column>

        <Column header="Your Team" style="width: 8rem">
          <template #body="{ data }">
            <Chip
              v-if="getUserTeam(data)"
              :label="getUserTeam(data) === 'red' ? 'Red' : 'Blue'"
              :severity="getUserTeam(data) === 'red' ? 'danger' : 'info'"
              size="small"
            />
            <span v-else class="text-xs text-surface-500 italic"
              >Spectator</span
            >
          </template>
        </Column>

        <Column header="Result" style="width: 10rem">
          <template #body="{ data }">
            <Chip
              :label="getResultLabel(data)"
              :severity="getResultSeverity(data)"
              size="small"
            />
          </template>
        </Column>
      </DataTable>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import { useGamesStore, type Game } from '../stores/games';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Column from 'primevue/column';

const store = useGamesStore();

defineEmits(['select-game']);

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

function getResultLabel(game: Game): string {
  const userTeam = getUserTeam(game);

  if (!game.winner) return 'Draw';
  if (!userTeam) return 'Not Playing';
  if (game.winner === userTeam) return 'Victory';
  return 'Defeat';
}

function getResultSeverity(game: Game): 'success' | 'danger' | 'secondary' {
  const userTeam = getUserTeam(game);
  if (!game.winner || !userTeam) return 'secondary';
  return game.winner === userTeam ? 'success' : 'danger';
}
</script>
