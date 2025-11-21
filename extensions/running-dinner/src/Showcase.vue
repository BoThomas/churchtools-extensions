<template>
  <div class="space-y-10 mx-auto">
    <header class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">Volt Component Showcase</h1>
      <p class="text-surface-500 dark:text-surface-400 text-sm">
        Quick visual regression surface for the custom themed PrimeVue (Volt)
        components. Colors derive only from CSS variables in
        <code>style.css</code>.
      </p>
    </header>

    <!-- Buttons -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Buttons</h2>
      <div class="flex flex-wrap gap-4 items-start">
        <Button>Primary</Button>
        <SecondaryButton>Secondary</SecondaryButton>
        <DangerButton>Danger</DangerButton>
        <Button severity="info" outlined>Outlined</Button>
        <Button text>Text</Button>
        <Button size="small">Small</Button>
        <Button size="large">Large</Button>
      </div>
    </section>

    <!-- Cards -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Card</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <Card>
          <template #title>Default Card</template>
          <template #subtitle>Subtitle / Meta</template>
          <p class="text-sm leading-relaxed">
            Body content using neutral text colors. Adjusting
            <code>--p-text-color</code> etc. reflects here.
          </p>
        </Card>
        <Card>
          <template #title>Interactive Sample</template>
          <div class="flex gap-2">
            <Button size="small">Action</Button>
            <SecondaryButton size="small">Alt</SecondaryButton>
          </div>
        </Card>
        <Card>
          <template #title>States</template>
          <p class="text-sm">
            Hover / focus tokens rely on
            <code>--p-content-hover-background</code>.
          </p>
        </Card>
      </div>
    </section>

    <!-- Inputs -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Inputs</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="flex flex-col gap-2">
          <label for="show-text" class="text-sm font-medium">Text</label>
          <InputText id="show-text" placeholder="Enter text" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="show-number" class="text-sm font-medium">Number</label>
          <InputNumber id="show-number" :useGrouping="false" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="show-password" class="text-sm font-medium"
            >Password</label
          >
          <Password id="show-password" toggleMask placeholder="Secret" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="show-date" class="text-sm font-medium">Date</label>
          <DatePicker id="show-date" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="show-ac" class="text-sm font-medium">Autocomplete</label>
          <AutoComplete
            id="show-ac"
            v-model="acValue"
            :suggestions="filtered"
            @complete="complete"
            placeholder="Search..."
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="show-multi" class="text-sm font-medium"
            >Multiselect</label
          >
          <Multiselect
            id="show-multi"
            v-model="multi"
            :options="cities"
            optionLabel="name"
            display="chip"
          />
        </div>
        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium">Choices</legend>
          <div class="flex gap-4 items-center">
            <label class="flex items-center gap-2"
              ><Checkbox v-model="check" :binary="true" />
              <span>Check</span></label
            >
            <label class="flex items-center gap-2"
              ><RadioButton name="r" value="A" v-model="radio" />
              <span>A</span></label
            >
            <label class="flex items-center gap-2"
              ><RadioButton name="r" value="B" v-model="radio" />
              <span>B</span></label
            >
          </div>
        </fieldset>
        <div class="flex flex-col gap-2">
          <label for="show-list" class="text-sm font-medium">Listbox</label>
          <Listbox
            id="show-list"
            v-model="listValue"
            :options="cities"
            optionLabel="name"
          />
        </div>
      </div>
    </section>

    <!-- Messaging -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Feedback</h2>
      <div class="flex flex-wrap gap-4">
        <Message severity="info">Info message</Message>
        <Message severity="success">Success message</Message>
        <Message severity="warn">Warning message</Message>
        <Message severity="error">Error message</Message>
      </div>
      <div class="w-full">
        <ProgressBar :value="70" showValue class="max-w-md" />
      </div>
    </section>

    <!-- Popover / Dialog demo triggers (static for now) -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Overlay (Static)</h2>
      <div class="flex gap-4">
        <Popover>
          <template #target>
            <Button size="small">Popover</Button>
          </template>
          <div class="text-sm">Example popover content</div>
        </Popover>
        <Dialog v-model:visible="showDialog" modal header="Dialog Title">
          <p class="text-sm">Dialog body driven by theme tokens.</p>
        </Dialog>
        <Button size="small" @click="showDialog = true">Open Dialog</Button>
      </div>
    </section>

    <!-- Icon Components (@primevue/icons) -->
    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Icon Components</h2>
      <p class="text-sm text-surface-500 dark:text-surface-400 max-w-prose">
        Preferred approach: import individual icons from
        <code>@primevue/icons</code> so the bundle only includes what you use
        (no full font file). Place them directly inside components or provide
        them via slots.
      </p>
      <div
        class="flex flex-wrap items-center gap-6 p-4 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
      >
        <div
          class="flex items-center gap-4 text-surface-600 dark:text-surface-300"
        >
          <CheckIcon class="w-5 h-5" />
          <TrashIcon class="w-5 h-5" />
          <TimesIcon class="w-5 h-5" />
          <ArrowDownIcon class="w-5 h-5" />
        </div>
        <div class="flex flex-wrap gap-4 items-center">
          <Button>
            <CheckIcon class="w-4 h-4" />
            <span>Save</span>
          </Button>
          <SecondaryButton>
            <TrashIcon class="w-4 h-4" />
            <span>Delete</span>
          </SecondaryButton>
          <DangerButton>
            <TimesIcon class="w-4 h-4" />
            <span>Cancel</span>
          </DangerButton>
          <Button aria-label="Dropdown">
            <ArrowDownIcon class="w-4 h-4" />
          </Button>
        </div>
      </div>
      <p class="text-xs text-surface-400 dark:text-surface-500">
        Tip: For icon‑only buttons add an <code>aria-label</code>. Size via
        utility classes (<code>w-4 h-4</code>) and recolor with
        <code>text-*</code> utilities.
      </p>
    </section>

    <!-- Icon Font (PrimeIcons) -->
    <section class="space-y-4">
      <h3 class="text-lg font-semibold">Icon Font (PrimeIcons)</h3>
      <p class="text-sm text-surface-500 dark:text-surface-400 max-w-prose">
        Legacy / broad approach: use the PrimeIcons font classes (<code
          >pi pi-*</code
        >). The font stylesheet is imported globally, enabling any
        <code>&lt;i&gt;</code> element with those classes. This loads the entire
        icon font, so prefer component imports above when possible.
      </p>
      <div
        class="flex flex-wrap gap-6 items-start p-4 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
      >
        <div
          class="flex items-center gap-4 text-surface-600 dark:text-surface-300 text-xl"
        >
          <i class="pi pi-check" aria-hidden="true"></i>
          <i class="pi pi-trash" aria-hidden="true"></i>
          <i class="pi pi-times" aria-hidden="true"></i>
          <i class="pi pi-chevron-down" aria-hidden="true"></i>
        </div>
        <div class="flex flex-wrap gap-4 items-center">
          <Button>
            <i class="pi pi-check text-base" aria-hidden="true"></i>
            <span>Save</span>
          </Button>
          <SecondaryButton>
            <i class="pi pi-trash text-base" aria-hidden="true"></i>
            <span>Delete</span>
          </SecondaryButton>
          <DangerButton>
            <i class="pi pi-times text-base" aria-hidden="true"></i>
            <span>Cancel</span>
          </DangerButton>
          <Button aria-label="Open Menu">
            <i class="pi pi-ellipsis-v text-base" aria-hidden="true"></i>
          </Button>
        </div>
      </div>
      <p class="text-xs text-surface-400 dark:text-surface-500">
        Use <code>text-xl</code> / <code>text-base</code> etc. for sizing. Add
        <code>aria-hidden</code>
        and supply accessible labels on parent controls when the icon is
        decorative.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import DangerButton from '@/volt/DangerButton.vue';
import Card from '@/volt/Card.vue';
import InputText from '@/volt/InputText.vue';
import InputNumber from '@/volt/InputNumber.vue';
import Password from '@/volt/Password.vue';
import DatePicker from '@/volt/DatePicker.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import Multiselect from '@/volt/Multiselect.vue';
import Checkbox from '@/volt/Checkbox.vue';
import RadioButton from '@/volt/RadioButton.vue';
import Listbox from '@/volt/Listbox.vue';
import Message from '@/volt/Message.vue';
import ProgressBar from '@/volt/ProgressBar.vue';
import Popover from '@/volt/Popover.vue';
import Dialog from '@/volt/Dialog.vue';
import CheckIcon from '@primevue/icons/check';
import TrashIcon from '@primevue/icons/trash';
import TimesIcon from '@primevue/icons/times';
import ArrowDownIcon from '@primevue/icons/arrowdown';

const showDialog = ref(false);

// Autocomplete demo
const acValue = ref('');
const suggestions = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map(
  (v) => ({
    label: v,
  }),
);
const filtered = ref<{ label: string }[]>([]);
function complete(e: { query: string }) {
  filtered.value = suggestions.filter((s) =>
    s.label.toLowerCase().includes(e.query.toLowerCase()),
  );
}

// Multiselect & Listbox data
const cities = [
  { name: 'Berlin' },
  { name: 'Hamburg' },
  { name: 'Munich' },
  { name: 'Cologne' },
  { name: 'Stuttgart' },
];
const multi = ref([]);
const listValue = ref();

// Checkbox / Radio
const check = ref(false);
const radio = ref('A');
</script>
