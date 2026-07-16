/**
 * Normalize backend (snake_case) responses into frontend camelCase shapes.
 */

export const normalizeMenuItem = (item: any) => ({
  id: String(item.id),
  name: item.name ?? '',
  description: item.description ?? '',
  price: Number(item.price ?? 0),
  category: (item.category as 'Food' | 'Beverage' | 'Snack') || 'Food',
  photo: item.image_url || item.photo || '',
  available: item.is_available ?? item.available ?? true,
  cafeId: item.cafe_id ?? item.cafeId ?? null,
});

export const normalizeOrderItem = (item: any) => ({
  itemId: String(item.menu_item_id ?? item.itemId ?? item.id ?? ''),
  name: item.item_name_snapshot ?? item.menu_items?.name ?? item.name ?? '',
  price: Number(item.unit_price_snapshot ?? item.menu_items?.price ?? item.price ?? 0),
  quantity: Number(item.quantity ?? 1),
});

export const normalizeOrder = (o: any) => ({
  id: String(o.id),
  orderUuid: o.order_uuid ?? o.orderUuid ?? '',
  employeeId: String(o.employee_id ?? o.employeeId ?? o.users?.employee_external_id ?? ''),
  employeeName:
    o.employee_name ??
    o.users?.fullname ??
    o.employee?.fullname ??
    o.employeeName ??
    '',
  department: o.users?.departments?.name ?? o.department ?? '',
  items: (o.order_items ?? o.items ?? []).map(normalizeOrderItem),
  amount: Number(o.total_amount ?? o.amount ?? 0),
  waiterName:
    o.waiter_name ??
    o.waiter?.fullname ??
    o.waiterName ??
    (o.waiter_id ? 'Waiter' : 'Online'),
  status: o.status ?? 'pending',
  date: o.created_at ?? o.date ?? new Date().toISOString(),
  location: o.cafes?.name ?? o.cafe?.name ?? o.location ?? '',
  cafe: o.cafes?.name ?? o.cafe?.name ?? o.location ?? '',
  cafeId: o.cafe_id ?? o.cafeId ?? null,
  comment: o.comment,
  rating: o.rating,
});

export const normalizeNotification = (n: any) => ({
  id: String(n.id),
  title: n.title ?? '',
  message: n.message ?? '',
  type: n.type ?? 'system',
  read: n.is_read ?? n.read ?? false,
  timestamp: n.created_at
    ? formatRelativeTime(n.created_at)
    : (n.timestamp ?? ''),
  createdAt: n.created_at ?? n.createdAt ?? null,
});

export const normalizeCafe = (c: any) => ({
  id: String(c.id),
  name: c.name ?? '',
  location: c.location ?? '',
  isActive: c.is_active ?? true,
});

export const normalizeWaiterPerformance = (w: any) => ({
  id: String(w.waiter_id ?? w.id ?? ''),
  name: w.waiter_name ?? w.name ?? 'Waiter',
  avatar: '',
  totalOrders: Number(w.total_orders ?? w.totalOrders ?? 0),
  avgDeliveryTime: w.avgDeliveryTime ?? '—',
  flaggedIssues: Number(w.flaggedIssues ?? 0),
  rating: Number(w.rating ?? 0),
  totalSales: Number(w.total_sales ?? 0),
});

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export const unwrapData = <T = any>(response: any): T => {
  if (response?.data !== undefined) return response.data as T;
  return response as T;
};
