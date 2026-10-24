// Permanent Fixed Telegram Bot Configuration
export const DEFAULT_TELEGRAM_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
export const DEFAULT_TELEGRAM_CHAT_ID = '867105778';

export const escapeTelegramHtml = (text: any): string => {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// Telegram instant message dispatcher with support for multiple Chat IDs and group chats
export const sendTelegramNotification = async (
  messageText: string, 
  botToken?: string, 
  chatId?: string,
  replyMarkup?: any
): Promise<boolean> => {
  const activeToken = (botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const rawChatId = (chatId || DEFAULT_TELEGRAM_CHAT_ID).trim();
  if (!activeToken || !rawChatId) return false;

  // Split multiple chat IDs if separated by commas, newlines, semicolons, or spaces
  const chatIds = rawChatId
    .split(/[\n,;\s]+/)
    .map(id => id.trim())
    .filter(Boolean);

  if (chatIds.length === 0) return false;

  // Sanitize replyMarkup inline keyboard buttons
  const sanitizeMarkup = (markup: any) => {
    if (!markup || !markup.inline_keyboard || !Array.isArray(markup.inline_keyboard)) return undefined;
    const sanitized: any[][] = [];
    for (const row of markup.inline_keyboard) {
      if (!Array.isArray(row)) continue;
      const validRow = row.filter((btn: any) => {
        if (!btn || !btn.url || typeof btn.url !== 'string') return false;
        const u = btn.url.trim();
        return (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('tg://')) &&
               !u.includes('localhost') && !u.includes('127.0.0.1') && !u.startsWith('tel:');
      }).map((btn: any) => {
        // If button URL had localhost or relative URL, convert or keep clean
        return btn;
      });
      if (validRow.length > 0) sanitized.push(validRow);
    }
    return sanitized.length > 0 ? { inline_keyboard: sanitized } : undefined;
  };

  const safeMarkup = sanitizeMarkup(replyMarkup);

  const results = await Promise.allSettled(
    chatIds.map(async (singleChatId) => {
      try {
        const payload: Record<string, any> = {
          chat_id: singleChatId,
          text: messageText,
          parse_mode: 'HTML'
        };
        if (safeMarkup) {
          payload.reply_markup = safeMarkup;
        }
        const url = `https://api.telegram.org/bot${activeToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok) return true;
        }

        // Fallback without HTML parse_mode AND without keyboard if Telegram rejected
        const plainPayload: Record<string, any> = {
          chat_id: singleChatId,
          text: String(messageText).replace(/<[^>]*>/g, '')
        };
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload)
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          if (retryData && retryData.ok) return true;
        }
        return false;
      } catch (err) {
        console.error(`Telegram notification error for ID ${singleChatId}:`, err);
        return false;
      }
    })
  );

  return results.some(r => r.status === 'fulfilled' && r.value === true);
};
