import { useState, useEffect } from 'react';
import {
  X, Package, MapPin, CreditCard, CheckCircle, XCircle, Truck, Clock,
  ChevronRight, RefreshCw
} from 'lucide-react';
import { OrderData } from '../types';
import { getAllOrders } from '../services/orderStore';
import { subscribe, CH } from '../services/eventBus';
import { useConfig } from '../hooks/useStore';
import { getCustomerPhone } from '../services/customer';

interface MyOrdersProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_INFO: Record<string, { label: string; emoji: string; color: string; bg: string; icon: React.ReactNode }> = {
  received: { label: 'Aguardando Confirmação', emoji: '📥', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Package size={14} /> },
  preparing: { label: 'Preparando', emoji: '👨‍🍳', color: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock size={14} /> },
  ready: { label: 'Pronto!', emoji: '✨', color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle size={14} /> },
  delivering: { label: 'Saiu para Entrega', emoji: '🛵', color: 'text-purple-600', bg: 'bg-purple-50', icon: <Truck size={14} /> },
  delivered: { label: 'Entregue', emoji: '🎉', color: 'text-gray-500', bg: 'bg-gray-50', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelado', emoji: '❌', color: 'text-danger', bg: 'bg-red-50', icon: <XCircle size={14} /> },
};

const ACTIVE_STATUSES = ['received', 'preparing', 'ready', 'delivering'];

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d >= today;
  if (isToday) return `Hoje, ${formatTime(d)}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ', ' + formatTime(d);
}

export default function MyOrders({ isOpen, onClose }: MyOrdersProps) {
  const config = useConfig();
  const savedPhone = getCustomerPhone();
  const [phone, setPhone] = useState(savedPhone || '');
  const [customerOrders, setCustomerOrders] = useState<OrderData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  // Listen to order changes — refresh search results live
  useEffect(() => {
    if (!isOpen || !hasSearched || !phone) return;
    const refresh = () => {
      const cleanPhone = phone.replace(/\D/g, '');
      const all = getAllOrders();
      const mine = all
        .filter(o => o.customerPhone.replace(/\D/g, '').endsWith(cleanPhone.slice(-8)))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCustomerOrders(mine);
      // Keep selectedOrder in sync
      if (selectedOrder) {
        const updated = mine.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    };
    refresh();
    return subscribe(CH.ORDERS, refresh);
  }, [isOpen, hasSearched, phone, selectedOrder]);

  const handleSearch = () => {
    if (phone.replace(/\D/g, '').length < 8) return;
    setHasSearched(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-8);
    const all = getAllOrders();
    const mine = all
      .filter(o => o.customerPhone.replace(/\D/g, '').endsWith(cleanPhone))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCustomerOrders(mine);
  };

  // Auto-search on open if phone is saved; reset on close
  useEffect(() => {
    if (isOpen && savedPhone && !hasSearched) {
      setPhone(savedPhone);
      setHasSearched(true);
    }
    if (!isOpen) {
      setTimeout(() => setSelectedOrder(null), 300);
    }
  }, [isOpen, savedPhone, hasSearched]);

  if (!isOpen) return null;

  const activeOrders = customerOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = customerOrders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  const renderOrderDetails = (order: OrderData) => {
    const status = STATUS_INFO[order.status];
    const isActive = ACTIVE_STATUSES.includes(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
      <div className="p-5 space-y-4">
        {/* Status badge */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${status.bg}`}>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
            {status.emoji}
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${status.color}`}>{status.label}</p>
            <p className="text-gray-500 text-xs">Pedido #{order.id}</p>
          </div>
          {isActive && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span></span>}
        </div>

        {/* Status timeline (only for active orders) */}
        {isActive && (
          <div className="space-y-2 bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acompanhamento</p>
            {[
              { key: 'received', label: 'Recebido', emoji: '✅' },
              { key: 'preparing', label: 'Preparando', emoji: '👨‍🍳' },
              { key: 'ready', label: 'Pronto', emoji: '✨' },
              { key: order.orderType === 'pickup' ? 'ready' : 'delivering', label: order.orderType === 'pickup' ? 'Pronto p/ retirada' : 'Saiu p/ entrega', emoji: order.orderType === 'pickup' ? '🏪' : '🛵' },
              { key: 'delivered', label: 'Entregue', emoji: '🎉' },
            ].map((step, idx, arr) => {
              const orderKeys = ['received', 'preparing', 'ready', order.orderType === 'pickup' ? 'ready' : 'delivering', 'delivered'];
              const currentIdx = orderKeys.indexOf(order.status);
              const stepIdx = orderKeys.indexOf(step.key);
              const done = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;
              const isLast = idx === arr.length - 1;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                      isCurrent ? 'bg-primary text-white shadow-lg glow-primary scale-110'
                      : done ? 'bg-success text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? (isCurrent ? <span className="animate-pulse">●</span> : '✓') : '○'}
                    </div>
                    {!isLast && <div className={`w-0.5 h-4 ${done && stepIdx < currentIdx ? 'bg-success' : 'bg-gray-200'}`} />}
                  </div>
                  <p className={`text-sm flex-1 ${isCurrent ? 'text-primary font-semibold' : done ? 'text-dark' : 'text-gray-400'}`}>
                    {step.emoji} {step.label}
                    {isCurrent && <span className="ml-2 inline-block animate-pulse text-primary">●</span>}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Order info */}
        <div className="space-y-2">
          {order.orderType === 'delivery' && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>{order.customerAddress}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CreditCard size={14} className="text-primary" />
            <span>
              {order.orderType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'} · {order.paymentMethod === 'pix' ? '📱 PIX' : order.paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={14} className="text-primary" />
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Itens do Pedido</p>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.image || '/images/pastel-carne.jpg'} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-dark'}`}>{item.quantity}x {item.name}</p>
                  {order.itemNotes[item.id] && <p className="text-[10px] text-amber-600">📝 {order.itemNotes[item.id]}</p>}
                </div>
                <span className={`text-sm font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-dark'}`}>
                  R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold">
            <span className="text-dark">Total</span>
            <span className={isCancelled ? 'text-gray-400 line-through' : 'text-primary'}>R$ {order.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Contact */}
        <a href={`tel:+${config.whatsapp}`} className="block text-center text-primary text-xs font-medium hover:text-primary-dark transition-colors">
          📞 {config.phone}
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-slide-in flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-primary via-primary-dark to-primary text-white relative overflow-hidden">
          <div className="absolute inset-0 shimmer-bg" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedOrder ? (
                <button onClick={() => setSelectedOrder(null)} className="hover:bg-white/20 p-1.5 rounded-xl transition-all">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
              ) : (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
              )}
              <div>
                <h2 className="font-bold text-lg">{selectedOrder ? `Pedido #${selectedOrder.id}` : 'Meus Pedidos'}</h2>
                <p className="text-white/70 text-xs">
                  {selectedOrder ? 'Detalhes do pedido' : 'Acompanhe seus pedidos'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedOrder ? (
            renderOrderDetails(selectedOrder)
          ) : !hasSearched ? (
            /* === SEARCH SCREEN === */
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                  <Package size={36} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">Rastreie seu Pedido</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Digite seu telefone/WhatsApp para ver todos os seus pedidos
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Telefone / WhatsApp</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="(82) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={phone.replace(/\D/g, '').length < 8}
                  className="w-full bg-gradient-to-r from-primary to-primary-dark disabled:from-gray-300 disabled:to-gray-300 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                  <Package size={18} />
                  Ver Meus Pedidos
                </button>
              </div>

              <div className="mt-6 bg-warm rounded-2xl p-4 border border-warm-dark">
                <p className="text-xs text-gray-600 text-center">
                  💡 Dica: use o mesmo telefone que você usou ao fazer o pedido
                </p>
              </div>
            </div>
          ) : customerOrders.length === 0 ? (
            /* === EMPTY STATE === */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package size={36} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">Nenhum pedido encontrado</h3>
              <p className="text-gray-400 text-sm mb-1">Não encontramos pedidos para o telefone</p>
              <p className="font-mono font-bold text-dark">{phone}</p>
              <button
                onClick={() => { setHasSearched(false); setPhone(''); }}
                className="mt-5 text-primary text-sm font-medium hover:underline"
              >
                Tentar outro telefone
              </button>
            </div>
          ) : (
            /* === ORDERS LIST === */
            <div className="p-4 space-y-4">
              {/* Active orders */}
              {activeOrders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-dark text-sm flex items-center gap-2">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
                      Pedidos Ativos ({activeOrders.length})
                    </h3>
                    <button onClick={handleSearch} className="text-primary text-xs flex items-center gap-1 hover:underline">
                      <RefreshCw size={11} /> Atualizar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeOrders.map(order => {
                      const status = STATUS_INFO[order.status];
                      return (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`w-full text-left rounded-2xl overflow-hidden border-2 ${status.bg} border-current/20 hover:scale-[1.01] hover:shadow-lg transition-all animate-fade-in-up`}
                        >
                          {/* Status strip with pulsing dot */}
                          <div className="h-1.5 bg-gradient-to-r from-primary to-secondary animate-gradient bg-[length:200%_100%]" />
                          <div className="p-4 bg-white">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono font-bold text-dark text-sm">#{order.id}</p>
                                <p className={`text-xs font-semibold ${status.color} flex items-center gap-1 mt-0.5`}>
                                  {status.emoji} {status.label}
                                  {order.status === 'preparing' && (
                                    <span className="ml-1 inline-block animate-pulse text-primary">●</span>
                                  )}
                                </p>
                              </div>
                              <ChevronRight size={18} className="text-gray-400" />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{order.items.reduce((s, i) => s + i.quantity, 0)} {order.items.length === 1 ? 'item' : 'itens'}</span>
                              <span className="font-bold text-primary text-base">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                              <span>{order.orderType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}</span>
                              <span>·</span>
                              <span>{formatTime(order.createdAt)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Past orders */}
              {pastOrders.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-3">Histórico ({pastOrders.length})</h3>
                  <div className="space-y-2">
                    {pastOrders.map(order => {
                      const status = STATUS_INFO[order.status];
                      return (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full text-left bg-white rounded-xl p-3 border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-xl ${status.bg} flex items-center justify-center text-lg shrink-0`}>
                                {status.emoji}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-mono font-bold text-dark text-sm">#{order.id}</p>
                                <p className={`text-[10px] font-medium ${status.color}`}>{status.label} · {formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className={`font-bold text-sm ${order.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-dark'}`}>
                                R$ {order.total.toFixed(2).replace('.', ',')}
                              </p>
                              <ChevronRight size={14} className="text-gray-300 inline-block" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setHasSearched(false); setPhone(''); setCustomerOrders([]); }}
                className="w-full text-gray-400 text-xs hover:text-primary transition-colors py-2"
              >
                Buscar outro telefone
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
