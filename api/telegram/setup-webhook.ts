import type { Request, Response } from 'express';
import { callTelegramApi } from '../../server/telegram';

export default async function handler(req: Request, res: Response) {
  // Allow GET and POST for setup
  try {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'www.drfix.repair') as string;
    const protocol = (req.headers['x-forwarded-proto'] || 'https') as string;
    
    // Priority for production domain:
    // 1. Explicit domain query param (?domain=https://www.drfix.repair)
    // 2. APP_URL env variable
    // 3. Request host header if it is a live domain (e.g. www.drfix.repair or drfix.repair)
    // 4. Default fallback to https://www.drfix.repair
    let baseDomain = 'https://www.drfix.repair';

    const customDomain = req.query.domain as string;
    if (customDomain && customDomain.startsWith('http')) {
      baseDomain = customDomain;
    } else if (process.env.APP_URL && process.env.APP_URL.startsWith('http') && !process.env.APP_URL.includes('run.app')) {
      baseDomain = process.env.APP_URL;
    } else if (host && (host.includes('drfix.repair') || host.includes('vercel.app'))) {
      baseDomain = `${protocol}://${host}`;
    }

    baseDomain = baseDomain.replace(/\/$/, '');
    const webhookUrl = `${baseDomain}/api/telegram`;

    // Telegram Bot API secret_token requirements: 1-256 characters, only [A-Za-z0-9_-]
    const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    const isValidSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret);

    const payload: Record<string, any> = {
      url: webhookUrl,
      drop_pending_updates: false
    };

    if (isValidSecret) {
      payload.secret_token = rawSecret;
    }

    // Call Telegram setWebhook
    const setWebhookResult = await callTelegramApi('setWebhook', payload);
    
    // Fetch current webhook info to verify
    const getInfoResult = await callTelegramApi('getWebhookInfo', {});

    const isSuccess = setWebhookResult && setWebhookResult.ok === true;

    return res.status(isSuccess ? 200 : 400).json({
      ok: isSuccess,
      message: isSuccess ? 'Telegram Webhook registered successfully' : 'Failed to register Telegram Webhook',
      targetWebhookUrl: webhookUrl,
      hasSecretTokenConfigured: isValidSecret,
      telegramSetResult: setWebhookResult,
      currentWebhookInfo: getInfoResult,
      configuredAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in setup-webhook:', error);
    return res.status(500).json({
      ok: false,
      error: String(error)
    });
  }
}
