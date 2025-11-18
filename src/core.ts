type Primitive = string | number | boolean | null | undefined;

/**
 * A value that can be stored in the state: a primitive, a readonly object of `StateValue`s, or a readonly array of `StateValue`s.
 */
export type StateValue = Primitive | StateObject | StateArray;
type StateObject = { readonly [key in string | number]?: StateValue };
type StateArray = readonly StateValue[];

type Stringify<T> = T extends symbol ? never : T;

type ConcatPath<Prefix extends PropertyKey, Suffix extends PropertyKey> = Prefix extends ""
  ? Suffix
  : Suffix extends ""
    ? Prefix
    : `${Stringify<Prefix>}.${Stringify<Suffix>}`;

// Determines if `T` is recursive (i.e., contains itself as a property) to prevent infinite path expansion.
// Note that this doesn't detect indirect recursion.
type IsRecursive<T> = T extends Primitive ? false : T extends T[keyof T] ? true : false;

// Converts `A | B | C` to `A & B & C`
type UnionToIntersection<U> =
  // biome-ignore lint/suspicious/noExplicitAny: type magic
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

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
export type PathMap<T, Prefix extends PropertyKey = ""> = true extends IsRecursive<T>
  ? { "": T }
  : { [K in Prefix]: T } & _PathMap<T, Prefix>;
type _PathMap<T, Prefix extends PropertyKey> = T extends Primitive
  ? // biome-ignore lint/complexity/noBannedTypes: we need a type with no keys here
    {}
  : T extends readonly unknown[]
    ? _PathMap<{ [_: number]: T[number]; length: number }, Prefix>
    : UnionToIntersection<
        {
          [K in keyof T]: PathMap<T[K], ConcatPath<Prefix, K>>;
        }[keyof T]
      >;

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

export type MetadataTree<
  T extends StateValue,
  M extends StateValue,
  R extends StateValue,
> = _MetadataTree<PathMap<T>, PathMap<M>, PathMap<R>>;

// const x: MetadataTree<{ a: number; b: { c: string } }, { issue: string }, { invalidFields: string[] }> = {
//   ''
// }

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
export type AnyState = Record<PropertyKey, StateValue>;

// Unique brand to identify Store objects. In practice we check for presence in implMap,
// but this symbol ensures type safety as well.
const brand = Symbol("Store");

/**
 * An opaque object that points to a state tree. These cannot be constructed directly; use {@link createStore} instead.
 * @template T  The `PathMap` type representing the shape of the state in the store
 */
export interface StoreView<T extends AnyState = AnyState, Mutable extends boolean = boolean> {
  /**
   * Brand to identify Store objects
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

export type Store<T extends AnyState = AnyState> = StoreView<T, true>;

export type StoreViewOf<T extends StateValue> = StoreView<PathMap<T>>;

export type StoreOf<T extends StateValue> = Store<PathMap<T>>;

// Holds the actual mutable state and listeners for a Store
interface StoreImpl {
  _state: StateValue;
  // biome-ignore lint/suspicious/noExplicitAny: we can't restrict the type here
  readonly _listeners: Map<PropertyKey, Set<(value: any, path: any) => void>>;
}

// Maps Store objects to their implementations
const implMap = new WeakMap<StoreView, StoreImpl>();

// Safely indexes into a StateValue object or array
function index(obj: StateValue, key: string): StateValue | undefined {
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
 * @param initialState The initial state value
 * @returns A new Store object
 */
export function createStore<T extends StateValue>(
  initialState: T | Store<PathMap<T>> | (() => Store<PathMap<T>>),
): Store<PathMap<T>> {
  if (isStore(initialState)) {
    return initialState;
  }
  if (typeof initialState === "function") {
    return initialState();
  }
  const store = Object.freeze<Store<PathMap<T>>>({
    [brand]: Object.freeze([true, null as unknown as PathMap<T>] as const),
    root: null,
    prefix: "",
  });
  const storeImpl = Object.preventExtensions<StoreImpl>({
    _state: patchStateValue(null, "", initialState, null),
    _listeners: new Map(),
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
export function isStore<T extends AnyState>(value: unknown): value is Store<T> {
  return implMap.has(value as StoreView);
}

/**
 * Retrieves the value at the specified path in the store's state.
 * @param store The Store object
 * @param path The path to retrieve
 * @returns The value at the specified path
 */
export function peek<T extends AnyState, P extends keyof T>(store: StoreView<T>, path: P): T[P] {
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
): () => void {
  const impl = getImpl(store);
  const fullPath = concatPath(store.prefix, path);
  let listeners = impl._listeners.get(fullPath);
  if (!listeners) {
    listeners = new Set();
    impl._listeners.set(fullPath, listeners);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Numberify<T> = T extends `${number}` ? number : T;

/**
 * Type that represents a sub-store focused on the state at the specified path prefix.
 */
export type Focus<T extends Record<PropertyKey, StateValue>, P extends keyof T> = "" extends P
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
  T extends Record<PropertyKey, StateValue>,
  P extends keyof T,
  M extends boolean,
>(store: StoreView<T, M>, path: P): StoreView<Focus<T, P>, M> {
  if (path === "") {
    return store as StoreView<Focus<T, P>, M>;
  }
  return Object.freeze<StoreView<Focus<T, P>, M>>({
    [brand]: store[brand] as [M, Focus<T, P>],
    root: store.root || store,
    prefix: concatPath(store.prefix, path),
  });
}

export function computed<T extends AnyState, P extends keyof T, V extends AnyState>(
  store: StoreView<T>,
  path: P,
  computeFn: (stateValue: T[P]) => V,
): StoreView<PathMap<V>> {
  const derived = createStore(computeFn(peek(store, path)));
  listen(store, path, (newValue) => patch(derived, computeFn(newValue)));
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

function patchStateValue(
  state: StateValue,
  selector: PropertyKey,
  patch: StateValue,
  notify: Map<PropertyKey, StateValue> | null,
): StateValue {
  // Setup the stack: add initial descent steps for each segment in the selector
  // We set `keys` to empty so that parent elements are never iterated-over
  const stack: PatchStack = [[state, undefined, "", "", [], []]];
  for (const segment of segments(selector)) {
    const [current, _, path] = stack[stack.length - 1];
    stack.push([index(current, segment), undefined, concatPath(path, segment), segment, [], []]);
  }
  // Set the patch value at the bottom of the stack to kick-off the patching process
  const lastStack = stack[stack.length - 1];
  lastStack[1] = patch;
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
        stack.push([
          index(current, nextKey),
          index(next, nextKey),
          concatPath(path, nextKey),
          nextKey,
          null,
          [],
        ]);
        continue;
      }
      // Finished iterating over keys; check for changes
      if (changes.length > 0) {
        const oldEntries = current && typeof current === "object" ? Object.entries(current) : [];
        if (Array.isArray(current)) {
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
        const newObj = Object.fromEntries(changesMap);
        newValue = Object.freeze(
          typeof newObj.length === "number" ? Object.assign([], newObj) : newObj,
        );
      }
      // If no changes, keep the current value
    } else if (current === next) {
      // No changes
    } else if (typeof next !== "object" || !next) {
      newValue = next;
      // Note that listeners of object keys will not be notified when a parent primitive changes
    } else {
      // We need to merge `current` and `next` by iterating over the keys of `next`
      if (recursionCheck.has(next)) {
        throw new Error(`Circular reference detected at path "${path as string}"`);
      }
      recursionCheck.add(next);
      const keys = Object.keys(next).reverse();
      if (Array.isArray(next)) {
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
      notify?.set(path, newValue);
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

function patchStore(
  store: Store,
  storeImpl: StoreImpl,
  path: PropertyKey,
  newValue: StateValue,
  notify: Map<PropertyKey, StateValue>,
) {
  storeImpl._state = patchStateValue(
    storeImpl._state,
    concatPath(store.prefix, path),
    newValue,
    notify,
  );
}

// Notifies listeners of changes recorded in the `notify` map
function notifyChange(impl: StoreImpl, notify: Map<PropertyKey, StateValue>) {
  for (const [changedPath, value] of notify) {
    const listeners = impl._listeners.get(changedPath);
    if (listeners) {
      for (const listener of listeners) {
        listener(value, changedPath);
      }
    }
  }
}

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
export function update<T extends AnyState>(store: Store<T>, ...replacements: PathPair<T>[]): void {
  const storeImpl = getImpl(store);
  const notify = new Map<PropertyKey, StateValue>();
  for (const [path, value] of replacements) {
    patchStore(store, storeImpl, path, value, notify);
  }
  notifyChange(storeImpl, notify);
}

// Patch specification type for patchState. Equivalent to a 'deep partial' but does not affect arrays.
type PatchSpec<T> = T extends Primitive
  ? T
  : T extends readonly unknown[]
    ? { readonly [_ in number]?: PatchSpec<T[number]> | null } | T
    : { readonly [K in keyof T]?: PatchSpec<T[K]> | null };

type PatchValue<T> = T | PatchSpec<T>;

/**
 * Patches the value at the specified path in the store's state by merging the provided patch object.
 * `null` values in the patch object will delete the corresponding keys in the state, while `undefined` values will leave them unchanged.
 * @param store The Store object
 * @param path The path to patch
 * @param patchValue The patch object to merge at the specified path
 */
export function patch<T extends AnyState>(store: Store<T>, patchValue: PatchValue<T[""]>): void {
  const storeImpl = getImpl(store);
  const notify = new Map<PropertyKey, StateValue>();
  patchStore(store, storeImpl, "", patchValue, notify);
  notifyChange(storeImpl, notify);
}

/**
 * Creates a store that synchronizes its state with external getter and setter functions.
 * @param getter Function to get the current value
 * @param setter Function to set a new value
 * @returns A Store object that syncs with the external source
 */
export function sync<T extends StateValue>(
  getter: () => T,
  setter: (value: T) => void,
): Store<PathMap<T>> {
  const store = createStore(getter());
  listen(store, "", () => {
    setter(peek(store, ""));
  });
  return store;
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
    const store = sync(getter, setter);
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
}
