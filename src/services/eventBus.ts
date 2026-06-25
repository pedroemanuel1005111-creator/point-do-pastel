/**
 * Simple global event bus.
 * - Same-tab: synchronous callback
 * - Cross-tab: BroadcastChannel fallback to storage event
 */

type Listener = () => void;

const subs = new Map<string, Set<Listener>>();
let bc: BroadcastChannel | null = null;

try {
  bc = new BroadcastChannel('pointdopastel_sync');
  bc.onmessage = (e) => {
    const ch = e.data?.channel as string;
    if (ch) fire(ch);
  };
} catch {
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('pointdopastel_')) {
      subs.forEach((_, ch) => fire(ch));
    }
  });
}

function fire(channel: string) {
  subs.get(channel)?.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export function subscribe(channel: string, listener: Listener): () => void {
  if (!subs.has(channel)) subs.set(channel, new Set());
  subs.get(channel)!.add(listener);
  return () => { subs.get(channel)?.delete(listener); };
}

export function emit(channel: string) {
  fire(channel);
  try { bc?.postMessage({ channel }); } catch {}
}

export const CH = {
  CONFIG: 'config',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  NEW_ORDER: 'new-order',
  MEDIA: 'media',
} as const;

// Alias for backward compat
export const CHANNELS = CH;
