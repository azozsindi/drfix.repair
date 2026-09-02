import { 
  PaymentPermission, 
  PaymentRole, 
  AccountingUser, 
  ManualPayment, 
  PaymentAuditLog,
  AuditActionType
} from '../types/accounting';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const DEFAULT_ROLES: PaymentRole[] = [
  {
    id: 'owner',
    code: 'OWNER',
    name: 'المالك / مدير عام النظام (Owner / Super Admin)',
    description: 'كامل الصلاحيات دون قيود: إضافة، تعديل، اعتماد، إلغاء، حذف، تصدير، وإدارة الصلاحيات والمستخدمين.',
    isSystem: true,
    permissions: [
      'view_payments',
      'create_payment',
      'edit_payment',
      'approve_payment',
      'reject_payment',
      'cancel_payment',
      'delete_payment',
      'view_financial_reports',
      'export_financial_reports',
      'manage_payment_permissions',
    ]
  },
  {
    id: 'accountant',
    code: 'ACCOUNTANT',
    name: 'المحاسب / الإدارة المالية (Finance / Accountant)',
    description: 'إضافة المدفوعات وتعديلها قبل الاعتماد، استعراض وتصدير التقارير المالية. لا يستطيع حذف أو تعديل دفعة معتمدة مباشرة.',
    isSystem: true,
    permissions: [
      'view_payments',
      'create_payment',
      'edit_payment',
      'view_financial_reports',
      'export_financial_reports',
    ]
  },
  {
    id: 'manager',
    code: 'MANAGER',
    name: 'المدير / المشرف (Admin / Manager)',
    description: 'مشاهدة المدفوعات والتقارير واعتماد أو رفض أو إلغاء المدفوعات.',
    isSystem: true,
    permissions: [
      'view_payments',
      'approve_payment',
      'reject_payment',
      'cancel_payment',
      'view_financial_reports',
      'export_financial_reports',
    ]
  },
  {
    id: 'staff',
    code: 'STAFF',
    name: 'موظف الاستقبال / العمليات (Staff)',
    description: 'مشاهدة العمليات فقط. لا يستطيع إضافة أو تعديل أو حذف أو اعتماد المدفوعات إلا إذا تم منحه صلاحية مخصصة.',
    isSystem: true,
    permissions: [
      'view_payments',
    ]
  },
  {
    id: 'technician',
    code: 'TECHNICIAN',
    name: 'فني الصيانة الميداني (Technician)',
    description: 'صلاحيات ميدانية فقط. محجوب تماماً عن رؤية المدفوعات أو التقارير والبيانات المالية.',
    isSystem: true,
    permissions: [] // لا يرى المدفوعات أو البيانات المالية إطلاقاً
  }
];

export const INITIAL_ACCOUNTING_USERS: AccountingUser[] = [
  {
    id: 'usr_owner_1',
    username: 'admin',
    name: 'المدير العام (DR.FIX Owner)',
    email: 'admin@drfix.repair',
    phone: '0500000001',
    roleId: 'owner',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_acc_1',
    username: 'accountant',
    name: 'سالم المحاسب (Finance)',
    email: 'finance@drfix.repair',
    phone: '0500000002',
    roleId: 'accountant',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_mgr_1',
    username: 'manager',
    name: 'طارق مشرف العمليات (Manager)',
    email: 'manager@drfix.repair',
    phone: '0500000003',
    roleId: 'manager',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_staff_1',
    username: 'reception',
    name: 'منى خدمة العملاء (Staff)',
    email: 'staff@drfix.repair',
    phone: '0500000004',
    roleId: 'staff',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_tech_1',
    username: 'tech_ahmed',
    name: 'أحمد فني ميكانيكا (Technician)',
    email: 'tech@drfix.repair',
    phone: '0500000005',
    roleId: 'technician',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

/**
 * Calculates effective permissions for a user given their role and custom overrides.
 */
export function getEffectivePermissions(
  user: AccountingUser | null | undefined, 
  roles: PaymentRole[] = DEFAULT_ROLES
): Set<PaymentPermission> {
  if (!user || !user.isActive) return new Set();

  const role = roles.find(r => r.id === user.roleId) || DEFAULT_ROLES.find(r => r.id === user.roleId);
  const rolePermissions = role ? role.permissions : [];
  const customOverrides = user.customPermissions || [];

  return new Set([...rolePermissions, ...customOverrides]);
}

/**
 * Checks if a user has a specific payment permission.
 */
export function hasPaymentPermission(
  user: AccountingUser | null | undefined,
  permission: PaymentPermission,
  roles: PaymentRole[] = DEFAULT_ROLES
): boolean {
  if (!user || !user.isActive) return false;
  const effective = getEffectivePermissions(user, roles);
  return effective.has(permission);
}

/**
 * Validates whether user can edit this specific payment.
 * Rule: 
 * - If payment is pending: requires 'edit_payment'.
 * - If payment is approved: requires 'edit_payment' AND ('manage_payment_permissions' OR role is owner/super admin) AND requires mandatory reason.
 */
export function checkCanEditPayment(
  user: AccountingUser | null | undefined,
  payment: ManualPayment,
  roles: PaymentRole[] = DEFAULT_ROLES
): { allowed: boolean; reasonRequirement: boolean; message?: string } {
  if (!user) return { allowed: false, reasonRequirement: false, message: 'يجب تسجيل الدخول' };
  
  const canEdit = hasPaymentPermission(user, 'edit_payment', roles);
  if (!canEdit) {
    return { allowed: false, reasonRequirement: false, message: 'ليس لديك صلاحية تعديل المدفوعات (edit_payment)' };
  }

  if (payment.status === 'approved') {
    const isSuper = hasPaymentPermission(user, 'manage_payment_permissions', roles) || user.roleId === 'owner';
    if (!isSuper) {
      return { 
        allowed: false, 
        reasonRequirement: false, 
        message: 'لا يمكن تعديل دفعة معتمدة مباشرة من قبل هذا الدور. يتطلب صلاحية إدارة النظام أو المالك.' 
      };
    }
    return { 
      allowed: true, 
      reasonRequirement: true, 
      message: 'الدفعة معتمدة، يجب إدخال سبب التعديل لتوثيقه في السجل الرقابي' 
    };
  }

  return { allowed: true, reasonRequirement: false };
}

/**
 * Validates whether user can delete a payment.
 * Rule: 
 * - Approved payments cannot be deleted unless by Super Admin/Owner with mandatory reason.
 */
export function checkCanDeletePayment(
  user: AccountingUser | null | undefined,
  payment: ManualPayment,
  roles: PaymentRole[] = DEFAULT_ROLES
): { allowed: boolean; message?: string } {
  if (!user) return { allowed: false, message: 'يجب تسجيل الدخول' };

  const canDelete = hasPaymentPermission(user, 'delete_payment', roles);
  if (!canDelete) {
    return { allowed: false, message: 'ليس لديك صلاحية حذف المدفوعات (delete_payment)' };
  }

  if (payment.status === 'approved') {
    const isOwner = user.roleId === 'owner';
    if (!isOwner) {
      return { allowed: false, message: 'لا يمكن حذف دفعة معتمدة. يمكن فقط للمالك إلغاؤها أو حذفها مع توثيق السبب.' };
    }
  }

  return { allowed: true };
}

/**
 * Record an audit log entry in Firestore.
 */
export async function recordPaymentAuditLog(
  action: AuditActionType,
  title: string,
  targetId: string,
  targetType: 'payment' | 'role' | 'user' | 'report',
  performedBy: { id: string; name: string; role: string; email?: string },
  details: {
    reason?: string;
    oldValue?: any;
    newValue?: any;
    meta?: Record<string, any>;
  }
): Promise<void> {
  try {
    const logData = {
      action,
      title,
      targetId,
      targetType,
      performedBy,
      timestamp: serverTimestamp(),
      details,
      createdAtIso: new Date().toISOString()
    };
    await addDoc(collection(db, 'payment_audit_logs'), logData);
  } catch (err) {
    console.error('Failed to write audit log to Firestore:', err);
  }
}
