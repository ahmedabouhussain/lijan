// LIJAN™ — shell sidebar presence.
//
// The governed shells mount the ONE shared sidebar, and that sidebar owns the assistant's
// entry point inside its own structure. While a shell is on screen the floating assistant
// launcher stands down, so two entry points never compete for the same screen edge and the
// assistant never covers the last navigation item.

import { useEffect, useState } from "react";

let present = false;
const listeners = new Set();

export function setShellSidebarPresence(value) {
  if (present === value) return;
  present = value;
  listeners.forEach((listener) => listener(present));
}

export function useShellSidebarPresence() {
  const [value, setValue] = useState(present);
  useEffect(() => {
    listeners.add(setValue);
    setValue(present);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}