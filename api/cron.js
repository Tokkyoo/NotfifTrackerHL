import {
  getAllChats,
  getTrackedWallets,
  getLastFillTime,
  setLastFillTime,
} from '../lib/redis.js';
import { getUserFills } from '../lib/hyperliquid.js';
import { sendTradeNotification } from '../lib/telegram.js';

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'];
  const isAuthorized =
    req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let checked = 0;
  let notified = 0;
  let errors = 0;

  try {
    const chats = await getAllChats();

    for (const chatId of chats) {
      const wallets = await getTrackedWallets(chatId);

      for (const [address, raw] of Object.entries(wallets)) {
        // Une erreur sur un wallet ne doit jamais faire échouer tout le cron :
        // sinon cron-job.org compte un échec et finit par désactiver le job.
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!data.active) continue;

          checked++;
          const lastFillTime = await getLastFillTime(chatId, address);
          const startTime = lastFillTime || Date.now() - 60 * 1000;
          const fills = await getUserFills(address, startTime);

          if (!fills || fills.length === 0) {
            if (!lastFillTime) {
              await setLastFillTime(chatId, address, Date.now());
            }
            continue;
          }

          const newFills = lastFillTime
            ? fills.filter((f) => f.time > lastFillTime)
            : [];

          if (newFills.length > 0) {
            await sendTradeNotification(chatId, address, newFills, data.label);
            notified += newFills.length;
          }

          const mostRecent = Math.max(...fills.map((f) => f.time));
          await setLastFillTime(chatId, address, mostRecent);
        } catch (walletErr) {
          errors++;
          console.error(`Cron error for ${chatId}/${address}:`, walletErr);
        }
      }
    }
  } catch (err) {
    // Même en cas d'erreur globale on répond 200 pour éviter que cron-job.org
    // désactive le job ; le détail est dans les logs.
    errors++;
    console.error('Cron error:', err);
  }

  res.status(200).json({ ok: true, checked, notified, errors });
}
