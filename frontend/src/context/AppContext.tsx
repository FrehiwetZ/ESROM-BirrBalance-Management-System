import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/i18n';
import { useTheme } from './ThemeContext';
import { User, MenuItem } from '../types';
import { normalizeNotification, unwrapData } from '../utils/apiMappers';

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
  logout: () => void | Promise<void>;
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
  apiPatch: (path: string, body?: any) => Promise<any>;
  apiDelete: (path: string) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

async function parseError(response: Response): Promise<Error> {
  const err = await response.json().catch(() => ({ message: 'API error' }));
  return new Error(err.message || 'API error');
}

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

  const authHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, []);

  const apiGet = useCallback(async (path: string) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const response = await fetch(path, { headers: authHeaders() });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Your session has expired');
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  }, [authHeaders, handleUnauthorized, isOffline]);

  const apiPost = useCallback(async (path: string, body: any) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const response = await fetch(path, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Your session has expired');
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  }, [authHeaders, handleUnauthorized, isOffline]);

  const apiPut = useCallback(async (path: string, body: any) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const response = await fetch(path, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Your session has expired');
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  }, [authHeaders, handleUnauthorized, isOffline]);

  const apiPatch = useCallback(async (path: string, body: any = {}) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const response = await fetch(path, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Your session has expired');
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  }, [authHeaders, handleUnauthorized, isOffline]);

  const apiDelete = useCallback(async (path: string) => {
    if (isOffline) {
      throw new Error('Offline mode active. API calls unavailable.');
    }
    const response = await fetch(path, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Your session has expired');
    }
    if (!response.ok) throw await parseError(response);
    return response.json();
  }, [authHeaders, handleUnauthorized, isOffline]);

  const mapSessionUser = (raw: any): User => {
    const primaryRole = raw.roles?.[0] || raw.role;
    let role = primaryRole;
    if (role === 'company_manager') role = 'manager';
    if (role === 'cafe_manager') role = 'cafe';

    return {
      id: String(raw.id),
      employeeId: raw.employeeId ?? raw.employee_external_id ?? '',
      fullName: raw.fullName ?? raw.fullname ?? '',
      role,
      email: raw.email ?? '',
      phone: raw.phone ?? raw.phone_number ?? '',
      department: raw.department ?? '',
      balance: Number(raw.balance ?? 0),
      monthlyAllocation: Number(raw.monthlyAllocation ?? 0),
      balanceTier: raw.balanceTier ?? '',
      isActive: raw.isActive ?? raw.is_active ?? true,
      encryptedQrToken: raw.encryptedQrToken,
    };
  };

  const fetchMe = useCallback(async () => {
    if (!token || isOffline) return;
    try {
      const response = await apiGet('/api/auth/me');
      const data = unwrapData(response);
      setUser(mapSessionUser(data.user));
    } catch (e) {
      console.error('Error fetching current user:', e);
      handleUnauthorized();
    }
  }, [token, apiGet, isOffline, handleUnauthorized]);

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token || isOffline) return;
    try {
      const response = await apiGet('/api/notifications?limit=50');
      const data = unwrapData(response);
      const items = (data.items ?? data.notifications ?? []).map(normalizeNotification);
      setNotifications(items);
      setUnreadCount(items.filter((n: any) => !n.read).length);
    } catch (e) {
      console.error('Error loading notifications', e);
    }
  }, [token, apiGet, isOffline]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  const setLanguage = (lang: 'en' | 'am') => {
    setLangState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('esrom_lang', lang);
  };

  const login = async (employeeId: string, password: string): Promise<any> => {
    setGlobalLoading(true);
    try {
      const response = await apiPost('/api/auth/login', { employee_external_id: employeeId, password });
      const { token: userToken, refresh_token, user: rawUser } = unwrapData(response);
      
      localStorage.setItem('token', userToken);
      localStorage.setItem('refresh_token', refresh_token);
      
      const clientRole = rawUser.roles?.[0] || rawUser.role;
      localStorage.setItem('role', clientRole);
      
      setToken(userToken);
      setUser(mapSessionUser({ ...rawUser, role: clientRole }));
      
      setGlobalLoading(false);
      return { token: userToken, role: clientRole, user: mapSessionUser({ ...rawUser, role: clientRole }) };
    } catch (e) {
      setGlobalLoading(false);
      throw e;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await apiPost('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.error('Error logging out from backend:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
    setCart([]);
    setActiveCafe(null);
    setNotifications([]);
    setUnreadCount(0);
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
      await apiPatch('/api/notifications/read-all', {});
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

  // Replay queued waiter orders when back online (one-by-one against /api/waiter/order)
  const triggerSync = async () => {
    if (offlineQueue.length === 0 || isOffline) return;
    setGlobalLoading(true);
    try {
      const remaining: any[] = [];
      for (const order of offlineQueue) {
        try {
          await apiPost('/api/waiter/order', order);
        } catch (e) {
          remaining.push(order);
        }
      }
      setOfflineQueue(remaining);
      localStorage.setItem('esrom_offline_queue', JSON.stringify(remaining));
      setGlobalLoading(false);
      fetchNotifications();
      if (remaining.length > 0) {
        throw new Error(`${remaining.length} offline order(s) could not be synced`);
      }
    } catch (e) {
      console.error('Sync failed:', e);
      setGlobalLoading(false);
      throw e;
    }
  };

  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0 && token) {
      triggerSync().catch(console.error);
    }
  }, [isOffline]);

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
        apiPatch,
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
