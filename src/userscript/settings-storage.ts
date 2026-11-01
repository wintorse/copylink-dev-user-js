export class SettingsStorageError extends Error {
  readonly cause: unknown;
  readonly rollbackFailed: boolean;

  constructor(cause: unknown, rollbackFailed: boolean) {
    super("Failed to save settings");
    this.name = "SettingsStorageError";
    this.cause = cause;
    this.rollbackFailed = rollbackFailed;
  }
}

let pendingSave: Promise<void> = Promise.resolve();

const writeSettings = async (values: Record<string, unknown>) => {
  const entries = Object.entries(values);
  let previous = new Map<string, unknown>();
  const attempted: Array<string> = [];
  try {
    previous = new Map(
      await Promise.all(
        entries.map(
          async ([key]) => [key, await GM.getValue<unknown>(key)] as const,
        ),
      ),
    );
    for (const [key, value] of entries) {
      // A rejected write may still have reached storage, so restore this key too.
      attempted.push(key);
      await GM.setValue(key, value);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of attempted.reverse()) {
      try {
        const value = previous.get(key);
        if (value === undefined) {
          await GM.deleteValue(key);
        } else {
          await GM.setValue(key, value);
        }
      } catch {
        // Keep restoring the remaining keys even if one restoration fails.
        rollbackFailed = true;
      }
    }
    throw new SettingsStorageError(error, rollbackFailed);
  }
};

/**
 * Save a settings batch, restoring its original values if any write fails.
 *
 * @param values Validated settings to persist.
 * @returns Completion of the save or a SettingsStorageError on failure.
 */
export const saveStoredSettings = (
  values: Record<string, unknown>,
): Promise<void> => {
  const save = pendingSave.then(() => writeSettings(values));
  // Serialize saves from this page without letting a failed save block retries.
  pendingSave = save.catch(() => {
    // The caller receives the original rejection; the queue can accept retries.
  });
  return save;
};
