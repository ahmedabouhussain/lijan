import { useEffect } from "react";

/**
 * AutoFullscreen — requests browser fullscreen on the first user interaction.
 * Browsers block fullscreen without a user gesture (click/keypress/touch),
 * so we listen for the first interaction and enter fullscreen once.
 */
export default function AutoFullscreen() {
  useEffect(() => {
    let triggered = false;

    const enterFullscreen = async () => {
      if (triggered) return;
      triggered = true;
      try {
        if (document.documentElement.requestFullscreen) {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }
      } catch {
        // Fullscreen may be blocked — fail silently
      }
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener("click", enterFullscreen);
      document.removeEventListener("keydown", enterFullscreen);
      document.removeEventListener("touchstart", enterFullscreen);
    };

    // Only attempt on the published app (not in builder preview)
    const isPublished = window.location.hostname.includes("base44.app");
    if (!isPublished) return;

    document.addEventListener("click", enterFullscreen, { once: true });
    document.addEventListener("keydown", enterFullscreen, { once: true });
    document.addEventListener("touchstart", enterFullscreen, { once: true });

    return cleanup;
  }, []);

  return null;
}