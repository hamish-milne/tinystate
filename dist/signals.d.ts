import { type Signal } from "@preact/signals";
import { type ComponentChildren } from "preact";
import { type AnyState, type PathMap, type Store } from "./core.js";
type SignalStore<T extends AnyState> = <P extends keyof T>(path: P) => Signal<T[P]>;
export declare function useCreateSignalStore<T extends AnyState>(store: Store<T>): SignalStore<T>;
declare global {
    /**
     * The global application state interface used by {@link StoreProvider} and {@link useStore}.
     * This pattern allows you to define your application's state shape in a modular way, maintaining type safety across your application.
     */
    interface AppState {
    }
}
type AppPaths = PathMap<AppState>;
type AppStore = Store<AppPaths>;
export declare function SignalStoreProvider(props: {
    value: AppState | AppStore | (() => AppStore);
    children: ComponentChildren;
}): import("preact").VNode<{
    value: SignalStore<{
        "": AppState;
    }> | null;
    children?: ComponentChildren;
}>;
export declare function useStoreSignal(): Signal<AppPaths[""]>;
export declare function useStoreSignal<P extends keyof AppPaths>(path: P): Signal<AppPaths[P]>;
export {};
