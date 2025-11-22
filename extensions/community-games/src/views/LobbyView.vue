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
          class="relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          @click="$emit('select-game', game.id)"
        >
          <template #title>
            <div class="flex justify-between items-center">
              <span>{{ game.name }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-surface-500">{{ game.type }}</span>
                <Badge
                  v-if="game.status === 'lobby'"
                  value="Lobby"
                  severity="info"
                />
              </div>
            </div>
          </template>
          <template #subtitle>
            <!-- Empty or can be removed -->
          </template>
          <template #content>
            <div class="space-y-4">
              <!-- Current Turn Indicator (for active games) -->
              <div
                v-if="game.status === 'active'"
                class="text-center py-2 rounded-lg"
                :class="
                  game.currentTurn === 'red'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                "
              >
                <div class="flex items-center justify-center gap-2">
                  <i class="pi pi-clock text-xs"></i>
                  <span class="text-xs font-semibold">
                    <span
                      :class="
                        game.currentTurn === 'red'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      "
                    >
                      {{ game.currentTurn === 'red' ? 'Red' : 'Blue' }} Team
                    </span>
                    's Turn
                  </span>
                </div>
              </div>

              <!-- Team Stats in Horizontal Layout -->
              <div
                class="flex items-center justify-around gap-4 py-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="inline-flex items-center rounded-2xl px-2 py-1 text-xs gap-1 bg-red-500 dark:bg-red-600 text-white"
                  >
                    {{ game.teams.red.length }}
                  </div>
                  <span
                    class="text-xs font-medium text-red-600 dark:text-red-400"
                    >Red</span
                  >
                </div>
                <span class="text-surface-400 text-xs font-bold">VS</span>
                <div class="flex items-center gap-2">
                  <span
                    class="text-xs font-medium text-blue-600 dark:text-blue-400"
                    >Blue</span
                  >
                  <div
                    class="inline-flex items-center rounded-2xl px-2 py-1 text-xs gap-1 bg-blue-500 dark:bg-blue-600 text-white"
                  >
                    {{ game.teams.blue.length }}
                  </div>
                </div>
              </div>

              <!-- User Status -->
              <div v-if="getUserTeam(game)" class="text-center">
                <div
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800"
                >
                  <i class="pi pi-user text-xs"></i>
                  <span class="text-xs font-medium">
                    You're on
                    <span
                      :class="
                        getUserTeam(game) === 'red'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      "
                    >
                      {{ getUserTeam(game) === 'red' ? 'Red' : 'Blue' }} Team
                    </span>
                  </span>
                </div>
              </div>

              <!-- Click hint -->
              <div class="text-center text-xs text-surface-400 italic">
                Click to participate
              </div>
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
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Column from 'primevue/column';

const store = useGamesStore();

defineEmits(['select-game']);

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
