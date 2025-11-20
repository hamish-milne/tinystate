import { createSync, type StateValue, type StoreOf, sync } from "./core.js";

export function createWebStorage<T extends StateValue>(
  storage: Storage,
  key: string,
  defaultValue: T,
) {
  return createSync(
    () => {
      const storedValue = storage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
    },
    (value: T) => {
      storage.setItem(key, JSON.stringify(value));
    },
  );
}

export function webStorage<T extends StateValue>(
  store: StoreOf<T>,
  storage: Storage,
  key: string,
  defaultValue: T,
) {
  return sync(
    store,
    () => {
      const storedValue = storage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
    },
    (value: T) => {
      storage.setItem(key, JSON.stringify(value));
    },
  );
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { peek, update } = await import("./core.js");

  test("webStorage syncs with sessionStorage", () => {
    const store = createWebStorage(sessionStorage, "test-key", { count: 0 });
    expect(peek(store, "").count).toBe(0);
    update(store, ["count", 5]);
    expect(JSON.parse(sessionStorage.getItem("test-key") || "{}").count).toBe(5);
  });

  test("webStorage with initial value in store", () => {
    sessionStorage.setItem("test-key-2", JSON.stringify({ count: 10 }));
    const store = createWebStorage(sessionStorage, "test-key-2", { count: 0 });
    expect(peek(store, "").count).toBe(10);
  });
}
