const API_URL = 'https://api.hyperliquid.xyz/info';

export async function getUserFills(address, startTime) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'userFillsByTime',
      user: address,
      startTime: startTime || Date.now() - 10 * 60 * 1000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Hyperliquid API error: ${res.status}`);
  }

  return await res.json();
}
