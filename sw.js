// Service worker - always fetch CSS/JS fresh from network
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('.css') || url.includes('.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
  }
});
