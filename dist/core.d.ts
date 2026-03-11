type Primitive = string | number | boolean | null | undefined;
/**
 * A value that can be stored in the state: a primitive, a readonly object of `StateValue`s, or a readonly array of `StateValue`s.
 */
export type StateValue = Primitive | StateObject | StateArray;
type StateObject = {
    readonly [key in string | number]?: StateValue;
};
type StateArray = readonly StateValue[];
export type StateConstraint = unknown;
type Stringify<T> = T extends symbol ? never : T;
type ConcatPath<Prefix extends PropertyKey, Suffix extends PropertyKey> = Prefix extends "" ? Suffix : Suffix extends "" ? Prefix : `${Stringify<Prefix>}.${Stringify<Suffix>}`;
type IsRecursive<T> = T extends Primitive ? false : T extends T[keyof T] ? true : false;
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type AllKeys<T> = keyof {
    [U in T as U extends readonly unknown[] ? Extract<keyof U, number | "length"> : keyof U]: unknown;
};
type OptionalKey<T, K extends PropertyKey> = T extends {
    [_ in K]: infer P;
} ? P : Extract<T, {
    [_ in K]?: unknown;
}>[K] | undefined;
type MergeUnionObject<T> = {
    [K in AllKeys<T>]: OptionalKey<T, K>;
};
type OrUndefined<T> = {
    [K in keyof T]: T[K] | undefined;
};
type MergeUnion<T> = Extract<T, Primitive> extends never ? MergeUnionObject<T> : OrUndefined<MergeUnionObject<Exclude<T, Primitive>>>;
/**
 * A mapping of all possible paths in `T` to their corresponding value types.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type Paths = PathMap<"", State>;
 * // Result:
 * // {
 * //   "foo": { bar: number; baz: string[] };
 * //   "foo.bar": number;
 * //   "foo.baz": string[];
 * //   "foo.baz.0": string;
 * //   "qux": boolean;
 * // }
 * ```
 */
export type PathMap<T, Prefix extends PropertyKey = ""> = true extends IsRecursive<T> ? {
    [K in Prefix]: T;
} : {
    [K in Prefix]: T;
} & _PathMap<MergeUnion<T>, Prefix>;
type _PathMap<T, Prefix extends PropertyKey> = UnionToIntersection<{
    [K in keyof T]: PathMap<T[K], ConcatPath<Prefix, K>>;
}[keyof T]>;
/**
 * Creates a PathMap where metadata paths `M` are nested under each data path in `T`, merged with root-level metadata paths in `R`.
 * This is useful for representing metadata associated with specific parts of the state tree, like field errors.
 * @example
 * ```ts
 * type State = { user: { name: string; age: number }; settings: { theme: string } };
 * type Meta = { issue: string };
 * type RootMeta = { invalidFields: string[] };
 * type Metadata = MetadataTree<State, Meta, RootMeta>;
 * // Result:
 * // {
 * //   "user": { issue: string };
 * //   "user.name": { issue: string };
 * //   "user.age": { issue: string };
 * //   "settings": { issue: string };
 * //   "settings.theme": { issue: string };
 * //   invalidFields: string[];
 * // }
 * ```
 */
export type MetadataTree<T extends StateConstraint, M extends StateConstraint, R extends StateConstraint> = _MetadataTree<PathMap<T>, PathMap<M>, PathMap<R>>;
type _MetadataTree<T extends AnyState, M extends AnyState, R extends AnyState> = UnionToIntersection<{
    [KT in keyof T]: {
        [KM in keyof M as ConcatPath<KT, KM>]: M[KM];
    };
}[keyof T]> & R;
/**
 * A union of all possible paths in `T`.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type Paths = PathOf<State>;
 * // Result: "foo" | "foo.bar" | "foo.baz" | `foo.baz.${number}` | "qux"
 * ```
 */
export type PathOf<T> = keyof PathMap<T>;
/**
 * The value type at path `P` in state type `T`.
 * @example
 * ```ts
 * type State = { foo: { bar: number; baz: string[] }; qux: boolean };
 * type FooBarType = ValueOf<State, "foo.bar">; // Result: number
 * type FooBazType = ValueOf<State, "foo.baz">; // Result: string[]
 * type QuxType = ValueOf<State, "qux">;       // Result: boolean
 * ```
 */
export type ValueOf<T, P extends PropertyKey | undefined> = P extends keyof PathMap<T> ? PathMap<T>[P] : never;
/**
 * A state object with any keys and values, as a fallback type.
 */
export type AnyState = Record<PropertyKey, StateConstraint>;
declare const brand: unique symbol;
/**
 * An opaque object that points to a state tree. These cannot be constructed directly; use {@link createStore} instead.
 * @template T  The `PathMap` type representing the shape of the state in the store
 * @template Mutable  Whether the store is mutable (true) or read-only (false)
 */
export interface StoreView<T extends AnyState = AnyState, Mutable extends boolean = boolean> {
    /**
     * Brand to identify Store objects and ensure type safety
     * Note that the real value will always be `[true, null]`, so you should not read this property at runtime.
     * @internal
     */
    readonly [brand]: readonly [Mutable, T];
    /**
     * The root store (null for the root store itself)
     */
    readonly root: StoreView | null;
    /**
     * The prefix path for this store (empty string for the root store)
     */
    readonly prefix: PropertyKey;
}
/**
 * A mutable Store object that points to a state tree. These cannot be constructed directly; use {@link createStore} instead.
 */
export type Store<T extends AnyState = AnyState> = StoreView<T, true>;
/**
 * A read-only StoreView object that points to a state tree.
 */
export type StoreViewOf<T extends StateConstraint, Mutable extends boolean = boolean> = StoreView<PathMap<T>, Mutable>;
/**
 * A mutable Store object for state of type `T`.
 */
export type StoreOf<T extends StateConstraint> = StoreViewOf<T, true>;
/**
 * Creates a new state store with the given initial state.
 * @param factory The initial state value
 * @returns A new Store object
 */
export declare function createStore<T extends StateConstraint, M extends boolean = true>(factory: T | StoreViewOf<T, M> | (() => StoreViewOf<T, M>)): StoreViewOf<T, M>;
/**
 * Destroys a store and any sub-stores, cleaning up its resources. Future operations on the store will throw errors.
 * @param store The Store object to destroy
 */
export declare function destroyStore(store: StoreView): void;
/**
 * Checks if a value is a valid Store object.
 * @param value The value to check
 * @returns True if the value is a Store, false otherwise
 */
export declare function isStore<T extends AnyState, M extends boolean = true>(value: unknown): value is StoreView<T, M>;
/**
 * Retrieves the value at the specified path in the store's state.
 * @param store The Store object
 * @param path The path to retrieve. If omitted, the entire state is returned.
 * @returns The value at the specified path
 */
export declare function peek<T extends AnyState>(store: StoreView<T>): T[""];
export declare function peek<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P): T[P];
/**
 * Registers a listener function that is called whenever the value at the specified path changes.
 * @param store The Store object
 * @param path The path to listen to
 * @param listener The listener function to call on changes
 * @returns A function to unregister the listener
 */
export declare function listen<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P, listener: (value: T[P], path: P) => void, initialNotify?: boolean): () => void;
type Numberify<T> = T extends `${number}` ? number : T;
/**
 * Type that represents a sub-store focused on the state at the specified path prefix.
 */
export type Focus<T extends Record<PropertyKey, StateConstraint>, P extends keyof T> = "" extends P ? T : {
    [K in keyof T as P extends K ? "" : K extends `${Stringify<P>}.${infer Rest}` ? Numberify<Rest> : never]: T[K];
};
/**
 * Creates a sub-store that focuses on the state at the specified path prefix.
 * @param store The parent Store object
 * @param path The path prefix for the sub-store
 * @returns A new Store object representing the sub-store
 */
export declare function focus<T extends Record<PropertyKey, StateConstraint>, P extends keyof T, M extends boolean>(store: StoreView<T, M>, path: P): StoreView<Focus<T, P>, M>;
/**
 * Creates a derived read-only store whose state is computed using the provided function whenever the value at the specified path changes.
 * @param store The source StoreView object
 * @param path The path in the source store to derive from
 * @param computeFn The function to compute the derived state from the source state value
 */
export declare function computed<T extends AnyState, P extends keyof T, V extends StateConstraint>(store: StoreView<T>, path: P, computeFn: (stateValue: T[P]) => V): StoreViewOf<V>;
/**
 * A tuple representing a path and its corresponding value in the store's state.
 * @example
 * ```ts
 * type State = { foo: number; bar: string };
 * type Pair = PathPair<State>;
 * // Result: ["foo", number] | ["bar", string]
 * ```
 */
export type PathPair<T extends AnyState> = {
    [K in keyof T]: readonly [K, PatchValue<T[K]>];
}[keyof T];
/**
 * Sets multiple values in the store's state in a single batch operation.
 * @param store The Store object
 * @param replacements Tuples of path-value pairs to set in the store
 */
export declare function update<T extends AnyState>(store: Store<T>, ...replacements: PathPair<T>[]): void;
type PatchSpec<T> = null | undefined | (T extends Primitive ? T : T extends readonly unknown[] ? {
    readonly [K in number | "length"]?: PatchSpecOrFunction<T[K]>;
} | T : {
    readonly [K in keyof T]?: PatchSpecOrFunction<T[K]>;
});
type PatchSpecOrFunction<T> = PatchSpec<T> | ((prev: T) => PatchSpec<T>);
/**
 * A value or patch specification for use with the `patch` function.
 * The patch specification allows partial updates to objects and arrays, with `null` values indicating deletion of keys and `undefined` values indicating no change.
 */
export type PatchValue<T> = T | PatchSpecOrFunction<T>;
/**
 * Patches the value at the specified path in the store's state by merging the provided patch object.
 * `null` values in the patch object will delete the corresponding keys in the state, while `undefined` values will leave them unchanged.
 * @param store The Store object
 * @param path The path to patch
 * @param patchValue The patch object to merge at the specified path
 */
export declare function patch<T extends AnyState>(store: Store<T>, patchValue: PatchValue<T[""]>): void;
/**
 * Synchronize an existing store with external getter and setter functions.
 * @param getter Function to get the current value
 * @param setter Function to set a new value
 * @returns A Store object that syncs with the external source
 */
export declare function sync<T extends StateConstraint>(store: StoreOf<T>, getter: () => PatchValue<T>, setter: (value: T) => void): () => void;
export {};
