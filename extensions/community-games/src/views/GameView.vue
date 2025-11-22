<template>
  <div class="p-6 flex flex-col items-center gap-6">
    <div v-if="!game" class="text-center">
      <Message severity="warn">Game not found</Message>
      <Button label="Back to Lobby" class="mt-4" @click="$emit('back')" />
    </div>

    <template v-else>
      <!-- Header with Back Button -->
      <div class="w-full max-w-2xl">
        <Button
          icon="pi pi-arrow-left"
          label="Back to Lobby"
          text
          @click="$emit('back')"
        />
      </div>

      <!-- Game Title and Status -->
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">{{ game.name }}</h1>
        <Badge
          :value="game.status"
          :severity="
            game.status === 'active'
              ? 'success'
              : game.status === 'finished'
                ? 'secondary'
                : 'info'
          "
        />
      </div>

      <!-- Current Turn Indicator -->
      <Card
        v-if="game.status === 'active' && !game.winner"
        class="w-full max-w-md"
      >
        <template #content>
          <div class="text-center">
            <div class="flex items-center justify-center gap-3 mb-2">
              <div
                class="inline-flex items-center rounded-2xl px-3 py-2 gap-2"
                :class="
                  game.currentTurn === 'red'
                    ? 'bg-red-500 dark:bg-red-600 text-white'
                    : 'bg-blue-500 dark:bg-blue-600 text-white'
                "
              >
                {{ game.currentTurn.toUpperCase() + ' TEAM' }}
              </div>
              <span class="text-lg font-semibold">is playing</span>
            </div>
            <div class="flex items-center justify-center gap-2 mt-3">
              <ProgressBar
                :value="(currentVoteCount / game.config.voteThreshold) * 100"
                class="w-48"
                :show-value="false"
              />
              <span class="text-sm text-surface-600 dark:text-surface-400">
                {{ currentVoteCount }} / {{ game.config.voteThreshold }} votes
              </span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Winner Message -->
      <Card v-if="game.winner" class="w-full max-w-md">
        <template #content>
          <div class="text-center">
            <div v-if="game.winner === 'draw'" class="text-2xl font-bold">
              🤝 It's a Draw!
            </div>
            <div v-else class="text-2xl font-bold">
              <div
                class="inline-flex items-center rounded-2xl px-4 py-3 text-base gap-2"
                :class="
                  game.winner === 'red'
                    ? 'bg-red-500 dark:bg-red-600 text-white'
                    : 'bg-blue-500 dark:bg-blue-600 text-white'
                "
              >
                {{ game.winner.toUpperCase() + ' TEAM WINS!' }}
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Game Board -->
      <div class="flex flex-col items-center">
        <TicTacToeCanvas
          v-if="game.type === 'tictactoe'"
          :state="game.state"
          :votes="game.votes"
          :current-turn="game.currentTurn"
          :my-team="myTeam"
          @vote="handleVote"
        />
      </div>

      <!-- Team Info -->
      <div class="flex gap-4 w-full max-w-md">
        <Card class="flex-1">
          <template #content>
            <div class="text-center">
              <div
                class="inline-flex items-center rounded-2xl px-3 py-2 gap-2 bg-red-500 dark:bg-red-600 text-white mb-2"
              >
                RED TEAM
              </div>
              <div class="text-3xl font-bold">
                {{ game.teams.red.length }}
              </div>
              <div class="text-sm text-surface-500">players</div>
            </div>
          </template>
        </Card>

        <Card class="flex-1">
          <template #content>
            <div class="text-center">
              <div
                class="inline-flex items-center rounded-2xl px-3 py-2 gap-2 bg-blue-500 dark:bg-blue-600 text-white mb-2"
              >
                BLUE TEAM
              </div>
              <div class="text-3xl font-bold">
                {{ game.teams.blue.length }}
              </div>
              <div class="text-sm text-surface-500">players</div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Player Status -->
      <Card class="w-full max-w-md">
        <template #content>
          <div class="text-center text-surface-600 dark:text-surface-400">
            <p v-if="myTeam">
              You are playing on
              <span
                class="inline-flex items-center rounded-2xl px-3 py-2 gap-2"
                :class="
                  myTeam === 'red'
                    ? 'bg-red-500 dark:bg-red-600 text-white'
                    : 'bg-blue-500 dark:bg-blue-600 text-white'
                "
              >
                {{ myTeam.toUpperCase() + ' TEAM' }}
              </span>
            </p>
            <p v-else class="flex items-center justify-center gap-2">
              <i class="pi pi-eye"></i>
              <span>You are spectating this game</span>
            </p>
          </div>
        </template>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGamesStore, type Game } from '../stores/games';
import TicTacToeCanvas from '../components/games/TicTacToeCanvas.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
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
