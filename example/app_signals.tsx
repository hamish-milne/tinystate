/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { computed } from "@preact/signals";
import { For } from "@preact/signals/utils";
import { formCheckbox, formField, formText } from "../src/formSignals";
import { SignalStoreProvider, useStoreSignal } from "../src/signals";
import { createWebStorage } from "../src/utils";

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

export function TodoApp() {
  return (
    <SignalStoreProvider
      value={() =>
        createWebStorage(localStorage, "todo-app", {
          todos: [
            { text: "Learn Preact", completed: false, priority: "high" },
            { text: "Build a Todo App", completed: false, priority: "medium" },
          ],
          newTodoText: "",
          newTodoPriority: "medium",
        } as unknown as Pick<AppState, keyof AppState>)
      }
    >
      <div className="min-h-screen bg-gray-50 py-8 **:transition-all **:duration-200">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Todo App</h1>
          <TodoList />
          <NewTodoForm />
        </div>
      </div>
    </SignalStoreProvider>
  );
}

function TodoList() {
  return (
    <ul className="mb-6 space-y-0">
      <For each={useStoreSignal("todos")}>
        {(_, index) => <TodoItem key={index} index={index} />}
      </For>
    </ul>
  );
}

function TodoItem(props: { index: number }) {
  const { index } = props;
  const list = useStoreSignal(`todos`);
  const completed = useStoreSignal(`todos.${index}.completed`);
  const text = useStoreSignal(`todos.${index}.text`);
  const priority = useStoreSignal(`todos.${index}.priority`);
  return (
    <li className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md flex items-center group">
      <input
        className="mr-3 w-4 h-4 text-blue-500 rounded focus:ring-blue-300 focus:ring-2"
        {...formCheckbox(completed)}
      />
      <span
        className={`mr-3 px-2 py-1 rounded-full text-xs font-medium ${
          priority.value === "high"
            ? "bg-red-100 text-red-700"
            : priority.value === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
        }`}
      >
        {priority.value}
      </span>
      <span className={`${completed.value ? "line-through text-gray-400" : "text-gray-700"} grow`}>
        {text.value}
      </span>
      <button
        type="button"
        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md opacity-0 group-hover:opacity-100"
        onClick={() => {
          list.value = list.value.filter((_, i) => i !== index);
        }}
      >
        Delete
      </button>
    </li>
  );
}

const inputStyle =
  "border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-300 focus:border-blue-400";

function NewTodoForm() {
  const newTodoText = useStoreSignal("newTodoText");
  const newTodoPriority = useStoreSignal("newTodoPriority");

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex gap-3 justify-center">
        <input
          className={`${inputStyle} grow`}
          placeholder="What needs to be done?"
          {...formField(newTodoText, "value")}
        />
        <select className={`${inputStyle} bg-white`} {...formText(newTodoPriority)}>
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
  const todos = useStoreSignal("todos");
  const newTodoText = useStoreSignal("newTodoText");
  const newTodoPriority = useStoreSignal("newTodoPriority");
  const addDisabled = computed(() => newTodoText.value.trim() === "");

  return (
    <button
      type="button"
      disabled={addDisabled}
      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:hover:bg-gray-300 text-white px-6 py-3 rounded-md font-medium whitespace-nowrap"
      onClick={() => {
        todos.value = [
          ...todos.value,
          {
            text: newTodoText.value,
            priority: newTodoPriority.value,
            completed: false,
          },
        ];
        newTodoText.value = "";
      }}
    >
      Add Todo
    </button>
  );
}
