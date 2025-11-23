/** @jsxRuntime automatic */
/** @jsxImportSource preact */
/**
 * The following example demonstrates the tinystate API in the form of a 'contacts' app.
 * It showcases creating, updating, and deleting contacts using the AppState pattern, using `sync` to
 * bind different sections of the state to localStorage (for the underlying data) and sessionStorage
 * (for UI state like selected contact and dialog open states).
 * Field validation is achieved with Valibot and the `validate` function, with errors surfaced in the UI.
 */

import { computed, createStore, focus, patch, peek, type StoreOf } from "../src/core";
import { dialogModal, formCheckbox, formField } from "../src/form";
import { List, StoreProvider, useCreateStore, useStore, useWatch } from "../src/preact";
import { syncStorage } from "../src/utils";
import { memo } from "../vendor/memo";

type Contact = {
  name: string;
  email: string;
  phone: string;
  favorite: boolean;
};

declare global {
  interface AppState {
    local: {
      contacts: Contact[];
    };
    session: {
      addEdit: {
        contactId: number;
        isOpen: boolean;
        editing: Contact;
      };
      delete: {
        contactId: number;
        isOpen: boolean;
      };
    };
  }
}

const initialState: AppState = {
  local: {
    contacts: [],
  },
  session: {
    addEdit: {
      contactId: -1,
      isOpen: false,
      editing: { name: "", email: "", phone: "", favorite: false },
    },
    delete: {
      contactId: -1,
      isOpen: false,
    },
  },
} as Pick<AppState, "local" | "session"> as AppState;

export function ContactsApp() {
  return (
    <StoreProvider
      value={() => {
        const store = createStore<Pick<AppState, keyof AppState>>(initialState);
        syncStorage(focus(store, "local"), localStorage, "contacts-app-local");
        syncStorage(focus(store, "session"), sessionStorage, "contacts-app-session");
        return store;
      }}
    >
      <div className="min-h-screen bg-gray-50 py-8 **:transition-all **:duration-200">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Contacts App</h1>
          <ContactList />
          <AddEditContactDialog />
          <DeleteContactDialog />
        </div>
      </div>
    </StoreProvider>
  );
}

function ContactList() {
  const store = useStore();
  return (
    <div>
      <button
        type="button"
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() =>
          patch(store, {
            session: {
              addEdit: {
                contactId: -1,
                isOpen: true,
                editing: initialState.session.addEdit.editing,
              },
            },
          })
        }
      >
        Add Contact
      </button>
      <ul className="space-y-2">
        <List store={focus(store, "local.contacts")}>{ContactListItem}</List>
      </ul>
    </div>
  );
}

const ContactListItem = memo(function ContactListItem(props: {
  index: number;
  itemStore: StoreOf<Contact>;
}) {
  const { index, itemStore } = props;
  const store = useStore();
  const { name = "", email = "", phone = "", favorite = "" } = useWatch(itemStore) ?? {};
  return (
    <li className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md flex items-center justify-between">
      <div>
        <h2 className="text-lg font-medium text-gray-800">{name}</h2>
        <p className="text-sm text-gray-600">{email}</p>
        <p className="text-sm text-gray-600">{phone}</p>
      </div>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            favorite
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => patch(itemStore, { favorite: !favorite })}
        >
          {favorite ? "★ Favorite" : "☆ Mark as Favorite"}
        </button>
        <button
          type="button"
          className="text-blue-500 hover:underline"
          onClick={() =>
            patch(store, {
              session: {
                addEdit: {
                  contactId: index,
                  isOpen: true,
                  editing: peek(itemStore),
                },
              },
            })
          }
        >
          Edit
        </button>
        <button
          type="button"
          className="text-red-500 hover:underline"
          onClick={() =>
            patch(store, {
              session: {
                delete: { contactId: index, isOpen: true },
              },
            })
          }
        >
          Delete
        </button>
      </div>
    </li>
  );
});

function AddEditContactDialog() {
  const store = useStore();
  const contactId = useWatch(store, "session.addEdit.contactId") ?? -1;
  const isEditMode = contactId >= 0;
  const contactStore = focus(store, "session.addEdit.editing");

  return (
    <dialog
      className="fixed inset-1/2 transform -translate-1/2 bg-white p-6 rounded-lg shadow-lg w-96 backdrop:bg-black backdrop:opacity-30 overflow-hidden"
      {...dialogModal(store, "session.addEdit.isOpen")}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const newContact = peek(contactStore);
          if (isEditMode) {
            patch(store, {
              local: { contacts: { [contactId]: newContact } },
              session: { addEdit: { isOpen: false } },
            });
          } else {
            const length = peek(store, "local.contacts.length") ?? 0;
            patch(store, {
              local: { contacts: { [length]: newContact, length: length + 1 } },
              session: { addEdit: { isOpen: false } },
            });
          }
        }}
      >
        <h2 className="text-xl font-bold mb-4">{isEditMode ? "Edit Contact" : "Add Contact"}</h2>
        <div className="space-y-4 mb-4">
          <div>
            <label for="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              className="w-full border border-gray-300 rounded-md p-2"
              {...formField(contactStore, "name", "value")}
              autoComplete="off"
            />
          </div>
          <div>
            <label for="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              className="w-full border border-gray-300 rounded-md p-2"
              {...formField(contactStore, "email", "value")}
              autoComplete="off"
            />
          </div>
          <div>
            <label for="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              className="w-full border border-gray-300 rounded-md p-2"
              {...formField(contactStore, "phone", "value")}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center">
            <input className="mr-2" {...formCheckbox(contactStore, "favorite")} />
            <label for="favorite" className="text-sm font-medium text-gray-700">
              Favorite
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            onClick={() => patch(store, { session: { addEdit: { isOpen: false } } })}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditMode ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteContactDialog() {
  const store = useStore();
  const contactId = useWatch(store, "session.delete.contactId");
  const contact = useCreateStore(() =>
    computed(store, "", (s) => {
      const id = s?.session?.delete?.contactId ?? -1;
      return id >= 0 ? s?.local?.contacts?.[id] : undefined;
    }),
  );
  const name = useWatch(contact, "name");
  return (
    <dialog
      className="fixed inset-1/2 transform -translate-1/2 bg-white p-6 rounded-lg shadow-lg w-96 backdrop:bg-black backdrop:opacity-30"
      {...dialogModal(store, "session.delete.isOpen")}
    >
      <h2 className="text-xl font-bold mb-4">Delete Contact</h2>
      <p className="mb-4">Are you sure you want to delete the contact "{name}"?</p>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          onClick={() => patch(store, { session: { delete: { isOpen: false } } })}
        >
          Cancel
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => {
            const contacts = peek(store, "local.contacts");
            patch(store, {
              local: { contacts: contacts?.filter((_, index) => index !== contactId) },
              session: { delete: { isOpen: false } },
            });
          }}
        >
          Delete
        </button>
      </div>
    </dialog>
  );
}
