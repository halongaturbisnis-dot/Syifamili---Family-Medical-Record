
import webpush from 'web-push';

export default async function handler(req, res) {
  // Aktifkan CORS agar GAS bisa memanggil endpoint ini
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, payload } = req.body;

  if (!subscription || !payload) {
    return res.status(400).json({ error: 'Missing subscription or payload' });
  }

  // Mengambil Key dari Environment Variable Vercel
  const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

  if (!publicVapidKey || !privateVapidKey) {
    console.error("VAPID Keys not configured in Vercel Environment Variables");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  webpush.setVapidDetails(
    contactEmail,
    publicVapidKey,
    privateVapidKey
  );

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending push:', error);
    // 410 Gone berarti user sudah unsubscribe/clear cache, subscription invalid
    if (error.statusCode === 410) {
        res.status(410).json({ error: 'Subscription expired' });
    } else {
        res.status(500).json({ error: 'Failed to send notification' });
    }
  }
}
