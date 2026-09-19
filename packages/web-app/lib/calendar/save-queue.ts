// One in-flight write; newer edits coalesce while it runs. On failure, drop
// unconfirmed edits so they cannot silently overwrite the restored view later.
export function createSaveQueue<T>(
  initial: T,
  save: (value: T) => Promise<{ ok: boolean }>,
  events: {
    shown: (value: T) => void;
    confirmed: (value: T) => void;
    failed: (value: boolean) => void;
  },
) {
  let confirmed = initial;
  let waiting: { value: T } | undefined;
  let running: Promise<void> | undefined;
  async function drain() {
    while (waiting) {
      const { value } = waiting;
      waiting = undefined;
      let ok = false;
      try {
        ok = (await save(value)).ok;
      } catch {
        /* Network failures use the same rollback. */
      }
      if (!ok) {
        waiting = undefined;
        events.shown(confirmed);
        events.failed(true);
        return;
      }
      confirmed = value;
      events.confirmed(value);
    }
  }
  return {
    update(value: T) {
      events.shown(value);
      events.failed(false);
      waiting = { value };
      if (!running)
        running = drain().finally(() => {
          running = undefined;
        });
      return running;
    },
  };
}
