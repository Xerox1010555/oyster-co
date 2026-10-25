'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/auth';
import { transitionOrder, isValidStatus } from '@/lib/orders';

export async function setOrderStatus(formData: FormData) {
  if (!(await isAdmin())) return;
  const orderId = String(formData.get('orderId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!orderId || !isValidStatus(status)) return;
  await transitionOrder(orderId, status, 'admin');
  revalidatePath('/admin');
}
