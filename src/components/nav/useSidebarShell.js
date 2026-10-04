import { useCallback, useEffect, useState } from "react";

// One governed sidebar state for every shell in the platform.
//
// Desktop  → the sidebar stays in the layout flow, expanded or collapsed (choice remembered).
// Tablet   → it is never permanent: it opens over the content as a panel with a scrim.
// Phone    → the same panel, full height, opening from the correct language side.

const COLLAPSED_KEY = "lijan_sidebar_collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

export function useSidebarShell() {
  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(DESKTOP_QUERY).matches
  );
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) setOverlayOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setCollapsed = useCallback((value) => {
    setCollapsedState(value);
    window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((current) => {
      window.localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      return !current;
    });
  }, []);

  const openOverlay = useCallback(() => setOverlayOpen(true), []);
  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  const toggle = useCallback(() => {
    if (isDesktop) toggleCollapsed();
    else setOverlayOpen((open) => !open);
  }, [isDesktop, toggleCollapsed]);

  // Escape closes the panel, and the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOverlayOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  return { collapsed, setCollapsed, toggleCollapsed, isDesktop, overlayOpen, openOverlay, closeOverlay, toggle };
}