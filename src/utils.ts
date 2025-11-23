import { createStore, type StateValue, type StoreOf, sync } from "./core.js";

export function syncStorage<T extends StateValue>(
  store: StoreOf<T>,
  storage: Storage,
  key: string,
) {
  return sync(
    store,
    () => {
      const storedValue = storage.getItem(key);
      if (storedValue) {
        return JSON.parse(storedValue) as T;
      }
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
    const store = createStore({ count: 0 });
    syncStorage(store, sessionStorage, "test-key");
    expect(peek(store, "").count).toBe(0);
    update(store, ["count", 5]);
    expect(JSON.parse(sessionStorage.getItem("test-key") || "{}").count).toBe(5);
  });

  test("webStorage with initial value in store", () => {
    const store = createStore({ count: 0 });
    sessionStorage.setItem("test-key-2", JSON.stringify({ count: 10 }));
    syncStorage(store, sessionStorage, "test-key-2");
    expect(peek(store, "").count).toBe(10);
  });
}
