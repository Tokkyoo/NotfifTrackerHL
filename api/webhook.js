import { sendMessage } from '../lib/telegram.js';
import {
  addWallet,
  removeWallet,
  getTrackedWallets,
  toggleWallet,
} from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body;
  if (!message?.text) return res.status(200).end();

  const chatId = message.chat.id;
  const text = message.text.trim();
  const cmd = text.split('@')[0];

  try {
    if (cmd === '/start') {
      await sendMessage(
        chatId,
        `<b>🔔 NotifTracker HL</b>\n\n` +
          `Tracker de wallets Hyperliquid.\n` +
          `Recevez une notification dès qu'un wallet trade.\n\n` +
          `<b>Commandes :</b>\n` +
          `/add <code>0x...</code> [nom] — Ajouter un wallet\n` +
          `/remove <code>0x...</code> — Retirer un wallet\n` +
          `/list — Voir vos wallets\n` +
          `/mute <code>0x...</code> — Couper les notifs\n` +
          `/unmute <code>0x...</code> — Réactiver les notifs`
      );
    } else if (cmd.startsWith('/add')) {
      await handleAdd(chatId, text);
    } else if (cmd.startsWith('/remove')) {
      await handleRemove(chatId, text);
    } else if (cmd === '/list') {
      await handleList(chatId);
    } else if (cmd.startsWith('/mute')) {
      await handleToggle(chatId, text, false);
    } else if (cmd.startsWith('/unmute')) {
      await handleToggle(chatId, text, true);
    }
  } catch (err) {
    console.error('Webhook error:', err);
    await sendMessage(chatId, '❌ Une erreur est survenue. Réessayez.');
  }

  res.status(200).end();
}

async function handleAdd(chatId, text) {
  const parts = text.split(/\s+/);
  const address = parts[1];
  const label = parts.slice(2).join(' ') || null;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    await sendMessage(
      chatId,
      '❌ Adresse invalide.\nFormat : <code>/add 0x1234...abcd</code>'
    );
    return;
  }

  await addWallet(chatId, address, label);
  const displayName = label
    ? `${label} (${address.slice(0, 6)}...${address.slice(-4)})`
    : `<code>${address.slice(0, 6)}...${address.slice(-4)}</code>`;

  await sendMessage(
    chatId,
    `✅ Wallet ajouté : <b>${displayName}</b>\n\nVous recevrez les notifications de trades.`
  );
}

async function handleRemove(chatId, text) {
  const address = text.split(/\s+/)[1];
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    await sendMessage(chatId, '❌ Format : <code>/remove 0x...</code>');
    return;
  }

  await removeWallet(chatId, address);
  await sendMessage(chatId, `✅ Wallet retiré.`);
}

async function handleList(chatId) {
  const wallets = await getTrackedWallets(chatId);
  const entries = Object.entries(wallets);

  if (entries.length === 0) {
    await sendMessage(
      chatId,
      'Aucun wallet suivi.\nUtilisez <code>/add 0x...</code> pour commencer.'
    );
    return;
  }

  let msg = '📋 <b>Vos wallets :</b>\n\n';
  for (const [addr, raw] of entries) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const status = data.active ? '🟢 ON' : '🔴 OFF';
    const name = data.label ? ` — ${data.label}` : '';
    msg += `${status} <code>${addr.slice(0, 6)}...${addr.slice(-4)}</code>${name}\n`;
  }

  await sendMessage(chatId, msg);
}

async function handleToggle(chatId, text, active) {
  const address = text.split(/\s+/)[1];
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    const cmd = active ? '/unmute' : '/mute';
    await sendMessage(chatId, `❌ Format : <code>${cmd} 0x...</code>`);
    return;
  }

  const ok = await toggleWallet(chatId, address, active);
  if (ok) {
    await sendMessage(
      chatId,
      active ? '🔔 Notifications réactivées.' : '🔇 Notifications coupées.'
    );
  } else {
    await sendMessage(chatId, '❌ Wallet non trouvé.');
  }
}
