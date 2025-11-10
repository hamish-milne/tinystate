import { createContext, type Provider } from "preact";
import { useCallback, useContext, useEffect, useState } from "preact/hooks";
import { type AnyState, getState, type Key, listen, type Store, setState } from "./state";

// biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
const StoreContext = createContext<Store<any> | null>(null);

/**
 * The Provider component for supplying a Store to the React component tree.
 */
// biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
export const StoreProvider = StoreContext.Provider as Provider<Store<any>>;

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
 * Hook to watch a specific path in the store's state and re-render when it changes.
 * @param store The Store object
 * @param path The path in the store to watch
 * @param calc Optional calculation function to derive a value from the state. Remember to wrap in {@link useCallback} if needed.
 * @returns The current value at the specified path, or the calculated value
 */
export function useWatch<T extends AnyState, P extends keyof T & Key, V = T[P]>(
  store: Store<T>,
  path: P,
  calc?: (this: void, stateValue: T[P], prev: V | null) => V,
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
