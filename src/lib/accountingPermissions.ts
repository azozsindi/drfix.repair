import { StaffUser } from '../types';

/**
 * Checks if a user has the explicit, non-inherited accounting_admin permission.
 * Strictly prevents automatic inheritance by super_admin, managers, or technicians.
 */
export function hasAccountingAdmin(user: StaffUser | null | undefined): boolean {
  if (!user || user.isActive === false) return false;
  // Technicians are strictly forbidden from having accounting access
  if (user.role === 'technician') return false;
  return user.permissions?.accounting_admin === true;
}

/**
 * Format SAR currency in Arabic / English standard format
 */
export function formatCurrency(amount: number, locale: 'ar' | 'en' = 'ar'): string {
  const rounded = Number((amount || 0).toFixed(2));
  if (locale === 'en') {
    return `${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  }
  return `${rounded.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

/**
 * Validates a financial calculation for a service invoice
 */
export function calculateServiceTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountAmount: number = 0,
  vatRate: number = 0.15
): {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  vatAmount: number;
  grandTotal: number;
} {
  const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const discount = Math.max(0, Math.min(Number(discountAmount) || 0, subtotal));
  const taxableAmount = Math.max(0, subtotal - discount);
  const vatAmount = Number((taxableAmount * (Number(vatRate) || 0)).toFixed(2));
  const grandTotal = Number((taxableAmount + vatAmount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    vatAmount,
    grandTotal
  };
}
