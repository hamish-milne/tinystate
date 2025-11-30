# tinystate

A tiny, type-safe state management library for React and Preact with path-based access, fine-grained reactivity, and built-in form bindings.

## Features

- **Tiny bundle size** - Minimal footprint (~2KB gzipped), zero dependencies, and tree-shakeable
- **Type-safe paths** - Full TypeScript inference for nested state access
- **Fine-grained reactivity** - Components only re-render when their watched paths change
- **Framework agnostic core** - Works standalone or with React/Preact bindings
- **Form bindings** - Built-in helpers for binding inputs to state
- **Validation support** - Integrates with Standard Schema compatible validators (Valibot, Zod, etc.)
- **Immutable updates** - Deep merging with support for deletions and array updates. Stored state is immutable, deep-frozen and ref-stable.

## Installation

```bash
npm install tinystate
# or
yarn add tinystate
```

`react`, `preact`, and `@preact/signals` are optional peer dependencies.

## Quick Start

```ts
import { createStore, peek, patch, listen } from 'tinystate';

// Create a store with initial state
const store = createStore({
  user: { name: 'Alice', age: 30 },
  settings: { theme: 'dark' }
});

// Read values using dot-notation paths
peek(store, 'user.name');        // 'Alice'
peek(store, 'settings.theme');   // 'dark'

// Update state with partial patches
patch(store, { user: { age: 31 } });

// Listen for changes at specific paths
const unsubscribe = listen(store, 'user.name', (name) => {
  console.log('Name changed to:', name);
});
```

## Core API

### `createStore(initialState)`

Creates a new store with the given initial state.

```ts
const store = createStore({ count: 0, items: ['a', 'b'] });
```

### `peek(store, path?)`

Reads the current value at a path without subscribing to changes.

```ts
peek(store);           // { count: 0, items: ['a', 'b'] }
peek(store, 'count');  // 0
peek(store, 'items.0'); // 'a'
```

### `patch(store, patchValue)`

Updates the store by deeply merging the patch value. Use `null` to delete keys, `undefined` to leave unchanged.

```ts
// Partial updates - only specified keys are changed
patch(store, { count: 5 });

// Nested updates
patch(store, { user: { name: 'Bob' } }); // leaves user.age unchanged

// Delete a key
patch(store, { user: { name: null } });

// Update array elements by index
patch(store, { items: { 1: 'updated' } });
```

### `update(store, ...pathPairs)`

Sets values at specific paths in a single batch.

```ts
update(store, 
  ['count', 10],
  ['user.name', 'Charlie']
);
```

### `listen(store, path, listener, initialNotify?)`

Subscribes to changes at a specific path. Returns an unsubscribe function.

```ts
const unsubscribe = listen(store, 'count', (value) => {
  console.log('Count is now:', value);
});

// Optionally notify immediately with current value
listen(store, 'count', callback, true);

// Clean up
unsubscribe();
```

### `focus(store, path)`

Creates a sub-store focused on a specific path. The sub-store shares state with the parent.

```ts
const userStore = focus(store, 'user');
peek(userStore, 'name');        // 'Alice'
patch(userStore, { age: 32 }); // Updates store.user.age
```

### `computed(store, path, computeFn)`

Creates a derived read-only store that updates when the source changes. Derived stores have the same fine-grained reactivity as regular stores, even when returning new objects.

```ts
const store = createStore({ items: [1, 2, 3] });
const sumStore = computed(store, 'items', (items) => ({
  total: items.reduce((a, b) => a + b, 0)
}));

peek(sumStore, 'total'); // 6
```

### `sync(store, getter, setter)`

Synchronizes a store with an external source (e.g., localStorage).

```ts
// This pattern is implemented in the syncStorage utility from 'tinystate/utils'
sync(
  store,
  () => JSON.parse(localStorage.getItem('state') || '{}'),
  (value) => localStorage.setItem('state', JSON.stringify(value))
);
```

## React Integration

```tsx
import { StoreProvider, useStore, useWatch, useStoreState } from 'tinystate/react';
import { createStore, patch } from 'tinystate';

// Define your app state type globally for type inference
declare global {
  interface AppState {
    count: number;
    user: { name: string };
  }
}

function App() {
  // The use of StoreProvider is entirely optional. You can also pass the store directly to hooks.
  return (
    <StoreProvider value={() => createStore<AppState>({
      count: 0,
      user: { name: 'Alice' },
    })}>
      <Counter />
    </StoreProvider>
  );
}

function Counter() {
  const store = useStore();
  const count = useWatch(store, 'count');
  
  return (
    <button onClick={() => patch(store, { count: count + 1 })}>
      Count: {count}
    </button>
  );
}

// Or use useStoreState for a useState-like API
function CounterAlt() {
  const store = useStore();
  const [count, setCount] = useStoreState(store, 'count');
  
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### `useWatch` with Derived Values

```tsx
function UserGreeting() {
  const store = useStore();
  
  // Derive a value with a calculation function
  const greeting = useWatch(
    store,
    'user.name',
    (name) => `Hello, ${name}!`,
    [] // dependency array for the calc function
  );
  
  return <h1>{greeting}</h1>;
}
```

### Rendering an array with `List`

```tsx
import { List } from 'tinystate/react';

// Item component that only re-renders when its own data changes
const Item = memo(function (props: {
  itemStore: StoreViewOf<{ id: number; name: string }>
}) {
  const name = useWatch(props.itemStore, 'name');
  return <div>{name}</div>;
});

function ItemList() {
  const store = useStore('items');
  
  return (
    <List store={store}>
      {Item}
    </List>
  );
}
```

## Form Bindings

Built-in helpers for binding form elements to store state:

```tsx
import { formField, formText, formCheckbox, formRadio, dialogModal } from 'tinystate/form';

function ProfileForm() {
  const store = useStore();
  
  return (
    <form>
      {/* Text inputs */}
      <input type="text" {...formText(store, 'user.name')} />
      
      {/* With custom event (default is onchange) */}
      <input type="text" {...formText(store, 'user.email', 'oninput')} />
      
      {/* Checkboxes */}
      <input {...formCheckbox(store, 'settings.notifications')} />
      
      {/* Radio buttons */}
      <input {...formRadio(store, 'settings.theme', 'light')} /> Light
      <input {...formRadio(store, 'settings.theme', 'dark')} /> Dark
      
      {/* Dialogs */}
      <dialog {...dialogModal(store, 'isModalOpen')}>
        Modal content
      </dialog>
    </form>
  );
}
```

## Storage Sync

Persist state to localStorage or sessionStorage:

```ts
import { syncStorage } from 'tinystate/utils';

const store = createStore({ theme: 'dark' });
syncStorage(store, localStorage, 'app-settings');
```

## Validation

Integrate with Standard Schema compatible validators like Valibot or Zod:

```tsx
import { validate, type ValidationStore } from 'tinystate/validate';
import { object, string, email, pipe } from 'valibot';

const UserSchema = object({
  name: string(),
  email: pipe(string(), email())
});

// Create a validation store to hold issues
const validStore = createStore({}) as ValidationStore<typeof UserSchema>;

// Validate data and update the validation store
const result = await validate(userData, validStore, UserSchema);

if (result) {
  // Validation passed, result contains the validated data
} else {
  // Check for errors at specific paths
  peek(validStore, 'issues.email'); // 'Invalid email address'
}
```

## Preact Signals Integration

For Preact apps using signals:

```tsx
import { SignalStoreProvider, useStoreSignal } from 'tinystate/signals';

function App() {
  return (
    <SignalStoreProvider value={store}>
      <Counter />
    </SignalStoreProvider>
  );
}

function Counter() {
  const count = useStoreSignal('count');
  
  return (
    <button onClick={() => count.value++}>
      Count: {count}
    </button>
  );
}
```

## TypeScript

tinystate provides full type inference for paths and values:

```ts
type State = {
  user: {
    name: string;
    contacts: { email: string }[];
  };
};

const store = createStore<State>({ ... });

// All paths are type-checked
peek(store, 'user.name');           // string
peek(store, 'user.contacts.0.email'); // string
peek(store, 'invalid.path');        // Type error!

// Patches are type-checked
patch(store, { user: { name: 123 } }); // Type error!
```

## Comparison with Other Libraries

### vs Redux

Redux is a mature, widely-used state management library. tinystate offers a simpler, more lightweight alternative with built-in form bindings and fine-grained reactivity.

| Feature | tinystate | Redux |
|---------|-----------|-------|
| Boilerplate | Minimal | High (actions, reducers) |
| Learning curve | Low | Moderate-High |
| DevTools | No | Yes |
| Middleware | No | Yes |
| Bundle size | ~2KB | ~5KB, ~19KB with toolkit |

**Choose tinystate when:** You want a simple, type-safe state manager with minimal setup.

**Choose Redux when:** You need a mature ecosystem, DevTools, and complex state management patterns.

### vs Zustand

Zustand is lightweight and flexible. tinystate differs by using path-based access instead of selectors, providing automatic fine-grained reactivity without manual optimization.

| Feature | tinystate | Zustand |
|---------|-----------|---------|
| State access | Path strings | Selectors |
| Reactivity | Automatic per-path | Manual via selectors |
| Form bindings | Built-in | None |
| Validation | Built-in | None |
| Bundle size | ~2KB | ~1KB |

**Choose tinystate when:** You want built-in form and validation support with path-based reactivity.

**Choose Zustand when:** You prefer selector-based access and a minimal API.

### vs React Hook Form

tinystate's API is heavily inspired by React Hook Form, expanding its uncontrolled input strategy and path-based access to general state management.

| Feature | tinystate | React Hook Form |
|---------|-----------|-----------------|
| Purpose | General state + forms | Forms only |
| Input strategy | Uncontrolled | Uncontrolled |
| Field arrays | Standard array operations | Dedicated `useFieldArray` API |
| Validation | Standard Schema | Built-in + schemas |
| Form state (dirty, touched) | Manual | Built-in |
| Bundle size | ~2KB | ~12KB |

**Choose tinystate when:** You want unified state and form management with a minimal API.

**Choose React Hook Form when:** You need built-in form state tracking (dirty/touched fields) or its ecosystem of integrations.
