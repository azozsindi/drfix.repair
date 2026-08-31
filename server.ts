import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  sendBookingNotification,
  sendReviewNotification,
  sendVisitNotification,
  handleTelegramWebhook,
  callTelegramApi
} from './server/telegram';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares for parsing JSON and urlencoded payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'DR.FIX Backend Service',
      canonicalDomain: 'https://drfix.repair',
      timestamp: new Date().toISOString()
    });
  });

  // Telegram Inbound Webhook
  app.post('/api/telegram', async (req, res) => {
    try {
      const update = req.body;
      const result = await handleTelegramWebhook(update);
      res.json(result);
    } catch (error) {
      console.error('Error in /api/telegram:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Setup / Register Webhook with Telegram
  app.get('/api/telegram/setup-webhook', async (req, res) => {
    try {
      const appUrl = process.env.APP_URL || 'https://drfix.repair';
      const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram`;
      const result = await callTelegramApi('setWebhook', { url: webhookUrl });
      res.json({ ok: true, webhookUrl, telegramResponse: result });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Server-side New Booking Notification Trigger
  app.post('/api/notify-booking', async (req, res) => {
    try {
      const booking = req.body;
      if (!booking || !booking.bookingId) {
        return res.status(400).json({ ok: false, message: 'Invalid booking data' });
      }
      const result = await sendBookingNotification(booking);
      res.json({ ok: true, result });
    } catch (error) {
      console.error('Error in /api/notify-booking:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Server-side Review Notification Trigger
  app.post('/api/notify-review', async (req, res) => {
    try {
      const review = req.body;
      const result = await sendReviewNotification(review);
      res.json({ ok: true, result });
    } catch (error) {
      console.error('Error in /api/notify-review:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Server-side Emergency / Visit Request Notification Trigger
  app.post('/api/notify-visit', async (req, res) => {
    try {
      const visit = req.body;
      const result = await sendVisitNotification(visit);
      res.json({ ok: true, result });
    } catch (error) {
      console.error('Error in /api/notify-visit:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Explicit Static Content-Type routes for SEO
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  // Vite Middleware & Static Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DR.FIX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
