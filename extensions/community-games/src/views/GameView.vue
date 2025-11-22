<template>
  <div class="p-6 flex flex-col items-center gap-6">
    <div v-if="!game" class="text-center">
      <Message severity="warn">Game not found</Message>
      <Button label="Back to Lobby" class="mt-4" @click="$emit('back')" />
    </div>

    <template v-else>
      <!-- Header with Back Button -->
      <div class="w-full max-w-2xl flex justify-between items-center">
        <Button
          icon="pi pi-arrow-left"
          label="Back to Lobby"
          text
          @click="$emit('back')"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          text
          :loading="store.refreshing"
          @click="store.init()"
        />
      </div>

      <!-- Game Title -->
      <div class="text-center">
        <h1 class="text-3xl font-bold">{{ game.name }}</h1>
      </div>

      <!-- Winner Message -->
      <Card v-if="game.winner" class="w-full max-w-4xl">
        <template #content>
          <div class="text-center">
            <div v-if="game.winner === 'draw'" class="text-2xl font-bold">
              🤝 It's a Draw!
            </div>
            <div v-else class="text-2xl font-bold">
              <Chip
                :label="game.winner.toUpperCase() + ' TEAM WINS!'"
                size="small"
                :pt:root:class="
                  game.winner === 'red'
                    ? 'bg-red-500 dark:bg-red-600 text-white'
                    : 'bg-blue-500 dark:bg-blue-600 text-white'
                "
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Main Content: Canvas and Info Side by Side -->
      <div
        class="w-full max-w-4xl flex flex-col lg:flex-row-reverse gap-6 lg:gap-14 items-center lg:items-start"
      >
        <!-- Game Board -->
        <div class="flex flex-col items-center lg:shrink-0">
          <TicTacToeCanvas
            v-if="game.type === 'tictactoe'"
            :state="game.state"
            :votes="game.votes"
            :current-turn="game.currentTurn"
            :my-team="myTeam"
            @vote="handleVote"
          />
          <ConnectFourCanvas
            v-else-if="game.type === 'connectfour'"
            :state="game.state"
            :votes="game.votes"
            :current-turn="game.currentTurn"
            :my-team="myTeam"
            @vote="handleVote"
          />
        </div>

        <!-- Info Section -->
        <div class="flex flex-col gap-6 w-full max-w-md lg:flex-1">
          <!-- User Status -->
          <div v-if="myTeam" class="text-center">
            <Chip
              size="small"
              :pt:root:class="'bg-surface-100 dark:bg-surface-800'"
            >
              <template #default>
                <i class="pi pi-user text-xs"></i>
                <span class="text-xs font-medium ml-2">
                  You're on
                  <span
                    :class="
                      myTeam === 'red'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    "
                  >
                    {{ myTeam === 'red' ? 'Red' : 'Blue' }} Team
                  </span>
                </span>
              </template>
            </Chip>
          </div>

          <!-- Team Info -->
          <div class="space-y-4">
            <div class="flex gap-4">
              <Card
                class="flex-1 transition-all"
                :class="{
                  'ring-2 ring-red-500 dark:ring-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]':
                    game.status === 'active' &&
                    !game.winner &&
                    game.currentTurn === 'red',
                }"
              >
                <template #content>
                  <div class="text-center">
                    <Chip
                      label="RED TEAM"
                      size="small"
                      :pt:root:class="'bg-red-500 dark:bg-red-600 text-white mb-2'"
                    />
                    <div class="text-3xl font-bold">
                      {{ game.teams.red.length }}
                    </div>
                    <div class="text-sm text-surface-500">players</div>
                    <div
                      v-if="
                        game.status === 'active' &&
                        !game.winner &&
                        game.currentTurn === 'red'
                      "
                      class="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 animate-pulse"
                    >
                      PLAYING NOW
                    </div>
                  </div>
                </template>
              </Card>

              <Card
                class="flex-1 transition-all"
                :class="{
                  'ring-2 ring-blue-500 dark:ring-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]':
                    game.status === 'active' &&
                    !game.winner &&
                    game.currentTurn === 'blue',
                }"
              >
                <template #content>
                  <div class="text-center">
                    <Chip
                      label="BLUE TEAM"
                      size="small"
                      :pt:root:class="'bg-blue-500 dark:bg-blue-600 text-white mb-2'"
                    />
                    <div class="text-3xl font-bold">
                      {{ game.teams.blue.length }}
                    </div>
                    <div class="text-sm text-surface-500">players</div>
                    <div
                      v-if="
                        game.status === 'active' &&
                        !game.winner &&
                        game.currentTurn === 'blue'
                      "
                      class="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse"
                    >
                      PLAYING NOW
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>

          <!-- Current Turn Indicator -->
          <Card v-if="game.status === 'active' && !game.winner">
            <template #content>
              <div class="text-center">
                <div class="flex items-center justify-center gap-2">
                  <ProgressBar
                    :value="
                      (currentVoteCount / game.config.voteThreshold) * 100
                    "
                    :show-value="false"
                    :pt:root:class="'w-48'"
                    :pt:value:class="
                      game.currentTurn === 'red'
                        ? 'p-determinate:bg-red-500 dark:p-determinate:bg-red-600'
                        : 'p-determinate:bg-blue-500 dark:p-determinate:bg-blue-600'
                    "
                  />
                  <span class="text-sm text-surface-600 dark:text-surface-400">
                    {{ currentVoteCount }} /
                    {{ game.config.voteThreshold }} votes
                  </span>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGamesStore, type Game } from '../stores/games';
import TicTacToeCanvas from '../components/games/TicTacToeCanvas.vue';
import ConnectFourCanvas from '../components/games/ConnectFourCanvas.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import ProgressBar from '@churchtools-extensions/prime-volt/ProgressBar.vue';

const props = defineProps<{
  gameId: string;
}>();

defineEmits(['back']);

const store = useGamesStore();

const game = computed(() =>
  store.games.find((g: Game) => g.id === props.gameId),
);

const myTeam = computed(() => {
  if (!game.value || !store.currentUser) return null;
  if (game.value.teams.red.includes(store.currentUser.id)) return 'red';
  if (game.value.teams.blue.includes(store.currentUser.id)) return 'blue';
  return null;
});

const currentVoteCount = computed(() => {
  if (!game.value) return 0;
  return Object.keys(game.value.votes).length;
});

function handleVote(index: number) {
  if (game.value) {
    store.castVote(game.value.id, index);
  }
}
</script>
