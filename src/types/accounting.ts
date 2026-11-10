export type AccountingPaymentMethod = 'cash' | 'card' | 'bank_transfer';

export type PurchaseCategory = 
  | 'spare_parts'          // قطع غيار
  | 'oils_fluids'          // زيوت وسوائل
  | 'tools_equipment'      // أدوات ومعدات
  | 'operating_supplies'   // مستلزمات تشغيل
  | 'other';               // أخرى

export type ExpenseCategory = 
  | 'salaries'             // رواتب
  | 'rent'                 // إيجار
  | 'fuel_transportation'  // وقود ونقل
  | 'maintenance'          // صيانة سيارات ومعدات
  | 'telecom'              // اتصالات وإنترنت
  | 'marketing'            // تسويق
  | 'government_fees'      // رسوم حكومية وتراخيص
  | 'software_subscriptions' // برامج واشتراكات
  | 'admin_expenses'       // مصروفات إدارية
  | 'other';               // أخرى

export interface AccountingServiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type InvoiceStatus = 'issued' | 'partially_paid' | 'paid' | 'cancelled';

export interface AccountingServiceInvoice {
  id: string; // e.g. "srv_20261103_001"
  invoiceNumber: string; // e.g. "DRF-INV-1001"
  financialAccountId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  maintenanceId?: string; // Optional booking link
  carInfo?: {
    make?: string;
    model?: string;
    year?: string;
    plateNumber?: string;
  };
  items: AccountingServiceItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string; // Mandatory if discountAmount > 0
  amountAfterDiscount: number;
  vatRate: number; // e.g. 0.15 (15%)
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  remainingBalance: number;
  status: InvoiceStatus;
  cancellationReason?: string;
  createdByStaffId: string;
  createdByStaffName: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export type VoucherType = 'receipt' | 'refund';
export type VoucherStatus = 'active' | 'cancelled';

export interface AccountingVoucher {
  id: string; // e.g. "vch_20261103_001"
  voucherNumber: string; // e.g. "DRF-RCT-1001"
  voucherType: VoucherType;
  serviceInvoiceId?: string;
  financialAccountId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentMethod: AccountingPaymentMethod;
  bankReference?: string;
  notes?: string;
  status: VoucherStatus;
  cancellationReason?: string;
  recordedByStaffId: string;
  recordedByStaffName: string;
  createdAt: string; // ISO 8601
}

export interface AccountingPurchase {
  id: string; // e.g. "pur_20261103_001"
  purchaseNumber: string; // e.g. "DRF-PUR-1001"
  category: PurchaseCategory;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isTaxable: boolean;
  vatRate: number; // e.g. 0.15 or 0
  vatAmount: number;
  finalTotal: number;
  supplierName: string;
  supplierInvoiceNumber: string;
  paymentMethod: AccountingPaymentMethod;
  receiptAttachmentUrl?: string;
  maintenanceId?: string; // Optional link to specific car/job
  notes?: string;
  paymentStatus: 'paid' | 'unpaid';
  status: 'active' | 'cancelled';
  cancellationReason?: string;
  recordedByStaffId: string;
  recordedByStaffName: string;
  purchaseDate: string;
  createdAt: string;
}

export interface AccountingExpense {
  id: string; // e.g. "exp_20261103_001"
  expenseNumber: string; // e.g. "DRF-EXP-1001"
  category: ExpenseCategory;
  title: string;
  amountBeforeVat: number;
  isTaxable: boolean;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: AccountingPaymentMethod;
  payeeOrVendor: string;
  receiptAttachmentUrl?: string;
  notes?: string;
  expenseDate: string;
  paymentStatus: 'paid' | 'unpaid';
  status: 'active' | 'cancelled';
  cancellationReason?: string;
  approvedByStaffId: string;
  approvedByStaffName: string;
  createdAt: string;
}

export interface CustomerFinancialAccount {
  id: string; // e.g. "cfa_<customerId>"
  customerId: string;
  customerName: string;
  primaryPhone: string;
  phoneHistory: string[];
  currentBalance: number; // Positive = owes money, zero = settled, negative = credit
  totalBilled: number;
  totalPaid: number;
  linkedBookingIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingAuditLog {
  id: string;
  action: 
    | 'CREATE_INVOICE'
    | 'CANCEL_INVOICE'
    | 'RECORD_PAYMENT'
    | 'RECORD_REFUND'
    | 'CANCEL_VOUCHER'
    | 'CREATE_PURCHASE'
    | 'CANCEL_PURCHASE'
    | 'CREATE_EXPENSE'
    | 'CANCEL_EXPENSE'
    | 'SET_PERMISSION'
    | 'CREATE_CUSTOMER_ACCOUNT'
    | 'LOGIN'
    | 'LOGOUT';
  targetType: 'service' | 'voucher' | 'purchase' | 'expense' | 'permission' | 'auth' | 'customer';
  targetId: string;
  performedBy: {
    id: string;
    name: string;
    username: string;
  };
  reason?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface FinancialSummaryReport {
  period: {
    from: string;
    to: string;
    label: string;
  };
  services: {
    totalSubtotal: number;
    totalDiscounts: number;
    totalVat: number;
    totalInvoiced: number; // Grand total of active invoices
    invoiceCount: number;
  };
  collections: {
    totalCollected: number; // Gross receipts - gross refunds
    cashAmount: number;
    cardAmount: number;
    bankTransferAmount: number;
    refundsAmount: number;
    vouchersCount: number;
  };
  receivables: {
    totalOutstanding: number; // Remaining balance on unpaid active invoices
  };
  purchases: {
    totalPurchases: number;
    byCategory: Record<PurchaseCategory, number>;
    purchasesCount: number;
  };
  expenses: {
    totalExpenses: number;
    byCategory: Record<ExpenseCategory, number>;
    expensesCount: number;
  };
  cashFlow: {
    netCashMovement: number; // totalCollected - totalPurchases - totalExpenses
  };
}
