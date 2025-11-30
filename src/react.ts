import {
  createContext,
  createElement,
  Fragment,
  type FunctionComponent,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type AnyState,
  createStore,
  type Focus,
  focus,
  listen,
  type PathMap,
  type PathOf,
  peek,
  type StateValue,
  type Store,
  type StoreOf,
  type StoreView,
  type StoreViewOf,
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
    store.current = createStore(initialState);
  }
  return store.current;
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

type AppStore = StoreOf<FixedAppState>;

const StoreContext = createContext<AppStore | null>(null);

/**
 * The Provider component for supplying a Store to the component tree.
 */
export function StoreProvider(props: {
  value: AppState | AppStore | (() => AppStore);
  children: React.ReactNode;
}) {
  const { value, children } = props;
  return createElement(StoreContext.Provider, { value: useCreateStore(value) }, children);
}

/**
 * Hook to access the Store from the React context.
 * @returns The Store object
 */
export function useStore(): AppStore;
export function useStore<P extends PathOf<FixedAppState>>(
  path: P,
): Store<Focus<PathMap<FixedAppState>, P>>;
export function useStore<P extends PathOf<FixedAppState>>(path: P = "" as P) {
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
export function useWatch<T extends AnyState>(store: StoreView<T>): T[""];
export function useWatch<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P): T[P];
export function useWatch<T extends AnyState, P extends keyof T, V>(
  store: StoreView<T>,
  path: P,
  calc: (this: void, stateValue: T[P], prev: V | null) => V,
  deps: readonly unknown[],
): V;
export function useWatch<T extends AnyState, P extends keyof T, V>(
  store: StoreView<T>,
  path: P = "" as P,
  calc: (this: void, stateValue: T[P], prev: V | null) => V = (x) => x as unknown as V,
  deps: readonly unknown[] = [],
): V {
  const [value, setValue] = useState(() => {
    const stateValue = peek(store, path);
    return calc(stateValue, null);
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps of calc are passed in manually
  useEffect(
    () => listen(store, path, (newValue) => setValue((prev) => calc(newValue, prev)), true),
    [store, path, ...deps],
  );
  return value;
}

/**
 * Hook to get and set the value at a specific path in the store's state. Behaves similarly to {@link useState}.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @returns A tuple containing the current value and a setter function
 */
export function useStoreState<T extends AnyState>(
  store: Store<T>,
): [T[""], (newValue: T[""]) => void];
export function useStoreState<T extends AnyState, P extends keyof T>(
  store: Store<T>,
  path: P,
): [T[P], (newValue: T[P]) => void];
export function useStoreState<T extends AnyState, P extends keyof T>(
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

type ItemProps<T extends StateValue, M extends boolean = boolean> = {
  itemStore: StoreViewOf<T, M>;
  index: number;
};

/**
 * Component to efficiently render a list based on a Store array.
 * @param props The component props
 * @returns A Preact VNode containing the rendered list
 */
export function List<T extends StateValue, M extends boolean>(props: {
  /**
   * The StoreView containing an array to render.
   */
  store: StoreView<{ length: number } & PathMap<T, number>, M>;

  /**
   * The function component used to render each item in the list.
   */
  children: FunctionComponent<ItemProps<T, M>>;
}) {
  const { store, children } = props;
  const { current: cache } = useRef<ReactElement<ItemProps<T, M>>[]>([]);
  const length = useWatch(store, "length");

  while (cache.length < length) {
    const index = cache.length;
    const itemStore = focus(store, index) as StoreViewOf<T, M>;
    cache.push(createElement(children, { itemStore, index }));
  }
  cache.length = length;

  return createElement(Fragment, null, ...cache);
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore, patch } = await import("./core.js");
  const { render, act } = await import("@testing-library/react");
  const { createElement } = await import("react");

  function renderTestComponent(store: Store, component: () => ReactElement | null) {
    return render(
      createElement(StoreProvider, { value: store, children: createElement(component) }),
    );
  }

  test("useStore and StoreProvider", () => {
    const store = createStore({ count: 0 });
    let usedStore: StoreView<{ count: number }> | null = null;
    renderTestComponent(store, () => {
      usedStore = useStore("") as StoreView as StoreView<{ count: number }>;
      return null;
    });
    expect(usedStore).toBe(store);
  });

  test("useStore throws outside Provider", () => {
    expect(() =>
      render(
        createElement(() => {
          useStore("");
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
    act(() => patch(store, { count: 42 }));
    expect(renderedValue).toBe(42);
  });

  test("useWatch with calc function", () => {
    const store = createStore({ count: 1 });
    let renderedValue: number | null = null;
    renderTestComponent(store, () => {
      renderedValue = useWatch(store, "count", (stateValue) => stateValue * 2, []);
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

  test("List renders items based on store array", () => {
    const store = createStore({ items: ["a", "b"] });
    let renderedItems: string[] = [];
    function ItemComponent(props: ItemProps<string>) {
      const { itemStore } = props;
      const value = useWatch(itemStore);
      renderedItems.push(value);
      return null;
    }
    renderTestComponent(store, () => {
      // biome-ignore lint/suspicious/noExplicitAny: for testing
      return createElement(List, { store: focus(store, "items"), children: ItemComponent as any });
    });
    expect(renderedItems).toEqual(["a", "b"]);
    renderedItems = [];
    act(() => patch(store, { items: ["x", "y", "z"] }));
    renderedItems.sort();
    expect(renderedItems).toEqual(["x", "y", "z"]);
  });
}
