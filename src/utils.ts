import { type StateValue, sync } from "./core.js";

export function webStorage<T extends StateValue>(storage: Storage, key: string, defaultValue: T) {
  return sync(
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
    const store = webStorage(sessionStorage, "test-key", { count: 0 });
    expect(peek(store, "").count).toBe(0);
    update(store, ["count", 5]);
    expect(JSON.parse(sessionStorage.getItem("test-key") || "{}").count).toBe(5);
  });

  test("webStorage with initial value in store", () => {
    sessionStorage.setItem("test-key-2", JSON.stringify({ count: 10 }));
    const store = webStorage(sessionStorage, "test-key-2", { count: 0 });
    expect(peek(store, "").count).toBe(10);
  });
}
