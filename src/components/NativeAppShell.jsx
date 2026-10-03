import { useEffect } from "react";

/**
 * NativeAppShell — the two device-level behaviours the app needs to feel native.
 * Mounted once, renders nothing.
 *
 * 1. Registers the offline/app-shell worker (public/sw.js). The worker caches no
 *    application response, so nothing here can serve stale governance data.
 * 2. On touch devices, keeps the focused field clear of the on-screen keyboard by
 *    bringing it to the middle of the viewport after the keyboard opens.
 */
export default function NativeAppShell() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.protocol !== "https:") return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return;
    const onFocusIn = (event) => {
      const el = event.target;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el.type === "checkbox" || el.type === "radio") return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      }, 250);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
}