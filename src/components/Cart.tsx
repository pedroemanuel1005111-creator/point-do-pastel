import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Minus, Trash2, ShoppingBag, ArrowLeft, ArrowRight,
  CheckCircle, Package, XCircle, AlertTriangle,
  CreditCard, MapPin, User, Phone, FileText,
  Clock, Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { OrderStep, OrderData } from '../types';
import { addOrder, generateOrderId, formatWhatsAppMessage, updateOrderStatus } from '../services/orderStore';
import { useConfig, useOrder } from '../hooks/useStore';
import { saveCustomerPhone, saveActiveOrderId, getActiveOrderId, clearActiveOrderId } from '../services/customer';
import { publishOrder } from '../services/cloudSync';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: { key: OrderStep; label: string }[] = [
  { key: 'cart', label: 'Carrinho' },
  { key: 'details', label: 'Dados' },
  { key: 'review', label: 'Revisão' },
  { key: 'tracking', label: 'Pedido' },
];

const STATUS_FLOW: { key: OrderData['status']; label: string; emoji: string; time: string }[] = [
  { key: 'received', label: 'Pedido Recebido', emoji: '✅', time: 'Agora mesmo' },
  { key: 'preparing', label: 'Preparando', emoji: '👨‍🍳', time: '5-10 min' },
  { key: 'ready', label: 'Pronto!', emoji: '✨', time: '10-15 min' },
  { key: 'delivering', label: 'Saiu para Entrega', emoji: '🛵', time: '15-25 min' },
  { key: 'delivered', label: 'Entregue!', emoji: '🎉', time: '' },
];

const CANCELLABLE_STATUSES: OrderData['status'][] = ['received', 'preparing'];

export default function Cart({ isOpen, onClose }: CartProps) {
  const { items, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart();

  // Restore active order on mount
  const savedOrderId = getActiveOrderId();
  const [step, setStep] = useState<OrderStep>(savedOrderId ? 'tracking' : 'cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(savedOrderId);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const config = useConfig();
  const trackedOrder = useOrder(step === 'tracking' ? currentOrderId : null);
  const deliveryFee = orderType === 'delivery' ? config.deliveryFee : 0;
  const finalTotal = totalPrice + deliveryFee;
  const stepIndex = STEPS.findIndex(s => s.key === step);

  // Confetti when delivered + auto-clear active order for terminal states
  useEffect(() => {
    if (!trackedOrder) return;
    if (trackedOrder.status === 'delivered' && confetti.length === 0) {
      setConfetti(Array.from({ length: 30 }, (_, j) => ({
        id: j,
        x: Math.random() * 100,
        color: ['#E85D04', '#FFBA08', '#16A34A', '#DC2626', '#3B82F6'][j % 5],
        delay: Math.random() * 0.5,
      })));
    }
    // Clear persisted active order when in a terminal state (after 5s so user sees the final state)
    if (trackedOrder.status === 'delivered' || trackedOrder.status === 'cancelled') {
      const timer = setTimeout(() => clearActiveOrderId(), 5000);
      return () => clearTimeout(timer);
    }
  }, [trackedOrder?.status, confetti.length]);

  const handleConfirmOrder = () => {
    const order: OrderData = {
      id: generateOrderId(),
      customerName,
      customerPhone,
      customerAddress,
      orderType,
      paymentMethod,
      items: [...items],
      notes: orderNotes,
      itemNotes: { ...itemNotes },
      subtotal: totalPrice,
      deliveryFee,
      total: finalTotal,
      status: 'received',
      createdAt: new Date(),
      estimatedTime: orderType === 'delivery' ? 25 : 15,
    };

    addOrder(order);
    saveCustomerPhone(customerPhone);
    saveActiveOrderId(order.id);
    setCurrentOrderId(order.id);
    setConfetti([]);
    setStep('tracking');
    clearCart();

    // 1. Publish to cloud (ntfy.sh) — admin receives instantly on any device
    publishOrder(order);

    // 2. Also send WhatsApp as backup notification
    const msg = formatWhatsAppMessage(order);
    const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`;
    setTimeout(() => window.open(url, '_blank'), 500);
  };

  const handleNewOrder = useCallback(() => {
    clearActiveOrderId();
    setStep('cart');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderNotes('');
    setItemNotes({});
    setCurrentOrderId(null);
    setConfetti([]);
    setShowCancelConfirm(false);
    onClose();
  }, [onClose]);

  const handleCancelOrder = () => {
    if (!currentOrderId) return;
    updateOrderStatus(currentOrderId, 'cancelled');
    setShowCancelConfirm(false);
  };

  const canCancel = trackedOrder && CANCELLABLE_STATUSES.includes(trackedOrder.status);
  const isCancelled = trackedOrder?.status === 'cancelled';

  const formatPhone = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const canProceedDetails = items.length > 0;
  const canProceedReview =
    customerName.trim().length >= 2 &&
    customerPhone.replace(/\D/g, '').length >= 10 &&
    (orderType === 'pickup' || customerAddress.trim().length >= 5);

  // Get current status index for tracking UI
  const trackingStatusIndex = trackedOrder
    ? STATUS_FLOW.findIndex(s => s.key === trackedOrder.status)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl animate-slide-in flex flex-col">
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-primary via-primary-dark to-primary text-white overflow-hidden">
          <div className="absolute inset-0 shimmer-bg" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {stepIndex > 0 && step !== 'tracking' && (
                <button onClick={() => setStep(STEPS[stepIndex - 1].key)} className="hover:bg-white/20 p-1.5 rounded-xl transition-all">
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h2 className="font-bold text-lg sm:text-xl">{STEPS[stepIndex].label}</h2>
                {step === 'cart' && totalItems > 0 && (
                  <p className="text-white/70 text-xs mt-0.5">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
                )}
                {step === 'tracking' && trackedOrder && (
                  <p className="text-white/70 text-xs mt-0.5">Pedido #{trackedOrder.id}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-all">
              <X size={18} />
            </button>
          </div>
          {step !== 'tracking' && (
            <div className="flex items-center gap-1 mt-4">
              {STEPS.slice(0, 3).map((_, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${i <= stepIndex ? 'bg-white' : 'bg-white/20'}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* === CART === */}
          {step === 'cart' && (
            items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-24 h-24 bg-warm rounded-full flex items-center justify-center mb-5 animate-float">
                  <span className="text-5xl">🛒</span>
                </div>
                <h3 className="text-xl font-bold text-dark mb-2">Carrinho Vazio</h3>
                <p className="text-gray-400 text-sm mb-8 max-w-xs">
                  Explore nosso cardápio e adicione pastéis deliciosos!
                </p>
                <button onClick={onClose}
                  className="btn-magnetic bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  Ver Cardápio 📋
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-5 space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id}
                    className="bg-gray-50 rounded-2xl p-3 sm:p-4 transition-all hover:bg-warm/50 animate-fade-in-up border border-gray-100"
                    style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex gap-3">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 shadow-md">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark text-sm sm:text-base truncate">{item.name}</h4>
                        <p className="text-primary font-bold text-sm mt-0.5">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          {item.quantity > 1 && <span className="text-gray-400 font-normal text-xs ml-1">(R$ {item.price.toFixed(2).replace('.', ',')} un.)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-all">
                            <Minus size={14} />
                          </button>
                          <span className="font-bold text-dark text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all">
                            <Plus size={14} />
                          </button>
                          <button onClick={() => removeItem(item.id)}
                            className="ml-auto w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-danger/70 hover:bg-danger hover:text-white hover:border-danger transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <input type="text"
                      placeholder="📝 Observação (ex: sem cebola)"
                      value={itemNotes[item.id] || ''}
                      onChange={(e) => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full mt-3 px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* === DETAILS === */}
          {step === 'details' && (
            <div className="p-5 sm:p-6 space-y-5 animate-fade-in-up">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-3">
                  <Package size={15} className="text-primary" /> Tipo do Pedido
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { type: 'delivery' as const, icon: '🛵', label: 'Delivery', sub: '+ R$ 5,00 · ~25min' },
                    { type: 'pickup' as const, icon: '🏪', label: 'Retirada', sub: 'Grátis · ~15min' },
                  ]).map(opt => (
                    <button key={opt.type} onClick={() => setOrderType(opt.type)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 ${
                        orderType === opt.type ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-3xl block mb-2">{opt.icon}</span>
                      <span className={`text-sm font-semibold block ${orderType === opt.type ? 'text-primary' : 'text-gray-700'}`}>{opt.label}</span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-2">
                  <User size={15} className="text-primary" /> Seu Nome *
                </label>
                <input type="text" placeholder="Como devemos chamar você?"
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm transition-all" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-2">
                  <Phone size={15} className="text-primary" /> Telefone / WhatsApp *
                </label>
                <input type="tel" placeholder="(82) 99999-9999"
                  value={customerPhone} onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm transition-all" />
              </div>

              {orderType === 'delivery' && (
                <div className="animate-fade-in-up">
                  <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-2">
                    <MapPin size={15} className="text-primary" /> Endereço de Entrega *
                  </label>
                  <textarea placeholder="Rua, número, bairro, referência..."
                    value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={3}
                    className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm transition-all resize-none" />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-3">
                  <CreditCard size={15} className="text-primary" /> Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pix', label: 'PIX', emoji: '📱' },
                    { id: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
                    { id: 'cartao', label: 'Cartão', emoji: '💳' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all ${
                        paymentMethod === m.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className="text-2xl block mb-1">{m.emoji}</span>
                      <span className={`text-xs font-semibold ${paymentMethod === m.id ? 'text-primary' : 'text-gray-500'}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-dark mb-2">
                  <FileText size={15} className="text-primary" /> Observações
                </label>
                <textarea placeholder="Troco pra quanto? Alguma observação?"
                  value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2}
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm transition-all resize-none" />
              </div>
            </div>
          )}

          {/* === REVIEW === */}
          {step === 'review' && (
            <div className="p-5 sm:p-6 space-y-4 animate-fade-in-up">
              <div className="glass-card rounded-2xl p-4 border border-gray-100">
                <h4 className="font-bold text-dark text-sm mb-3 flex items-center gap-2">
                  <User size={14} className="text-primary" /> Cliente
                </h4>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-600"><span className="font-medium text-dark">Nome:</span> {customerName}</p>
                  <p className="text-gray-600"><span className="font-medium text-dark">Telefone:</span> {customerPhone}</p>
                  <p className="text-gray-600"><span className="font-medium text-dark">Tipo:</span> {orderType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}</p>
                  {orderType === 'delivery' && <p className="text-gray-600"><span className="font-medium text-dark">Endereço:</span> {customerAddress}</p>}
                  <p className="text-gray-600"><span className="font-medium text-dark">Pagamento:</span> {paymentMethod === 'pix' ? '📱 PIX' : paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão'}</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-gray-100">
                <h4 className="font-bold text-dark text-sm mb-3 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-primary" /> Itens
                </h4>
                <div className="space-y-2.5">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{item.quantity}x {item.name}</p>
                        {itemNotes[item.id] && <p className="text-[11px] text-gray-400 truncate">📝 {itemNotes[item.id]}</p>}
                      </div>
                      <span className="text-sm font-bold text-dark shrink-0">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {orderNotes && (
                <div className="glass-card rounded-2xl p-4 border border-gray-100">
                  <h4 className="font-bold text-dark text-sm mb-1 flex items-center gap-2"><FileText size={14} className="text-primary" /> Observações</h4>
                  <p className="text-gray-500 text-sm">{orderNotes}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 border border-primary/10">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>R$ {totalPrice.toFixed(2).replace('.', ',')}</span></div>
                {orderType === 'delivery' && <div className="flex justify-between text-sm text-gray-600 mt-1"><span>Entrega</span><span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span></div>}
                <div className="border-t border-primary/10 pt-2 mt-2 flex justify-between font-bold text-lg text-dark">
                  <span>Total</span><span className="text-primary">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 glass-card rounded-2xl p-4 border border-gray-100">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center"><Clock size={18} className="text-secondary" /></div>
                <div>
                  <p className="text-sm font-semibold text-dark">Tempo Estimado</p>
                  <p className="text-xs text-gray-400">{orderType === 'delivery' ? '~25 min (preparo + entrega)' : '~15 min (preparo)'}</p>
                </div>
              </div>
            </div>
          )}

          {/* === TRACKING === */}
          {step === 'tracking' && trackedOrder && (
            <div className="p-5 sm:p-6 animate-fade-in-up">
              {confetti.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                  {confetti.map(p => (
                    <div key={p.id} className="absolute w-3 h-3 rounded-sm"
                      style={{ left: `${p.x}%`, bottom: '-10px', backgroundColor: p.color, animation: `confetti 2s ease-out ${p.delay}s forwards` }} />
                  ))}
                </div>
              )}

              {/* === CANCELLED STATE === */}
              {isCancelled ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-danger/10 rounded-full mb-4 animate-bounce-in">
                    <XCircle size={44} className="text-danger" />
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-1">Pedido Cancelado</h3>
                  <p className="text-gray-400 text-sm">Pedido <span className="font-mono font-bold">#{trackedOrder.id}</span> foi cancelado.</p>
                  <p className="text-gray-400 text-xs mt-2 max-w-xs mx-auto">
                    Caso tenha sido um engano, entre em contato com o restaurante.
                  </p>
                  <a href={`tel:+${config.whatsapp}`} className="inline-flex items-center gap-2 text-primary font-semibold text-sm mt-4">
                    <Phone size={14} /> {config.phone}
                  </a>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-3 animate-bounce-in">
                      <CheckCircle size={36} className="text-success" />
                    </div>
                    <h3 className="text-xl font-bold text-dark">Pedido Confirmado! 🎉</h3>
                    <p className="text-gray-400 text-sm mt-1">Nº <span className="font-mono font-bold text-primary">{trackedOrder.id}</span></p>
                    <p className="text-gray-400 text-xs mt-1">Acompanhe o status abaixo:</p>
                  </div>

                  {/* Status steps */}
                  <div className="space-y-0 mb-6">
                    {STATUS_FLOW.filter((_, i) => !(orderType === 'pickup' && i === 3)).map((status, i) => {
                      const isActive = i <= trackingStatusIndex;
                      const isCurrent = i === trackingStatusIndex;
                      const isLast = orderType === 'pickup' ? i === 3 : i === 4;
                      return (
                        <div key={status.key} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                              isCurrent ? 'bg-primary text-white shadow-lg glow-primary scale-110'
                              : isActive ? 'bg-success text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <span className="text-lg">{isActive ? status.emoji : '○'}</span>
                            </div>
                            {!isLast && <div className={`w-0.5 h-10 transition-all duration-500 ${isActive && i < trackingStatusIndex ? 'bg-success' : 'bg-gray-200'}`} />}
                          </div>
                          <div className={`pt-2 pb-4 transition-all ${isCurrent ? 'opacity-100' : isActive ? 'opacity-70' : 'opacity-40'}`}>
                            <p className={`font-semibold text-sm ${isCurrent ? 'text-primary' : isActive ? 'text-dark' : 'text-gray-400'}`}>
                              {status.label}
                              {isCurrent && <span className="inline-flex ml-2 animate-pulse text-primary">●</span>}
                            </p>
                            {status.time && <p className="text-xs text-gray-400 mt-0.5">{status.time}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cancel confirmation dialog */}
                  {showCancelConfirm && (
                    <div className="mb-4 bg-danger/5 border border-danger/20 rounded-2xl p-4 animate-fade-in-up">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-dark text-sm">Cancelar pedido?</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Essa ação não pode ser desfeita. O restaurante será notificado do cancelamento.
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={handleCancelOrder}
                              className="bg-danger text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all"
                            >
                              Sim, cancelar pedido
                            </button>
                            <button
                              onClick={() => setShowCancelConfirm(false)}
                              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                            >
                              Não, manter
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Order summary — always visible */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumo</span>
                  <span className="text-xs text-gray-400">{trackedOrder.items.reduce((s, i) => s + i.quantity, 0)} itens</span>
                </div>
                {trackedOrder.items.map(item => (
                  <div key={item.id} className="flex justify-between py-1 text-sm">
                    <span className={`${isCancelled ? 'text-gray-400 line-through' : 'text-gray-600'}`}>{item.quantity}x {item.name}</span>
                    <span className={`font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-dark'}`}>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-dark">Total</span>
                  <span className={isCancelled ? 'text-gray-400 line-through' : 'text-primary'}>R$ {trackedOrder.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Contact */}
              <div className="mt-4 glass-card rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-gray-500 text-xs mb-2">Dúvidas sobre seu pedido?</p>
                <a href={`tel:+${config.whatsapp}`} className="inline-flex items-center gap-2 text-primary font-semibold text-sm">
                  <Phone size={14} /> {config.phone}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'cart' && items.length > 0 && (
          <div className="border-t border-gray-100 p-4 sm:p-5 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Subtotal</span>
              <span className="font-bold text-xl text-dark">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <button onClick={() => setStep('details')} disabled={!canProceedDetails}
              className="w-full btn-magnetic bg-gradient-to-r from-primary to-primary-dark disabled:from-gray-300 disabled:to-gray-300 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/25">
              Continuar <ArrowRight size={18} />
            </button>
            <button onClick={clearCart} className="w-full text-gray-400 text-xs hover:text-danger transition-colors py-1">Limpar carrinho</button>
          </div>
        )}

        {step === 'details' && (
          <div className="border-t border-gray-100 p-4 sm:p-5 bg-white">
            <button onClick={() => setStep('review')} disabled={!canProceedReview}
              className="w-full btn-magnetic bg-gradient-to-r from-primary to-primary-dark disabled:from-gray-300 disabled:to-gray-300 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/25">
              Revisar Pedido <ArrowRight size={18} />
            </button>
            {!canProceedReview && <p className="text-center text-gray-400 text-xs mt-2">Preencha os campos obrigatórios *</p>}
          </div>
        )}

        {step === 'review' && (
          <div className="border-t border-gray-100 p-4 sm:p-5 bg-white">
            <button onClick={handleConfirmOrder}
              className="w-full btn-magnetic bg-gradient-to-r from-success to-green-600 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-success/25 hover:scale-[1.01]">
              <CheckCircle size={20} /> Confirmar Pedido — R$ {finalTotal.toFixed(2).replace('.', ',')}
            </button>
            <p className="text-center text-gray-400 text-xs mt-2">✅ Seu pedido será enviado ao restaurante via WhatsApp</p>
          </div>
        )}

        {step === 'tracking' && (
          <div className="border-t border-gray-100 p-4 sm:p-5 bg-white space-y-2">
            <button onClick={handleNewOrder}
              className="w-full btn-magnetic bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/25">
              <Sparkles size={18} /> Fazer Novo Pedido
            </button>
            {canCancel && !showCancelConfirm && (
              <button onClick={() => setShowCancelConfirm(true)}
                className="w-full text-danger/60 hover:text-danger text-xs font-medium py-2 transition-colors flex items-center justify-center gap-1.5">
                <XCircle size={13} /> Cancelar Pedido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
