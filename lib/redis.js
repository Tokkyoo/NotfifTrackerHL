import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getTrackedWallets(chatId) {
  const wallets = await redis.hgetall(`wallets:${chatId}`);
  return wallets || {};
}

export async function addWallet(chatId, address, label) {
  const data = { label, active: true };
  await redis.hset(`wallets:${chatId}`, {
    [address.toLowerCase()]: JSON.stringify(data),
  });
  await redis.sadd('chats', chatId.toString());
}

export async function removeWallet(chatId, address) {
  await redis.hdel(`wallets:${chatId}`, address.toLowerCase());
  await redis.del(`lastfill:${chatId}:${address.toLowerCase()}`);
}

export async function toggleWallet(chatId, address, active) {
  const raw = await redis.hget(`wallets:${chatId}`, address.toLowerCase());
  if (!raw) return false;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  data.active = active;
  await redis.hset(`wallets:${chatId}`, {
    [address.toLowerCase()]: JSON.stringify(data),
  });
  return true;
}

export async function getAllChats() {
  const chats = await redis.smembers('chats');
  return chats || [];
}

export async function setLastFillTime(chatId, address, time) {
  await redis.set(`lastfill:${chatId}:${address.toLowerCase()}`, time);
}

export async function getLastFillTime(chatId, address) {
  return await redis.get(`lastfill:${chatId}:${address.toLowerCase()}`);
}
