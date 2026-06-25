/**
 * Cloud sync via ntfy.sh — free, no signup, real-time, BIDIRECTIONAL.
 *
 * Messages:
 *   { type: 'new_order',     order: OrderData }   — client → admin
 *   { type: 'status_update', orderId, status }     — admin → client
 */

import { OrderData } from '../types';
import { addOrder, getOrderById, updateOrderStatus as localUpdateStatus } from './orderStore';

const TOPIC_KEY = 'pointdopastel_sync_topic';
const NTFY_BASE = 'https://ntfy.sh';
const DEFAULT_TOPIC = 'pointdopastel_pedidos_2025';

function getTopic(): string {
  return localStorage.getItem(TOPIC_KEY) || DEFAULT_TOPIC;
}

export function getSyncTopic(): string { return getTopic(); }
export function setSyncTopic(topic: string): void { localStorage.setItem(TOPIC_KEY, topic); }

// ====== PUBLISH ======

async function publish(data: object): Promise<boolean> {
  try {
    await fetch(`${NTFY_BASE}/${getTopic()}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return true;
  } catch { return false; }
}

/** Client publishes a new order */
export async function publishOrder(order: OrderData): Promise<boolean> {
  return publish({
    type: 'new_order',
    order: { ...order, createdAt: new Date(order.createdAt).toISOString() },
  });
}

/** Admin publishes a status update */
export async function publishStatusUpdate(orderId: string, status: OrderData['status']): Promise<boolean> {
  return publish({ type: 'status_update', orderId, status });
}

// ====== SUBSCRIBE ======

let es: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function startListening(): void {
  stopListening();
  try {
    es = new EventSource(`${NTFY_BASE}/${getTopic()}/sse`);
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        let payload: any;
        if (msg.message) {
          try { payload = JSON.parse(msg.message); } catch { return; }
        } else if (msg.type) {
          payload = msg;
        } else { return; }

        if (payload?.type === 'new_order' && payload?.order) {
          const o = payload.order as OrderData;
          o.createdAt = new Date(o.createdAt);
          if (!getOrderById(o.id)) addOrder(o);
        }

        if (payload?.type === 'status_update' && payload?.orderId && payload?.status) {
          const existing = getOrderById(payload.orderId);
          if (existing && existing.status !== payload.status) {
            localUpdateStatus(payload.orderId, payload.status);
          }
        }
      } catch {}
    };
    es.onerror = () => {
      stopListening();
      retryTimer = setTimeout(() => startListening(), 5000);
    };
  } catch {}
}

export function stopListening(): void {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (es) { es.close(); es = null; }
}

export function isListening(): boolean {
  return es !== null && es.readyState !== EventSource.CLOSED;
}
