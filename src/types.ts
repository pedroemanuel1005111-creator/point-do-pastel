export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  popular?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  observations?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Review {
  name: string;
  rating: number;
  date: string;
  text: string;
  badge?: string;
}

export type OrderStep = 'cart' | 'details' | 'review' | 'tracking';

export interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderType: 'delivery' | 'pickup';
  paymentMethod: string;
  items: CartItem[];
  notes: string;
  itemNotes: Record<string, string>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'received' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  createdAt: Date;
  estimatedTime: number; // minutes
}
