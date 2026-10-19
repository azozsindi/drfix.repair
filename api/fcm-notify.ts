import firebaseConfig from '../firebase-applet-config.json';

const PROJECT_ID = firebaseConfig.projectId || 'hr-system-2026';

// Helper to query GCP Metadata access token on Cloud Run
async function getGcpAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.access_token || null;
    }
  } catch (e) {
    // Not running on GCP or metadata unreachable
  }
  return null;
}

// Helper to fetch active FCM tokens directly from Firestore via REST
async function fetchActiveFcmTokens(apiKey: string): Promise<{ id: string; token: string }[]> {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbId}/documents/fcm_tokens?key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];

    const data: any = await res.json();
    if (!data.documents) return [];

    const tokens: { id: string; token: string }[] = [];
    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const token = fields.token?.stringValue;
      const isActive = fields.isActive?.booleanValue ?? true;
      if (token && isActive) {
        const nameParts = doc.name.split('/');
        const id = nameParts[nameParts.length - 1];
        tokens.push({ id, token });
      }
    }
    return tokens;
  } catch (e) {
    console.warn('Error fetching tokens from Firestore REST:', e);
    return [];
  }
}

// Mark expired/unregistered token as inactive
async function deactivateToken(docId: string, apiKey: string) {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbId}/documents/fcm_tokens/${docId}?updateMask.fieldPaths=isActive&updateMask.fieldPaths=deactivatedAt&key=${apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          isActive: { booleanValue: false },
          deactivatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) {
    console.warn('Error deactivating invalid FCM token:', e);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }

    const {
      title = 'DR.FIX | إشعار جديد 🚗',
      body = 'وصلك إشعار فوري جديد من نظام DR.FIX',
      url = '/admin',
      targetTokens = [],
      bookingId,
      serverKey = process.env.FIREBASE_SERVER_KEY || ''
    } = payload || {};

    const apiKey = firebaseConfig.apiKey;
    let tokensToSend: { id: string; token: string }[] = [];

    // If specific tokens were passed
    if (Array.isArray(targetTokens) && targetTokens.length > 0) {
      tokensToSend = targetTokens.map((t: string, idx: number) => ({ id: `manual_${idx}`, token: t }));
    } else {
      // Otherwise fetch registered admin/staff tokens from Firestore
      tokensToSend = await fetchActiveFcmTokens(apiKey);
    }

    if (tokensToSend.length === 0) {
      return res.status(200).json({
        ok: true,
        sent: 0,
        message: 'لا توجد أجهزة نشطة مسجلة لاستقبال الإشعارات حالياً. يُرجى تفعيل الإشعارات من لوحة الإدارة أولاً.',
        devicesFound: 0
      });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Strategy 1: Legacy FCM Endpoint (if serverKey is configured)
    if (serverKey && serverKey.trim()) {
      const legacyPayload = {
        registration_ids: tokensToSend.map(t => t.token),
        notification: {
          title,
          body,
          icon: '/logo-custom.png',
          badge: '/favicon-96x96.png',
          click_action: url
        },
        data: {
          title,
          body,
          url,
          bookingId: bookingId || '',
          timestamp: String(Date.now())
        },
        priority: 'high'
      };

      try {
        const legacyRes = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${serverKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(legacyPayload)
        });

        if (legacyRes.ok) {
          const legacyData: any = await legacyRes.json();
          successCount = legacyData.success || 0;
          failCount = legacyData.failure || 0;
          return res.status(200).json({
            ok: true,
            method: 'legacy_server_key',
            sent: successCount,
            failed: failCount,
            results: legacyData.results
          });
        }
      } catch (err: any) {
        errors.push(`Legacy FCM error: ${err.message}`);
      }
    }

    // Strategy 2: FCM v1 API with Google Cloud Access Token (Standard OAuth2)
    const gcpAccessToken = await getGcpAccessToken();
    if (gcpAccessToken) {
      for (const item of tokensToSend) {
        try {
          const fcmV1Payload = {
            message: {
              token: item.token,
              notification: {
                title,
                body
              },
              data: {
                url,
                bookingId: bookingId ? String(bookingId) : '',
                timestamp: String(Date.now())
              },
              webpush: {
                headers: {
                  Urgency: 'high'
                },
                notification: {
                  icon: '/logo-custom.png',
                  badge: '/favicon-96x96.png',
                  dir: 'rtl',
                  lang: 'ar',
                  renotify: true,
                  requireInteraction: true
                },
                fcm_options: {
                  link: url
                }
              }
            }
          };

          const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcpAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fcmV1Payload)
          });

          if (fcmRes.ok) {
            successCount++;
          } else {
            const errData: any = await fcmRes.json();
            failCount++;
            const errStr = errData.error?.message || 'FCM error';
            errors.push(errStr);
            // If token is invalid or unregistered, deactivate it in Firestore
            if (errStr.includes('UNREGISTERED') || errStr.includes('registration-token-not-registered') || errData.error?.status === 'NOT_FOUND') {
              await deactivateToken(item.id, apiKey);
            }
          }
        } catch (err: any) {
          failCount++;
          errors.push(err.message);
        }
      }

      return res.status(200).json({
        ok: successCount > 0 || failCount === 0,
        method: 'fcm_v1_api',
        sent: successCount,
        failed: failCount,
        errors: errors.slice(0, 5),
        totalDevices: tokensToSend.length
      });
    }

    // Fallback response when no server credentials yet configured
    return res.status(200).json({
      ok: false,
      sent: 0,
      failed: tokensToSend.length,
      devicesCount: tokensToSend.length,
      message: 'يحتاج السيرفر إلى ضبط مفتاح Firebase Server Key أو Service Account لإرسال الإشعارات عبر السيرفر.',
      instructions: 'يمكن إدخال مفتاح الخادم (Server Key) أو مفتاح VAPID في لوحة الإدارة ضمن قسم إعدادات الإشعارات.'
    });

  } catch (error: any) {
    console.error('Server FCM Notification Handler Error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Internal Server Error'
    });
  }
}
