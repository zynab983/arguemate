// Group Debate rooms need a distinct participant identity per browser/tab,
// even under mock auth where every session shares the same Supabase user id
// ('demo-user-id'). This generates and persists a lightweight per-browser id
// in localStorage, completely separate from the real auth session used by
// the 1-vs-AI feature (that flow is untouched).
const STORAGE_KEY = 'edquanta_room_identity';

export function getGuestId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `guest-${crypto.randomUUID()}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back to a
    // session-only id so the UI still works within this page load.
    return `guest-${Math.random().toString(36).slice(2)}`;
  }
}
