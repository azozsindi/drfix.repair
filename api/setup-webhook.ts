export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE').trim();
    if (!botToken) {
      return res.status(500).json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN is missing in environment variables'
      });
    }

    const host = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || 'www.drfix.repair';
    const protocol = (req.headers && (req.headers['x-forwarded-proto'])) || 'https';
    
    // Target base domain priority
    let baseDomain = 'https://www.drfix.repair';
    const queryDomain = (req.query && req.query.domain) || '';
    if (queryDomain && typeof queryDomain === 'string' && queryDomain.startsWith('http')) {
      baseDomain = queryDomain;
    } else if (process.env.APP_URL && process.env.APP_URL.startsWith('http') && !process.env.APP_URL.includes('run.app')) {
      baseDomain = process.env.APP_URL;
    } else if (host && (host.includes('drfix.repair') || host.includes('vercel.app'))) {
      baseDomain = `${protocol}://${host}`;
    }

    baseDomain = baseDomain.replace(/\/$/, '');
    const webhookUrl = `${baseDomain}/api/telegram`;

    // Telegram Bot API secret_token validation: 1-256 characters, only [A-Za-z0-9_-]
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

    // Call Telegram setWebhook
    const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const telegramSetResult = await setRes.json();

    // Call Telegram getWebhookInfo
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const currentWebhookInfo = await infoRes.json();

    const isUrlAlreadyActive = currentWebhookInfo?.result?.url === webhookUrl;
    const isSuccess = (telegramSetResult && telegramSetResult.ok === true) || isUrlAlreadyActive;

    return res.status(isSuccess ? 200 : 400).json({
      ok: isSuccess,
      message: isSuccess
        ? 'Telegram Webhook is registered and active'
        : 'Failed to register Telegram Webhook with Telegram API',
      targetWebhookUrl: webhookUrl,
      isUrlAlreadyActive,
      hasSecretTokenConfigured: isValidSecret,
      telegramSetResult,
      currentWebhookInfo,
      configuredAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in setup-webhook serverless function:', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || String(error),
      stack: error?.stack || undefined
    });
  }
}
