/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import "preact/debug";
import { render } from "preact";
import { TodoApp } from "./app";

const app = document.getElementById("app");
if (app) {
  render(<TodoApp />, app);
}
