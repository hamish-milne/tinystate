import { type ComponentChildren, type FunctionComponent, type VNode } from "preact";
import { type AnyState, type Focus, type PathMap, type PathOf, type StateConstraint, type Store, type StoreOf, type StoreView, type StoreViewOf } from "./core.js";
/**
 * Hook to create and persist a Store instance.
 * @param initialState Either: a Store, a function that returns a Store, or an initial state value
 * @returns The Store instance
 */
export declare function useCreateStore<T extends StateConstraint, M extends boolean>(initialState: StoreViewOf<T, M> | T | (() => StoreViewOf<T, M>)): StoreViewOf<T, M>;
declare global {
    /**
     * The global application state interface used by {@link StoreProvider} and {@link useStore}.
     * This pattern allows you to define your application's state shape in a modular way, maintaining type safety across your application.
     */
    interface AppState {
    }
}
export type AppStore = StoreOf<AppState>;
/**
 * The Provider component for supplying a Store to the component tree.
 */
export declare function StoreProvider(props: {
    value: AppState | AppStore | (() => AppStore);
    children: ComponentChildren;
}): VNode<{
    value: AppStore | null;
    children?: ComponentChildren;
}>;
/**
 * Hook to access the Store from the React context.
 * @returns The Store object
 */
export declare function useStore(): AppStore;
export declare function useStore<P extends PathOf<AppState>>(path: P): Store<Focus<PathMap<AppState>, P>>;
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
export declare function useWatch<T extends AnyState>(store: StoreView<T>): T[""];
export declare function useWatch<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P): T[P];
export declare function useWatch<T extends AnyState, P extends keyof T, V>(store: StoreView<T>, path: P, calc: (this: void, stateValue: T[P], prev: V | null) => V, deps: readonly unknown[]): V;
/**
 * Hook to get and set the value at a specific path in the store's state. Behaves similarly to {@link useState}.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @returns A tuple containing the current value and a setter function
 */
export declare function useStoreState<T extends AnyState>(store: Store<T>): [T[""], (newValue: T[""]) => void];
export declare function useStoreState<T extends AnyState, P extends keyof T>(store: Store<T>, path: P): [T[P], (newValue: T[P]) => void];
type ItemProps<T extends StateConstraint, M extends boolean = boolean> = {
    itemStore: StoreViewOf<T, M>;
    index: number;
};
/**
 * Component to efficiently render a list based on a Store array.
 * @param props The component props
 * @returns A Preact VNode containing the rendered list
 */
export declare function List<T extends StateConstraint, M extends boolean>(props: {
    /**
     * The StoreView containing an array to render.
     */
    store: StoreView<{
        length: number;
    } & PathMap<T, number>, M>;
    /**
     * The function component used to render each item in the list.
     */
    children: FunctionComponent<ItemProps<T, M>>;
}): ComponentChildren;
export {};
