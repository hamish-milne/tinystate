import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type AnyState, getState, type Key, listen, type Store, setState } from "./state";

// biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
const StoreContext = createContext<Store<any> | null>(null);

export const StoreProvider = StoreContext.Provider;

export function useStore<T>(): Store<T> {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore() must be used within a StoreProvider");
  }
  return store;
}

export function useWatch<T extends AnyState, P extends keyof T & Key, V = T[P]>(
  store: Store<T>,
  path: P,
  calc?: (this: void, stateValue: T[P], prev: V | null) => V,
) {
  const [value, setValue] = useState(() => {
    const stateValue = getState(store, path);
    return calc ? calc(stateValue, null) : (stateValue as unknown as V);
  });
  useEffect(
    () =>
      listen(store, path, (newValue) => {
        setValue(calc ? (prev) => calc(newValue, prev) : (newValue as unknown as V));
      }),
    [store, path, calc],
  );
  return value;
}

export function useStoreState<T extends AnyState, P extends keyof T & Key>(
  store: Store<T>,
  path: P,
) {
  const value = useWatch(store, path);
  const setStateValue = useCallback(
    (newValue: T[P]) => {
      setState(store, path, newValue);
    },
    [store, path],
  );
  return [value, setStateValue] as const;
}
