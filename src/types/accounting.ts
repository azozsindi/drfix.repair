import { Timestamp } from 'firebase/firestore';

export type PaymentPermission = 
  | 'view_payments'
  | 'create_payment'
  | 'edit_payment'
  | 'approve_payment'
  | 'reject_payment'
  | 'cancel_payment'
  | 'delete_payment'
  | 'view_financial_reports'
  | 'export_financial_reports'
  | 'manage_payment_permissions';

export interface PermissionDefinition {
  id: PaymentPermission;
  name: string;
  description: string;
  category: 'operations' | 'approvals' | 'reports' | 'admin';
}

export const ALL_PAYMENT_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'view_payments',
    name: 'مشاهدة المدفوعات',
    description: 'استعراض قائمة المدفوعات اليدوية وتفاصيل السندات',
    category: 'operations'
  },
  {
    id: 'create_payment',
    name: 'إضافة دفعة يدوية',
    description: 'تسجيل دفعة أو سند قبض يدوي جديد في النظام المحاسبي',
    category: 'operations'
  },
  {
    id: 'edit_payment',
    name: 'تعديل المدفوعات',
    description: 'تعديل بيانات الدفعات قبل الاعتماد (أو مع توثيق السبب بعد الاعتماد للمخولين)',
    category: 'operations'
  },
  {
    id: 'approve_payment',
    name: 'اعتماد المدفوعات',
    description: 'اعتماد وترحيل الدفعات رسمياً في الحسابات المالية',
    category: 'approvals'
  },
  {
    id: 'reject_payment',
    name: 'رفض المدفوعات',
    description: 'رفض الدفعة المعلقة مع تسجيل السبب في السجل الرقابي',
    category: 'approvals'
  },
  {
    id: 'cancel_payment',
    name: 'إلغاء المدفوعات',
    description: 'إلغاء سند قبض معتمد أو معلق مع تسجيل سبب الإلغاء الإلزامي',
    category: 'approvals'
  },
  {
    id: 'delete_payment',
    name: 'حذف المدفوعات',
    description: 'حذف سجل الدفعة نهائياً من النظام (صلاحية خاصة جداً)',
    category: 'operations'
  },
  {
    id: 'view_financial_reports',
    name: 'مشاهدة التقارير المالية',
    description: 'استعراض الإيرادات والتحليلات والملخصات المحاسبية',
    category: 'reports'
  },
  {
    id: 'export_financial_reports',
    name: 'تصدير التقارير وسندات القبض',
    description: 'تصدير تقارير المدفوعات وسندات القبض كملفات Word و PDF و Excel',
    category: 'reports'
  },
  {
    id: 'manage_payment_permissions',
    name: 'إدارة صلاحيات وأدوار المدفوعات',
    description: 'إنشاء وتعديل الأدوار المخصصة وتعيين الصلاحيات للمستخدمين',
    category: 'admin'
  }
];

export interface PaymentRole {
  id: string; // e.g. 'owner', 'accountant', 'manager', 'staff', 'technician', or custom 'role-xxx'
  code: string;
  name: string;
  description: string;
  isSystem?: boolean;
  permissions: PaymentPermission[];
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface AccountingUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  roleId: string;
  customPermissions?: PaymentPermission[]; // overrides if needed
  isActive: boolean;
  lastLogin?: string | Timestamp;
  createdAt: string | Timestamp;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'pos' | 'cheque';
export type PaymentCategory = 'service_fee' | 'part_sale' | 'advance_deposit' | 'maintenance_settlement' | 'other';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PaymentEditRecord {
  modifiedAt: string;
  modifiedBy: {
    id: string;
    name: string;
    role: string;
  };
  reason: string;
  oldAmount: number;
  newAmount: number;
  oldPayerName?: string;
  newPayerName?: string;
  notes?: string;
}

export interface ManualPayment {
  id: string;
  paymentNumber: string; // e.g. "DRF-PAY-1001"
  amount: number;
  payerName: string;
  payerPhone: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  category: PaymentCategory;
  bookingId?: string;
  notes?: string;
  status: PaymentStatus;
  createdAt: any;
  createdBy: {
    id: string;
    name: string;
    role: string;
    email?: string;
  };
  approvedAt?: any;
  approvedBy?: {
    id: string;
    name: string;
    role: string;
  };
  rejectedAt?: any;
  rejectedBy?: {
    id: string;
    name: string;
    role: string;
  };
  rejectionReason?: string;
  cancelledAt?: any;
  cancelledBy?: {
    id: string;
    name: string;
    role: string;
  };
  cancellationReason?: string;
  editHistory?: PaymentEditRecord[];
}

export type AuditActionType =
  | 'CREATE_PAYMENT'
  | 'EDIT_PAYMENT'
  | 'APPROVE_PAYMENT'
  | 'REJECT_PAYMENT'
  | 'CANCEL_PAYMENT'
  | 'DELETE_PAYMENT'
  | 'CREATE_ROLE'
  | 'UPDATE_ROLE'
  | 'DELETE_ROLE'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'EXPORT_REPORT';

export interface PaymentAuditLog {
  id: string;
  action: AuditActionType;
  title: string;
  targetId: string;
  targetType: 'payment' | 'role' | 'user' | 'report';
  performedBy: {
    id: string;
    name: string;
    role: string;
    email?: string;
  };
  timestamp: any;
  details: {
    reason?: string;
    oldValue?: any;
    newValue?: any;
    meta?: Record<string, any>;
  };
  ipAddress?: string;
}
