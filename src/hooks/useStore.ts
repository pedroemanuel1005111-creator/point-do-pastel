import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribe, CH } from '../services/eventBus';
import { getConfig, StoreConfig, getProducts, getCategories, getMedia, MediaItem } from '../services/storeConfig';
import { getAllOrders, getOrderById, getTodayStats } from '../services/orderStore';
import { OrderData, MenuItem, Category } from '../types';

// ============ CORE REACTIVE HOOK ============
// Reads data on mount, subscribes to channel, re-reads on every emit.
// Uses ref for getter so the subscription callback never goes stale.
// Also re-reads when `refreshKey` changes (for manual refresh triggers).

function useReactiveData<T>(channel: string, getter: () => T, refreshKey?: unknown): T {
  const getterRef = useRef(getter);
  getterRef.current = getter;
  const [data, setData] = useState<T>(() => getter());

  useEffect(() => {
    // Always re-read on mount or when refreshKey changes
    setData(getterRef.current());
    const unsub = subscribe(channel, () => {
      setData(getterRef.current());
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, refreshKey]);

  return data;
}

// ============ EXPORTED HOOKS ============
// Each hook uses a stable channel constant + a stable imported getter function.
// The data auto-updates whenever emit(CH.xxx) is called anywhere.

export function useConfig(): StoreConfig {
  return useReactiveData(CH.CONFIG, getConfig);
}

export function useProducts(): MenuItem[] {
  return useReactiveData(CH.PRODUCTS, getProducts);
}

export function useCategories(): Category[] {
  return useReactiveData(CH.CATEGORIES, getCategories);
}

export function useOrders(): OrderData[] {
  return useReactiveData(CH.ORDERS, getAllOrders);
}

export function useTodayStats() {
  return useReactiveData(CH.ORDERS, getTodayStats);
}

export function useMedia(): MediaItem[] {
  return useReactiveData(CH.MEDIA, getMedia);
}

export function useOrder(id: string | null): OrderData | undefined {
  const getter = useCallback(
    () => (id ? getOrderById(id) : undefined),
    [id]
  );
  return useReactiveData(CH.ORDERS, getter, id);
}

// ============ NOTIFICATION SYSTEM ============

interface NewOrderNotification {
  order: OrderData | null;
  visible: boolean;
  dismiss: () => void;
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [660, 880, 1100];
    const playRound = () => {
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        }, i * 250);
      });
    };
    playRound();
    setTimeout(playRound, 1000);
  } catch {}
}

function vibrateDevice() {
  try { navigator?.vibrate?.([200, 100, 200, 100, 300]); } catch {}
}

function flashTabTitle(message: string): () => void {
  const original = document.title;
  let on = true;
  const interval = setInterval(() => {
    document.title = on ? message : original;
    on = !on;
  }, 800);
  return () => { clearInterval(interval); document.title = original; };
}

function sendBrowserNotification(order: OrderData) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
    new Notification(`🥟 Novo Pedido #${order.id}`, {
      body: `${order.customerName} · ${itemCount} itens · R$ ${order.total.toFixed(2).replace('.', ',')}`,
      icon: '/images/pastel-carne.jpg',
      tag: `order-${order.id}`,
      requireInteraction: true,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

export function useNewOrderAlert(enabled: boolean): NewOrderNotification {
  const [toast, setToast] = useState<{ order: OrderData; visible: boolean } | null>(null);
  const stopFlashRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unsub = subscribe(CH.NEW_ORDER, () => {
      const orders = getAllOrders();
      const latestOrder = orders[0];
      if (!latestOrder) return;

      playAlarmSound();
      vibrateDevice();

      stopFlashRef.current?.();
      stopFlashRef.current = flashTabTitle('🔔 NOVO PEDIDO!');
      setTimeout(() => { stopFlashRef.current?.(); stopFlashRef.current = null; }, 30000);

      sendBrowserNotification(latestOrder);

      setToast({ order: latestOrder, visible: true });
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 15000);
    });

    return unsub;
  }, [enabled]);

  useEffect(() => {
    return () => { stopFlashRef.current?.(); };
  }, []);

  const dismiss = useCallback(() => {
    setToast(prev => prev ? { ...prev, visible: false } : null);
    stopFlashRef.current?.();
    stopFlashRef.current = null;
  }, []);

  return {
    order: toast?.order ?? null,
    visible: toast?.visible ?? false,
    dismiss,
  };
}
