import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/i18n';
import { useTheme } from './ThemeContext';
import { User, MenuItem, Order, Feedback, AuditLog, Message, Conversation, WaiterPerformance } from '../types';

interface AppContextType {
  user: User | null;
  token: string | null;
  theme: 'light' | 'dark';
  language: 'en' | 'am';
  cart: { item: MenuItem; quantity: number }[];
  offlineQueue: any[];
  isOffline: boolean;
  notifications: any[];
  unreadCount: number;
  globalLoading: boolean;
  activeCafe: { id: string; name: string; location: string; image: string } | null;
  setActiveCafe: (cafe: any) => void;
  showLogoutModal: boolean;
  setShowLogoutModal: (show: boolean) => void;
  
  // Actions
  toggleTheme: () => void;
  setLanguage: (lang: 'en' | 'am') => void;
  login: (employeeId: string, password: string) => Promise<any>;
  logout: () => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  addNotification: (notification: any) => void;
  markNotificationsAsRead: () => void;
  triggerSync: () => Promise<void>;
  addToOfflineQueue: (order: any) => void;
  setGlobalLoading: (loading: boolean) => void;
  
  // API triggers
  refreshData: () => Promise<void>;
  apiGet: (path: string) => Promise<any>;
  apiPost: (path: string, body: any) => Promise<any>;
  apiPut: (path: string, body: any) => Promise<any>;
  apiDelete: (path: string) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const { theme, toggleTheme } = useTheme();
  const [language, setLangState] = useState<'en' | 'am'>((localStorage.getItem('esrom_lang') as 'en' | 'am') || 'en');
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('esrom_offline_queue') || '[]');
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [activeCafe, setActiveCafe] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Synced state triggers
  const apiGet = useCallback(async (path: string) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(path, { headers });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setToken(null);
      setUser(null);
      throw new Error('Your session has expired');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'API error' }));
      throw new Error(err.message || 'API error');
    }
    return response.json();
  }, [token, isOffline]);

  const apiPost = useCallback(async (path: string, body: any) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setToken(null);
      setUser(null);
      throw new Error('Your session has expired');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'API error' }));
      throw new Error(err.message || 'API error');
    }
    return response.json();
  }, [token, isOffline]);

  const apiPut = useCallback(async (path: string, body: any) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(path, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setToken(null);
      setUser(null);
      throw new Error('Your session has expired');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'API error' }));
      throw new Error(err.message || 'API error');
    }
    return response.json();
  }, [token, isOffline]);

  const apiDelete = useCallback(async (path: string) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(path, {
      method: 'DELETE',
      headers
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setToken(null);
      setUser(null);
      throw new Error('Your session has expired');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'API error' }));
      throw new Error(err.message || 'API error');
    }
    return response.json();
  }, [token, isOffline]);

  // Auth fetch
  const fetchMe = useCallback(async () => {
    if (!token || isOffline) return;
    try {
      const data = await apiGet('/api/auth/me');
      const userData = { ...data.user };
      if (userData.role === 'company_manager') userData.role = 'manager';
      if (userData.role === 'cafe_manager') userData.role = 'cafe';
      setUser(userData);
    } catch (e) {
      console.error('Error fetching current user:', e);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  }, [token, apiGet, isOffline]);

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

  // Listen to offline/online events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token || isOffline) return;
    try {
      const data = await apiGet('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: any) => !n.read).length);
    } catch (e) {
      console.error('Error loading notifications', e);
    }
  }, [token, apiGet, isOffline]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      // Setup dynamic poll for live updates
      const interval = setInterval(() => {
        fetchNotifications();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  // Theme is handled in ThemeContext

  const setLanguage = (lang: 'en' | 'am') => {
    setLangState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('esrom_lang', lang);
  };

  const login = async (employeeId: string, password: string): Promise<any> => {
    setGlobalLoading(true);
    try {
      const data = await apiPost('/api/auth/login', { employeeId, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setToken(data.token);
      
      const userData = { ...data.user };
      if (userData.role === 'company_manager') userData.role = 'manager';
      if (userData.role === 'cafe_manager') userData.role = 'cafe';
      setUser(userData);
      
      setGlobalLoading(false);
      return data;
    } catch (e) {
      setGlobalLoading(false);
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
    setCart([]);
    setActiveCafe(null);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.item.id === itemId ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const addNotification = (notif: any) => {
    setNotifications((prev) => [notif, ...prev]);
    setUnreadCount((c) => c + 1);
  };

  const markNotificationsAsRead = async () => {
    if (!token || isOffline) return;
    try {
      await apiPost('/api/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Error marking read:', e);
    }
  };

  const addToOfflineQueue = (order: any) => {
    const queue = [...offlineQueue, order];
    setOfflineQueue(queue);
    localStorage.setItem('esrom_offline_queue', JSON.stringify(queue));
  };

  // Sync waiter offline queue
  const triggerSync = async () => {
    if (offlineQueue.length === 0 || isOffline) return;
    setGlobalLoading(true);
    try {
      const response = await apiPost('/api/waiter/sync-orders', { orders: offlineQueue });
      setOfflineQueue([]);
      localStorage.setItem('esrom_offline_queue', '[]');
      setGlobalLoading(false);
      fetchNotifications();
    } catch (e) {
      console.error('Sync failed:', e);
      setGlobalLoading(false);
      throw e;
    }
  };

  // Auto-sync when online restores
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0 && token) {
      triggerSync().catch(console.error);
    }
  }, [isOffline, offlineQueue, token]);

  const refreshData = async () => {
    await fetchMe();
    await fetchNotifications();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        theme,
        language,
        cart,
        offlineQueue,
        isOffline,
        notifications,
        unreadCount,
        globalLoading,
        activeCafe,
        setActiveCafe,
        showLogoutModal,
        setShowLogoutModal,
        toggleTheme,
        setLanguage,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        addNotification,
        markNotificationsAsRead,
        triggerSync,
        addToOfflineQueue,
        setGlobalLoading,
        refreshData,
        apiGet,
        apiPost,
        apiPut,
        apiDelete
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
