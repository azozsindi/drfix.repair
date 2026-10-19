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

  const results = await Promise.allSettled(
    chatIds.map(async (singleChatId) => {
      try {
        const payload: Record<string, any> = {
          chat_id: singleChatId,
          text: messageText,
          parse_mode: 'HTML'
        };
        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }
        const url = `https://api.telegram.org/bot${activeToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok) return true;
        }

        // Fallback without HTML parse_mode if Telegram rejected formatting
        const plainPayload: Record<string, any> = {
          chat_id: singleChatId,
          text: String(messageText).replace(/<[^>]*>/g, '')
        };
        if (replyMarkup) {
          plainPayload.reply_markup = replyMarkup;
        }
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload)
        });
        return retryRes.ok;
      } catch (err) {
        console.error(`Telegram notification error for ID ${singleChatId}:`, err);
        return false;
      }
    })
  );

  return results.some(r => r.status === 'fulfilled' && r.value === true);
};
