/* LIJAN™ app shell — installability plus an offline screen, and nothing else.
 *
 * This worker deliberately caches NO application response: no page, no API call,
 * no bundle. Governance data, sessions and builds are therefore never served from
 * a cache, so a signed-out or re-authorized user can never be shown stale records,
 * and a new release can never be masked by an old copy. Only the offline screen is
 * precached, and it is served solely when a navigation request fails offline. */

const SHELL_CACHE = "lijan-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
