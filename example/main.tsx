/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import "preact/debug";
import { render } from "preact";
// import { TodoApp } from "./app";
import { ContactsApp } from "./contacts";

const app = document.getElementById("app");
if (app) {
  render(<ContactsApp />, app);
}
