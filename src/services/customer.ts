// Persist customer data for tracking across sessions

const PHONE_KEY = 'pointdopastel_customer_phone';
const ACTIVE_ORDER_KEY = 'pointdopastel_active_order';

export function saveCustomerPhone(phone: string) {
  try { localStorage.setItem(PHONE_KEY, phone); } catch {}
}

export function getCustomerPhone(): string {
  try { return localStorage.getItem(PHONE_KEY) || ''; } catch { return ''; }
}

/** Save the active order ID so client can resume tracking after page reload */
export function saveActiveOrderId(orderId: string) {
  try { localStorage.setItem(ACTIVE_ORDER_KEY, orderId); } catch {}
}

export function getActiveOrderId(): string | null {
  try { return localStorage.getItem(ACTIVE_ORDER_KEY); } catch { return null; }
}

export function clearActiveOrderId() {
  try { localStorage.removeItem(ACTIVE_ORDER_KEY); } catch {}
}
