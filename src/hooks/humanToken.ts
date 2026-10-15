// play-sim-town: no login, so each browser gets its own player id, kept in localStorage.
// If storage is blocked (private window), the id lasts for this page load only.
let memo: string | undefined;
export function humanToken(): string {
  if (memo) return memo;
  try {
    memo = localStorage.getItem('playsim-human') ?? undefined;
    if (!memo) {
      memo = `human-${crypto.randomUUID()}`;
      localStorage.setItem('playsim-human', memo);
    }
  } catch {
    memo = memo ?? `human-${Math.random().toString(36).slice(2)}`;
  }
  return memo;
}

export function seenOnboarding(): boolean {
  try {
    return localStorage.getItem('playsim-onboarded') === '1';
  } catch {
    return false;
  }
}
export function markOnboarded() {
  try {
    localStorage.setItem('playsim-onboarded', '1');
  } catch {
    /* fine: the welcome shows again next time */
  }
}
