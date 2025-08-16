import "./app.css";
import { type Entry, map, scalar, schema, set } from "../lib";
import { useFormCheckbox, useFormField, useStateRoot, useWatch } from "../lib/preact";

const MySchema = schema({
  name: "John Doe",
  age: 30,
  isActive: true,
  address: {
    street: "123 Main St",
    city: "Anytown",
    country: "USA",
  },
  preferences: map(scalar("")),
  tags: set(),
  get fullName() {
    console.log("Computing fullName");
    return `${this.name} (${Math.floor(this.age / 10)}0s)`;
  },
});

function FullNameComponent(props: { entry: Entry<string> }) {
  const value = useWatch(props.entry);
  return <span>{value}</span>;
}

function JsonDisplay(props: { entry: Entry<unknown> }) {
  const value = useWatch(props.entry);
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}

export function App() {
  const state = useStateRoot(MySchema);

  return (
    <div className="App">
      <h1>My App</h1>
      <form style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label>
          Name:
          <input type="text" {...useFormField(state.name)} />
        </label>
        <label>
          Age:
          <input type="number" {...useFormField(state.age)} />
        </label>
        <label>
          Active:
          <input {...useFormCheckbox(state.isActive)} />
        </label>
        <label>
          Full Name:
          <input type="text" {...useFormField(state.fullName)} readOnly />
        </label>
        <label>
          Tag 1:
          <input {...useFormCheckbox(state.tags.member("tag1"))} />
        </label>
        <label>
          Tag 2:
          <input {...useFormCheckbox(state.tags.member("tag2"))} />
        </label>
        <label>
          Tag 3:
          <input {...useFormCheckbox(state.tags.member("tag1"))} />
        </label>
      </form>
      <h3>
        <FullNameComponent entry={state.fullName} />
      </h3>
      <div>
        <JsonDisplay entry={state} />
      </div>
    </div>
  );
}
