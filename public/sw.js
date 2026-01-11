
/**
 * Syifamili Service Worker
 * Optimized for iOS Web Push
 */

// 1. Handle Pesan dari Server (Push)
self.addEventListener('push', function(event) {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Syifamili', body: event.data.text() };
    }
  } else {
    data = { title: 'Syifamili', body: 'Ada pembaruan data.' };
  }

  // Opsi Sederhana untuk Kompatibilitas iOS Maksimal
  // iOS sering memblokir notifikasi jika icon URL bermasalah/lambat
  const options = {
    body: data.body || 'Silakan cek aplikasi untuk detailnya.',
    tag: 'syifamili-notif',
    renotify: true,
    data: {
      url: data.url || '/'
    }
    // Icon & Badge dihapus sementara untuk memastikan notifikasi masuk dulu
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Syifamili', options)
  );
});

// 2. Handle Klik Notifikasi
self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const urlToOpen = notification.data.url || '/';

  notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Coba fokus ke tab/window yang sudah terbuka
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        const clientUrl = new URL(client.url, self.location.origin).pathname;
        
        // Cek dasar apakah url cocok
        if (clientUrl === '/' || clientUrl === '/index.html') {
           if ('focus' in client) {
             if ('navigate' in client) {
                return client.navigate(urlToOpen).then(c => c.focus());
             }
             return client.focus();
           }
        }
      }
      // Jika tidak ada yang terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 3. Handle Pesan Lokal (Untuk Tombol "Test di HP Ini")
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('Test Berhasil! 🎉', {
      body: 'Notifikasi di HP ini berfungsi normal.',
      vibrate: [100, 50, 100],
      data: { url: '/?test=success' }
    });
  }
});
