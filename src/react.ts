import { createContext, type Provider, useCallback, useContext, useEffect, useState } from "react";
import { type AnyState, getState, type Key, listen, type Store, setState } from "./state";

// biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
const StoreContext = createContext<Store<any> | null>(null);

/**
 * The Provider component for supplying a Store to the React component tree.
 */
// biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
export const StoreProvider: Provider<Store<any>> = StoreContext.Provider;

/**
 * Hook to access the Store from the React context.
 * @returns The Store object
 */
export function useStore<T>(): Store<T> {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore() must be used within a StoreProvider");
  }
  return store;
}

/**
 * Calculation function type for useWatch
 */
export type CalcFn<T, V = T> = (this: void, stateValue: T, prev: V | null) => V;

/**
 * Hook to watch a specific path in the store's state and re-render when it changes.
 * @param store The Store object
 * @param path The path in the store to watch
 * @param calc Optional calculation function to derive a value from the state. Remember to wrap in {@link useCallback} if needed.
 * @returns The current value at the specified path, or the calculated value
 */
export function useWatch<T extends AnyState, P extends keyof T & Key, V = T[P]>(
  store: Store<T>,
  path: P,
  calc?: CalcFn<T[P], V>,
): V {
  const [value, setValue] = useState(() => {
    const stateValue = getState(store, path);
    return calc ? calc(stateValue, null) : (stateValue as unknown as V);
  });
  useEffect(
    () =>
      listen(store, path, (newValue) =>
        setValue(calc ? (prev) => calc(newValue, prev) : (newValue as unknown as V)),
      ),
    [store, path, calc],
  );
  return value;
}

/**
 * Hook to get and set the value at a specific path in the store's state. Behaves similarly to {@link useState}.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @returns A tuple containing the current value and a setter function
 */
export function useStoreState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
) {
  const value = useWatch(store, path);
  const setStateValue = useCallback(
    (newValue: T[P]) => setState(store, path, newValue),
    [store, path],
  );
  return [value, setStateValue] as const;
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore } = await import("./state");
  const { render, act } = await import("@testing-library/react");
  const { createElement } = await import("react");

  function renderTestComponent(store: Store, component: () => null) {
    return render(createElement(StoreProvider, { value: store }, createElement(component)));
  }

  test("useStore and StoreProvider", () => {
    const store = createStore({ count: 0 });
    let usedStore: Store<{ count: number }> | null = null;
    renderTestComponent(store, () => {
      usedStore = useStore<{ count: number }>();
      return null;
    });
    expect(usedStore).toBe(store);
  });

  test("useStore throws outside Provider", () => {
    expect(() =>
      render(
        createElement(() => {
          useStore();
          return null;
        }),
      ),
    ).toThrow(/useStore\(\) must be used within a StoreProvider/);
  });

  test("useWatch updates on state change", () => {
    const store = createStore({ count: 0 });
    let renderedValue: number | null = null;
    renderTestComponent(store, () => {
      renderedValue = useWatch(store, "count");
      return null;
    });
    expect(renderedValue).toBe(0);
    act(() => setState(store, "count", 42));
    expect(renderedValue).toBe(42);
  });

  test("useWatch with calc function", () => {
    const store = createStore({ count: 1 });
    let renderedValue: number | null = null;
    renderTestComponent(store, () => {
      renderedValue = useWatch(
        store,
        "count",
        useCallback<CalcFn<number>>((stateValue) => stateValue * 2, []),
      );
      return null;
    });
    expect(renderedValue).toBe(2);
    act(() => setState(store, "count", 3));
    expect(renderedValue).toBe(6);
  });

  test("useStoreState provides state and setter", () => {
    const store = createStore({ count: 0 });
    let renderedValue: number | undefined;
    let setCount: ((newValue: number) => void) | undefined;
    renderTestComponent(store, () => {
      [renderedValue, setCount] = useStoreState(store, "count");
      return null;
    });
    expect(renderedValue).toBe(0);
    expect(setCount).not.toBeUndefined();
    act(() => setCount?.(100));
    expect(renderedValue).toBe(100);
  });
}
