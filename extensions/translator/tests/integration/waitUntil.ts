export type WaitUntilOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  message?: string;
};

export async function waitUntil(
  predicate: () => boolean,
  options: WaitUntilOptions = {},
): Promise<void> {
  const { timeoutMs = 1000, intervalMs = 0, message } = options;
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (predicate()) {
      return;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(message ?? `waitUntil timed out after ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
