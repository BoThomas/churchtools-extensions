import { ref, computed, watch } from 'vue';
import { useChurchtoolsStore } from '@/stores/churchtools';
import type { Person } from '@/types/models';

export interface PersonWithDisplay extends Person {
  displayName: string;
}

export interface UsePersonSelectorOptions {
  /** Auto-select current user as leader on mount */
  autoSelectCurrentUser?: boolean;
  /** Initial number of persons to load */
  initialLoadLimit?: number;
  /** Number of results to fetch during search */
  searchLimit?: number;
  /** Debounce delay for search in ms */
  debounceDelay?: number;
}

const defaultOptions: Required<UsePersonSelectorOptions> = {
  autoSelectCurrentUser: true,
  initialLoadLimit: 200,
  searchLimit: 20,
  debounceDelay: 600,
};

/**
 * Composable for person selection with leader and co-leaders
 * Features:
 * - Auto-select current user as leader
 * - Protected persons (selected persons don't disappear during filtering)
 * - Computed lists that exclude already-selected persons
 * - Debounced search
 */
export function usePersonSelector(options: UsePersonSelectorOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  const churchtoolsStore = useChurchtoolsStore();

  // State
  const loadingPersons = ref(false);
  const persons = ref<PersonWithDisplay[]>([]);
  const selectedLeader = ref<PersonWithDisplay | null>(null);
  const selectedCoLeaders = ref<PersonWithDisplay[]>([]);

  // Protected persons that should never be removed from the list
  const protectedPersons = ref<Map<number, PersonWithDisplay>>(new Map());

  // Debounce timer for search
  let filterTimeout: ReturnType<typeof setTimeout> | null = null;

  // Computed lists to exclude already selected persons
  const availableLeaders = computed(() => {
    // Exclude co-leaders from leader selection
    const coLeaderIds = new Set(selectedCoLeaders.value.map((p) => p.id));
    return persons.value.filter((p) => !coLeaderIds.has(p.id));
  });

  const availableCoLeaders = computed(() => {
    // Exclude the selected leader from co-leader selection
    const leaderId = selectedLeader.value?.id;
    return persons.value.filter((p) => p.id !== leaderId);
  });

  // Helper to create person with display name
  function createPersonWithDisplay(person: Person): PersonWithDisplay {
    return {
      ...person,
      displayName: `${person.firstName} ${person.lastName}${person.email ? ` (${person.email})` : ''}`,
    };
  }

  // Helper to add person to protected list
  function addProtectedPerson(person: PersonWithDisplay) {
    protectedPersons.value.set(person.id, person);
  }

  // Helper to merge search results with protected persons
  function mergePersons(searchResults: Person[]): PersonWithDisplay[] {
    const resultsWithDisplay = searchResults.map(createPersonWithDisplay);

    // Create a map for deduplication
    const personMap = new Map<number, PersonWithDisplay>();

    // Add protected persons first (they appear at the top)
    protectedPersons.value.forEach((person) => {
      personMap.set(person.id, person);
    });

    // Add search results
    resultsWithDisplay.forEach((person) => {
      if (!personMap.has(person.id)) {
        personMap.set(person.id, person);
      }
    });

    return Array.from(personMap.values());
  }

  // Watch for selection changes to update protected persons
  watch(selectedLeader, (newLeader) => {
    if (newLeader) {
      addProtectedPerson(newLeader);
    }
  });

  watch(selectedCoLeaders, (newCoLeaders) => {
    newCoLeaders.forEach((coLeader) => {
      addProtectedPerson(coLeader);
    });
  });

  // Load persons (initial load or search)
  async function loadPersons(query: string = '') {
    try {
      loadingPersons.value = true;
      const limit = query ? opts.searchLimit : opts.initialLoadLimit;
      const searchResults = await churchtoolsStore.searchPersons(
        query,
        1,
        limit,
      );

      // Add initial load results to protected list
      if (!query) {
        searchResults.forEach((person) => {
          addProtectedPerson(createPersonWithDisplay(person));
        });
      }

      persons.value = mergePersons(searchResults);
    } catch (err) {
      console.error('Failed to load persons:', err);
    } finally {
      loadingPersons.value = false;
    }
  }

  // Filter persons with debounce (for Select/Multiselect @filter event)
  async function filterPersons(event: { value: string }) {
    // Clear existing timeout
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }

    // Show loading immediately
    loadingPersons.value = true;

    // Debounce the API call
    filterTimeout = setTimeout(async () => {
      await loadPersons(event.value);
    }, opts.debounceDelay);
  }

  // Initialize on mount
  async function initialize() {
    // Load current user first and protect them
    if (opts.autoSelectCurrentUser) {
      const currentUser = await churchtoolsStore.getCurrentUser();
      if (currentUser) {
        const currentPersonWithDisplay = createPersonWithDisplay(currentUser);
        addProtectedPerson(currentPersonWithDisplay);
        selectedLeader.value = currentPersonWithDisplay;
      }
    }

    // Load initial batch of persons
    await loadPersons();
  }

  // Reset state
  function reset() {
    selectedLeader.value = null;
    selectedCoLeaders.value = [];
    // Don't clear protected persons or main list - they can be reused
  }

  // Get leader ID (for form submission)
  const leaderId = computed(() => selectedLeader.value?.id ?? null);

  // Get co-leader IDs (for form submission)
  const coLeaderIds = computed(() => selectedCoLeaders.value.map((p) => p.id));

  return {
    // State
    loadingPersons,
    persons,
    selectedLeader,
    selectedCoLeaders,

    // Computed
    availableLeaders,
    availableCoLeaders,
    leaderId,
    coLeaderIds,

    // Methods
    loadPersons,
    filterPersons,
    initialize,
    reset,
    createPersonWithDisplay,
    addProtectedPerson,
  };
}
