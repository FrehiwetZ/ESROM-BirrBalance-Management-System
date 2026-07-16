import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  UtensilsCrossed,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Check,
  AlertTriangle,
  Download,
  DollarSign,
  Clock,
  ThumbsUp
} from 'lucide-react';
import {
  MiniSparklineChart,
  DailyOrderVolumeChart,
  FrequentVisitorsChart,
  MostOrderedItemsChart,
  PeakOrderTimesChart
} from '../../components/charts/DashboardCharts';
import { exportToExcel } from '../../utils/exportHelpers';
import {
  normalizeMenuItem,
  normalizeOrder,
  normalizeWaiterPerformance,
  unwrapData,
} from '../../utils/apiMappers';

const currentMonthString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatPeakHour = (hour: string) => {
  const raw = String(hour ?? '').split(':')[0];
  const h = Number(raw);
  if (Number.isNaN(h)) return String(hour ?? '—');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${String(display).padStart(2, '0')} ${suffix}`;
};

const downloadCafeReport = async (month: string, fmt: 'csv' | 'xlsx' | 'pdf') => {
  const token = localStorage.getItem('token');
  const res = await fetch(
    `/api/cafe/reports/operational?month=${encodeURIComponent(month)}&format=${fmt}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error('Failed to download report');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] || `cafe-operational-report-${month}.${fmt}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function CafePortal() {
  const { user, apiGet, apiPost, apiPatch, apiDelete } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Determine active tab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('menu')) return 'menu';
    if (path.includes('orders')) return 'orders';
    if (path.includes('waiters')) return 'waiters';
    if (path.includes('analytics')) return 'analytics';
    if (path.includes('reports')) return 'reports';
    return 'dashboard'; // default
  };

  const activeTab = getActiveTab();

  // Shared state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCafeData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const month = currentMonthString();
      const [menuRes, ordersRes, analyticsRes] = await Promise.all([
        apiGet('/api/cafe/menu'),
        apiGet('/api/cafe/orders?limit=100'),
        apiGet(`/api/cafe/analytics?month=${month}`),
      ]);

      const menuData = unwrapData(menuRes);
      const menuList = Array.isArray(menuData) ? menuData : (menuData?.items ?? []);
      setMenuItems(menuList.map(normalizeMenuItem));

      const ordersData = unwrapData(ordersRes);
      const orderList = Array.isArray(ordersData)
        ? ordersData
        : (ordersData?.items ?? ordersData?.orders ?? []);
      setOrders(orderList.map(normalizeOrder));

      const stats = unwrapData(analyticsRes) ?? {};
      setAnalytics(stats);
      const waiterList = (stats.waiter_performance ?? []).map(normalizeWaiterPerformance);
      setWaiters(waiterList);
    } catch (e: any) {
      console.error('Error loading cafe portal data', e);
      setError(e?.message || 'Failed to load cafe data');
    } finally {
      setLoading(false);
    }
  }, [apiGet]);

  useEffect(() => {
    if (user && user.role === 'cafe') {
      loadCafeData();
    }
  }, [user, location.pathname, loadCafeData]);

  if (!user || user.role !== 'cafe') return null;

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-10 font-sans">
        <p className="text-sm font-bold text-subtle-text">Loading café data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-10 font-sans space-y-4">
        <p className="text-sm font-bold text-danger bg-red-50 p-4 rounded-2xl border border-red-200">{error}</p>
        <button
          type="button"
          onClick={() => loadCafeData()}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-10 space-y-8 font-sans">
      {activeTab === 'dashboard' && (
        <CafeDashboardOverview
          orders={orders}
          waiters={waiters}
          analytics={analytics}
        />
      )}
      {activeTab === 'menu' && (
        <CafeMenuManagement
          menuItems={menuItems}
          onReload={loadCafeData}
          apiPost={apiPost}
          apiPatch={apiPatch}
          apiDelete={apiDelete}
        />
      )}
      {activeTab === 'orders' && (
        <CafeOrdersList
          orders={orders}
          onReload={loadCafeData}
          apiPatch={apiPatch}
        />
      )}
      {activeTab === 'waiters' && (
        <CafeWaitersPerformance
          waiters={waiters}
          orders={orders}
        />
      )}
      {activeTab === 'analytics' && (
        <CafeEmployeeUsageAnalytics apiGet={apiGet} />
      )}
      {activeTab === 'reports' && (
        <CafeOperationalReports apiGet={apiGet} />
      )}
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 1: OVERVIEW DASHBOARD
// -----------------------------------------------------------
function CafeDashboardOverview({
  orders,
  waiters,
  analytics,
}: {
  orders: any[];
  waiters: any[];
  analytics: any | null;
}) {
  const totalOrdersToday = analytics?.total_orders ?? orders.filter(o => o.status !== 'expired' && o.status !== 'cancelled').length;
  const totalRevenue = analytics?.total_sales ?? 0;
  const activeWaiters = waiters.length;
  const mostOrderedItem = analytics?.most_ordered_item;
  const mostOrdered = mostOrderedItem
    ? `${mostOrderedItem.name} (${mostOrderedItem.total_quantity})`
    : '—';

  const dailyOrders = (analytics?.daily_orders ?? []) as { date: string; count: number }[];
  const chartData = dailyOrders.map((d) => ({
    day: d.date
      ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      : '—',
    orders: Number(d.count ?? 0),
  }));
  const sparkCounts = dailyOrders.map((d) => Number(d.count ?? 0));
  const orderSpark = sparkCounts.length > 0 ? sparkCounts.slice(-6) : [0];
  const revenueSpark = sparkCounts.length > 0 ? sparkCounts.slice(-6) : [0];

  const handleExportVolume = () => {
    if (chartData.length === 0) return;
    const volumeData = chartData.map((d) => ({ Day: d.day, Orders: d.orders }));
    exportToExcel(volumeData, 'Cafe_Daily_Order_Volume', 'Orders stats');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Café Dashboard</h1>
        <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Live order pipeline, inventory and waiter diagnostics</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Orders */}
        <div className="stat-card-1 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-subtle uppercase tracking-wider">Total Orders Today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-text-primary">{totalOrdersToday}</span>
            </div>
          </div>
          <MiniSparklineChart data={orderSpark} type="bar" color="#3B82F6" />
        </div>

        {/* Revenue */}
        <div className="stat-card-2 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-subtle uppercase tracking-wider">Total Revenue This Month</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-text-subtle">ETB</span>
              <span className="text-2xl font-black text-text-primary">{Number(totalRevenue).toLocaleString()}</span>
            </div>
          </div>
          <MiniSparklineChart data={revenueSpark} color="#8B5CF6" />
        </div>

        {/* Most Ordered Item */}
        <div className="stat-card-3 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-subtle uppercase tracking-wider">Most Ordered Item</p>
            <p className="text-sm font-extrabold text-text-primary">{mostOrdered}</p>
          </div>
          <div className="p-2 bg-info-bg rounded-2xl">
            <UtensilsCrossed className="w-5 h-5 text-info" />
          </div>
        </div>

        {/* Active Waiters */}
        <div className="stat-card-4 rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-subtle uppercase tracking-wider">Active Waiters</p>
            <p className="text-3xl font-black text-text-primary">{activeWaiters}</p>
          </div>
          <div className="p-2 bg-success-bg rounded-2xl">
            <Users className="w-5 h-5 text-success" />
          </div>
        </div>
      </div>

      {/* Bar Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-primary tracking-tight">Daily Order Volume</h3>
              <p className="text-[10px] text-subtle-text font-medium mt-0.5">Summary of kitchen order counts filled throughout the week</p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-xs text-subtle-text py-8 text-center">No daily order data for this month.</p>
          ) : (
            <DailyOrderVolumeChart data={chartData} />
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              id="export-daily-vol-btn"
              onClick={handleExportVolume}
              disabled={chartData.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-slate-50 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Order Data</span>
            </button>
          </div>
        </div>

        {/* Live Waiters Performance List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div>
            <h3 className="text-sm font-black text-primary tracking-tight">Staff Efficiency Stats</h3>
            <p className="text-[10px] text-subtle-text font-medium mt-0.5">Orders and sales per waiter</p>
          </div>

          <div className="space-y-4">
            {waiters.length === 0 ? (
              <p className="text-xs text-subtle-text py-4 text-center">No waiter performance data yet.</p>
            ) : (
              waiters.map((w) => (
                <div key={w.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-primary font-bold flex items-center justify-center uppercase shadow-sm">
                      {(w.name || '?').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">{w.name}</h4>
                      <p className="text-[10px] text-slate-400">ETB {Number(w.totalSales ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold text-slate-600 block">{w.totalOrders} Orders</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div>
          <h3 className="text-sm font-black text-primary tracking-tight">Recent Orders</h3>
          <p className="text-[10px] text-subtle-text font-medium mt-0.5">Live status and waiter assignments for incoming lunch tickets</p>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-subtle-text py-6 text-center">No recent orders.</p>
        ) : (
          <div className="table-container relative -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-subtle-text uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-3">Employee Name</th>
                  <th className="py-3 px-3">Items Ordered</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Waiter Name</th>
                  <th className="py-3 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-6 font-mono font-bold text-primary">{order.id}</td>
                    <td className="py-3 px-3 font-bold text-primary">{order.employeeName}</td>
                    <td className="py-3 px-3 text-slate-500 font-medium max-w-xs truncate">
                      {(order.items ?? []).map((i: any) => `${i.name} (x${i.quantity})`).join(', ') || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-primary">ETB {order.amount}</td>
                    <td className="py-3 px-3 text-center text-slate-600 font-semibold">{order.waiterName}</td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        order.status === 'completed' || order.status === 'confirmed'
                          ? 'bg-green-50 text-success'
                          : order.status === 'ready'
                            ? 'bg-blue-50 text-ready'
                            : 'bg-amber-50 text-warning'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 2: MENU MANAGEMENT
// -----------------------------------------------------------
function CafeMenuManagement({
  menuItems,
  onReload,
  apiPost,
  apiPatch,
  apiDelete
}: {
  menuItems: any[];
  onReload: () => Promise<void>;
  apiPost: (path: string, body: any) => Promise<any>;
  apiPatch: (path: string, body?: any) => Promise<any>;
  apiDelete: (path: string) => Promise<any>;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<'Food' | 'Beverage' | 'Snack'>('Food');
  const [photo, setPhoto] = useState('');
  const [formError, setFormError] = useState('');

  // Delete handlers
  const [deleteItem, setDeleteItem] = useState<any | null>(null);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      setFormError('Item name and price are required.');
      return;
    }

    try {
      await apiPost('/api/cafe/menu', {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        is_available: true,
      });

      setName('');
      setDescription('');
      setPrice('');
      setCategory('Food');
      setPhoto('');
      setShowAddModal(false);
      setFormError('');
      onReload();
    } catch (e: any) {
      setFormError(e.message || 'Error creating menu item');
    }
  };

  const handleToggleAvailable = async (item: any) => {
    try {
      await apiPatch(`/api/cafe/menu/${item.id}/availability`, {
        is_available: !item.available,
      });
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await apiDelete(`/api/cafe/menu/${deleteItem.id}`);
      setDeleteItem(null);
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Menu Management</h1>
          <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Configure cafe meals, pricing, and availability triggers</p>
        </div>
        <button
          id="add-menu-trigger-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-secondary text-white rounded-xl text-xs font-bold shadow-md transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Grid layout */}
      {menuItems.length === 0 ? (
        <p className="text-xs text-subtle-text py-10 text-center bg-white rounded-3xl border border-slate-100">
          No menu items yet. Add your first dish to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between group">
              {/* Meal Image */}
              <div className="h-40 overflow-hidden relative bg-slate-100">
                <img
                  src={item.photo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300&auto=format&fit=crop'}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full">
                  {item.category || 'Food'}
                </span>
              </div>

              {/* Content Body */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-black text-primary line-clamp-1">{item.name}</h3>
                    <span className="text-xs font-extrabold text-secondary flex-shrink-0">ETB {item.price}</span>
                  </div>
                  <p className="text-[11px] text-subtle-text line-clamp-2 leading-relaxed">{item.description || 'No description provided.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                  {/* Available toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`menu-toggle-avail-${item.id}`}
                      onClick={() => handleToggleAvailable(item)}
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                        item.available ? 'bg-success' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                        item.available ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {/* Delete option */}
                  <button
                    id={`menu-delete-trigger-${item.id}`}
                    onClick={() => setDeleteItem(item)}
                    className="p-2 border border-slate-200 hover:border-red-200 rounded-lg text-slate-400 hover:text-danger transition-all"
                    title="Permanently Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div id="add-menu-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative space-y-6 modal-card">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-primary tracking-tight">Add New Dish</h3>
              <p className="text-xs text-subtle-text">Create foods or beverages in the cafeteria database</p>
            </div>

            {formError && (
              <p className="text-xs font-bold text-danger bg-red-50 p-3 rounded-xl border border-red-200">{formError}</p>
            )}

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Dish Name *</label>
                <input
                  id="add-menu-name"
                  type="text"
                  required
                  placeholder="e.g. Kitfo Special"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  id="add-menu-desc"
                  placeholder="e.g. Finely chopped raw beef mixed with mitmita and niter kibeh..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Price (ETB) *</label>
                  <input
                    id="add-menu-price"
                    type="number"
                    required
                    placeholder="e.g. 250"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    id="add-menu-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Food">Food</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Photo URL</label>
                <input
                  id="add-menu-photo"
                  type="text"
                  placeholder="e.g. https://images.unsplash.com/..."
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  id="add-menu-submit-btn"
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-secondary min-h-[44px]"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteItem && (
        <div id="delete-menu-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <div>
              <h3 className="text-base font-black text-danger tracking-tight">Permanently Delete Dish?</h3>
              <p className="text-xs text-subtle-text mt-1">Are you sure you want to delete <strong>{deleteItem.name}</strong> from the active cafeteria menus? This cannot be undone.</p>
            </div>

            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                id="delete-menu-confirm-btn"
                onClick={handleDeleteItem}
                className="flex-1 py-3 bg-danger text-white font-bold rounded-xl hover:bg-red-600 min-h-[44px]"
              >
                Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 3: LIVE ACTIVE ORDERS PIPELINE
// -----------------------------------------------------------
function CafeOrdersList({
  orders,
  onReload,
  apiPatch
}: {
  orders: any[];
  onReload: () => Promise<void>;
  apiPatch: (path: string, body?: any) => Promise<any>;
}) {
  const queueOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const deliveredOrders = orders.filter(o => o.status === 'completed' || o.status === 'confirmed');

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      await apiPatch(`/api/orders/${orderId}/status`, { status: nextStatus });
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  const renderOrderCard = (o: any, action?: React.ReactNode) => (
    <div key={o.id} className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 ${action ? '' : 'opacity-80 space-y-2'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-extrabold text-xs text-primary">{o.employeeName}</h4>
          <span className="text-[9px] text-slate-400 font-mono">{o.id}</span>
        </div>
        <span className={`text-[10px] font-black ${action ? 'text-secondary' : 'text-success'}`}>ETB {o.amount}</span>
      </div>
      {action ? (
        <>
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl space-y-0.5 font-semibold">
            {(o.items ?? []).map((i: any) => (
              <p key={i.itemId || `${i.name}-${i.quantity}`}>&bull; {i.name} (x{i.quantity})</p>
            ))}
          </div>
          {action}
        </>
      ) : (
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-success" />
          <span>Completed</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Kitchen Orders</h1>
        <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Monitor live order statuses and handle prep pipelines</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-xs text-subtle-text py-10 text-center bg-white rounded-3xl border border-slate-100">
          No kitchen orders right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Stage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-primary uppercase tracking-wider">Queue / Pending</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {queueOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {queueOrders.length === 0 ? (
                <p className="text-[11px] text-subtle-text text-center py-4">Queue is empty</p>
              ) : (
                queueOrders.map(o =>
                  renderOrderCard(
                    o,
                    <button
                      id={`btn-prep-${o.id}`}
                      onClick={() => handleUpdateStatus(o.id, 'ready')}
                      className="w-full text-center py-2 bg-primary hover:bg-secondary text-white font-bold rounded-lg text-[10px] uppercase shadow-sm transition-all"
                    >
                      Mark as Ready / Out for delivery
                    </button>
                  )
                )
              )}
            </div>
          </div>

          {/* Ready Stage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-primary uppercase tracking-wider">Ready for Delivery</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-ready text-[10px] font-bold">
                {readyOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {readyOrders.length === 0 ? (
                <p className="text-[11px] text-subtle-text text-center py-4">No ready orders</p>
              ) : (
                readyOrders.map(o =>
                  renderOrderCard(
                    o,
                    <div className="flex gap-1.5">
                      <button
                        id={`btn-confirm-${o.id}`}
                        onClick={() => handleUpdateStatus(o.id, 'completed')}
                        className="flex-1 text-center py-2 bg-success text-white font-bold rounded-lg text-[10px] uppercase shadow-sm transition-all"
                      >
                        Delivered
                      </button>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          {/* Confirmed / Delivered Stage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-primary uppercase tracking-wider">Delivered / Confirmed</span>
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-success text-[10px] font-bold">
                {deliveredOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {deliveredOrders.length === 0 ? (
                <p className="text-[11px] text-subtle-text text-center py-4">No delivered orders</p>
              ) : (
                deliveredOrders.slice(0, 4).map(o => renderOrderCard(o))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 4: WAITER PERFORMANCE VIEW
// -----------------------------------------------------------
function CafeWaitersPerformance({
  waiters,
  orders,
}: {
  waiters: any[];
  orders: any[];
}) {
  const [expandedWaiterId, setExpandedWaiterId] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Waiter Efficiency</h1>
        <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Track order volume and sales by waiter</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {waiters.length === 0 ? (
          <p className="text-xs text-subtle-text py-10 text-center">No waiter performance data for this period.</p>
        ) : (
          <div className="table-container relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-subtle-text uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6 w-16"></th>
                  <th className="py-4 px-4">Waiter Name</th>
                  <th className="py-4 px-4 text-center">Total Orders Handled</th>
                  <th className="py-4 px-4 text-center">Total Sales</th>
                  <th className="py-4 px-6 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {waiters.map((w) => {
                  const isExpanded = expandedWaiterId === w.id;
                  const waiterOrders = orders.filter(o => o.waiterName === w.name);

                  return (
                    <React.Fragment key={w.id}>
                      <tr
                        onClick={() => setExpandedWaiterId(isExpanded ? null : w.id)}
                        className="hover:bg-slate-50/40 cursor-pointer select-none"
                      >
                        <td className="py-4 px-6 text-center">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </td>
                        <td className="py-4 px-4 font-bold text-primary flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-primary font-bold flex items-center justify-center uppercase shadow-sm">
                            {(w.name || '?').charAt(0)}
                          </div>
                          <span>{w.name}</span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-600">{w.totalOrders}</td>
                        <td className="py-4 px-4 text-center font-medium text-slate-600">
                          ETB {Number(w.totalSales ?? 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-400 font-bold text-[10px] uppercase">
                          {isExpanded ? 'Hide' : 'View'}
                        </td>
                      </tr>

                      {/* Expands details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/30 px-8 py-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-inner space-y-4">
                              <h4 className="text-[10px] font-bold text-subtle-text uppercase tracking-wider border-b pb-2">Completed Logs by {w.name}</h4>
                              {waiterOrders.length === 0 ? (
                                <p className="text-xs text-subtle-text">No orders logged in this active session yet.</p>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar text-xs">
                                  {waiterOrders.map(o => (
                                    <div key={o.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                                      <span className="font-mono font-bold text-slate-500">{o.id}</span>
                                      <span className="font-bold text-primary">{o.employeeName}</span>
                                      <span className="font-bold text-secondary">ETB {o.amount}</span>
                                      <span className="text-slate-400 font-medium">{new Date(o.date).toLocaleTimeString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 5: EMPLOYEE USAGE ANALYTICS
// -----------------------------------------------------------
function CafeEmployeeUsageAnalytics({
  apiGet,
}: {
  apiGet: (path: string) => Promise<any>;
}) {
  const [dateRange, setDateRange] = useState(currentMonthString());
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiGet(`/api/cafe/analytics?month=${encodeURIComponent(dateRange)}`);
        if (!cancelled) {
          setAnalytics(unwrapData(res) ?? {});
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load analytics');
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [apiGet, dateRange]);

  const visitorsData = (analytics?.employee_usage ?? []).map((e: any) => ({
    name: e.employee_name || e.name || 'Employee',
    visits: Number(e.total_orders ?? e.visits ?? 0),
  }));

  const itemsData = (analytics?.popular_menu_items ?? []).map((i: any) => ({
    name: i.name || 'Item',
    count: Number(i.total_quantity ?? i.count ?? 0),
  }));

  const hoursData = (analytics?.peak_ordering_hours ?? []).map((h: any) => ({
    hour: formatPeakHour(h.hour),
    Orders: Number(h.count ?? h.Orders ?? 0),
  }));

  const handleExportVisitors = () => {
    if (visitorsData.length === 0) return;
    exportToExcel(visitorsData, 'Cafe_Top_Visitors', 'Visits count');
  };

  const handleExportItems = () => {
    if (itemsData.length === 0) return;
    exportToExcel(itemsData, 'Cafe_Top_Items', 'Units count');
  };

  const handleExportHours = () => {
    if (hoursData.length === 0) return;
    exportToExcel(hoursData, 'Cafe_Peak_Hours', 'Hours count');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Usage Analytics</h1>
          <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Review dining spikes, top visitors, and top foods</p>
        </div>
        <div className="text-xs font-bold text-slate-700">
          <input
            id="analytics-month-picker"
            type="month"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
          />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-subtle-text">Loading analytics…</p>
      )}
      {error && (
        <p className="text-xs font-bold text-danger bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visitor Stats */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-wider">Most Frequent Employee Visitors</h3>
            {visitorsData.length === 0 ? (
              <p className="text-xs text-subtle-text py-6 text-center">No visitor data for this month.</p>
            ) : (
              <FrequentVisitorsChart data={visitorsData} />
            )}
            <button
              id="export-visitors-btn"
              onClick={handleExportVisitors}
              disabled={visitorsData.length === 0}
              className="w-full text-center py-2.5 border border-primary text-primary hover:bg-slate-50 text-[10px] font-bold uppercase rounded-xl transition-all disabled:opacity-40"
            >
              Export Visitor Data
            </button>
          </div>

          {/* Food items stats */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-wider">Most Ordered Menu Items</h3>
            {itemsData.length === 0 ? (
              <p className="text-xs text-subtle-text py-6 text-center">No item data for this month.</p>
            ) : (
              <MostOrderedItemsChart data={itemsData} />
            )}
            <button
              id="export-items-btn"
              onClick={handleExportItems}
              disabled={itemsData.length === 0}
              className="w-full text-center py-2.5 border border-primary text-primary hover:bg-slate-50 text-[10px] font-bold uppercase rounded-xl transition-all disabled:opacity-40"
            >
              Export Item Data
            </button>
          </div>

          {/* Peak Hours line */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-xs font-black text-primary uppercase tracking-wider">Peak Dining Times by Hour</h3>
            {hoursData.length === 0 ? (
              <p className="text-xs text-subtle-text py-6 text-center">No peak-hour data for this month.</p>
            ) : (
              <PeakOrderTimesChart data={hoursData} />
            )}
            <button
              id="export-hours-btn"
              onClick={handleExportHours}
              disabled={hoursData.length === 0}
              className="w-full text-center py-2.5 border border-primary text-primary hover:bg-slate-50 text-[10px] font-bold uppercase rounded-xl transition-all disabled:opacity-40"
            >
              Export Hours Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// SUB-PAGE 6: OPERATIONAL REPORTS
// -----------------------------------------------------------
function CafeOperationalReports({
  apiGet,
}: {
  apiGet: (path: string) => Promise<any>;
}) {
  const [month, setMonth] = useState(currentMonthString());
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiGet(
          `/api/cafe/reports/operational?month=${encodeURIComponent(month)}&format=json`
        );
        const data = unwrapData(res);
        if (!cancelled) {
          setMetrics(data?.metrics ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load operational report');
          setMetrics([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [apiGet, month]);

  const summary = metrics.find((m) => m.metric === 'summary');
  const totalOrders = Number(summary?.total_orders ?? 0);
  const totalRevenue = Number(summary?.total_sales ?? 0);

  const handleDownload = async (fmt: 'csv' | 'xlsx' | 'pdf') => {
    setExportError('');
    try {
      await downloadCafeReport(month, fmt);
    } catch (e: any) {
      setExportError(e?.message || `Failed to export ${fmt.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Operational Reports</h1>
        <p className="text-xs text-subtle-text font-medium uppercase tracking-wider mt-1">Audit ledger logs and cafeteria sales summaries</p>
      </div>

      {/* Month picker */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-xs">
        <div className="space-y-1.5 w-full md:w-auto">
          <label className="font-bold text-slate-700">Report Month</label>
          <input
            id="ops-month-picker"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-accent font-semibold w-full"
          />
        </div>
      </div>

      {loading && <p className="text-xs text-subtle-text">Loading report…</p>}
      {error && (
        <p className="text-xs font-bold text-danger bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}
      {exportError && (
        <p className="text-xs font-bold text-danger bg-red-50 p-3 rounded-xl border border-red-200">{exportError}</p>
      )}

      {/* Summary boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-subtle-text uppercase tracking-wider">Total Sales count</p>
          <p className="text-2xl font-black text-primary mt-1">{totalOrders} orders</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-subtle-text uppercase tracking-wider">Accumulated Sales Value</p>
          <p className="text-2xl font-black text-secondary mt-1">ETB {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Export row */}
      <div className="flex flex-wrap gap-2.5">
        <button
          id="ops-export-xlsx-btn"
          onClick={() => handleDownload('xlsx')}
          className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary hover:bg-slate-50 rounded-xl text-xs font-bold transition-all min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          <span>Export XLSX</span>
        </button>
        <button
          id="ops-export-pdf-btn"
          onClick={() => handleDownload('pdf')}
          className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary hover:bg-slate-50 rounded-xl text-xs font-bold transition-all min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </button>
        <button
          id="ops-export-csv-btn"
          onClick={() => handleDownload('csv')}
          className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary hover:bg-slate-50 rounded-xl text-xs font-bold transition-all min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Metrics table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {(!loading && metrics.length === 0) ? (
          <p className="text-xs text-subtle-text py-10 text-center">No operational metrics for this month.</p>
        ) : (
          <div className="table-container relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-subtle-text uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Metric</th>
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4 text-right">Orders</th>
                  <th className="py-4 px-4 text-right">Sales / Qty</th>
                  <th className="py-4 px-6">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {metrics.map((m, idx) => (
                  <tr key={`${m.metric}-${m.name}-${idx}`} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-6 font-mono font-bold text-primary text-[10px] uppercase">{m.metric}</td>
                    <td className="py-3 px-4 font-bold text-primary">{m.name}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-600">
                      {m.total_orders != null ? m.total_orders : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-primary">
                      {m.total_sales != null
                        ? `ETB ${Number(m.total_sales).toLocaleString()}`
                        : m.quantity != null
                          ? m.quantity
                          : '—'}
                    </td>
                    <td className="py-3 px-6 text-slate-400 font-semibold">{m.extra || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
