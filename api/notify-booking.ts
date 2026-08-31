import { sendBookingNotification } from '../server/telegram';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    let booking = req.body;
    if (typeof booking === 'string') {
      try {
        booking = JSON.parse(booking);
      } catch {
        booking = null;
      }
    }

    if (!booking || !booking.bookingId) {
      return res.status(400).json({ ok: false, message: 'Invalid booking data' });
    }

    const result = await sendBookingNotification(booking);
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Notify booking serverless function error:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
