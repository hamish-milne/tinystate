export type AnyMembers = Record<string | number | symbol, Schema>;
export type AnyMutations = Record<string, (...args: any[]) => void>;

export type EntryOf<T extends Schema> = T extends Schema<infer A, infer B, infer C, infer D>
  ? Entry<A, B, C, D>
  : never;

export type ValueOf<T extends Schema> = T extends Schema<infer V> ? V : never;

type MemberPairs<T extends AnyMembers> = {
  [K in keyof T]: [K, EntryOf<T[K]>];
}[keyof T];

type MemberEntries<T extends AnyMembers> = {
  [K in keyof T]: T[K] extends Schema ? EntryOf<T[K]> : never;
};

export const VALUE_UNSET = Symbol("value unset");
export const VALUE_KEEP = Symbol("value keep");

export class NotImplementedError extends Error {
  constructor() {
    super("This method is not implemented");
  }
}

export class ReadonlyError extends Error {
  constructor() {
    super("This object is read-only and cannot be modified");
  }
}

export type Empty = { [k: string]: never };

export const KIND_SCALAR = Symbol("scalar");
export const KIND_NARROWING = Symbol("narrowing");
export const KIND_WIDENING = Symbol("widening");
export type Kind = typeof KIND_SCALAR | typeof KIND_NARROWING | typeof KIND_WIDENING;

export type Listener<T, TParent, TMembers extends AnyMembers, TMutations extends AnyMutations> = (
  this: void,
  value: T,
  previous: T | typeof VALUE_UNSET,
  entry: Entry<T, TParent, TMembers, TMutations>,
) => void;
export type Cleanup = (this: void) => void;

export interface Schema<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> {
  compute(
    entry: Entry<T, TParent, TMembers, TMutations>,
    value: T | typeof VALUE_UNSET,
  ): T | typeof VALUE_KEEP;
  computeDefault(): T;
  change(entry: Entry<T, TParent, TMembers, TMutations>, value: T): T | typeof VALUE_KEEP;
  getMember<K extends keyof TMembers>(key: K): TMembers[K];
  getMember(key: keyof TMembers): TMembers[keyof TMembers];
  get kind(): Kind;
  mutations(entry: Entry<T, TParent, TMembers, TMutations>): TMutations;
  hasValue(entry: Entry<T, TParent, TMembers, TMutations>, value: T | typeof VALUE_UNSET): boolean;
  unset(entry: Entry<T, TParent, TMembers, TMutations>): void;
}

export function isSchema<T = any>(value: unknown): value is Schema<T> {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }
  switch (value.kind) {
    case KIND_SCALAR:
    case KIND_NARROWING:
    case KIND_WIDENING:
      return true;
    default:
      return false;
  }
}

export interface Entry<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> {
  get(): T;
  set(value: T): void;
  unset(): void;
  invalidate(): void;
  recompute(): void;
  notify(): void;
  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup;
  isEmpty(): boolean;
  hasValue(): boolean;
  members(): IterableIterator<MemberPairs<TMembers>, undefined>;
  $<K extends keyof TMembers>(key: K): MemberEntries<TMembers>[K];
  get mutations(): TMutations;
  get parent(): Entry<TParent> | undefined;
  get kind(): Kind;
  get default(): T;
}

class EntryImpl<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> implements Entry<T, TParent, TMembers, TMutations>
{
  private declare _schema: Schema<T, TParent, TMembers, TMutations>;
  private declare _value: T | typeof VALUE_UNSET;
  private declare _previous: T | typeof VALUE_UNSET;
  private declare _listeners: Set<Listener<T, TParent, TMembers, TMutations>> | undefined;
  private declare _parent: EntryImpl<TParent> | undefined;
  private declare _members: Map<string, ReturnType<typeof Proxy.revocable>> | undefined;
  private declare _manager: Manager;
  private declare _mutations: TMutations | undefined;
  private declare _isComputing: boolean;
  private declare _default: T | typeof VALUE_UNSET;

  constructor(schema: Schema<T, TParent, TMembers, TMutations>, parent: EntryImpl | Manager) {
    this._schema = schema;
    this._value = VALUE_UNSET;
    this._previous = VALUE_UNSET;
    this._listeners = undefined;
    this._members = undefined;
    this._mutations = undefined;
    this._default = VALUE_UNSET;
    this._isComputing = false;
    if (parent instanceof EntryImpl) {
      this._parent = parent;
      this._manager = parent._manager;
    } else {
      this._manager = parent;
      this._parent = undefined; // If parent is a manager, this entry has no parent
    }
  }

  get parent() {
    return this._parent;
  }

  get default(): T {
    if (this._default === VALUE_UNSET) {
      this._default = this._schema.computeDefault();
    }
    return this._default;
  }

  get(): T {
    if (this._value === VALUE_UNSET) {
      try {
        if (this._isComputing) {
          throw new Error("Recursive compute call detected");
        }
        this._isComputing = true;
        const newValue = this._schema.compute(this, this._value);
        if (newValue === VALUE_KEEP) {
          throw new Error("compute() returned VALUE_KEEP for entry without a value");
        }
        this._value = newValue;
      } finally {
        this._isComputing = false;
      }
    }
    return this._value;
  }

  get kind(): Kind {
    return this._schema.kind;
  }

  hasValue(): boolean {
    return this._schema.hasValue(this, this._value);
  }

  isEmpty(): boolean {
    return !(this._listeners?.size || this._members?.size || this.hasValue());
  }

  set(value: T): void {
    const newValue = this._schema.change(this, value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this.checkDelete();
    }
  }

  unset(): void {
    if (this.kind === KIND_WIDENING) {
      for (const [_key, member] of this.members()) {
        member.unset();
      }
    }
    this._schema.unset(this);
  }

  invalidate(): void {
    const { kind } = this._schema;
    if (kind === KIND_NARROWING) {
      if (this._manager.scheduleRecompute(this)) {
        for (const [_, member] of this.members()) {
          member.invalidate();
        }
      }
    } else {
      if (kind === KIND_WIDENING) {
        this._value = VALUE_UNSET;
      }
      this._parent?.invalidate();
      if (this._manager.scheduleNotify(this)) {
        for (const [_, member] of this.members()) {
          if (member.kind === KIND_NARROWING) {
            member.invalidate();
          }
        }
      }
    }
  }

  private checkDelete() {
    if (this.isEmpty()) {
      this._manager.scheduleDestroy(this);
    }
  }

  garbageCollect(): void {
    if (this._members) {
      for (const [key, { revoke, proxy: member }] of this._members.entries()) {
        if ((member as EntryImpl).isEmpty()) {
          this._members.delete(String(key));
          revoke();
        }
      }
    }
    if (this.isEmpty()) {
      this._parent?.garbageCollect();
    }
  }

  subscribe(listener: Listener<T, TParent, TMembers, TMutations>): Cleanup {
    if (!this._listeners) {
      this._listeners = new Set();
    }
    this._listeners.add(listener);
    return () => {
      if (this._listeners?.delete(listener)) {
        this.checkDelete();
      }
    };
  }

  notify(): void {
    if (this._listeners) {
      const previous = this._previous;
      const value = this.get();
      this._previous = value;
      for (const listener of this._listeners) {
        listener(value, previous, this);
      }
    }
  }

  recompute(): void {
    const newValue = this._schema.compute(this, this._value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this._manager.scheduleNotify(this);
    }
  }

  members(): IterableIterator<MemberPairs<TMembers>, undefined> {
    this._members ??= new Map();
    const inner = this._members.entries();
    return {
      next() {
        const result = inner.next();
        if (result.done) {
          return result;
        }
        const [key, { proxy: value }] = result.value;
        return {
          value: [key, value] as MemberPairs<TMembers>,
        };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  $<K extends keyof TMembers>(key: K): MemberEntries<TMembers>[K] {
    let member = this._members?.get(String(key));
    if (!member) {
      const schemaMember = this._schema.getMember(key);
      member = Proxy.revocable(new EntryImpl(schemaMember, this), {});
      this._members ??= new Map();
      this._members.set(String(key), member);
    }
    return member.proxy as MemberEntries<TMembers>[K];
  }

  get mutations(): TMutations {
    this._mutations ??= Object.freeze(this._schema.mutations(this));
    return this._mutations;
  }
}

type Scheduler = (callback: () => void) => number | undefined;

class Manager {
  private declare _timeoutId: number | undefined;
  private declare _updateIteration: number;
  private declare readonly _updateIterationMax: number; // Maximum iterations to prevent infinite loops
  private declare readonly _update: () => void;
  private declare readonly _scheduler: Scheduler;
  private declare readonly _toNotify: Set<EntryImpl>;
  private declare readonly _toRecompute: Set<EntryImpl>;
  private declare readonly _toDestroy: Set<EntryImpl>;

  constructor(scheduler: Scheduler) {
    this._updateIteration = 0;
    this._updateIterationMax = 3;
    this._toNotify = new Set();
    this._toRecompute = new Set();
    this._toDestroy = new Set();
    this._update = this.update.bind(this);
    this._scheduler = scheduler;
  }

  private scheduleUpdate() {
    if (this._timeoutId === undefined) {
      this._updateIteration++;
      if (this._updateIteration > this._updateIterationMax) {
        throw new Error("Too many iterations in state manager timeout, possible infinite loop");
      }
      this._timeoutId = this._scheduler(this._update);
    }
  }

  private update() {
    this._timeoutId = undefined;

    for (const [set, method] of [
      [this._toRecompute, "recompute"],
      [this._toNotify, "notify"],
      [this._toDestroy, "garbageCollect"],
    ] as const) {
      const setCopy = Array.from(set);
      set.clear();
      for (const entry of setCopy) {
        try {
          entry[method]();
        } catch (error) {
          console.error(error);
        }
      }
    }

    // Only reset the iteration count if another update was not scheduled
    if (this._timeoutId === undefined) {
      this._updateIteration = 0;
    }
  }

  private schedule(entry: EntryImpl, set: Set<EntryImpl>): boolean {
    if (set.has(entry)) {
      return false; // Already scheduled
    }
    set.add(entry);
    this.scheduleUpdate();
    return true;
  }

  scheduleNotify(entry: EntryImpl): boolean {
    return this.schedule(entry, this._toNotify);
  }
  scheduleRecompute(entry: EntryImpl): boolean {
    return this.schedule(entry, this._toRecompute);
  }
  scheduleDestroy(entry: EntryImpl): void {
    this.schedule(entry, this._toDestroy);
  }
}

export function createRoot<
  T,
  TParent,
  TMembers extends AnyMembers,
  TMutations extends AnyMutations,
>(
  schema: Schema<T, TParent, TMembers, TMutations>,
  scheduler: Scheduler = (u) => setTimeout(u, 0),
): Entry<T, TParent, TMembers, TMutations> {
  return new EntryImpl(schema, new Manager(scheduler));
}
