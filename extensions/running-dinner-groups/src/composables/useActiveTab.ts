import { ref, watch, type Ref } from 'vue';

export function useActiveTab<T extends string>(
  extensionKey: string,
  defaultTab: T,
  validTabs: readonly T[],
): Ref<T> {
  const storageKey = `${extensionKey}_active_tab`;

  function load(): T {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (validTabs as readonly string[]).includes(stored)) {
        return stored as T;
      }
    } catch (e) {
      console.warn('Failed to load active tab from localStorage', e);
    }
    return defaultTab;
  }

  const activeTab = ref<T>(load()) as Ref<T>;

  watch(activeTab, (value) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch (e) {
      console.warn('Failed to save active tab to localStorage', e);
    }
  });

  return activeTab;
}
