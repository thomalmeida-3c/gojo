const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequestTime = 0;
const MIN_DELAY_MS = 700;

export async function rateLimitedFetch<T>(fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < MIN_DELAY_MS) {
    await delay(MIN_DELAY_MS - elapsed);
  }

  lastRequestTime = Date.now();
  return fetcher();
}
