import { type Signal, signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { type AnyState, getState, type Key, listen, type Store, setState } from "./core.js";

export function useSignalStore<T extends AnyState>(
  store: Store<T>,
): <P extends keyof T & Key>(path: P) => Signal<T[P]> {
  // biome-ignore lint/suspicious/noExplicitAny: avoid casting when getting from map
  const signalCache = useRef<[Map<Key, Signal<any>>, (() => void)[]]>([new Map(), []]);
  useEffect(() => () => {
    for (const unsubscribe of signalCache.current[1]) {
      unsubscribe();
    }
  });
  return function useSignal<P extends keyof T & Key>(path: P): Signal<T[P]> {
    const [cache, unsubscribes] = signalCache.current;
    const sig = cache.get(path);
    if (sig) {
      return sig;
    }
    const newSig = signal(getState(store, path));
    unsubscribes.push(
      listen(store, path, (newValue) => {
        newSig.value = newValue;
      }),
    );
    newSig.subscribe((newValue) => setState(store, path, newValue));
    cache.set(path, newSig);
    return newSig;
  };
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore } = await import("./core.js");
  const { render } = await import("@testing-library/preact");
  const { h } = await import("preact");

  test("useSignalStore syncs state with signals", () => {
    const store = createStore({ count: 0 });
    let countSignal: Signal<number> | undefined;
    let countSignal2: Signal<number> | undefined;
    const result = render(
      h(() => {
        const useSignal = useSignalStore(store);
        countSignal = useSignal("count");
        countSignal2 = useSignal("count");
        return null;
      }, {}),
    );
    expect(countSignal).toBeDefined();
    if (countSignal === undefined) return;
    expect(countSignal).toBe(countSignal2);
    expect(countSignal.value).toBe(0);
    setState(store, "count", 5);
    expect(countSignal.value).toBe(5);
    countSignal.value = 10;
    expect(getState(store, "count")).toBe(10);
    result.unmount();
    setState(store, "count", 15);
    expect(countSignal.value).toBe(10); // should not update after unmount
  });
}
