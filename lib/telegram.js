const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  };

  const res = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return await res.json();
}

export async function sendTradeNotification(chatId, address, fills) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  for (const fill of fills.slice(0, 10)) {
    const isBuy = fill.side === 'B';
    const side = isBuy ? '🟢 ACHAT (Long)' : '🔴 VENTE (Short)';

    let direction = '';
    if (fill.dir) {
      const dirMap = {
        'Open Long': '🟢 OPEN LONG',
        'Close Long': '🟡 CLOSE LONG',
        'Open Short': '🔴 OPEN SHORT',
        'Close Short': '🟡 CLOSE SHORT',
      };
      direction = dirMap[fill.dir] || fill.dir;
    } else {
      direction = side;
    }

    const coin = fill.coin;
    const size = parseFloat(fill.sz).toLocaleString('en-US');
    const price = parseFloat(fill.px).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    const time = new Date(fill.time).toLocaleString('fr-FR', {
      timeZone: 'Europe/Paris',
    });

    const text =
      `<b>${direction}</b>\n\n` +
      `<b>Wallet:</b> <code>${shortAddr}</code>\n` +
      `<b>Token:</b> ${coin}\n` +
      `<b>Taille:</b> ${size}\n` +
      `<b>Prix:</b> $${price}\n` +
      `<b>Heure:</b> ${time}`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📊 HyperDash',
            url: `https://hyperdash.com/address/${address}`,
          },
          {
            text: '🔍 Hypurrscan',
            url: `https://hypurrscan.io/address/${address}`,
          },
        ],
      ],
    };

    await sendMessage(chatId, text, { reply_markup: keyboard });
  }
}
