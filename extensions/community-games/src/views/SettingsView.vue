<template>
  <div class="space-y-6 max-w-5xl">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <template #title>Create New Game</template>
        <template #content>
          <div class="space-y-4">
            <div class="flex flex-col gap-2">
              <label for="gameName" class="font-medium text-sm"
                >Game Name</label
              >
              <InputText
                id="gameName"
                v-model="newGameName"
                placeholder="e.g. Friday Night TicTacToe"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="gameType" class="font-medium text-sm"
                >Game Type</label
              >
              <Select
                id="gameType"
                v-model="newGameType"
                :options="gameTypes"
                optionLabel="label"
                optionValue="value"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="voteThreshold" class="font-medium text-sm"
                >Vote Threshold</label
              >
              <InputNumber
                id="voteThreshold"
                v-model="voteThreshold"
                :min="1"
                showButtons
                class="w-full"
              />
              <p class="text-xs text-surface-500 dark:text-surface-400">
                Number of votes required to make a move.
              </p>
            </div>

            <div class="flex gap-3 pt-4">
              <Button
                label="Create Game"
                icon="pi pi-plus"
                @click="handleCreateGame"
                :loading="creating"
              />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>About Community Games</template>
        <template #content>
          <div class="space-y-4">
            <p>
              Play interactive games with your community directly in
              ChurchTools.
            </p>
            <p>Currently supported games:</p>
            <ul class="list-disc list-inside ml-4">
              <li>Tic Tac Toe (Team vs Team)</li>
            </ul>
            <p class="text-sm text-surface-500">More games coming soon!</p>
          </div>
        </template>
      </Card>
    </div>

    <Card>
      <template #title>Extension Information</template>
      <template #content>
        <div
          class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center max-w-2xl"
        >
          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Name</span
          >
          <div>
            <Badge :value="extensionInfo.name" severity="contrast" />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Version</span
          >
          <div class="flex items-center gap-2">
            <Badge :value="extensionInfo.version" severity="contrast" />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Git Commit</span
          >
          <div class="flex items-center gap-2">
            <Badge :value="'# ' + extensionInfo.gitHash" severity="secondary" />
            <Badge
              :value="'⎇ ' + extensionInfo.gitBranch"
              severity="secondary"
            />
          </div>

          <span class="text-surface-500 dark:text-surface-400 text-sm"
            >Built</span
          >
          <div>
            <Badge
              :value="formatDate(extensionInfo.buildDate)"
              severity="secondary"
            />
          </div>

          <template
            v-if="extensionInfo.authorName || extensionInfo.authorEmail"
          >
            <span class="text-surface-500 dark:text-surface-400 text-sm"
              >Author</span
            >
            <a
              v-if="extensionInfo.authorEmail"
              :href="'mailto:' + extensionInfo.authorEmail"
              class="flex items-center gap-2 text-sm group"
              target="_blank"
            >
              <i class="pi pi-envelope text-primary"></i>
              <span class="group-hover:underline">{{
                extensionInfo.authorName
              }}</span>
            </a>
            <span v-else class="text-sm">{{ extensionInfo.authorName }}</span>
          </template>

          <template v-if="extensionInfo.repositoryUrl">
            <span class="text-surface-500 dark:text-surface-400 text-sm"
              >Repository</span
            >
            <a
              :href="extensionInfo.repositoryUrl"
              target="_blank"
              class="flex items-center gap-2 text-xs font-mono group"
            >
              <i class="pi pi-github text-sm text-primary"></i>
              <span
                class="text-surface-500 dark:text-surface-400 group-hover:underline"
              >
                {{ extensionInfo.repositoryUrl }}
              </span>
            </a>
          </template>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGamesStore, type GameType } from '../stores/games';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import InputNumber from '@churchtools-extensions/prime-volt/InputNumber.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import { useToast } from 'primevue/usetoast';
import extensionInfo from 'virtual:extension-info';

const store = useGamesStore();
const toast = useToast();

const newGameName = ref('');
const newGameType = ref<GameType>('tictactoe');
const voteThreshold = ref(3);
const creating = ref(false);

const gameTypes = [{ label: 'Tic Tac Toe', value: 'tictactoe' }];

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

async function handleCreateGame() {
  if (!newGameName.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please enter a game name',
      life: 3000,
    });
    return;
  }

  creating.value = true;
  try {
    await store.createGame(newGameName.value, newGameType.value, {
      voteThreshold: voteThreshold.value,
    });
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Game created',
      life: 3000,
    });
    newGameName.value = '';
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create game',
      life: 3000,
    });
  } finally {
    creating.value = false;
  }
}
</script>
