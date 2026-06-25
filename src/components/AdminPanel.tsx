import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChefHat, Package, Clock, DollarSign, TrendingUp, RefreshCw, Trash2, ArrowLeft,
  Bell, BellOff, Phone, MapPin, FileText, User, ShoppingBag, Settings, Plus,
  Edit2, Save, Image, Video, Upload, MessageCircle, Store, LogOut,
  Lock, Mail, Download, UploadCloud, AlertTriangle, Check, Search, Grid, List, Star, Flame
} from 'lucide-react';
import { OrderData, MenuItem } from '../types';
import { updateOrderStatus, deleteOrder, clearAllOrders, addOrder, getOrderById } from '../services/orderStore';
import { decodeOrder } from '../services/orderShare';
import {
  getConfig, saveConfig, addProduct, updateProduct, deleteProduct,
  addCategory, deleteCategory, getAuth, saveAuth, verifyLogin,
  changePassword, changeEmail, getMedia, addMedia, deleteMedia, exportAllData,
  importData, resetProducts, resetCategories, StoreConfig, AdminAuth
} from '../services/storeConfig';
import { useOrders, useTodayStats, useProducts, useCategories, useNewOrderAlert } from '../hooks/useStore';
import { startListening, stopListening, getSyncTopic, setSyncTopic as saveSyncTopic, isListening } from '../services/cloudSync';
import { subscribe, emit, CHANNELS } from '../services/eventBus';
import OrderToast from './OrderToast';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'orders' | 'products' | 'media' | 'settings' | 'profile';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; next?: OrderData['status']; nextLabel?: string }> = {
  received: { label: 'Recebido', emoji: '📥', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', next: 'preparing', nextLabel: '👨‍🍳 Preparar' },
  preparing: { label: 'Preparando', emoji: '👨‍🍳', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', next: 'ready', nextLabel: '✅ Pronto' },
  ready: { label: 'Pronto', emoji: '✨', color: 'text-green-600', bg: 'bg-green-50 border-green-200', next: 'delivering', nextLabel: '🛵 Entregar' },
  delivering: { label: 'Entregando', emoji: '🛵', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', next: 'delivered', nextLabel: '🎉 Entregue' },
  delivered: { label: 'Entregue', emoji: '🎉', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  cancelled: { label: 'Cancelado', emoji: '❌', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

const STATUS_ORDER: OrderData['status'][] = ['received', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  // Auth state
  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');

  // Reactive data — auto-updates when emit(CH.xxx) fires.
  const orders = useOrders();
  const stats = useTodayStats();
  const products = useProducts();
  const categories = useCategories();

  // Force re-read all data when panel opens (failsafe)
  useEffect(() => {
    if (isOpen && authenticated) {
      emit(CHANNELS.ORDERS);
      emit(CHANNELS.PRODUCTS);
    }
  }, [isOpen, authenticated]);

  // UI state for orders
  const [orderFilter, setOrderFilter] = useState<'all' | OrderData['status']>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [importCode, setImportCode] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('todos');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // New product form
  const [newProduct, setNewProduct] = useState<Partial<MenuItem>>({
    name: '', description: '', price: 0, image: '', category: 'salgados', popular: false
  });

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Settings state
  const [config, setConfig] = useState<StoreConfig>(getConfig());
  const [configSaved, setConfigSaved] = useState(false);

  // Profile state
  const [auth, setAuthState] = useState<AdminAuth>(getAuth());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Media state
  const [media, setMedia] = useState(getMedia());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh non-reactive local state (auth, media, config form).
  // Reactive data (orders, products, categories, stats) auto-updates via useSyncExternalStore.
  const refreshData = useCallback(() => {
    setConfig(getConfig());
    setAuthState(getAuth());
    setMedia(getMedia());
  }, []);

  useEffect(() => {
    if (!authenticated || !isOpen) return;
    refreshData();
    const unsub1 = subscribe(CHANNELS.CONFIG, () => setConfig(getConfig()));
    const unsub2 = subscribe(CHANNELS.MEDIA, () => setMedia(getMedia()));
    return () => { unsub1(); unsub2(); };
  }, [authenticated, isOpen, refreshData]);

  // Cloud sync — listen for orders from other devices via ntfy.sh
  const [syncConnected, setSyncConnected] = useState(false);
  const [syncTopic, setSyncTopicState] = useState(getSyncTopic());

  useEffect(() => {
    if (!authenticated) return;
    startListening();
    setSyncConnected(true);
    const check = setInterval(() => setSyncConnected(isListening()), 3000);
    return () => { stopListening(); clearInterval(check); setSyncConnected(false); };
  }, [authenticated]);

  // Full notification system (sound + vibrate + push + flash + toast)
  const notification = useNewOrderAlert(authenticated && soundEnabled);

  // Handlers
  const handleLogin = () => {
    if (verifyLogin(loginEmail, loginPassword)) {
      setAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Email ou senha incorretos');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
    setActiveTab('orders');
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderData['status']) => {
    updateOrderStatus(orderId, newStatus);
    refreshData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleSaveConfig = () => {
    saveConfig(config);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      updateProduct(editingProduct.id, editingProduct);
      setEditingProduct(null);
    }
    refreshData();
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    addProduct(newProduct as Omit<MenuItem, 'id'>);
    setNewProduct({ name: '', description: '', price: 0, image: '', category: 'salgados', popular: false });
    setIsAddingProduct(false);
    refreshData();
  };

  const handleDeleteProduct = (id: string) => {
    deleteProduct(id);
    refreshData();
  };

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    addCategory({ name: newCategoryName, icon: newCategoryIcon });
    setNewCategoryName('');
    setNewCategoryIcon('🍽️');
    setShowAddCategory(false);
    refreshData();
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (changePassword(currentPassword, newPassword)) {
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      refreshData();
    } else {
      setPasswordError('Senha atual incorreta');
    }
  };

  const handleChangeEmail = () => {
    setEmailError('');
    setEmailSuccess('');
    if (!newEmail.includes('@')) {
      setEmailError('Email inválido');
      return;
    }
    if (changeEmail(currentPassword, newEmail)) {
      setEmailSuccess('Email alterado com sucesso!');
      setNewEmail('');
      setCurrentPassword('');
      refreshData();
    } else {
      setEmailError('Senha incorreta');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        addMedia({ type, url: base64, name: file.name });
        setMedia(getMedia());
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointdopastel_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (importData(reader.result as string)) {
        refreshData();
        alert('Dados importados com sucesso!');
      } else {
        alert('Erro ao importar dados');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
  const filteredProducts = products.filter(p => {
    const matchCat = productCategory === 'todos' || p.category === productCategory;
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="absolute inset-2 sm:inset-4 lg:inset-8 bg-gradient-to-br from-gray-50 to-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        
        {/* ====== LOGIN ====== */}
        {!authenticated ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30 animate-float">
                  <ChefHat size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-dark">Painel Administrativo</h1>
                <p className="text-gray-400 text-sm mt-1">Point do Pastel — Gerencie seu negócio</p>
              </div>

              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                      <Mail size={14} /> Email
                    </label>
                    <input
                      type="email"
                      placeholder="admin@pointdopastel.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                      <Lock size={14} /> Senha
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full px-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  {loginError && (
                    <p className="text-danger text-sm text-center bg-danger/10 py-2 rounded-xl">{loginError}</p>
                  )}
                  <button
                    onClick={handleLogin}
                    className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02]"
                  >
                    Entrar
                  </button>
                </div>
                <p className="text-center text-gray-400 text-xs mt-4">
                  Padrão: admin@pointdopastel.com / admin123
                </p>
              </div>

              <button onClick={onClose} className="block mx-auto mt-6 text-gray-400 text-sm hover:text-gray-600 transition-colors">
                ← Voltar ao site
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar */}
            <div className="lg:w-64 bg-dark text-white flex lg:flex-col border-b lg:border-b-0 lg:border-r border-white/10">
              {/* Logo */}
              <div className="p-4 lg:p-6 flex items-center gap-3 border-r lg:border-r-0 lg:border-b border-white/10">
                {config.logoImage ? (
                  <img src={config.logoImage} alt="" className="w-10 h-10 rounded-xl object-cover shadow-lg" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">{config.logoEmoji}</span>
                  </div>
                )}
                <div className="hidden lg:block">
                  <h2 className="font-bold text-sm">{config.storeName}</h2>
                  <p className="text-white/50 text-xs">Admin</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex lg:flex-col flex-1 overflow-x-auto lg:overflow-visible p-2 lg:p-3 gap-1 scrollbar-hide">
                {([
                  { key: 'orders', icon: <ShoppingBag size={18} />, label: 'Pedidos', badge: stats.pending },
                  { key: 'products', icon: <Package size={18} />, label: 'Produtos' },
                  { key: 'media', icon: <Image size={18} />, label: 'Mídia' },
                  { key: 'settings', icon: <Settings size={18} />, label: 'Configurações' },
                  { key: 'profile', icon: <User size={18} />, label: 'Perfil' },
                ] as { key: AdminTab; icon: React.ReactNode; label: string; badge?: number }[]).map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setActiveTab(item.key); setSelectedOrder(null); setEditingProduct(null); setIsAddingProduct(false); }}
                    className={`relative flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all whitespace-nowrap text-sm font-medium ${
                      activeTab === item.key
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 lg:static lg:ml-auto bg-danger text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Bottom */}
              <div className="hidden lg:block p-3 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              {/* Top Bar */}
              <div className="p-4 sm:p-5 bg-white border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h1 className="font-bold text-lg text-dark">
                    {activeTab === 'orders' && 'Pedidos'}
                    {activeTab === 'products' && 'Produtos'}
                    {activeTab === 'media' && 'Mídia'}
                    {activeTab === 'settings' && 'Configurações'}
                    {activeTab === 'profile' && 'Meu Perfil'}
                  </h1>
                  <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === 'orders' && (
                    <>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2.5 rounded-xl transition-all ${soundEnabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}
                        title={soundEnabled ? 'Som ativo' : 'Som mudo'}
                      >
                        {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                      </button>
                      {/* Cloud sync indicator */}
                      <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${
                        syncConnected ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'
                      }`} title={`Sincronização: ${syncConnected ? 'Conectado' : 'Desconectado'}\nTópico: ${syncTopic}`}>
                        <span className={`w-2 h-2 rounded-full ${syncConnected ? 'bg-success animate-pulse' : 'bg-gray-300'}`} />
                        <span className="hidden sm:inline">{syncConnected ? 'Online' : 'Offline'}</span>
                      </div>
                      <button onClick={refreshData} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-gray-500">
                        <RefreshCw size={18} />
                      </button>
                    </>
                  )}
                  <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 lg:hidden">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                
                {/* ====== ORDERS TAB ====== */}
                {activeTab === 'orders' && !selectedOrder && (
                  <>
                    {/* Import Order Box */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">📲</span>
                        <h4 className="font-bold text-dark text-sm">Receber Pedido Externo</h4>
                      </div>
                      <p className="text-gray-400 text-[11px] mb-3">Cole o link ou código que o cliente enviou via WhatsApp</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Cole o link do pedido aqui..."
                          value={importCode}
                          onChange={(e) => { setImportCode(e.target.value); setImportStatus('idle'); }}
                          className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-xs"
                        />
                        <button
                          onClick={() => {
                            if (!importCode.trim()) return;
                            // Extract the pedido param from URL or treat as raw code
                            let code = importCode.trim();
                            try {
                              const url = new URL(code);
                              code = url.searchParams.get('pedido') || code;
                            } catch {
                              // Maybe it's just the raw code
                              if (code.includes('pedido=')) {
                                code = code.split('pedido=')[1]?.split('&')[0] || code;
                              }
                            }
                            const order = decodeOrder(code);
                            if (!order) { setImportStatus('error'); return; }
                            if (getOrderById(order.id)) { setImportStatus('duplicate'); return; }
                            addOrder(order);
                            setImportStatus('success');
                            setImportCode('');
                            setTimeout(() => setImportStatus('idle'), 4000);
                          }}
                          className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all shrink-0"
                        >
                          Importar
                        </button>
                      </div>
                      {importStatus === 'success' && (
                        <p className="text-success text-xs mt-2 animate-fade-in-up">✅ Pedido importado com sucesso!</p>
                      )}
                      {importStatus === 'error' && (
                        <p className="text-danger text-xs mt-2">❌ Código inválido. Verifique e tente novamente.</p>
                      )}
                      {importStatus === 'duplicate' && (
                        <p className="text-amber-600 text-xs mt-2">⚠️ Este pedido já foi importado.</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: 'Pedidos', value: stats.totalOrders, icon: <ShoppingBag size={18} />, color: 'text-primary', bg: 'bg-primary/10' },
                        { label: 'Faturamento', value: `R$ ${stats.totalRevenue.toFixed(0)}`, icon: <DollarSign size={18} />, color: 'text-success', bg: 'bg-success/10' },
                        { label: 'Pendentes', value: stats.pending, icon: <Clock size={18} />, color: 'text-amber-600', bg: 'bg-amber-100' },
                        { label: 'Ticket Médio', value: `R$ ${stats.avgTicket.toFixed(0)}`, icon: <TrendingUp size={18} />, color: 'text-blue-600', bg: 'bg-blue-100' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                          <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                          <p className="font-bold text-dark text-xl">{s.value}</p>
                          <p className="text-gray-400 text-xs">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                      <button onClick={() => setOrderFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${orderFilter === 'all' ? 'bg-dark text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                        Todos ({orders.length})
                      </button>
                      {STATUS_ORDER.map(s => {
                        const count = orders.filter(o => o.status === s).length;
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button key={s} onClick={() => setOrderFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${orderFilter === s ? `${cfg.bg} ${cfg.color}` : 'bg-white text-gray-500 border border-gray-200'}`}>
                            {cfg.emoji} {cfg.label} {count > 0 && <span className="bg-gray-200/50 px-1.5 rounded-full text-[10px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Orders List */}
                    {filteredOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Package size={48} className="text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">Nenhum pedido</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredOrders.map(order => {
                          const cfg = STATUS_CONFIG[order.status];
                          return (
                            <div key={order.id} onClick={() => setSelectedOrder(order)} className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-lg transition-all ${order.status === 'received' ? 'border-blue-200 shadow-md ring-1 ring-blue-100' : 'border-gray-100'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-dark">#{order.id}</span>
                                  {order.status === 'received' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">NOVO</span>}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-dark text-sm">{order.customerName}</p>
                                  <p className="text-gray-400 text-xs">{order.orderType === 'delivery' ? '🛵' : '🏪'} {order.items.reduce((s, i) => s + i.quantity, 0)} itens · {formatTime(order.createdAt)}</p>
                                </div>
                                <p className="font-bold text-primary">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                              </div>
                              {cfg.next && (
                                <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, cfg.next!); }} className="mt-3 w-full bg-gradient-to-r from-primary to-primary-dark text-white py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all">
                                  {cfg.nextLabel}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Order Detail */}
                {activeTab === 'orders' && selectedOrder && (
                  <div className="animate-fade-in-up">
                    <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-gray-500 hover:text-dark mb-4 text-sm">
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-dark">Pedido #{selectedOrder.id}</h3>
                          <p className="text-gray-400 text-xs">{formatTime(selectedOrder.createdAt)}</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].color}`}>
                          {STATUS_CONFIG[selectedOrder.status].emoji} {STATUS_CONFIG[selectedOrder.status].label}
                        </span>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-400">Cliente:</span> <span className="font-medium text-dark">{selectedOrder.customerName}</span></div>
                          <div><span className="text-gray-400">Telefone:</span> <a href={`tel:${selectedOrder.customerPhone}`} className="font-medium text-primary">{selectedOrder.customerPhone}</a></div>
                          <div><span className="text-gray-400">Tipo:</span> <span className="font-medium">{selectedOrder.orderType === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}</span></div>
                          <div><span className="text-gray-400">Pagamento:</span> <span className="font-medium">{selectedOrder.paymentMethod === 'pix' ? '📱 PIX' : selectedOrder.paymentMethod === 'dinheiro' ? '💵 Dinheiro' : '💳 Cartão'}</span></div>
                        </div>
                        {selectedOrder.orderType === 'delivery' && (
                          <div className="bg-gray-50 rounded-xl p-3 text-sm">
                            <span className="text-gray-400">Endereço:</span>
                            <p className="font-medium text-dark mt-1">{selectedOrder.customerAddress}</p>
                          </div>
                        )}
                        <div className="border-t border-gray-100 pt-4">
                          <h4 className="font-semibold text-dark text-sm mb-3">Itens</h4>
                          {selectedOrder.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-3">
                                <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                <div>
                                  <p className="font-medium text-dark text-sm">{item.quantity}x {item.name}</p>
                                  {selectedOrder.itemNotes[item.id] && <p className="text-xs text-amber-600">📝 {selectedOrder.itemNotes[item.id]}</p>}
                                </div>
                              </div>
                              <span className="font-bold text-dark text-sm">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>
                        {selectedOrder.notes && (
                          <div className="bg-amber-50 rounded-xl p-3 text-sm border border-amber-200">
                            <span className="text-amber-700 font-medium">📝 Observações:</span>
                            <p className="text-amber-800 mt-1">{selectedOrder.notes}</p>
                          </div>
                        )}
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>R$ {selectedOrder.subtotal.toFixed(2).replace('.', ',')}</span></div>
                          {selectedOrder.orderType === 'delivery' && <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">Entrega</span><span>R$ {selectedOrder.deliveryFee.toFixed(2).replace('.', ',')}</span></div>}
                          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-primary/10"><span>Total</span><span className="text-primary">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span></div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-dark text-sm mb-2">Alterar Status</h4>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_ORDER.map(s => (
                              <button key={s} onClick={() => handleStatusUpdate(selectedOrder.id, s)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${selectedOrder.status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-2 ring-offset-1` : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                                {STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {STATUS_CONFIG[selectedOrder.status].next && (
                            <button onClick={() => handleStatusUpdate(selectedOrder.id, STATUS_CONFIG[selectedOrder.status].next!)} className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                              {STATUS_CONFIG[selectedOrder.status].nextLabel}
                            </button>
                          )}
                          <button onClick={() => { deleteOrder(selectedOrder.id); setSelectedOrder(null); refreshData(); }} className="p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====== PRODUCTS TAB ====== */}
                {activeTab === 'products' && !editingProduct && !isAddingProduct && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 mb-5">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar produto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
                      </div>
                      <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                        <button onClick={() => setProductViewMode('grid')} className={`p-2 rounded-lg ${productViewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}><Grid size={16} /></button>
                        <button onClick={() => setProductViewMode('list')} className={`p-2 rounded-lg ${productViewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}><List size={16} /></button>
                      </div>
                      <button onClick={() => setIsAddingProduct(true)} className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                        <Plus size={16} /> Novo
                      </button>
                    </div>

                    {/* Categories Management */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-dark text-sm">Categorias</h3>
                        <button onClick={() => setShowAddCategory(!showAddCategory)} className="text-primary text-xs font-medium hover:underline">
                          {showAddCategory ? 'Cancelar' : '+ Nova'}
                        </button>
                      </div>
                      {showAddCategory && (
                        <div className="flex gap-2 mb-3 animate-fade-in-up">
                          <input type="text" placeholder="Emoji" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} className="w-16 px-3 py-2 bg-white border border-gray-200 rounded-xl text-center text-lg" maxLength={2} />
                          <input type="text" placeholder="Nome da categoria" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
                          <button onClick={handleAddCategory} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"><Check size={16} /></button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c.id !== 'todos').map(c => (
                          <div key={c.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm group">
                            <span>{c.icon}</span>
                            <span className="text-gray-700">{c.name}</span>
                            <button onClick={() => { deleteCategory(c.id); refreshData(); }} className="ml-1 text-gray-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Products Grid/List */}
                    {productViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all">
                            <div className="relative h-32">
                              <img src={p.image || '/images/pastel-carne.jpg'} alt="" className="w-full h-full object-cover" />
                              {p.popular && <span className="absolute top-2 left-2 bg-secondary text-dark text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Flame size={10} /> Popular</span>}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => setEditingProduct(p)} className="p-2 bg-white rounded-full text-primary hover:scale-110 transition-transform"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-white rounded-full text-danger hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-dark text-sm truncate">{p.name}</h4>
                              <p className="text-gray-400 text-xs truncate">{p.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</span>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{categories.find(c => c.id === p.category)?.icon}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500">Produto</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500">Categoria</th>
                              <th className="text-left p-3 text-xs font-semibold text-gray-500">Preço</th>
                              <th className="text-right p-3 text-xs font-semibold text-gray-500">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map(p => (
                              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <img src={p.image || '/images/pastel-carne.jpg'} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                    <div>
                                      <p className="font-medium text-dark text-sm flex items-center gap-1">{p.name} {p.popular && <Star size={12} className="text-secondary fill-secondary" />}</p>
                                      <p className="text-gray-400 text-xs truncate max-w-[200px]">{p.description}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-sm text-gray-500">{categories.find(c => c.id === p.category)?.name}</td>
                                <td className="p-3 font-bold text-primary text-sm">R$ {p.price.toFixed(2).replace('.', ',')}</td>
                                <td className="p-3 text-right">
                                  <button onClick={() => setEditingProduct(p)} className="p-2 text-gray-400 hover:text-primary"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-danger"><Trash2 size={16} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex gap-2 mt-5">
                      <button onClick={() => { resetProducts(); refreshData(); }} className="text-xs text-gray-400 hover:text-danger transition-colors flex items-center gap-1">
                        <RefreshCw size={12} /> Restaurar padrão
                      </button>
                    </div>
                  </>
                )}

                {/* Edit/Add Product */}
                {activeTab === 'products' && (editingProduct || isAddingProduct) && (
                  <div className="animate-fade-in-up">
                    <button onClick={() => { setEditingProduct(null); setIsAddingProduct(false); }} className="flex items-center gap-2 text-gray-500 hover:text-dark mb-4 text-sm">
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="font-bold text-dark mb-4">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Nome *</label>
                          <input type="text" value={editingProduct?.name || newProduct.name} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Preço *</label>
                          <input type="number" step="0.01" value={editingProduct?.price || newProduct.price} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 }) : setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Descrição</label>
                          <textarea value={editingProduct?.description || newProduct.description} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, description: e.target.value }) : setNewProduct({ ...newProduct, description: e.target.value })} rows={3} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                          <select value={editingProduct?.category || newProduct.category} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, category: e.target.value }) : setNewProduct({ ...newProduct, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm">
                            {categories.filter(c => c.id !== 'todos').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Imagem (URL ou da Mídia)</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="/images/pastel.jpg" value={editingProduct?.image || newProduct.image} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, image: e.target.value }) : setNewProduct({ ...newProduct, image: e.target.value })} className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                          </div>
                        </div>
                        <div className="lg:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editingProduct?.popular || newProduct.popular} onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, popular: e.target.checked }) : setNewProduct({ ...newProduct, popular: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <span className="text-sm text-gray-600">⭐ Marcar como popular</span>
                          </label>
                        </div>
                        {(editingProduct?.image || newProduct.image) && (
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Preview</label>
                            <img src={editingProduct?.image || newProduct.image} alt="Preview" className="w-32 h-32 rounded-xl object-cover border border-gray-200" onError={(e) => (e.target as HTMLImageElement).src = '/images/pastel-carne.jpg'} />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-5">
                        <button onClick={() => { setEditingProduct(null); setIsAddingProduct(false); }} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all">
                          Cancelar
                        </button>
                        <button onClick={editingProduct ? handleSaveProduct : handleAddProduct} className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                          <Save size={18} /> {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====== MEDIA TAB ====== */}
                {activeTab === 'media' && (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-dark">Upload de Mídia</h3>
                        <span className="text-xs text-gray-400">{media.length} arquivo(s)</span>
                      </div>
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                        <Upload size={32} className="mx-auto mb-2 text-gray-300 group-hover:text-primary transition-colors" />
                        <p className="text-gray-500 text-sm">Clique para fazer upload de imagens ou vídeos</p>
                        <p className="text-gray-400 text-xs mt-1">JPG, PNG, MP4, WebM</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileUpload} className="hidden" />
                    </div>

                    {media.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {media.map(m => (
                          <div key={m.id} className="relative group bg-white rounded-xl border border-gray-100 overflow-hidden">
                            {m.type === 'video' ? (
                              <video src={m.url} className="w-full h-32 object-cover" />
                            ) : (
                              <img src={m.url} alt="" className="w-full h-32 object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button onClick={() => navigator.clipboard.writeText(m.url)} className="p-2 bg-white rounded-lg text-primary hover:scale-110 transition-transform" title="Copiar URL">
                                <FileText size={14} />
                              </button>
                              <button onClick={() => { deleteMedia(m.id); setMedia(getMedia()); }} className="p-2 bg-white rounded-lg text-danger hover:scale-110 transition-transform">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="absolute top-2 left-2">
                              {m.type === 'video' ? <Video size={14} className="text-white drop-shadow" /> : <Image size={14} className="text-white drop-shadow" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ====== SETTINGS TAB ====== */}
                {activeTab === 'settings' && (
                  <div className="max-w-2xl">
                    {/* Logo & Identity */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><Store size={18} className="text-primary" /> Logo & Identidade</h3>
                      
                      {/* Logo upload area */}
                      <div className="flex flex-col sm:flex-row gap-5 mb-5">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative group">
                            {config.logoImage ? (
                              <img
                                src={config.logoImage}
                                alt="Logo"
                                className="w-28 h-28 rounded-2xl object-cover border-2 border-gray-200 shadow-lg group-hover:border-primary transition-all"
                              />
                            ) : (
                              <div className="w-28 h-28 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg text-5xl">
                                {config.logoEmoji}
                              </div>
                            )}
                            {/* Overlay on hover */}
                            <label className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center text-white gap-1">
                              <Upload size={20} />
                              <span className="text-[10px] font-medium">Trocar Logo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setConfig({ ...config, logoImage: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          {config.logoImage && (
                            <button
                              onClick={() => setConfig({ ...config, logoImage: '' })}
                              className="text-xs text-danger/70 hover:text-danger transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Remover imagem
                            </button>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Logo por URL</label>
                            <input
                              type="url"
                              placeholder="https://... ou deixe vazio para usar emoji"
                              value={config.logoImage}
                              onChange={(e) => setConfig({ ...config, logoImage: e.target.value })}
                              className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Emoji (fallback)</label>
                            <input
                              type="text"
                              value={config.logoEmoji}
                              onChange={(e) => setConfig({ ...config, logoEmoji: e.target.value })}
                              className="w-20 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-center text-2xl"
                              maxLength={2}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Usado quando não há imagem</p>
                          </div>
                        </div>
                      </div>

                      {/* Store info */}
                      <div className="space-y-4 border-t border-gray-100 pt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Nome da Loja</label>
                          <input type="text" value={config.storeName} onChange={(e) => setConfig({ ...config, storeName: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Slogan</label>
                          <input type="text" value={config.slogan} onChange={(e) => setConfig({ ...config, slogan: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Imagem de Fundo (Hero)</label>
                          <div className="flex gap-2">
                            <input type="url" placeholder="/images/hero-bg.jpg ou URL" value={config.heroImage} onChange={(e) => setConfig({ ...config, heroImage: e.target.value })} className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                            <label className="px-4 py-3 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 cursor-pointer transition-all flex items-center gap-1 text-sm font-medium shrink-0">
                              <Upload size={14} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setConfig({ ...config, heroImage: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          {config.heroImage && (
                            <img src={config.heroImage} alt="Preview" className="w-full h-24 rounded-xl object-cover mt-2 border border-gray-200" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><Phone size={18} className="text-primary" /> Contato</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</label>
                            <input type="text" value={config.whatsapp} onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })} placeholder="5582999999999" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">📷 Instagram</label>
                            <input type="text" value={config.instagram} onChange={(e) => setConfig({ ...config, instagram: e.target.value })} placeholder="@seuinstagram" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Telefone</label>
                          <input type="text" value={config.phone} onChange={(e) => setConfig({ ...config, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><MapPin size={18} className="text-primary" /> Localização</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Endereço</label>
                          <textarea value={config.address} onChange={(e) => setConfig({ ...config, address: e.target.value })} rows={2} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Link do Google Maps</label>
                          <input type="url" value={config.addressLink} onChange={(e) => setConfig({ ...config, addressLink: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><DollarSign size={18} className="text-primary" /> Delivery</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Taxa de Entrega (R$)</label>
                          <input type="number" step="0.01" value={config.deliveryFee} onChange={(e) => setConfig({ ...config, deliveryFee: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Tempo Delivery (min)</label>
                          <input type="number" value={config.deliveryTime} onChange={(e) => setConfig({ ...config, deliveryTime: parseInt(e.target.value) || 25 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Tempo Retirada (min)</label>
                          <input type="number" value={config.pickupTime} onChange={(e) => setConfig({ ...config, pickupTime: parseInt(e.target.value) || 15 })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        </div>
                      </div>
                    </div>

                    <button onClick={handleSaveConfig} className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                      {configSaved ? <><Check size={18} /> Salvo!</> : <><Save size={18} /> Salvar Configurações</>}
                    </button>

                    {/* Cloud Sync Settings */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
                      <h3 className="font-bold text-dark mb-2 flex items-center gap-2">
                        📡 Sincronização em Nuvem
                      </h3>
                      <p className="text-gray-400 text-xs mb-4">
                        Pedidos feitos de qualquer dispositivo chegam aqui automaticamente via internet.
                        Para receber pedidos de outro dispositivo, ambos devem usar o mesmo código de sincronização.
                      </p>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={syncTopic}
                          onChange={(e) => setSyncTopicState(e.target.value)}
                          className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-xs font-mono"
                          placeholder="Código de sincronização"
                        />
                        <button
                          onClick={() => {
                            saveSyncTopic(syncTopic);
                            stopListening();
                            startListening();
                            setSyncConnected(true);
                          }}
                          className="bg-primary text-white px-4 py-3 rounded-xl text-xs font-bold shrink-0"
                        >
                          Salvar
                        </button>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${syncConnected ? 'bg-success/10 text-success' : 'bg-gray-50 text-gray-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${syncConnected ? 'bg-success animate-pulse' : 'bg-gray-300'}`} />
                        {syncConnected ? 'Conectado — recebendo pedidos em tempo real' : 'Desconectado'}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">
                        💡 Para usar em vários dispositivos: copie este código e cole nas Configurações do painel no outro aparelho.
                      </p>
                    </div>

                    <div className="mt-8 pt-5 border-t border-gray-100">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><Download size={18} className="text-primary" /> Backup</h3>
                      <div className="flex gap-2">
                        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all">
                          <Download size={16} /> Exportar Dados
                        </button>
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer">
                          <UploadCloud size={16} /> Importar Dados
                          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====== PROFILE TAB ====== */}
                {activeTab === 'profile' && (
                  <div className="max-w-lg">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                          {auth.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-dark">{auth.name}</h3>
                          <p className="text-gray-400 text-sm">{auth.email}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nome</label>
                        <input type="text" value={auth.name} onChange={(e) => { saveAuth({ name: e.target.value }); setAuthState(getAuth()); }} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><Mail size={18} className="text-primary" /> Alterar Email</h3>
                      <div className="space-y-3">
                        <input type="email" placeholder="Novo email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        <input type="password" placeholder="Senha atual (para confirmar)" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        {emailError && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-xl">{emailError}</p>}
                        {emailSuccess && <p className="text-success text-sm bg-success/10 px-3 py-2 rounded-xl">{emailSuccess}</p>}
                        <button onClick={handleChangeEmail} className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-all">
                          Alterar Email
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                      <h3 className="font-bold text-dark mb-4 flex items-center gap-2"><Lock size={18} className="text-primary" /> Alterar Senha</h3>
                      <div className="space-y-3">
                        <input type="password" placeholder="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        <input type="password" placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        <input type="password" placeholder="Confirmar nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm" />
                        {passwordError && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-xl">{passwordError}</p>}
                        {passwordSuccess && <p className="text-success text-sm bg-success/10 px-3 py-2 rounded-xl">{passwordSuccess}</p>}
                        <button onClick={handleChangePassword} className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-all">
                          Alterar Senha
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-amber-800 text-sm">Área de Perigo</h4>
                          <p className="text-amber-700 text-xs mt-1 mb-3">Ações irreversíveis que afetam todos os dados.</p>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => { if(confirm('Limpar todos os pedidos?')) { clearAllOrders(); refreshData(); }}} className="text-xs bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all">
                              Limpar Pedidos
                            </button>
                            <button onClick={() => { if(confirm('Restaurar produtos originais?')) { resetProducts(); resetCategories(); refreshData(); }}} className="text-xs bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all">
                              Restaurar Produtos
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button onClick={handleLogout} className="w-full mt-5 flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-danger transition-colors">
                      <LogOut size={16} /> Sair da conta
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order notification toast */}
      <OrderToast
        order={notification.order}
        visible={notification.visible}
        onDismiss={notification.dismiss}
        onView={(order) => {
          notification.dismiss();
          if (!authenticated) return;
          setActiveTab('orders');
          setSelectedOrder(order);
        }}
      />
    </div>
  );
}
