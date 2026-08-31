import type { Request, Response } from 'express';
import { handleTelegramWebhook } from '../server/telegram';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'DR.FIX Telegram Webhook Endpoint' });
  }

  try {
    const update = req.body;
    const result = await handleTelegramWebhook(update);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Telegram serverless function error:', error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
