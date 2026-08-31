import { sendVisitNotification } from './_telegram';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    let visit = req.body;
    if (typeof visit === 'string') {
      try {
        visit = JSON.parse(visit);
      } catch {
        visit = null;
      }
    }
    const result = await sendVisitNotification(visit);
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Notify visit serverless function error:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
