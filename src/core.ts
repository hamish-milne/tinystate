type Assert<Actual extends Expected, Expected> = Actual;

type Primitive = string | number | boolean | null | undefined;

const atom = Symbol("atom");

/**
 * A unique marker type to identify objects that should be treated as atomic values in patches, even if they are objects or arrays.
 * See {@link setAtom} for how to create Atom objects.
 */
export type Atom = { [atom]: true };

/**
 * A type that represents an object of type `T` marked as an Atom.
 */
export type AtomOf<T extends object> = T & Atom;

type AtomicValue = Atom | Primitive;

/**
 * A value that can be stored in the state: a primitive, a readonly object of `StateValue`s, or a readonly array of `StateValue`s.
 */
export type StateValue = AtomicValue | StateObject | StateArray;
type StateObject = { readonly [key in string | number]?: StateValue };
type StateArray = readonly StateValue[];

// We use `unknown` here for better developer experience, rather than the more correct `object | Primitive`.
// This allows any value to be used as state without requiring awkward type conversions if a non-compatible (but not present in practice) type is found somewhere in the tree.
export type StateConstraint = unknown; // object | Primitive;

// We don't support symbol keys, but 'pretending to' simplifies some type logic.
// This helper filters out symbols where that's strictly necessary, such as in path stringification.
type Stringify<T> = T extends symbol ? never : T;

// Concatenates a prefix and suffix into a dot-separated path string.
type ConcatPath<Prefix extends PropertyKey, Suffix extends PropertyKey> = Prefix extends ""
  ? Suffix
  : Suffix extends ""
    ? Prefix
    : `${Stringify<Prefix>}.${Stringify<Suffix>}`;

// Determines if `T` is recursive (i.e., contains itself as a property) to prevent infinite path expansion.
// Note that this doesn't detect indirect recursion.
type IsRecursive<T> = T extends AtomicValue ? false : T extends T[keyof T] ? true : false;

type _Test_IsRecursive1 = Assert<
  // biome-ignore lint/suspicious/noExplicitAny: for testing
  IsRecursive<{ a: number; b: { c: string; d: { e: number; f: { g: any } } }; h: any }>,
  true
>;
type _Test_IsRecursive2 = Assert<
  IsRecursive<{ a: number; b: { c: string; d: { e: number } } }>,
  false
>;

// Converts `A | B | C` to `A & B & C`
type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: type magic
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type _Test_UnionToIntersection = Assert<
  UnionToIntersection<{ a: number } | { b: string } | { c: boolean }>,
  { a: number } & { b: string } & { c: boolean }
>;

type AllKeys<T> = keyof {
  [U in T as U extends readonly unknown[] ? Extract<keyof U, number | "length"> : keyof U]: unknown;
};

type OptionalKey<T, K extends PropertyKey> = T extends { [_ in K]: infer P }
  ? P
  : Extract<T, { [_ in K]?: unknown }>[K] | undefined;

type MergeUnionObject<T> = { [K in AllKeys<T>]: OptionalKey<T, K> };

type OrUndefined<T> = { [K in keyof T]: T[K] | undefined };

type MergeUnion<T> =
  Extract<T, AtomicValue> extends never
    ? MergeUnionObject<T>
    : OrUndefined<MergeUnionObject<Exclude<T, AtomicValue>>>;

type _Test_MergeUnion1 = Assert<
  MergeUnion<{ a: { x: number }; b: { y: string } } | { a: { z: boolean }; c: { w: number[] } }>,
  { a: { x: number } | { z: boolean }; b?: { y: string }; c?: { w: number[] } }
>;
type _Test_MergeUnion2 = Assert<
  MergeUnion<{ a: number } | { b: string } | { c: boolean }>,
  { a?: number; b?: string; c?: boolean }
>;
type _Test_MergeUnion3 = Assert<MergeUnion<{ a: number } | { a: string }>, { a: number | string }>;
type _Test_MergeUnion4 = Assert<
  MergeUnion<{ a: number } | { a: string } | number>,
  { a?: number | string }
>;
type _Test_MergeUnion5 = Assert<
  MergeUnion<{ a: number } | { a: string } | [number, string] | [number, string, boolean]>,
  { a?: number | string; 0?: number; 1?: string; 2?: boolean; length?: 2 | 3 }
>;
type _Test_MergeUnion6 = Assert<
  MergeUnion<{ a: number | { b: number }; b: null | { c: number } }>,
  { a: number | { b: number }; b: null | { c: number } }
>;

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
export type PathMap<T, Prefix extends PropertyKey = ""> =
  true extends IsRecursive<T>
    ? { [K in Prefix]: T }
    : { [K in Prefix]: T } & _PathMap<MergeUnion<T>, Prefix>;
type _PathMap<T, Prefix extends PropertyKey> = UnionToIntersection<
  {
    [K in keyof T]: PathMap<T[K], ConcatPath<Prefix, K>>;
  }[keyof T]
>;

type _Test_PathMap1 = Assert<
  PathMap<{ foo: { bar: number; baz?: string[] }; qux: boolean }>,
  {
    "": { foo: { bar: number; baz?: string[] }; qux: boolean };
    foo: { bar: number; baz?: string[] };
    "foo.bar": number;
    "foo.baz": string[] | undefined;
    "foo.baz.length": number | undefined;
    qux: boolean;
  } & {
    [_ in `foo.baz.${number}`]: string | undefined;
  }
>;
type _Test_PathMap2 = Assert<
  PathMap<{ a: number } | { b: string }>,
  {
    "": { a: number } | { b: string };
    a: number | undefined;
    b: string | undefined;
  }
>;

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
export type MetadataTree<
  T extends StateConstraint,
  M extends StateConstraint,
  R extends StateConstraint,
> = _MetadataTree<PathMap<T>, PathMap<M>, PathMap<R>>;
type _MetadataTree<
  T extends AnyState,
  M extends AnyState,
  R extends AnyState,
> = UnionToIntersection<
  {
    [KT in keyof T]: { [KM in keyof M as ConcatPath<KT, KM>]: M[KM] };
  }[keyof T]
> &
  R;

type _Test_MetadataTree = Assert<
  MetadataTree<
    { user: { name: string; age: number }; settings: { theme: string } },
    { issue: string },
    { invalidFields: string[] }
  >,
  {
    user: { issue: string };
    "user.name": { issue: string };
    "user.age": { issue: string };
    settings: { issue: string };
    "settings.theme": { issue: string };
    invalidFields: string[];
  }
>;

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
export type ValueOf<T, P extends PropertyKey | undefined> = P extends keyof PathMap<T>
  ? PathMap<T>[P]
  : never;

/**
 * A state object with any keys and values, as a fallback type.
 */
export type AnyState = Record<PropertyKey, StateConstraint>;

// Unique brand to identify Store objects. In practice we check for presence in implMap,
// but this symbol ensures type safety as well.
const brand = Symbol("Store");

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
export type StoreViewOf<T extends StateConstraint, Mutable extends boolean = boolean> = StoreView<
  PathMap<T>,
  Mutable
>;

/**
 * A mutable Store object for state of type `T`.
 */
export type StoreOf<T extends StateConstraint> = StoreViewOf<T, true>;

type AnyPatch = StateValue | ((prev: StateValue) => StateValue);

// Holds the actual mutable state and listeners for a Store
interface StoreImpl {
  _state: StateValue;
  // biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
  readonly _listeners: Map<PropertyKey, Set<(value: any, path: any) => void>>;
  // biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
  readonly _extListeners: Map<(pairs: readonly any[]) => void, boolean>;
  readonly _queuedUpdates: [PropertyKey, AnyPatch][];
}

const {
  freeze,
  preventExtensions,
  entries: objectEntries,
  fromEntries,
  keys: objectKeys,
  assign,
} = Object;
const { isArray, from: arrayFrom } = Array;

// Maps Store objects to their implementations
const implMap = new WeakMap<StoreView, StoreImpl>();

// Safely indexes into a StateValue object or array
function index(obj: StateValue, key: string): StateValue {
  return obj && typeof obj === "object" ? obj[key as string & number] : undefined;
}

// Splits a path string into segments separated by dots, ignoring empty segments
function segments(path: PropertyKey): string[] {
  return String(path).match(/[^.]+/g) || [];
}

function deepIndex(obj: StateValue, path: PropertyKey): StateValue {
  let result = obj;
  for (const segment of segments(path)) {
    result = index(result, segment);
  }
  return result;
}

// Concatenates a prefix and key into a dot-separated path
function concatPath(prefix: PropertyKey, key: PropertyKey): PropertyKey {
  return prefix === "" ? key : key === "" ? prefix : `${prefix as string}.${key as string}`;
}

function getImpl(store: StoreView): StoreImpl {
  const storeImpl = implMap.get(store.root || store);
  if (!storeImpl) {
    throw new Error("Invalid store");
  }
  return storeImpl;
}

/**
 * Creates a new state store with the given initial state.
 * @param factory The initial state value
 * @returns A new Store object
 */
export function createStore<T extends StateConstraint, M extends boolean = true>(
  factory: T | StoreViewOf<T, M> | (() => StoreViewOf<T, M>),
): StoreViewOf<T, M> {
  if (isStore<PathMap<T>, M>(factory)) {
    return factory;
  }
  if (typeof factory === "function") {
    return (factory as () => StoreViewOf<T, M>)();
  }
  const store = freeze<StoreViewOf<T, M>>({
    [brand]: freeze([true as M, null as unknown as PathMap<T>] as const),
    root: null,
    prefix: "",
  });
  const storeImpl = preventExtensions<StoreImpl>({
    _state: patchStateValue(null, "", factory as StateValue, null, null),
    _listeners: new Map(),
    _extListeners: new Map(),
    _queuedUpdates: [],
  });
  implMap.set(store, storeImpl);
  return store;
}

/**
 * Destroys a store and any sub-stores, cleaning up its resources. Future operations on the store will throw errors.
 * @param store The Store object to destroy
 */
export function destroyStore(store: StoreView): void {
  implMap.delete(store.root || store);
}

/**
 * Checks if a value is a valid Store object.
 * @param value The value to check
 * @returns True if the value is a Store, false otherwise
 */
export function isStore<T extends AnyState, M extends boolean = true>(
  value: unknown,
): value is StoreView<T, M> {
  return implMap.has(value as StoreView);
}

/**
 * Retrieves the value at the specified path in the store's state.
 * @param store The Store object
 * @param path The path to retrieve. If omitted, the entire state is returned.
 * @returns The value at the specified path
 */
export function peek<T extends AnyState>(store: StoreView<T>): T[""];
export function peek<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P): T[P];
export function peek<T extends AnyState, P extends keyof T>(
  store: StoreView<T>,
  path: P = "" as P,
): T[P] {
  return deepIndex(getImpl(store)._state, concatPath(store.prefix, path)) as T[P];
}

/**
 * Registers a listener function that is called whenever the value at the specified path changes.
 * @param store The Store object
 * @param path The path to listen to
 * @param listener The listener function to call on changes
 * @returns A function to unregister the listener
 */
export function listen<T extends AnyState, P extends keyof T>(
  store: StoreView<T>,
  path: P,
  listener: (value: T[P], path: P) => void,
  initialNotify = false,
): () => void {
  const impl = getImpl(store);
  const fullPath = concatPath(store.prefix, path);
  let listeners = impl._listeners.get(fullPath);
  if (!listeners) {
    listeners = new Set();
    impl._listeners.set(fullPath, listeners);
  }
  listeners.add(listener);
  if (initialNotify) {
    listener(peek(store, path), path);
  }
  return () => listeners.delete(listener);
}

/**
 * Registers a listener function that is called whenever any value in the store changes.
 * The listener receives an array of path-value pairs representing all changed paths and their new values (with `null` for deleted keys).
 * @param store The Store object
 * @param listener The listener function to call on changes
 * @param includeObjects Whether to include changes to object and array values (default: false). If false, only changes to primitive values will be included.
 * @returns A function to unregister the listener
 */
export function listenAll<T extends AnyState>(
  store: StoreView<T>,
  listener: (pairs: readonly Readonly<ListenPair<T>>[]) => void,
  includeObjects = false,
): () => void {
  const { _extListeners } = getImpl(store);
  _extListeners.set(listener, includeObjects);
  return () => _extListeners.delete(listener);
}

type Numberify<T> = T extends `${number}` ? number : T;

/**
 * Type that represents a sub-store focused on the state at the specified path prefix.
 */
export type Focus<T extends Record<PropertyKey, StateConstraint>, P extends keyof T> = "" extends P
  ? T
  : {
      [K in keyof T as P extends K
        ? ""
        : K extends `${Stringify<P>}.${infer Rest}`
          ? Numberify<Rest>
          : never]: T[K];
    };

/**
 * Creates a sub-store that focuses on the state at the specified path prefix.
 * @param store The parent Store object
 * @param path The path prefix for the sub-store
 * @returns A new Store object representing the sub-store
 */
export function focus<
  T extends Record<PropertyKey, StateConstraint>,
  P extends keyof T,
  M extends boolean,
>(store: StoreView<T, M>, path: P): StoreView<Focus<T, P>, M> {
  if (path === "") {
    return store as StoreView<Focus<T, P>, M>;
  }
  return freeze<StoreView<Focus<T, P>, M>>({
    [brand]: store[brand] as [M, Focus<T, P>],
    root: store.root || store,
    prefix: concatPath(store.prefix, path),
  });
}

/**
 * Creates a derived read-only store whose state is computed using the provided function whenever the value at the specified path changes.
 * @param store The source StoreView object
 * @param path The path in the source store to derive from
 * @param computeFn The function to compute the derived state from the source state value
 */
export function computed<T extends AnyState, P extends keyof T, V extends StateConstraint>(
  store: StoreView<T>,
  path: P,
  computeFn: (stateValue: T[P]) => V,
): StoreViewOf<V> {
  const derived = createStore<V>(undefined as unknown as V);
  listen(store, path, (newValue) => patch(derived, computeFn(newValue)), true);
  return derived;
}

type PatchStack = [
  current: StateValue,
  next: StateValue,
  path: PropertyKey,
  key: string,
  keys: string[] | null,
  changes: [string, StateValue][],
][];

function descend(stack: PatchStack, segment: string, keys: string[] | null): void {
  const [current, next, path] = stack[stack.length - 1];
  const current1 = index(current, segment);
  const next1 = index(next, segment) as StateValue | ((prev: StateValue) => StateValue);
  stack.push([
    current1,
    typeof next1 === "function" ? next1(current1) : next1,
    concatPath(path, segment),
    segment,
    keys,
    [],
  ]);
}

function patchStateValue(
  state: StateValue,
  selector: PropertyKey,
  patch: StateValue | ((prev: StateValue) => StateValue),
  notify: Map<PropertyKey, StateValue> | null,
  removedObjects: Set<PropertyKey> | null,
): StateValue {
  // Setup the stack: add initial descent steps for each segment in the selector
  // We set `keys` to empty so that parent elements are never iterated-over
  const stack: PatchStack = [[state, undefined, "", "", [], []]];
  for (const segment of segments(selector)) {
    descend(stack, segment, []);
  }
  // Set the patch value at the bottom of the stack to kick-off the patching process
  const lastStack = stack[stack.length - 1];
  lastStack[1] = typeof patch === "function" ? patch(lastStack[0]) : (patch as StateValue);
  lastStack[4] = null;
  const recursionCheck = new WeakSet();
  while (true) {
    const [current, next, path, key, keys, changes] = stack[stack.length - 1];
    let newValue: StateValue;
    if (keys) {
      // If `keys` is not null, we are iterating over the keys of `next`, or have finished iterating
      const nextKey = keys.pop();
      if (nextKey) {
        // More keys to process
        descend(stack, nextKey, null);
        continue;
      }
      // Finished iterating over keys; check for changes
      if (changes.length > 0) {
        const oldEntries = current && typeof current === "object" ? objectEntries(current) : [];
        if (isArray(current)) {
          oldEntries.push(["length", current.length]);
        }
        const changesMap = new Map(oldEntries);
        for (const [k, v] of changes) {
          if (v === null) {
            changesMap.delete(k);
          } else if (v !== undefined) {
            changesMap.set(k, v);
          }
        }
        const newObj = fromEntries(changesMap);
        newValue = freeze(typeof newObj.length === "number" ? assign([], newObj) : newObj);
      }
      // If no changes, keep the current value
    } else if (current === next) {
      // No changes
    } else if (typeof next !== "object" || !next || isAtom(next)) {
      newValue = next;
      if (typeof current === "object" && current && removedObjects) {
        removedObjects.add(path);
      }
    } else {
      // We need to merge `current` and `next` by iterating over the keys of `next`
      if (recursionCheck.has(next)) {
        throw new Error(`Circular reference detected at path "${path as string}"`);
      }
      recursionCheck.add(next);
      const keys = objectKeys(next).reverse();
      if (isArray(next)) {
        keys.push("length");
      }
      stack[stack.length - 1][4] = keys;
      continue;
    }
    // If we're here, we didn't modify the stack this iteration, so we can pop it
    recursionCheck.delete(next as object);
    stack.pop();
    // If there is a new value, record the change:
    if (newValue !== undefined) {
      notify?.set(path, newValue ?? undefined);
      if (stack.length) {
        stack[stack.length - 1][5].push([key, newValue]);
      } else {
        // If the stack is empty, we're done
        return newValue;
      }
    }
    // If the stack is empty with no new value, return the original state
    if (!stack.length) {
      return state;
    }
  }
}

type Key = string | number;

function applyChanges(impl: StoreImpl): void {
  try {
    processChangeQueue(impl);
  } catch (error) {
    // Clear the queue so it doesn't lock up
    impl._queuedUpdates.length = 0;
    throw error;
  }
}

function processChangeQueue(impl: StoreImpl) {
  while (impl._queuedUpdates.length > 0) {
    const notify = new Map<Key, StateValue>();
    const removedObjects = new Set<Key>();
    // Apply queued changes one 'batch' at a time.
    // This ensures that if listeners synchronously trigger more changes,
    // those will be processed in a separate batch after the current listeners have finished,
    // preventing infinite loops and ensuring a predictable order of operations.
    const batchLength = impl._queuedUpdates.length;
    for (let i = 0; i < batchLength; i++) {
      const [path, patch] = impl._queuedUpdates[i];
      impl._state = patchStateValue(impl._state, path, patch, notify, removedObjects);
    }
    impl._queuedUpdates.splice(0, batchLength);

    for (const [changedPath, value] of notify) {
      const listeners = impl._listeners.get(changedPath);
      if (listeners) {
        for (const listener of listeners) {
          listener(value, changedPath);
        }
      }
      if (removedObjects.has(changedPath)) {
        const prefix = `${changedPath}.`;
        for (const [listenerPath, listeners] of impl._listeners) {
          if (
            !notify.has(listenerPath as Key) &&
            typeof listenerPath === "string" &&
            listenerPath.startsWith(prefix)
          ) {
            for (const listener of listeners) {
              listener(undefined, listenerPath);
            }
          }
        }
      }
    }
    if (impl._extListeners.size > 0) {
      const pairs = freeze(
        arrayFrom(notify.entries()).map(([key, value]) => freeze([key, value ?? null] as const)),
      );
      const primitivePairs = freeze(
        pairs.filter(([, value]) => typeof value !== "object" || value === null || isAtom(value)),
      );
      for (const [listener, includeObjects] of impl._extListeners) {
        listener(includeObjects ? pairs : primitivePairs);
      }
    }
  }
}

/**
 * A tuple representing a path and its corresponding patch value, used for batch updates in the `update` function.
 */
export type PatchPair<T extends AnyState> = {
  [K in keyof T]: readonly [K, PatchValue<T[K]>];
}[keyof T];

/**
 * A tuple representing a path and its corresponding value type, used for listening to changes in the `listen` function.
 * @example
 * ```ts
 * type State = { foo: number; bar: string };
 * type Pair = ListenPair<State>;
 * // Result: ["foo", number] | ["bar", string]
 * ```
 */
export type ListenPair<T extends AnyState> = {
  [K in keyof T]: readonly [K, T[K] | null];
}[keyof T];

/**
 * Sets multiple values in the store's state in a single batch operation.
 * @param store The Store object
 * @param replacements Tuples of path-value pairs to set in the store
 */
export function update<T extends AnyState>(store: Store<T>, ...replacements: PatchPair<T>[]): void {
  const storeImpl = getImpl(store);
  for (const [path, patch] of replacements) {
    storeImpl._queuedUpdates.push([concatPath(store.prefix, path), patch as AnyPatch]);
  }
  applyChanges(storeImpl);
}

// Patch specification type for patchState. Equivalent to a 'deep partial' but does not affect arrays.
type PatchSpec<T> =
  | null
  | undefined
  | (T extends AtomicValue
      ? T
      : T extends readonly unknown[]
        ? { readonly [K in number | "length"]?: PatchSpecOrFunction<T[K]> } | T
        : { readonly [K in keyof T]?: PatchSpecOrFunction<T[K]> });

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
export function patch<T extends AnyState>(store: Store<T>, patchValue: PatchValue<T[""]>): void {
  const storeImpl = getImpl(store);
  storeImpl._queuedUpdates.push([store.prefix, patchValue as AnyPatch]);
  applyChanges(storeImpl);
}

/**
 * Synchronize an existing store with external getter and setter functions.
 * @param getter Function to get the current value
 * @param setter Function to set a new value
 * @returns A Store object that syncs with the external source
 */
export function sync<T extends StateConstraint>(
  store: StoreOf<T>,
  getter: () => PatchValue<T>,
  setter: (value: T) => void,
) {
  patch(store, getter());
  return listen(store, "", () => {
    setter(peek(store, ""));
  });
}

/**
 * Marks an object as an atom, which is always treated as a primitive value in patches, even if it is an object or array.
 * This is useful for cases where you want to replace an entire object or array rather than merging it.
 * @param value The object to mark as an atom
 * @returns The same object with an atom marker
 */
export function setAtom<T extends object>(value: T): AtomOf<T> {
  return assign(value, { [atom]: true as const });
}

/**
 * Checks if a value is an atom, meaning it has been marked with the atom marker and should be treated as a primitive value in patches.
 * @param value The value to check
 * @returns True if the value is an atom, false otherwise
 */
export function isAtom<T extends object>(value: T): value is AtomOf<T> {
  return typeof value === "object" && value !== null && (value as AtomOf<T>)[atom] === true;
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;

  test("get initial state from a new store", () => {
    const store = createStore({ a: 1, b: { c: 2 } });
    expect(peek(store, "a")).toBe(1);
    expect(peek(store, "b.c")).toBe(2);
    expect(isStore(store)).toBe(true);
    expect(isStore({})).toBe(false);
  });

  test("create store from existing store", () => {
    const original = createStore({ a: 1 });
    expect(createStore(original)).toBe(original);
    expect(createStore(() => original)).toBe(original);
  });

  test("error after destroy", () => {
    const store = createStore({ a: 1 });
    destroyStore(store);
    expect(isStore(store)).toBe(false);
    expect(() => peek(store, "a")).toThrow("Invalid store");
  });

  test("set state and get updated value", () => {
    const store = createStore({ a: 1, b: { c: 2 } });
    update(store, ["a", 10]);
    update(store, ["b.c", 20]);
    expect(peek(store, "a")).toBe(10);
    expect(peek(store, "b.c")).toBe(20);
  });

  test("patch primitive with object", () => {
    const store = createStore({ a: 1 as number | { b: number }, b: null as null | { c: number } });
    patch(store, { a: { b: 2 } });
    expect(peek(store, "a.b")).toBe(2);
    patch(store, { b: { c: 3 } });
    expect(peek(store, "b.c")).toBe(3);
  });

  test("patch state with partial object", () => {
    const store = createStore({ a: 1, b: { c: 2, d: 3 } });
    patch(store, { b: { c: 20 } });
    expect(peek(store, "b.c")).toBe(20);
    expect(peek(store, "b.d")).toBe(3);
  });

  test("patch state with null to delete key", () => {
    const store = createStore({ a: 1, b: { c: 2, d: 3 } });
    patch(store, { b: { d: null } });
    expect(peek(store, "b.c")).toBe(2);
    expect(peek(store, "b.d")).toBeUndefined();
  });

  test("patch array indexes", () => {
    const store = createStore({ arr: [1, 2, 3] });
    patch(store, { arr: { 1: 20 } });
    expect(peek(store, "arr")).toEqual([1, 20, 3]);
  });

  test("patch with function", () => {
    const store = createStore([1, 2, 3]);
    patch(store, (prev) => prev.map((x) => x * 2));
    expect(peek(store, "")).toEqual([2, 4, 6]);
    patch(store, { 0: (prev) => prev + 10 });
    expect(peek(store, "")).toEqual([12, 4, 6]);
  });

  test("atomic patch", () => {
    const store = createStore({
      a: { b: 1, c: 2 } as AtomOf<Uint8Array> | { b: number; c: number },
    });
    const newObj = setAtom({ b: 10, c: 20 });
    patch(store, { a: newObj });
    expect(peek(store, "a")).toBe(newObj);
    const newArr = setAtom(new Uint8Array([1, 2, 3]));
    patch(store, { a: newArr });
    expect(peek(store, "a")).toBe(newArr);
  });

  test("listen to state changes", () => {
    const store = createStore({ a: [1, 2, 3] });
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsubscribe1 = listen(focus(store, "a"), "", listener1);
    const unsubscribe2 = listen(store, "a.1", listener2);
    update(store, ["a.1", 20]);
    update(store, ["a.1", 20]);
    update(store, ["a", [1, 20, 3]]);
    expect(listener1).toHaveBeenCalledWith([1, 20, 3], "a");
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(20, "a.1");
    patch(store, { a: [2, 4, 6] });
    expect(listener1).toHaveBeenCalledWith([2, 4, 6], "a");
    expect(listener2).toHaveBeenCalledWith(4, "a.1");
    unsubscribe1();
    unsubscribe2();
    update(store, ["a.2", 30]);
    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  test("listenAll to all state changes", () => {
    const store = createStore({
      a: 1,
      b: { c: 2 },
      d: 3,
      e: { f: 4 },
      g: undefined as undefined | AtomOf<{ h: number }>,
    });
    const listener = vi.fn();
    const listenerWithObjects = vi.fn();
    const unsubscribe = listenAll(store, listener);
    const unsubscribeWithObjects = listenAll(store, listenerWithObjects, true);
    update(store, ["a", 10], ["b.c", 20], ["d", null], ["e", null], ["g", setAtom({ h: 5 })]);
    expect(listenerWithObjects).toHaveBeenCalledWith(
      expect.arrayContaining([
        ["a", 10],
        ["b.c", 20],
        ["b", { c: 20 }],
        ["d", null],
        ["e", null],
        ["g", setAtom({ h: 5 })],
        ["", { a: 10, b: { c: 20 }, g: setAtom({ h: 5 }) }],
      ]),
    );
    expect(listener).toHaveBeenCalledWith(
      expect.arrayContaining([
        ["a", 10],
        ["b.c", 20],
        ["d", null],
        ["e", null],
        ["g", setAtom({ h: 5 })],
      ]),
    );
    unsubscribe();
    unsubscribeWithObjects();
    update(store, ["a", 30]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listenerWithObjects).toHaveBeenCalledTimes(1);
  });

  test("circular reference detection", () => {
    const store = createStore({ a: 1 });
    // biome-ignore lint/suspicious/noExplicitAny: for testing
    const obj: any = { b: 2 };
    obj.c = obj; // Create circular reference
    expect(() => update(store, ["a", obj])).toThrow('Circular reference detected at path "a.c"');
  });

  test("unchanged objects are ref-stable", () => {
    const store = createStore({ a: { b: 1 }, c: { b: 2 } });
    const obj1 = peek(store, "a");
    const obj2 = peek(store, "c");
    patch(store, { a: { b: 1 } }); // No actual change
    expect(peek(store, "a")).toBe(obj1); // Same reference
    update(store, ["c.b", 3]); // Actual change
    expect(peek(store, "c")).not.toBe(obj2); // Different reference
  });

  test("replacing object by reference notifies sub-listeners", () => {
    const store = createStore({ a: { b: 1 } });
    const obj = peek(store, "a");
    patch(store, { a: { b: 2 } }); // Force new object
    const listener = vi.fn();
    listen(store, "a.b", listener);
    patch(store, { a: obj }); // Set back to original object
    expect(listener).toHaveBeenCalledWith(1, "a.b");
  });

  test("deleting key notifies listeners", () => {
    const store = createStore({ a: { b: 1 } });
    const listener = vi.fn();
    listen(store, "a.b", listener);
    patch(store, { a: { b: null } });
    expect(listener).toHaveBeenCalledWith(undefined, "a.b");
  });

  test("replacing object with primitive notifies sub-listeners", () => {
    const store = createStore({ a: { b: 1 } as number | { b: number } });
    const listener = vi.fn();
    listen(store, "a.b", listener);
    patch(store, { a: 42 });
    patch(store, { a: 43 });
    expect(listener).toHaveBeenCalledWith(undefined, "a.b");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("update with does not notify intermediate changes", () => {
    const store = createStore({ a: { b: 1 } as number | { b: number } });
    const listener = vi.fn();
    const listener2 = vi.fn();
    listen(store, "a", listener);
    listen(store, "a.b", listener2);
    update(store, ["a", 2], ["a", { b: 3 }]);
    expect(listener).toHaveBeenCalledWith({ b: 3 }, "a");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledWith(3, "a.b");
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  test("update within listener notifies in sequence", () => {
    const store = createStore({ a: 1, b: 1 });
    listen(store, "a", (value) => {
      patch(store, { b: value + 1 });
    });
    const listenerFn = vi.fn();
    listen(store, "", listenerFn);
    patch(store, { a: 2 });
    expect(listenerFn).toHaveBeenCalledWith({ a: 2, b: 1 }, "");
    expect(listenerFn).toHaveBeenCalledWith({ a: 2, b: 3 }, "");
  });

  test("focus creates sub-store", () => {
    const store = createStore({ a: { b: 1, c: 2 }, d: [3] });
    const subStore = focus(store, "a");
    expect(peek(subStore, "b")).toBe(1);
    expect(peek(subStore, "c")).toBe(2);
    patch(subStore, { b: 10 });
    expect(peek(store, "a.b")).toBe(10);
    const subSubStore = focus(subStore, "c");
    expect(peek(subSubStore, "")).toBe(2);
    patch(subSubStore, 20);
    expect(peek(store, "a.c")).toBe(20);
    const arrayStore = focus(store, "d");
    expect(peek(focus(arrayStore, 0), "")).toBe(3);
  });

  test("focus with empty path returns same store", () => {
    const store = createStore({ a: 1 });
    const focusedStore = focus(store, "");
    expect(focusedStore).toBe(store);
  });

  test("computed store reflects derived value", () => {
    const store = createStore([1, 2, 3]);
    const derived = computed(store, "", (arr) => ({
      sum: arr.reduce((acc, val) => acc + val, 0),
      max: Math.max(...arr),
    }));
    const lSum = vi.fn();
    const lMax = vi.fn();
    listen(derived, "sum", lSum);
    listen(derived, "max", lMax);
    expect(peek(derived, "sum")).toBe(6);
    expect(peek(derived, "max")).toBe(3);
    patch(store, { 1: 5 });
    expect(peek(derived, "sum")).toBe(9);
    expect(peek(derived, "max")).toBe(5);
    expect(lSum).toHaveBeenCalledWith(9, "sum");
    expect(lMax).toHaveBeenCalledWith(5, "max");
    patch(store, [-2, undefined, 6]);
    expect(lMax).toHaveBeenCalledWith(6, "max");
    expect(lSum).toBeCalledTimes(1); // sum didn't change
  });

  test("sync store with external getter/setter", () => {
    let externalValue = { x: 1, y: 2 };
    const getter = () => externalValue;
    const setter = (val: typeof externalValue) => {
      externalValue = val;
    };
    const store = createStore(undefined as unknown as typeof externalValue);
    sync(store, getter, setter);
    expect(peek(store, "x")).toBe(1);
    expect(peek(store, "y")).toBe(2);
    patch(store, { x: 10 });
    expect(externalValue.x).toBe(10);
    expect(externalValue.y).toBe(2);
    patch(store, { x: 5, y: 15 });
    expect(externalValue).toEqual({ x: 5, y: 15 });
  });

  test("listen on root after partial update", () => {
    const store = createStore([{ a: 1 }, { a: 2 }]);
    const listener = vi.fn();
    listen(store, "", listener);
    patch(store, [...peek(store, ""), { a: 3 }]);
    expect(listener).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }, { a: 3 }], "");
  });

  test("import index", async () => {
    const module = await import("./index.js");
    expect(module.createStore).toBeTypeOf("function");
  });
}
