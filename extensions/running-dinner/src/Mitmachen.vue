<template>
  <div class="space-y-6">
    <header class="space-y-2 max-w-4xl">
      <h2 class="text-2xl font-bold tracking-tight">Mitmachen</h2>
      <p class="text-sm text-surface-500 dark:text-surface-400 max-w-prose">
        Hier kannst du an Running Dinners teilnehmen. Wähle ein Dinner aus der
        Liste oder klicke direkt auf "Mitmachen".
      </p>
    </header>
    <div class="max-w-6xl">
      <div class="space-y-4">
        <section class="space-y-4" v-if="dinners.length">
          <h3 class="text-lg font-semibold">Verfügbare Dinners</h3>
          <DinnerList :dinners="dinners">
            <template #actions="{ record }">
              <Button size="small" @click="joinDinner(record)"
                >Mitmachen</Button
              >
            </template>
          </DinnerList>
        </section>
        <section
          v-else
          class="text-sm text-surface-500 dark:text-surface-400 flex flex-col gap-4"
        >
          <div>Keine Running Dinners gefunden.</div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRunningDinnerStore } from '@/stores/runningDinner';
import DinnerList from '@/components/DinnerList.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';

const store = useRunningDinnerStore();
const { dinners } = storeToRefs(store);
// no details selection state needed anymore

function joinDinner(rec: any) {
  // Dummy action for now
  // Later: call API / store action to register current user
  // eslint-disable-next-line no-alert
  alert(`(Dummy) Du willst beim Dinner "${rec.value.name}" mitmachen.`);
}

onMounted(() => {
  store.fetchAll();
});
</script>
