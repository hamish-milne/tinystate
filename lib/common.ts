export type AnyMembers = Record<string | number | symbol, Schema | undefined>;
export type AnyMutations = Record<string, (...args: any[]) => void>;

export type EntryOf<T extends Schema | undefined> = T extends Schema<
  infer A,
  infer B,
  infer C,
  infer D
>
  ? Entry<A, B, C, D>
  : never;

type MemberPairs<T extends AnyMembers> = {
  [K in keyof T]: [K, EntryOf<T[K]>];
}[keyof T];

type MemberEntries<T extends AnyMembers> = {
  [K in keyof T]: T[K] extends Schema ? EntryOf<T[K]> : never;
};

export const VALUE_UNSET = Symbol("value unset");
export const VALUE_KEEP = Symbol("value keep");
const ENTRY_DESTROYED = Symbol("entry destroyed");

export class DestroyedError extends Error {
  constructor() {
    super("This object has been destroyed and cannot be used");
  }
}

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

const MAP_EMPTY = new Map<never, never>();

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
  isDestroyed(): boolean;
  hasValue(): boolean;
  members(): IteratorObject<MemberPairs<TMembers>>;
  getMember<K extends keyof TMembers>(key: K): MemberEntries<TMembers>[K];
  get mutations(): TMutations;
  get parent(): Entry<TParent> | undefined;
  get kind(): Kind;
}

class EntryImpl<
  T = any,
  TParent = any,
  TMembers extends AnyMembers = any,
  TMutations extends AnyMutations = any,
> implements Entry<T, TParent, TMembers, TMutations>
{
  private _schema: Schema<T, TParent, TMembers, TMutations> | typeof ENTRY_DESTROYED;
  private _value: T | typeof VALUE_UNSET = VALUE_UNSET;
  private _previous: T | typeof VALUE_UNSET = VALUE_UNSET;
  private _listeners: Set<Listener<T, TParent, TMembers, TMutations>> | undefined;
  private _parent: EntryImpl<TParent> | undefined;
  private _members: Map<string, Entry> | undefined = undefined;
  private _manager: Manager;
  private _mutations: TMutations | undefined;
  private _isComputing: boolean = false;

  constructor(schema: Schema<T, TParent, TMembers, TMutations>, parent: EntryImpl | Manager) {
    this._schema = schema;
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

  get(): T {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
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
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    return this._schema.kind;
  }

  hasValue(): boolean {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    return this._schema.hasValue(this, this._value);
  }

  isEmpty(): boolean {
    return !(this._listeners?.size || this._members?.size || this.hasValue());
  }

  isDestroyed(): boolean {
    return this._schema === ENTRY_DESTROYED;
  }

  set(value: T): void {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    const newValue = this._schema.change(this, value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this.checkDelete();
    }
  }

  unset(): void {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    if (this.kind === KIND_WIDENING) {
      for (const [_key, member] of this.members()) {
        member.unset();
      }
    }
    this._schema.unset(this);
  }

  invalidate(): void {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
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
      if (this._manager.scheduleNotify(this)) {
        this._parent?.invalidate();
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
    if (this._schema === ENTRY_DESTROYED) {
      return; // Already destroyed, nothing to collect
    }
    for (const [key, member] of this.members()) {
      if (member.isDestroyed()) {
        this._members?.delete(String(key));
      }
    }
    if (this._parent && this.isEmpty()) {
      const parent = this._parent;
      this._schema = ENTRY_DESTROYED;
      this._value = VALUE_UNSET;
      this._previous = VALUE_UNSET;
      this._listeners = undefined;
      this._members = undefined;
      this._parent = undefined;
      Object.freeze(this);
      parent.garbageCollect();
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
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    const newValue = this._schema.compute(this, this._value);
    if (newValue !== VALUE_KEEP) {
      this._value = newValue;
      this._manager.scheduleNotify(this);
    }
  }

  members() {
    return (this._members ?? MAP_EMPTY).entries() as IteratorObject<MemberPairs<TMembers>>;
  }

  getMember<K extends keyof TMembers>(key: K): MemberEntries<TMembers>[K] {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    let member = this._members?.get(String(key));
    if (!member) {
      const schemaMember = this._schema.getMember(key);
      if (schemaMember) {
        member = new EntryImpl(schemaMember, this);
        this._members ??= new Map();
        this._members.set(String(key), member);
      }
    }
    return member as MemberEntries<TMembers>[K];
  }

  get mutations(): TMutations {
    if (this._schema === ENTRY_DESTROYED) {
      throw new DestroyedError();
    }
    this._mutations ??= this._schema.mutations(this);
    return this._mutations;
  }
}

class Manager {
  private _timeoutId: number | undefined;
  private _updateIteration: number = 0;
  private readonly _updateIterationMax: number = 3; // Maximum iterations to prevent infinite loops
  private readonly _update: () => void;
  private readonly _toNotify = new Set<EntryImpl>();
  private readonly _toRecompute = new Set<EntryImpl>();
  private readonly _toDestroy = new Set<EntryImpl>();

  constructor() {
    this._update = this.update.bind(this);
  }

  private scheduleUpdate() {
    if (this._timeoutId === undefined) {
      this._updateIteration++;
      if (this._updateIteration > this._updateIterationMax) {
        throw new Error("Too many iterations in state manager timeout, possible infinite loop");
      }
      this._timeoutId = window.setTimeout(this._update, 0);
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
>(schema: Schema<T, TParent, TMembers, TMutations>): Entry<T, TParent, TMembers, TMutations> {
  return new EntryImpl(schema, new Manager());
}
