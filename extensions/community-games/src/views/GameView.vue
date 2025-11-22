<template>
  <div class="p-4 flex flex-col items-center gap-6">
    <div v-if="!game" class="text-center">
      <p>Game not found</p>
      <Button label="Back to Lobby" @click="$emit('back')" />
    </div>

    <template v-else>
      <div class="w-full max-w-4xl flex justify-between items-center">
        <Button
          icon="pi pi-arrow-left"
          label="Lobby"
          text
          @click="$emit('back')"
        />
        <h1 class="text-2xl font-bold">{{ game.name }}</h1>
        <Badge :value="game.status" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        <!-- Red Team -->
        <Card class="h-full border-t-4 border-red-500">
          <template #title>Red Team</template>
          <template #content>
            <div class="text-4xl font-bold text-center mb-4">
              {{ game.teams.red.length }}
            </div>
            <div
              v-if="game.currentTurn === 'red' && game.status === 'active'"
              class="text-center text-red-600 font-bold animate-pulse"
            >
              YOUR TURN
            </div>
          </template>
        </Card>

        <!-- Game Board -->
        <div class="flex flex-col items-center justify-center">
          <TicTacToeCanvas
            v-if="game.type === 'tictactoe'"
            :state="game.state"
            :votes="game.votes"
            :current-turn="game.currentTurn"
            :my-team="myTeam"
            @vote="handleVote"
          />

          <div v-if="game.winner" class="mt-4 text-2xl font-bold">
            <span v-if="game.winner === 'draw'">It's a Draw!</span>
            <span
              v-else
              :class="game.winner === 'red' ? 'text-red-500' : 'text-blue-500'"
            >
              {{ game.winner.toUpperCase() }} WINS!
            </span>
          </div>
        </div>

        <!-- Blue Team -->
        <Card class="h-full border-t-4 border-blue-500">
          <template #title>Blue Team</template>
          <template #content>
            <div class="text-4xl font-bold text-center mb-4">
              {{ game.teams.blue.length }}
            </div>
            <div
              v-if="game.currentTurn === 'blue' && game.status === 'active'"
              class="text-center text-blue-600 font-bold animate-pulse"
            >
              YOUR TURN
            </div>
          </template>
        </Card>
      </div>

      <div class="text-center text-surface-500">
        <p>Vote Threshold: {{ game.config.voteThreshold }} votes needed</p>
        <p v-if="myTeam">
          You are on team:
          <span
            class="font-bold"
            :class="myTeam === 'red' ? 'text-red-500' : 'text-blue-500'"
            >{{ myTeam.toUpperCase() }}</span
          >
        </p>
        <p v-else>You are spectating</p>
      </div>
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

function handleVote(index: number) {
  if (game.value) {
    store.castVote(game.value.id, index);
  }
}
</script>
