import { type ComponentChildren, createContext, createElement } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import {
  type AnyState,
  createStore,
  focus,
  isStore,
  listen,
  type PathOf,
  peek,
  type StateValue,
  type Store,
  type StoreOf,
  type StoreView,
  update,
} from "./core.js";

/**
 * Hook to create and persist a Store instance.
 * @param initialState Either: a Store, a function that returns a Store, or an initial state value
 * @returns The Store instance
 */
export function useCreateStore<T extends StateValue>(
  initialState: StoreOf<T> | T | (() => StoreOf<T>),
): StoreOf<T> {
  const store = useRef<StoreOf<T>>(null);
  if (!store.current) {
    store.current = isStore(initialState)
      ? initialState
      : typeof initialState === "function"
        ? initialState()
        : createStore(initialState);
  }
  return store.current;
}

declare global {
  interface AppState {}
}

type FixedAppState = { [K in keyof AppState]: AppState[K] };

type AppStore = StoreOf<FixedAppState>;

const StoreContext = createContext<AppStore | null>(null);

/**
 * The Provider component for supplying a Store to the component tree.
 */
export function StoreProvider(props: {
  value: AppState | AppStore | (() => AppStore);
  children: ComponentChildren;
}) {
  const { value, children } = props;
  return createElement(StoreContext.Provider, { value: useCreateStore(value) }, children);
}

/**
 * Hook to access the Store from the React context.
 * @returns The Store object
 */
export function useStore<P extends PathOf<FixedAppState> = "">(path: P = "" as P) {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore() must be used within a StoreProvider");
  }
  return focus(store, path);
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
export function useWatch<T extends AnyState, P extends keyof T = "", V = T[P]>(
  store: StoreView<T>,
  path: P = "" as P,
  calc?: (this: void, stateValue: T[P], prev: V | null) => V,
): V {
  const [value, setValue] = useState(() => {
    const stateValue = peek(store, path);
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
export function useStoreState<T extends AnyState, P extends keyof T = "">(
  store: Store<T>,
  path: P = "" as P,
) {
  const value = useWatch(store, path);
  const setStateValue = useCallback(
    (newValue: T[P]) => update(store, [path, newValue]),
    [store, path],
  );
  return [value, setStateValue] as const;
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore, patch } = await import("./core.js");
  const { render, act } = await import("@testing-library/preact");
  const { createElement } = await import("preact");

  function renderTestComponent(store: Store, component: () => null) {
    return render(
      createElement(StoreProvider, { value: store, children: createElement(component, {}) }),
    );
  }

  test("useStore and StoreProvider", () => {
    const store = createStore({ count: 0 });
    let usedStore: StoreView<{ count: number }> | null = null;
    renderTestComponent(store, () => {
      usedStore = useStore() as StoreView as StoreView<{ count: number }>;
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
        }, {}),
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
    act(() => patch(store, { count: 42 }));
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
    act(() => patch(store, { count: 3 }));
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
