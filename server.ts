import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import telegramHandler from './api/telegram';
import notifyBookingHandler from './api/notify-booking';
import notifyReviewHandler from './api/notify-review';
import notifyVisitHandler from './api/notify-visit';
import setupWebhookHandler from './api/setup-webhook';
import statusRedirectHandler from './api/status-redirect';
import accountingHandler from './api/accounting';
import notifyCustomerRegistrationHandler from './api/notify-customer-registration';

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
      canonicalDomain: 'https://www.drfix.repair',
      timestamp: new Date().toISOString()
    });
  });

  // Telegram Inbound Webhook
  app.all('/api/telegram', async (req, res) => {
    await telegramHandler(req, res);
  });

  // Setup / Register Webhook with Telegram
  app.all('/api/setup-webhook', async (req, res) => {
    await setupWebhookHandler(req, res);
  });
  app.all('/api/telegram/setup-webhook', async (req, res) => {
    await setupWebhookHandler(req, res);
  });

  // Server-side New Booking Notification Trigger
  app.all('/api/notify-booking', async (req, res) => {
    await notifyBookingHandler(req, res);
  });

  // Server-side Review Notification Trigger
  app.all('/api/notify-review', async (req, res) => {
    await notifyReviewHandler(req, res);
  });

  // Server-side Emergency / Visit Request Notification Trigger
  app.all('/api/notify-visit', async (req, res) => {
    await notifyVisitHandler(req, res);
  });

  // Server-side Customer Registration Notification Trigger
  app.all('/api/notify-customer-registration', async (req, res) => {
    await notifyCustomerRegistrationHandler(req, res);
  });

  // Direct Status Update & WhatsApp Redirect Route
  app.all('/api/status-redirect', async (req, res) => {
    await statusRedirectHandler(req, res);
  });

  // Manual Payments & Accounting RBAC API Handler
  app.all('/api/accounting*', async (req, res) => {
    await accountingHandler(req, res);
  });

  // Explicit Static Content-Type routes for SEO & Social Previews
  app.get('/logo.png', (req, res) => {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'public', 'logo.png'));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  app.get('/manifest.webmanifest', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'manifest.webmanifest'));
  });

  // Vite Middleware for SPA Development & Production Serving
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
    console.log(`[DR.FIX Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Error:', err);
});
