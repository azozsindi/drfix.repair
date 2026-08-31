import type { Request, Response } from 'express';
import { handleTelegramWebhook } from '../../server/telegram';

export default async function handler(req: Request, res: Response) {
  // Respond to GET health checks
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'DR.FIX Telegram Inbound Webhook',
      status: 'active',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    // Verify optional secret token header if configured
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secretHeader && secretHeader !== expectedSecret) {
      console.warn('Unauthorized Telegram webhook request: secret mismatch');
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const update = req.body;
    if (!update) {
      return res.status(400).json({ ok: false, error: 'Empty update payload' });
    }

    const result = await handleTelegramWebhook(update);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Telegram serverless function error:', error);
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
