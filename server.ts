import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import telegramHandler from './api/telegram';
import statusRedirectHandler from './api/status-redirect';
import accountingHandler from './api/accounting';
import notifyHandler from './api/notify';
import uploadHandler from './api/upload';
import portalHandler from './api/portal';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares for parsing JSON and urlencoded payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Standard CORS headers for API routes (handles mobile browsers and credential requests)
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-Admin-Name, X-Admin-Id');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'DR.FIX Backend Service',
      canonicalDomain: 'https://www.drfix.repair',
      timestamp: new Date().toISOString()
    });
  });

  // Telegram Inbound Webhook & Setup Webhook
  app.all('/api/telegram*', async (req, res) => {
    await telegramHandler(req, res);
  });
  app.all('/api/setup-webhook', async (req, res) => {
    await telegramHandler(req, res);
  });

  // Unified Notification Engine (Booking, Review, Visit, Customer Registration, FCM)
  app.all([
    '/api/notify-booking',
    '/api/notify-review',
    '/api/notify-visit',
    '/api/notify-customer-registration',
    '/api/fcm-notify',
    '/api/notify*'
  ], async (req, res) => {
    await notifyHandler(req, res);
  });

  // Direct Status Update & WhatsApp Redirect Route
  app.all('/api/status-redirect', async (req, res) => {
    await statusRedirectHandler(req, res);
  });

  // Manual Payments & Accounting RBAC API Handler
  app.all('/api/accounting*', async (req, res) => {
    await accountingHandler(req, res);
  });

  // Unified Portal Engine (Staff Auth, Booking Tracking, Workshop Operations, Customer Linking)
  app.all([
    '/api/staff*',
    '/api/booking/track',
    '/api/customer*',
    '/api/portal*',
    '/api/customer-link*',
    '/api/portal'
  ], async (req, res) => {
    await portalHandler(req, res);
  });

  // Unified Media Upload (Images & Videos)
  app.all([
    '/api/upload-video',
    '/api/upload-image',
    '/api/upload*'
  ], async (req, res) => {
    await uploadHandler(req, res);
  });

  // Explicitly block any direct static access to accounting_private if ever referenced
  app.all('/uploads/accounting_private*', (_req, res) => {
    return res.status(403).json({ error: 'Forbidden', message: 'الوصول المباشر لمرفقات المحاسبة محظور نهائياً.' });
  });

  // Serve uploaded media with revalidation caching (prevents stale browser cache after replacement)
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
    maxAge: '5m',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
  }));

  // Fallback static mount for /tmp/uploads in serverless or ephemeral filesystems
  try {
    const tmpUploadsDir = path.join('/tmp', 'uploads');
    if (fs.existsSync(tmpUploadsDir)) {
      app.use('/uploads', express.static(tmpUploadsDir, {
        maxAge: '5m',
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        }
      }));
    }
  } catch {}

  // Explicit Static Content-Type routes for SEO, Googlebot-Favicon & Social Previews
  app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  });

  app.get(['/favicon-48x48.png', '/favicon-96x96.png', '/favicon-192x192.png', '/apple-touch-icon.png'], (req, res) => {
    const filename = path.basename(req.path);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'public', filename));
  });

  app.get(['/logo.png', '/logo-custom.png', '/hero-custom.jpg'], (req, res) => {
    const filename = path.basename(req.path);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    res.sendFile(path.join(process.cwd(), 'public', filename));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
  });

  app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
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
