import { X, Bell, ShoppingBag, MapPin } from 'lucide-react';
import { OrderData } from '../types';

interface OrderToastProps {
  order: OrderData | null;
  visible: boolean;
  onDismiss: () => void;
  onView: (order: OrderData) => void;
}

export default function OrderToast({ order, visible, onDismiss, onView }: OrderToastProps) {
  if (!order || !visible) return null;

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed top-4 right-4 z-[300] max-w-sm w-full animate-slide-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-primary/20 overflow-hidden ring-2 ring-primary/30 ring-offset-2">
        {/* Header pulse bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient" />

        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center animate-bounce-in">
                <Bell size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-dark text-sm">Novo Pedido! 🔔</p>
                <p className="text-gray-400 text-[11px] font-mono">#{order.id}</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Order info */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-dark">
                👤 {order.customerName}
              </span>
              <span className="font-bold text-primary text-sm">
                R$ {order.total.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ShoppingBag size={11} />
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
              <span className="flex items-center gap-1">
                {order.orderType === 'delivery' ? '🛵' : '🏪'}
                {order.orderType === 'delivery' ? 'Delivery' : 'Retirada'}
              </span>
              <span className="flex items-center gap-1">
                {order.paymentMethod === 'pix' ? '📱' : order.paymentMethod === 'dinheiro' ? '💵' : '💳'}
                {order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'dinheiro' ? 'Dinheiro' : 'Cartão'}
              </span>
            </div>
            {order.orderType === 'delivery' && order.customerAddress && (
              <p className="flex items-start gap-1 text-xs text-gray-400">
                <MapPin size={11} className="mt-0.5 shrink-0" />
                <span className="truncate">{order.customerAddress}</span>
              </p>
            )}
          </div>

          {/* Items preview */}
          <div className="flex gap-1.5 mb-3 overflow-hidden">
            {order.items.slice(0, 4).map((item, i) => (
              <img
                key={i}
                src={item.image || '/images/pastel-carne.jpg'}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
              />
            ))}
            {order.items.length > 4 && (
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                +{order.items.length - 4}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onView(order)}
              className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              Ver Pedido
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
