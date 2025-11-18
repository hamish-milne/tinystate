/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { patch, peek } from "../src/core";
import { formCheckbox, formField, formText } from "../src/form";
import { useStore as $, StoreProvider, useWatch } from "../src/preact";
import { webStorage } from "../src/utils";

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

function TodoItem(props: { index: number }) {
  const { index } = props;
  const store = $(`todos.${index}`);
  const { priority, text, completed } = useWatch(store);
  return (
    <li className="mb-2 flex items-center">
      <input className="mr-2" {...formCheckbox(store, "completed")} />
      <span
        className={`mr-2 ${
          priority === "high"
            ? "text-red-500"
            : priority === "medium"
              ? "text-yellow-500"
              : "text-green-500"
        }`}
      >
        [{priority}]
      </span>
      <span className={completed ? "line-through text-gray-500" : ""}>{text}</span>
    </li>
  );
}

function TodoList() {
  const length = useWatch($(), "todos.length");
  return (
    <ul className="mb-4">
      {Array.from({ length }).map((_, index) => (
        <TodoItem key={index} index={index} />
      ))}
    </ul>
  );
}

function NewTodoForm() {
  const store = $();

  return (
    <div className="flex mb-4">
      <input
        className="border p-2 grow mr-2"
        placeholder="New todo"
        {...formField(store, "newTodoText", "value")}
      />
      <select className="border p-2 mr-2" {...formText(store, "newTodoPriority")}>
        <option value="low">Low</option>
        <option value="medium" selected>
          Medium
        </option>
        <option value="high">High</option>
      </select>
      <button
        type="button"
        className="bg-blue-500 text-white p-2"
        onClick={() => {
          const {
            todos: { length },
            newTodoText,
            newTodoPriority,
          } = peek(store, "");
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
    </div>
  );
}

export function TodoApp() {
  return (
    <StoreProvider
      value={() =>
        webStorage(localStorage, "todo-app", {
          todos: [
            { text: "Learn Preact", completed: false, priority: "high" },
            { text: "Build a Todo App", completed: false, priority: "medium" },
          ],
          newTodoText: "",
          newTodoPriority: "medium",
        })
      }
    >
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Todo App</h1>
        <TodoList />
        <NewTodoForm />
      </div>
    </StoreProvider>
  );
}
