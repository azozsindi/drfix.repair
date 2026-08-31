import type { Request, Response } from 'express';
import { sendBookingNotification } from '../server/telegram';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const booking = req.body;
    if (!booking || !booking.bookingId) {
      return res.status(400).json({ ok: false, message: 'Invalid booking data' });
    }
    const result = await sendBookingNotification(booking);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Notify booking serverless function error:', error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
