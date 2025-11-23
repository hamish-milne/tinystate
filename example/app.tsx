/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { createStore, focus, patch, peek } from "../src/core";
import { formCheckbox, formField, formText } from "../src/form";
import { type FixedAppState, StoreProvider, useStore, useWatch } from "../src/preact";
import { syncStorage } from "../src/utils";
import { memo } from "../vendor/memo";

type Priority = "low" | "medium" | "high";

declare global {
  interface AppState {
    todos: {
      text: string;
      priority: Priority;
      completed: boolean;
    }[];
    newTodoText: string;
    newTodoPriority: Priority;
  }
}

const initialState: AppState = {
  todos: [
    { text: "Learn Preact", completed: false, priority: "high" },
    { text: "Build a Todo App", completed: false, priority: "medium" },
  ],
  newTodoText: "",
  newTodoPriority: "medium",
} as unknown as AppState;

export function TodoApp() {
  return (
    <StoreProvider
      value={() => {
        const store = createStore<FixedAppState>(initialState);
        syncStorage(store, localStorage, "todo-app");
        return store;
      }}
    >
      <div className="min-h-screen bg-gray-50 py-8 **:transition-all **:duration-200">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Todo App</h1>
          <TodoList />
          <NewTodoForm />
        </div>
      </div>
    </StoreProvider>
  );
}

function TodoList() {
  const length = useWatch(useStore(), "todos.length");
  return (
    <ul className="mb-6 space-y-0">
      {Array.from({ length }).map((_, index) => (
        <TodoItem key={index} index={index} />
      ))}
    </ul>
  );
}

const TodoItem = memo(function TodoItem(props: { index: number }) {
  const { index } = props;
  const list = useStore(`todos`);
  const store = focus(list, index);
  const { priority, text, completed } = useWatch(store);
  return (
    <li className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md flex items-center group">
      <input
        className="mr-3 w-4 h-4 text-blue-500 rounded focus:ring-blue-300 focus:ring-2"
        {...formCheckbox(store, "completed")}
      />
      <span
        className={`mr-3 px-2 py-1 rounded-full text-xs font-medium ${
          priority === "high"
            ? "bg-red-100 text-red-700"
            : priority === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
        }`}
      >
        {priority}
      </span>
      <span className={`${completed ? "line-through text-gray-400" : "text-gray-700"} grow`}>
        {text}
      </span>
      <button
        type="button"
        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md opacity-0 group-hover:opacity-100"
        onClick={() => {
          const array = [...peek(list)];
          array.splice(index, 1);
          patch(list, array);
        }}
      >
        Delete
      </button>
    </li>
  );
});

const inputStyle =
  "border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-300 focus:border-blue-400";

function NewTodoForm() {
  const store = useStore();

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex gap-3 justify-center">
        <input
          className={`${inputStyle} grow`}
          placeholder="What needs to be done?"
          {...formField(store, "newTodoText", "value")}
        />
        <select className={`${inputStyle} bg-white`} {...formText(store, "newTodoPriority")}>
          <option value="low">Low</option>
          <option value="medium" selected>
            Medium
          </option>
          <option value="high">High</option>
        </select>
        <AddTodoButton />
      </div>
    </div>
  );
}

function AddTodoButton() {
  const store = useStore();
  const addDisabled = useWatch(store, "newTodoText", (state) => state.trim() === "", []);

  return (
    <button
      type="button"
      disabled={addDisabled}
      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:hover:bg-gray-300 text-white px-6 py-3 rounded-md font-medium whitespace-nowrap"
      onClick={() => {
        const {
          todos: { length },
          newTodoText,
          newTodoPriority,
        } = peek(store);
        patch(store, {
          todos: {
            [length]: {
              text: newTodoText,
              completed: false,
              priority: newTodoPriority,
            },
            length: length + 1,
          },
          newTodoText: "",
        });
      }}
    >
      Add Todo
    </button>
  );
}
