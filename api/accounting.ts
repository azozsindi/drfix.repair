import { Request, Response } from 'express';

// In-memory / server-side validator for accounting RBAC operations
const PERMISSION_MATRIX: Record<string, string[]> = {
  owner: [
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
  ],
  accountant: [
    'view_payments',
    'create_payment',
    'edit_payment',
    'view_financial_reports',
    'export_financial_reports',
  ],
  manager: [
    'view_payments',
    'approve_payment',
    'reject_payment',
    'cancel_payment',
    'view_financial_reports',
    'export_financial_reports',
  ],
  staff: [
    'view_payments',
  ],
  technician: []
};

export default async function accountingHandler(req: Request, res: Response) {
  // CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Role, X-User-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.path || req.url;

  try {
    const userRole = (req.headers['x-user-role'] as string) || req.body?.userRole || 'owner';
    const userId = (req.headers['x-user-id'] as string) || req.body?.userId || 'usr_owner_1';
    const userName = (req.body?.userName as string) || 'مسؤول النظام';
    const customPermissions: string[] = req.body?.customPermissions || [];

    const effectivePermissions = new Set([
      ...(PERMISSION_MATRIX[userRole] || []),
      ...customPermissions
    ]);

    // Check endpoint permissions
    if (path.includes('/payments/create') || req.body?.action === 'create_payment') {
      if (!effectivePermissions.has('create_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية إنشاء دفعة يدوية (create_payment)',
          requiredPermission: 'create_payment',
          userRole
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم التحقق من الصلاحيات وتسجيل الدفعة بنجاح',
        audit: {
          action: 'CREATE_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/payments/approve') || req.body?.action === 'approve_payment') {
      if (!effectivePermissions.has('approve_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية اعتماد المدفوعات (approve_payment)',
          requiredPermission: 'approve_payment',
          userRole
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم التحقق من الصلاحية واعتماد الدفعة بنجاح',
        audit: {
          action: 'APPROVE_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/payments/reject') || req.body?.action === 'reject_payment') {
      if (!effectivePermissions.has('reject_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية رفض المدفوعات (reject_payment)',
          requiredPermission: 'reject_payment',
          userRole
        });
      }

      if (!req.body?.reason) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'يجب إدخال سبب رفض الدفعة'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم رفض الدفعة وتوثيق السبب في السجل الرقابي',
        audit: {
          action: 'REJECT_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          reason: req.body.reason,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/payments/cancel') || req.body?.action === 'cancel_payment') {
      if (!effectivePermissions.has('cancel_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية إلغاء المدفوعات (cancel_payment)',
          requiredPermission: 'cancel_payment',
          userRole
        });
      }

      if (!req.body?.reason) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'يجب تحديد سبب إلغاء الدفعة'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم إلغاء الدفعة وتوثيق سبب الإلغاء',
        audit: {
          action: 'CANCEL_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          reason: req.body.reason,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/payments/edit') || req.body?.action === 'edit_payment') {
      if (!effectivePermissions.has('edit_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية تعديل المدفوعات (edit_payment)',
          requiredPermission: 'edit_payment',
          userRole
        });
      }

      const isApproved = req.body?.isApproved || req.body?.status === 'approved';
      if (isApproved && userRole !== 'owner' && !effectivePermissions.has('manage_payment_permissions')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'حماية الدفعات: لا يمكن تعديل دفعة معتمدة مباشرة من هذا الدور دون صلاحية إدارة النظام.',
          userRole
        });
      }

      if (isApproved && !req.body?.reason) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'يجب تقديم سبب تعديل الدفعة المعتمدة'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم التحقق من التعديل وتسجيل السجل القديم والجديد بنجاح',
        audit: {
          action: 'EDIT_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          reason: req.body?.reason,
          oldValue: req.body?.oldValue,
          newValue: req.body?.newValue,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/payments/delete') || req.body?.action === 'delete_payment') {
      if (!effectivePermissions.has('delete_payment') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية حذف المدفوعات (delete_payment)',
          requiredPermission: 'delete_payment',
          userRole
        });
      }

      const isApproved = req.body?.isApproved || req.body?.status === 'approved';
      if (isApproved && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'لا يمكن حذف دفعة معتمدة إطلاقاً. يمكن إلغاؤها فقط من قبل المخولين.',
          userRole
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم التحقق وحذف سجل الدفعة بنجاح',
        audit: {
          action: 'DELETE_PAYMENT',
          performedBy: { id: userId, name: userName, role: userRole },
          timestamp: new Date().toISOString()
        }
      });
    }

    if (path.includes('/roles/save') || req.body?.action === 'manage_roles') {
      if (!effectivePermissions.has('manage_payment_permissions') && userRole !== 'owner') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'تم رفض العملية: ليس لديك صلاحية إدارة أدوار وصلاحيات المدفوعات (manage_payment_permissions)',
          requiredPermission: 'manage_payment_permissions',
          userRole
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم تحديث الأدوار والصلاحيات بنجاح',
        audit: {
          action: 'UPDATE_ROLE',
          performedBy: { id: userId, name: userName, role: userRole },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Default status route
    return res.status(200).json({
      status: 'ok',
      service: 'DR.FIX Manual Payments & RBAC API',
      permissionsCount: Object.keys(PERMISSION_MATRIX).length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Accounting API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'حدث خطأ غير متوقع في المعالجة'
    });
  }
}
