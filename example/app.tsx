import { peek } from "../src/core";
import { formCheckbox, formField, formText } from "../src/form";
import { useStoreState } from "../src/preact";
import { webStorage } from "../src/utils";

type Todo = {
  text: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
};

const store = webStorage(localStorage, "todo-app", {
  todos: [
    { text: "Learn Preact", completed: false, priority: "high" },
    { text: "Build a Todo App", completed: false, priority: "medium" },
  ] as Todo[],
  newTodoText: "",
  newTodoPriority: "medium" as "low" | "medium" | "high",
});

export function TodoApp() {
  const [todos, setTodos] = useStoreState(store, "todos");
  const [newTodoText, setNewTodoText] = useStoreState(store, "newTodoText");

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Todo App</h1>
      <ul className="mb-4">
        {todos.map((todo, index) => (
          <li key={index} className="mb-2 flex items-center">
            <input className="mr-2" {...formCheckbox(store, `todos.${index}.completed`)} />
            <span
              className={`mr-2 ${
                todo.priority === "high"
                  ? "text-red-500"
                  : todo.priority === "medium"
                    ? "text-yellow-500"
                    : "text-green-500"
              }`}
            >
              [{todo.priority}]
            </span>
            <span className={todo.completed ? "line-through text-gray-500" : ""}>{todo.text}</span>
          </li>
        ))}
      </ul>
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
            setTodos([
              ...todos,
              {
                text: newTodoText,
                completed: false,
                priority: peek(store, "newTodoPriority"),
              },
            ]);
            setNewTodoText("");
          }}
        >
          Add Todo
        </button>
      </div>
    </div>
  );
}
