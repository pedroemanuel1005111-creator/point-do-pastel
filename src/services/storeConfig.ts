import { MenuItem, Category } from '../types';
import { menuItems as defaultMenu, categories as defaultCategories } from '../data/menu';
import { emit, CHANNELS } from './eventBus';

// ===== KEYS =====
const CONFIG_KEY = 'pointdopastel_config';
const PRODUCTS_KEY = 'pointdopastel_products';
const CATEGORIES_KEY = 'pointdopastel_categories';
const AUTH_KEY = 'pointdopastel_auth';
const MEDIA_KEY = 'pointdopastel_media';

// ===== TYPES =====
export interface StoreConfig {
  storeName: string;
  slogan: string;
  whatsapp: string;
  instagram: string;
  phone: string;
  address: string;
  addressLink: string;
  deliveryFee: number;
  deliveryTime: number;
  pickupTime: number;
  primaryColor: string;
  heroImage: string;
  logoEmoji: string;
  logoImage: string; // base64 or URL — when set, shown instead of emoji
}

export interface AdminAuth {
  email: string;
  password: string;
  name: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  name: string;
  createdAt: Date;
}

// ===== DEFAULTS =====
const defaultConfig: StoreConfig = {
  storeName: 'Point do Pastel',
  slogan: 'O melhor pastel de Rio Largo',
  whatsapp: '5582993246373',
  instagram: 'pointdopastel',
  phone: '(82) 99324-6373',
  address: 'AL-210, 353 - Conj. Bandeirante, Rio Largo - AL, 57100-000',
  addressLink: 'https://www.google.com/maps/place/Point+do+Pastel/@-9.5110155,-35.8165484,16z',
  deliveryFee: 5.00,
  deliveryTime: 25,
  pickupTime: 15,
  primaryColor: '#E85D04',
  heroImage: '/images/hero-bg.jpg',
  logoEmoji: '🥟',
  logoImage: '',
};

const defaultAuth: AdminAuth = {
  email: 'admin@pointdopastel.com',
  password: 'admin123',
  name: 'Administrador',
};

// ===== CONFIG =====
export function getConfig(): StoreConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(config: Partial<StoreConfig>): StoreConfig {
  const current = getConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  emit(CHANNELS.CONFIG);
  return updated;
}

export function resetConfig(): StoreConfig {
  localStorage.removeItem(CONFIG_KEY);
  emit(CHANNELS.CONFIG);
  return defaultConfig;
}

// ===== PRODUCTS =====
export function getProducts(): MenuItem[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return defaultMenu;
    return JSON.parse(raw);
  } catch {
    return defaultMenu;
  }
}

export function saveProducts(products: MenuItem[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  emit(CHANNELS.PRODUCTS);
}

export function addProduct(product: Omit<MenuItem, 'id'>): MenuItem {
  const products = getProducts();
  const newProduct: MenuItem = {
    ...product,
    id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  products.unshift(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<MenuItem>): MenuItem | null {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...updates };
  saveProducts(products);
  return products[index];
}

export function deleteProduct(id: string): void {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
}

export function resetProducts(): void {
  localStorage.removeItem(PRODUCTS_KEY);
  emit(CHANNELS.PRODUCTS);
}

// ===== CATEGORIES =====
export function getCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return defaultCategories;
    return JSON.parse(raw);
  } catch {
    return defaultCategories;
  }
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  emit(CHANNELS.CATEGORIES);
}

export function addCategory(category: Omit<Category, 'id'>): Category {
  const categories = getCategories();
  const newCat: Category = {
    ...category,
    id: category.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
  };
  categories.push(newCat);
  saveCategories(categories);
  return newCat;
}

export function deleteCategory(id: string): void {
  if (id === 'todos') return;
  const categories = getCategories().filter(c => c.id !== id);
  saveCategories(categories);
}

export function resetCategories(): void {
  localStorage.removeItem(CATEGORIES_KEY);
  emit(CHANNELS.CATEGORIES);
}

// ===== AUTH =====
export function getAuth(): AdminAuth {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return defaultAuth;
    return { ...defaultAuth, ...JSON.parse(raw) };
  } catch {
    return defaultAuth;
  }
}

export function saveAuth(auth: Partial<AdminAuth>): AdminAuth {
  const current = getAuth();
  const updated = { ...current, ...auth };
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  return updated;
}

export function verifyLogin(email: string, password: string): boolean {
  const auth = getAuth();
  return auth.email.toLowerCase() === email.toLowerCase() && auth.password === password;
}

export function changePassword(currentPassword: string, newPassword: string): boolean {
  const auth = getAuth();
  if (auth.password !== currentPassword) return false;
  saveAuth({ password: newPassword });
  return true;
}

export function changeEmail(password: string, newEmail: string): boolean {
  const auth = getAuth();
  if (auth.password !== password) return false;
  saveAuth({ email: newEmail });
  return true;
}

// ===== MEDIA =====
export function getMedia(): MediaItem[] {
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((m: MediaItem) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }));
  } catch {
    return [];
  }
}

export function addMedia(media: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem {
  const allMedia = getMedia();
  const newMedia: MediaItem = {
    ...media,
    id: `media-${Date.now()}`,
    createdAt: new Date(),
  };
  allMedia.unshift(newMedia);
  localStorage.setItem(MEDIA_KEY, JSON.stringify(allMedia));
  emit(CHANNELS.MEDIA);
  return newMedia;
}

export function deleteMedia(id: string): void {
  const media = getMedia().filter(m => m.id !== id);
  localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
  emit(CHANNELS.MEDIA);
}

// ===== EXPORT ALL DATA =====
export function exportAllData(): string {
  return JSON.stringify({
    config: getConfig(),
    products: getProducts(),
    categories: getCategories(),
    auth: getAuth(),
    media: getMedia(),
    orders: localStorage.getItem('pointdopastel_orders'),
  }, null, 2);
}

// ===== IMPORT DATA =====
export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.config) localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
    if (data.products) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
    if (data.categories) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(data.categories));
    if (data.auth) localStorage.setItem(AUTH_KEY, JSON.stringify(data.auth));
    if (data.media) localStorage.setItem(MEDIA_KEY, JSON.stringify(data.media));
    if (data.orders) localStorage.setItem('pointdopastel_orders', data.orders);
    emit(CHANNELS.CONFIG);
    emit(CHANNELS.PRODUCTS);
    emit(CHANNELS.CATEGORIES);
    emit(CHANNELS.ORDERS);
    emit(CHANNELS.MEDIA);
    return true;
  } catch {
    return false;
  }
}
