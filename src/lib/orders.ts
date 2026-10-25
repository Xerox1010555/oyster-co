import { prisma } from './prisma';

export const ORDER_STATUSES = ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isValidStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export async function nextOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  return `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
}

/** Central transition: writes the Order row + appends an OrderEvent. */
export async function transitionOrder(orderId: string, to: OrderStatus, by: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === to) return order ?? null;
  const [updated] = await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: to } }),
    prisma.orderEvent.create({
      data: { orderId, from: order.status, to, by },
    }),
  ]);
  return updated;
}

export function lineLabel(configJson: string, ar: boolean): string {
  try {
    const cfg = JSON.parse(configJson);
    return (ar ? cfg.labelAr : cfg.labelEn) ?? '';
  } catch {
    return '';
  }
}

export function statusLabelAr(status: string): string {
  const map: Record<string, string> = {
    pending: 'بانتظار الدفع', paid: 'مدفوعة', confirmed: 'مؤكدة',
    shipped: 'قيد الشحن', delivered: 'تم التسليم', cancelled: 'ملغاة', refunded: 'مُستردة',
  };
  return map[status] ?? status;
}
export function statusLabelEn(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending', paid: 'Paid', confirmed: 'Confirmed',
    shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
  };
  return map[status] ?? status;
}
