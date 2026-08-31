import type { Request, Response } from 'express';
import { sendReviewNotification } from '../server/telegram';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const review = req.body;
    const result = await sendReviewNotification(review);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Notify review serverless function error:', error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
