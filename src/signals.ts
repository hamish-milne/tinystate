import { type Signal, signal } from "@preact/signals";
import { type ComponentChildren, createContext, createElement } from "preact";
import { useContext, useEffect, useRef } from "preact/hooks";
import { type AnyState, listen, type PathMap, peek, type Store, update } from "./core.js";
import { useCreateStore } from "./preact.js";

type SignalStore<T extends AnyState> = <P extends keyof T>(path: P) => Signal<T[P]>;

export function useCreateSignalStore<T extends AnyState>(store: Store<T>): SignalStore<T> {
  // biome-ignore lint/suspicious/noExplicitAny: avoid casting when getting from map
  const signalCache = useRef<[Map<PropertyKey, Signal<any>>, (() => void)[]]>();
  useEffect(() => () => {
    for (const unsubscribe of signalCache.current?.[1] || []) {
      unsubscribe();
    }
  });
  return function useStoreSignal<P extends keyof T>(path: P): Signal<T[P]> {
    if (!signalCache.current) {
      signalCache.current = [new Map(), []];
    }
    const [cache, unsubscribes] = signalCache.current;
    const sig = cache.get(path);
    if (sig) {
      return sig;
    }
    const newSig = signal(peek(store, path));
    unsubscribes.push(
      listen(store, path, (newValue) => {
        newSig.value = newValue;
      }),
    );
    newSig.subscribe((newValue) => update(store, [path, newValue]));
    cache.set(path, newSig);
    return newSig;
  };
}

declare global {
  /**
   * The global application state interface used by {@link StoreProvider} and {@link useStore}.
   * This pattern allows you to define your application's state shape in a modular way, maintaining type safety across your application.
   */
  interface AppState {}
}

// Because AppState is an interface, we need to create a mapped type to fix its index signature.
// https://github.com/microsoft/TypeScript/issues/15300
export type FixedAppState = { [K in keyof AppState]: AppState[K] };

type AppPaths = PathMap<FixedAppState>;

type AppStore = Store<AppPaths>;

const SignalStoreContext = createContext<SignalStore<AppPaths> | null>(null);

export function SignalStoreProvider(props: {
  value: AppState | AppStore | (() => AppStore);
  children: ComponentChildren;
}) {
  const { value, children } = props;
  const store = useCreateStore(value);
  const signalStore = useCreateSignalStore(store);
  return createElement(SignalStoreContext.Provider, { value: signalStore }, children);
}

export function useStoreSignal(): Signal<AppPaths[""]>;
export function useStoreSignal<P extends keyof AppPaths>(path: P): Signal<AppPaths[P]>;
export function useStoreSignal<P extends keyof AppPaths>(path: P = "" as P): Signal<AppPaths[P]> {
  const signalStore = useContext(SignalStoreContext);
  if (!signalStore) {
    throw new Error("useStoreSignal must be used within a SignalStoreProvider");
  }
  return signalStore(path);
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore, patch } = await import("./core.js");
  const { render } = await import("@testing-library/preact");
  const { h } = await import("preact");

  test("useCreateSignalStore syncs state with signals", () => {
    const store = createStore({ count: 0 });
    let countSignal: Signal<number> | undefined;
    let countSignal2: Signal<number> | undefined;
    const result = render(
      h(() => {
        const useSignal = useCreateSignalStore(store);
        countSignal = useSignal("count");
        countSignal2 = useSignal("count");
        return null;
      }, {}),
    );
    expect(countSignal).toBeDefined();
    if (countSignal === undefined) return;
    expect(countSignal).toBe(countSignal2);
    expect(countSignal.value).toBe(0);
    patch(store, { count: 5 });
    expect(countSignal.value).toBe(5);
    countSignal.value = 10;
    expect(peek(store, "count")).toBe(10);
    result.unmount();
    patch(store, { count: 15 });
    expect(countSignal.value).toBe(10); // should not update after unmount
  });

  test("useStoreSignal and SignalStoreProvider", () => {
    const store = createStore({ count: 0 });
    let countSignal: Signal<number> | undefined;
    const result = render(
      h(SignalStoreProvider, {
        value: store,
        children: [
          h(() => {
            countSignal = useStoreSignal("count" as keyof AppPaths) as Signal<number>;
            return null;
          }, {}),
        ],
      }),
    );
    expect(countSignal).toBeDefined();
    if (countSignal === undefined) return;
    expect(countSignal.value).toBe(0);
    patch(store, { count: 5 });
    expect(countSignal.value).toBe(5);
    countSignal.value = 10;
    expect(peek(store, "count")).toBe(10);
    result.unmount();
    patch(store, { count: 15 });
    expect(countSignal.value).toBe(10); // should not update after unmount
  });

  test("useStoreSignal throws outside Provider", () => {
    expect(() =>
      render(
        h(() => {
          useStoreSignal("count" as keyof AppPaths);
          return null;
        }, {}),
      ),
    ).toThrow(/useStoreSignal must be used within a SignalStoreProvider/);
  });

  test("useCreateSignalStore doesn't throw if unmounted before effect runs", () => {
    const store = createStore({ count: 0 });
    const result = render(
      h(() => {
        useCreateSignalStore(store);
        return null;
      }, {}),
    );
    result.unmount();
  });
}
