import { OrderData } from '../types';
import { addOrder, getOrderById } from './orderStore';

/**
 * Encode order to compact base64 for URL.
 * Strips images/descriptions to keep URL short.
 */
export function encodeOrder(order: OrderData): string {
  const compact = {
    i: order.id,
    n: order.customerName,
    p: order.customerPhone,
    a: order.customerAddress,
    t: order.orderType === 'delivery' ? 'd' : 'p',
    pm: order.paymentMethod,
    it: order.items.map(item => [item.name, item.price, item.quantity]),
    no: order.notes || '',
    in: order.itemNotes,
    df: order.deliveryFee,
    to: order.total,
    ca: new Date(order.createdAt).getTime(),
  };
  try {
    const json = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/**
 * Decode base64 order back to OrderData.
 */
export function decodeOrder(encoded: string): OrderData | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const c = JSON.parse(json);
    return {
      id: c.i,
      customerName: c.n,
      customerPhone: c.p,
      customerAddress: c.a || '',
      orderType: c.t === 'd' ? 'delivery' : 'pickup',
      paymentMethod: c.pm,
      items: (c.it as [string, number, number][]).map(([name, price, qty], idx) => ({
        id: `imported-${idx}`,
        name,
        price,
        quantity: qty,
        image: '/images/pastel-carne.jpg',
        category: 'salgados',
        description: '',
      })),
      notes: c.no || '',
      itemNotes: c.in || {},
      subtotal: c.to - (c.df || 0),
      deliveryFee: c.df || 0,
      total: c.to,
      status: 'received',
      createdAt: new Date(c.ca),
      estimatedTime: c.t === 'd' ? 25 : 15,
    };
  } catch {
    return null;
  }
}

/**
 * Try to import order from URL params (?pedido=...).
 */
export function importOrderFromURL(): OrderData | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('pedido');
    if (!encoded) return null;

    const order = decodeOrder(encoded);
    if (!order) return null;

    // Don't duplicate
    if (getOrderById(order.id)) {
      cleanURL();
      return order;
    }

    addOrder(order);
    cleanURL();
    return order;
  } catch {
    return null;
  }
}

function cleanURL() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('pedido');
    window.history.replaceState({}, '', url.pathname);
  } catch {}
}

/**
 * Generate import link for this order.
 */
export function getOrderImportLink(order: OrderData): string {
  const encoded = encodeOrder(order);
  const base = window.location.origin + window.location.pathname;
  return `${base}?pedido=${encoded}`;
}
