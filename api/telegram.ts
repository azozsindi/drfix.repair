import { handleTelegramWebhook } from './_telegram';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-bot-api-secret-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Allow setup or diagnostics via query param (?setup=1 or ?action=setup)
  if (req.method === 'GET') {
    const isSetup = req.query && (req.query.setup === '1' || req.query.setup === 'true' || req.query.action === 'setup');
    if (isSetup) {
      try {
        const botToken = (process.env.TELEGRAM_BOT_TOKEN || '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE').trim();
        const host = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || 'www.drfix.repair';
        const protocol = (req.headers && (req.headers['x-forwarded-proto'])) || 'https';
        
        let baseDomain = 'https://www.drfix.repair';
        if (req.query?.domain && typeof req.query.domain === 'string') {
          baseDomain = req.query.domain;
        } else if (process.env.APP_URL && process.env.APP_URL.startsWith('http') && !process.env.APP_URL.includes('run.app')) {
          baseDomain = process.env.APP_URL;
        } else if (host && (host.includes('drfix.repair') || host.includes('vercel.app'))) {
          baseDomain = `${protocol}://${host}`;
        }
        baseDomain = baseDomain.replace(/\/$/, '');
        const webhookUrl = `${baseDomain}/api/telegram`;

        const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
        const isValidSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret);

        const payload: Record<string, any> = {
          url: webhookUrl,
          drop_pending_updates: false,
          max_connections: 40
        };
        if (isValidSecret) {
          payload.secret_token = rawSecret;
        }

        const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const telegramSetResult = await setRes.json();
        const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const currentWebhookInfo = await infoRes.json();

        return res.status(telegramSetResult.ok ? 200 : 400).json({
          ok: telegramSetResult.ok,
          message: telegramSetResult.ok ? 'Webhook registered successfully via setup query' : 'Failed to register Webhook',
          targetWebhookUrl: webhookUrl,
          telegramSetResult,
          currentWebhookInfo,
          configuredAt: new Date().toISOString()
        });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    }

    return res.status(200).json({
      ok: true,
      service: 'DR.FIX Telegram Inbound Webhook',
      status: 'active',
      method: req.method,
      setupInstruction: 'To register webhook, visit /api/setup-webhook or /api/telegram?setup=1',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const secretHeader = req.headers && req.headers['x-telegram-bot-api-secret-token'];
    const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();

    if (expectedSecret && secretHeader && secretHeader !== expectedSecret) {
      console.warn('Unauthorized Telegram webhook request: secret mismatch');
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    let update = req.body;
    if (typeof update === 'string') {
      try {
        update = JSON.parse(update);
      } catch {
        update = null;
      }
    }

    if (!update) {
      return res.status(400).json({ ok: false, error: 'Empty update payload' });
    }

    const result = await handleTelegramWebhook(update);
    return res.status(200).json(result || { ok: true });
  } catch (error: any) {
    console.error('Telegram webhook handler exception:', error);
    // Always return 200 to Telegram so it doesn't repeatedly hammer with failed retries
    return res.status(200).json({ ok: true, handledWithError: error?.message || String(error) });
  }
}
