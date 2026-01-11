
/**
 * Syifamili Service Worker
 * Handles Web Push Notifications
 */

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Syifamili', body: event.data.text() };
    }
  } else {
    data = { title: 'Syifamili', body: 'New notification' };
  }

  const options = {
    body: data.body,
    icon: 'https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV', // App Icon
    badge: 'https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV', // Small monochrome icon recommended
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // If a window is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
