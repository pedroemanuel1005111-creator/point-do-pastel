import { OrderData } from '../types';
import { emit, CH } from './eventBus';
import { getOrderImportLink } from './orderShare';

const ORDERS_KEY = 'pointdopastel_orders';

// ====== STORAGE ======
function getOrders(): OrderData[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((o: OrderData) => ({
      ...o,
      createdAt: new Date(o.createdAt),
    }));
  } catch {
    return [];
  }
}

function saveOrders(orders: OrderData[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  emit(CH.ORDERS);
}

// ====== PUBLIC API ======
export function addOrder(order: OrderData): OrderData {
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  emit(CH.NEW_ORDER);
  return order;
}

export function getAllOrders(): OrderData[] {
  return getOrders();
}

export function getOrderById(id: string): OrderData | undefined {
  return getOrders().find(o => o.id === id);
}

export function updateOrderStatus(id: string, status: OrderData['status']): OrderData | undefined {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return undefined;
  orders[index].status = status;
  saveOrders(orders);

  // Publish to cloud so client on other device sees the update
  import('./cloudSync').then(({ publishStatusUpdate }) => {
    publishStatusUpdate(id, status);
  });

  return orders[index];
}

export function deleteOrder(id: string): void {
  const orders = getOrders().filter(o => o.id !== id);
  saveOrders(orders);
}

export function clearAllOrders(): void {
  saveOrders([]);
}

export function getOrdersByStatus(status: OrderData['status']): OrderData[] {
  return getOrders().filter(o => o.status === status);
}

export function getTodayOrders(): OrderData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getOrders().filter(o => new Date(o.createdAt) >= today);
}

export function getTodayStats() {
  const todayOrders = getTodayOrders();
  return {
    totalOrders: todayOrders.length,
    totalRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
    pending: todayOrders.filter(o => o.status === 'received').length,
    preparing: todayOrders.filter(o => o.status === 'preparing').length,
    ready: todayOrders.filter(o => o.status === 'ready').length,
    delivering: todayOrders.filter(o => o.status === 'delivering').length,
    delivered: todayOrders.filter(o => o.status === 'delivered').length,
    avgTicket: todayOrders.length > 0 ? todayOrders.reduce((s, o) => s + o.total, 0) / todayOrders.length : 0,
  };
}

export function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'PP-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function formatWhatsAppMessage(order: OrderData): string {
  let msg = `🥟 *NOVO PEDIDO - Point do Pastel*\n`;
  msg += `📌 *Pedido:* #${order.id}\n\n`;
  msg += `👤 *Cliente:* ${order.customerName}\n`;
  msg += `📞 *Tel:* ${order.customerPhone}\n`;
  msg += `📦 *Tipo:* ${order.orderType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}\n`;
  if (order.orderType === 'delivery') {
    msg += `📍 *Endereço:* ${order.customerAddress}\n`;
  }
  msg += `💳 *Pagamento:* ${
    order.paymentMethod === 'pix' ? 'PIX' :
    order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Cartão'
  }\n`;
  msg += `\n━━━━━━━━━━━━━━━\n📋 *ITENS:*\n\n`;
  order.items.forEach(item => {
    msg += `• ${item.quantity}x ${item.name} — R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    if (order.itemNotes[item.id]) {
      msg += `  📝 _${order.itemNotes[item.id]}_\n`;
    }
  });
  if (order.notes) {
    msg += `\n📝 *Obs:* ${order.notes}\n`;
  }
  msg += `\n━━━━━━━━━━━━━━━\n`;
  if (order.orderType === 'delivery') {
    msg += `Subtotal: R$ ${order.subtotal.toFixed(2).replace('.', ',')}\n`;
    msg += `Entrega: R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}\n`;
  }
  msg += `*TOTAL: R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
  msg += `\n━━━━━━━━━━━━━━━\n`;
  msg += `📲 *IMPORTAR NO PAINEL:*\n`;
  msg += `Abra o link abaixo OU copie e cole no painel admin:\n\n`;
  msg += getOrderImportLink(order);
  return msg;
}
