import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  DollarSign, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Eye, 
  FileText, 
  Lock, 
  Unlock, 
  Users, 
  UserCheck, 
  History, 
  Download, 
  Search, 
  Filter, 
  CreditCard, 
  Wallet, 
  Building2, 
  Info, 
  AlertCircle, 
  Check, 
  ChevronDown, 
  RefreshCw,
  Printer,
  FileCheck
} from 'lucide-react';
import { 
  ManualPayment, 
  PaymentPermission, 
  PaymentRole, 
  AccountingUser, 
  PaymentAuditLog, 
  ALL_PAYMENT_PERMISSIONS,
  PaymentMethod,
  PaymentCategory,
  PaymentStatus
} from '../../types/accounting';
import { 
  DEFAULT_ROLES, 
  INITIAL_ACCOUNTING_USERS, 
  hasPaymentPermission, 
  checkCanEditPayment, 
  checkCanDeletePayment, 
  recordPaymentAuditLog,
  getEffectivePermissions
} from '../../lib/accountingPermissions';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy,
  setDoc
} from 'firebase/firestore';

interface Props {
  className?: string;
}

export const ManualPaymentsManager: React.FC<Props> = ({ className = '' }) => {
  // State for Roles & Users
  const [roles, setRoles] = useState<PaymentRole[]>(() => {
    const saved = localStorage.getItem('drfix_payment_roles');
    return saved ? JSON.parse(saved) : DEFAULT_ROLES;
  });

  const [users, setUsers] = useState<AccountingUser[]>(() => {
    const saved = localStorage.getItem('drfix_payment_users');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTING_USERS;
  });

  // Active User in Accounting session
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    const saved = localStorage.getItem('drfix_active_accounting_user');
    return saved || 'usr_owner_1';
  });

  const activeUser = users.find(u => u.id === activeUserId) || users[0];
  const activeUserPermissions = getEffectivePermissions(activeUser, roles);

  // Tabs
  const [currentTab, setCurrentTab] = useState<'payments' | 'audit' | 'roles' | 'users'>('payments');

  // Payments State
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PaymentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ManualPayment | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    open: boolean;
    type: 'reject' | 'cancel' | 'edit_approved' | 'delete_approved';
    payment: ManualPayment | null;
    reason: string;
    newAmount?: number;
    newPayerName?: string;
    newNotes?: string;
  }>({
    open: false,
    type: 'reject',
    payment: null,
    reason: ''
  });

  const [viewingVoucher, setViewingVoucher] = useState<ManualPayment | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<PaymentRole | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AccountingUser | null>(null);

  // Form states for new payment
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payerName: '',
    payerPhone: '',
    paymentMethod: 'cash' as PaymentMethod,
    referenceNumber: '',
    category: 'service_fee' as PaymentCategory,
    bookingId: '',
    notes: ''
  });

  // Save roles & users to localStorage as backup
  useEffect(() => {
    localStorage.setItem('drfix_payment_roles', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('drfix_payment_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('drfix_active_accounting_user', activeUserId);
  }, [activeUserId]);

  // Sync payments from Firestore
  useEffect(() => {
    setLoading(true);
    const qPayments = query(collection(db, 'manual_payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const docs: ManualPayment[] = [];
      snapshot.forEach(docSnap => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as ManualPayment);
      });
      setPayments(docs);
      setLoading(false);
    }, (err) => {
      console.error('Firestore payments fetch error:', err);
      setLoading(false);
    });

    // Sync audit logs
    const qLogs = query(collection(db, 'payment_audit_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs: PaymentAuditLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as PaymentAuditLog);
      });
      setAuditLogs(logs);
    }, (err) => {
      console.error('Firestore audit logs fetch error:', err);
    });

    return () => {
      unsubPayments();
      unsubLogs();
    };
  }, []);

  // Helper check for current user
  const can = (perm: PaymentPermission) => hasPaymentPermission(activeUser, perm, roles);

  // --- Handlers ---

  // Handle Add Payment
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('create_payment')) {
      alert('عذراً: ليس لديك صلاحية إضافة دفعة يدوية (create_payment).');
      return;
    }

    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!paymentForm.payerName.trim()) {
      alert('يرجى إدخال اسم العميل / الدافع');
      return;
    }

    try {
      const count = payments.length + 1;
      const paymentNumber = `DRF-PAY-${String(1000 + count)}`;

      const newPaymentData = {
        paymentNumber,
        amount: amt,
        payerName: paymentForm.payerName.trim(),
        payerPhone: paymentForm.payerPhone.trim(),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        category: paymentForm.category,
        bookingId: paymentForm.bookingId.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
        status: 'pending' as PaymentStatus,
        createdAt: serverTimestamp(),
        createdBy: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.roleId,
          email: activeUser.email
        },
        editHistory: []
      };

      // Call backend API for authorization & verification
      try {
        await fetch('/api/accounting/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': activeUser.roleId, 'X-User-Id': activeUser.id },
          body: JSON.stringify({ action: 'create_payment', userId: activeUser.id, userName: activeUser.name, userRole: activeUser.roleId, data: newPaymentData })
        });
      } catch (apiErr) {
        console.warn('API verification fallback to direct DB:', apiErr);
      }

      const docRef = await addDoc(collection(db, 'manual_payments'), newPaymentData);

      // Record Audit Log
      await recordPaymentAuditLog(
        'CREATE_PAYMENT',
        `إنشاء دفعة يدوية جديدة بقيمة ${amt} ريال (#${paymentNumber})`,
        docRef.id,
        'payment',
        { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
        {
          newValue: { amount: amt, payerName: paymentForm.payerName, method: paymentForm.paymentMethod }
        }
      );

      setIsAddPaymentOpen(false);
      setPaymentForm({
        amount: '',
        payerName: '',
        payerPhone: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        category: 'service_fee',
        bookingId: '',
        notes: ''
      });
      alert(`تم إضافة سند القبض بنجاح برقم: ${paymentNumber}`);
    } catch (err: any) {
      console.error('Error adding payment:', err);
      alert('حدث خطأ أثناء حفظ الدفعة: ' + err.message);
    }
  };

  // Handle Approve Payment
  const handleApprovePayment = async (payment: ManualPayment) => {
    if (!can('approve_payment')) {
      alert('عذراً: ليس لديك صلاحية اعتماد المدفوعات (approve_payment).');
      return;
    }

    if (payment.status === 'approved') {
      alert('الدفعة معتمدة بالفعل');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من اعتماد الدفعة رقم (${payment.paymentNumber}) بقيمة ${payment.amount} ريال؟\nبعد الاعتماد ستكون الدفعة محمية من التعديل والحذف المباشر.`)) {
      return;
    }

    try {
      // Backend API validation
      try {
        await fetch('/api/accounting/payments/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': activeUser.roleId, 'X-User-Id': activeUser.id },
          body: JSON.stringify({ action: 'approve_payment', paymentId: payment.id, userId: activeUser.id, userName: activeUser.name, userRole: activeUser.roleId })
        });
      } catch (e) {
        console.warn('Backend API note:', e);
      }

      await updateDoc(doc(db, 'manual_payments', payment.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: {
          id: activeUser.id,
          name: activeUser.name,
          role: activeUser.roleId
        }
      });

      await recordPaymentAuditLog(
        'APPROVE_PAYMENT',
        `اعتماد الدفعة (#${payment.paymentNumber}) بقيمة ${payment.amount} ريال`,
        payment.id,
        'payment',
        { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
        {
          oldValue: { status: payment.status },
          newValue: { status: 'approved' }
        }
      );

      alert(`✅ تم اعتماد وترحيل الدفعة (${payment.paymentNumber}) بنجاح.`);
    } catch (err: any) {
      alert('خطأ أثناء الاعتماد: ' + err.message);
    }
  };

  // Handle Reject / Cancel / Edit with Reason Submission
  const handleReasonSubmit = async () => {
    const { type, payment, reason, newAmount, newPayerName, newNotes } = reasonModal;
    if (!payment) return;

    if (!reason.trim()) {
      alert('يرجى إدخال سبب العملية الإلزامي');
      return;
    }

    try {
      if (type === 'reject') {
        if (!can('reject_payment')) {
          alert('ليس لديك صلاحية رفض المدفوعات');
          return;
        }

        await updateDoc(doc(db, 'manual_payments', payment.id), {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          rejectedBy: { id: activeUser.id, name: activeUser.name, role: activeUser.roleId },
          rejectionReason: reason.trim()
        });

        await recordPaymentAuditLog(
          'REJECT_PAYMENT',
          `رفض الدفعة (#${payment.paymentNumber}) - السبب: ${reason.trim()}`,
          payment.id,
          'payment',
          { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
          {
            reason: reason.trim(),
            oldValue: { status: payment.status },
            newValue: { status: 'rejected' }
          }
        );

        alert(`تم رفض الدفعة وتوثيق السبب في السجل الرقابي.`);
      } else if (type === 'cancel') {
        if (!can('cancel_payment')) {
          alert('ليس لديك صلاحية إلغاء المدفوعات');
          return;
        }

        await updateDoc(doc(db, 'manual_payments', payment.id), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelledBy: { id: activeUser.id, name: activeUser.name, role: activeUser.roleId },
          cancellationReason: reason.trim()
        });

        await recordPaymentAuditLog(
          'CANCEL_PAYMENT',
          `إلغاء الدفعة (#${payment.paymentNumber}) - السبب: ${reason.trim()}`,
          payment.id,
          'payment',
          { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
          {
            reason: reason.trim(),
            oldValue: { status: payment.status },
            newValue: { status: 'cancelled' }
          }
        );

        alert(`تم إلغاء الدفعة وتوثيق سبب الإلغاء.`);
      } else if (type === 'edit_approved') {
        // Protected Edit on Approved Payment
        const editEntry = {
          modifiedAt: new Date().toISOString(),
          modifiedBy: { id: activeUser.id, name: activeUser.name, role: activeUser.roleId },
          reason: reason.trim(),
          oldAmount: payment.amount,
          newAmount: newAmount || payment.amount,
          oldPayerName: payment.payerName,
          newPayerName: newPayerName || payment.payerName,
          notes: newNotes || payment.notes
        };

        const updatedHistory = [...(payment.editHistory || []), editEntry];

        await updateDoc(doc(db, 'manual_payments', payment.id), {
          amount: newAmount || payment.amount,
          payerName: (newPayerName || payment.payerName).trim(),
          notes: (newNotes || payment.notes || '').trim(),
          editHistory: updatedHistory
        });

        await recordPaymentAuditLog(
          'EDIT_PAYMENT',
          `تعديل دفعة معتمدة (#${payment.paymentNumber}) - من ${payment.amount} إلى ${newAmount} ريال`,
          payment.id,
          'payment',
          { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
          {
            reason: reason.trim(),
            oldValue: { amount: payment.amount, payerName: payment.payerName },
            newValue: { amount: newAmount, payerName: newPayerName }
          }
        );

        alert(`✅ تم تحديث الدفعة المعتمدة وتوثيق السبب في السجل الرقابي والمالي.`);
      } else if (type === 'delete_approved') {
        if (activeUser.roleId !== 'owner' && !can('manage_payment_permissions')) {
          alert('حذف الدفعات المعتمدة محصور على المالك/السوبر أدمن فقط.');
          return;
        }

        await deleteDoc(doc(db, 'manual_payments', payment.id));
        await recordPaymentAuditLog(
          'DELETE_PAYMENT',
          `حذف دفعة معتمدة (#${payment.paymentNumber}) بقيمة ${payment.amount} ريال - السبب: ${reason.trim()}`,
          payment.id,
          'payment',
          { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
          {
            reason: reason.trim(),
            oldValue: payment
          }
        );
        alert(`تم حذف الدفعة وتوثيق العملية في سجل التدقيق.`);
      }

      setReasonModal({ open: false, type: 'reject', payment: null, reason: '' });
    } catch (err: any) {
      alert('حدث خطأ: ' + err.message);
    }
  };

  // Direct Edit for Pending Payment
  const handleEditPendingPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const check = checkCanEditPayment(activeUser, editingPayment, roles);
    if (!check.allowed) {
      alert(check.message || 'ليس لديك صلاحية التعديل');
      return;
    }

    if (check.reasonRequirement) {
      // Must open reason modal for approved payment
      setReasonModal({
        open: true,
        type: 'edit_approved',
        payment: editingPayment,
        reason: '',
        newAmount: parseFloat(paymentForm.amount) || editingPayment.amount,
        newPayerName: paymentForm.payerName || editingPayment.payerName,
        newNotes: paymentForm.notes
      });
      setEditingPayment(null);
      return;
    }

    // Direct update for pending
    try {
      const amt = parseFloat(paymentForm.amount) || editingPayment.amount;
      await updateDoc(doc(db, 'manual_payments', editingPayment.id), {
        amount: amt,
        payerName: paymentForm.payerName.trim(),
        payerPhone: paymentForm.payerPhone.trim(),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber.trim() || null,
        category: paymentForm.category,
        bookingId: paymentForm.bookingId.trim() || null,
        notes: paymentForm.notes.trim() || null
      });

      await recordPaymentAuditLog(
        'EDIT_PAYMENT',
        `تعديل بيانات الدفعة المعلقة (#${editingPayment.paymentNumber})`,
        editingPayment.id,
        'payment',
        { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
        {
          oldValue: { amount: editingPayment.amount, payerName: editingPayment.payerName },
          newValue: { amount: amt, payerName: paymentForm.payerName }
        }
      );

      setEditingPayment(null);
      alert('تم حفظ التعديلات بنجاح');
    } catch (err: any) {
      alert('خطأ أثناء التعديل: ' + err.message);
    }
  };

  // Handle Delete Payment
  const handleDeletePayment = async (payment: ManualPayment) => {
    const check = checkCanDeletePayment(activeUser, payment, roles);
    if (!check.allowed) {
      alert(check.message || 'لا تملك صلاحية الحذف');
      return;
    }

    if (payment.status === 'approved') {
      setReasonModal({
        open: true,
        type: 'delete_approved',
        payment,
        reason: ''
      });
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف الدفعة (${payment.paymentNumber}) نهائياً؟`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'manual_payments', payment.id));
      await recordPaymentAuditLog(
        'DELETE_PAYMENT',
        `حذف الدفعة المعلقة (#${payment.paymentNumber}) بقيمة ${payment.amount} ريال`,
        payment.id,
        'payment',
        { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
        { oldValue: payment }
      );
      alert('تم حذف الدفعة بنجاح');
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  // Export Payments to Word / Excel Report
  const handleExportPaymentsReport = () => {
    if (!can('export_financial_reports')) {
      alert('عذراً: ليس لديك صلاحية تصدير التقارير المالية (export_financial_reports).');
      return;
    }

    const filtered = filteredPayments;
    const totalRev = filtered.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);

    const rows = filtered.map((p, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${p.paymentNumber}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.payerName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; direction: ltr; text-align: right;">${p.payerPhone || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1e3a8a;">${p.amount} ريال</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${getMethodLabel(p.paymentMethod)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${getCategoryLabel(p.category)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${getStatusLabel(p.status)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.createdBy?.name || 'النظام'}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>تقرير المقبوضات والمدفوعات اليدوية</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; margin: 20px; }
          .header { border-bottom: 3px solid #E31837; padding-bottom: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background-color: #f3f4f6; color: #111; padding: 10px; border: 1px solid #ccc; font-weight: bold; }
          .kpi-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="color: #E31837; margin: 0 0 5px 0;">DR.FIX | كشف المقبوضات والمدفوعات اليدوية</h2>
          <div style="font-size: 12px; color: #666;">
            تاريخ استخراج التقرير: ${new Date().toLocaleString('ar-SA')} | المستخدم المستخرج: ${activeUser.name} (${activeUser.roleId})
          </div>
        </div>

        <div class="kpi-box">
          <table style="border: none; margin: 0;">
            <tr style="border: none;">
              <td style="border: none;"><strong>إجمالي المعتمد:</strong> ${totalRev} ريال</td>
              <td style="border: none;"><strong>عدد السندات المعروضة:</strong> ${filtered.length}</td>
              <td style="border: none;"><strong>المقبوضات المعلقة:</strong> ${filtered.filter(p => p.status === 'pending').length}</td>
            </tr>
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم السند</th>
              <th>اسم الدافع</th>
              <th>الجوال</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>التصنيف</th>
              <th>الحالة</th>
              <th>المسؤول</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          <table style="border: none; width: 100%;">
            <tr style="border: none;">
              <td style="border: none; text-align: center; width: 50%;">
                <strong>توقيع المحاسب المسئول</strong><br><br>____________________
              </td>
              <td style="border: none; text-align: center; width: 50%;">
                <strong>اعتماد الإدارة والختم</strong><br><br>____________________
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRFIX_Payments_Report_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Audit Log
    recordPaymentAuditLog(
      'EXPORT_REPORT',
      `تصدير تقرير المدفوعات اليدوية كملف Word (${filtered.length} سجل)`,
      'system_report',
      'report',
      { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
      { meta: { count: filtered.length, totalRevenue: totalRev } }
    );
  };

  // Export Single Voucher
  const handleExportVoucher = (p: ManualPayment) => {
    if (!can('export_financial_reports')) {
      alert('ليس لديك صلاحية تصدير سندات القبض');
      return;
    }

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>سند قبض مالي #${p.paymentNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; margin: 30px; }
          .card { border: 2px solid #E31837; border-radius: 10px; padding: 25px; }
          .header { border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
          .field { margin-bottom: 12px; font-size: 14px; }
          .field strong { color: #333; display: inline-block; width: 140px; }
          .amount-box { background: #fef2f2; border: 2px dashed #E31837; padding: 15px; font-size: 20px; font-weight: bold; color: #E31837; text-align: center; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2 style="color: #E31837; margin: 0;">DR.FIX | سند قبض مالي رسمي</h2>
            <div style="font-size: 12px; color: #777;">سند استلام دفعة يدوية معتمد</div>
          </div>

          <div class="field"><strong>رقم السند:</strong> #${p.paymentNumber}</div>
          <div class="field"><strong>تاريخ السند:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
          <div class="field"><strong>استلمنا من السيد/ة:</strong> ${p.payerName}</div>
          <div class="field"><strong>رقم الجوال:</strong> ${p.payerPhone || '-'}</div>
          
          <div class="amount-box">
            المبلغ المقبوض: ${p.amount} ريال سعودي فقط لا غير
          </div>

          <div class="field"><strong>طريقة الدفع:</strong> ${getMethodLabel(p.paymentMethod)} ${p.referenceNumber ? `(رقم المرجع: ${p.referenceNumber})` : ''}</div>
          <div class="field"><strong>التصنيف:</strong> ${getCategoryLabel(p.category)}</div>
          <div class="field"><strong>حالة السند:</strong> ${getStatusLabel(p.status)}</div>
          ${p.notes ? `<div class="field"><strong>ملاحظات:</strong> ${p.notes}</div>` : ''}

          <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 25px;">
            <table style="width: 100%;">
              <tr>
                <td style="text-align: center; width: 50%;">
                  <strong>المستلم / المحاسب</strong><br><br>
                  ${p.createdBy?.name || 'إدارة الحسابات'}<br>
                  ____________________
                </td>
                <td style="text-align: center; width: 50%;">
                  <strong>الختم والاعتماد الرسمي</strong><br><br>
                  DR.FIX REPAIR CENTER<br>
                  ____________________
                </td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRFIX_Voucher_${p.paymentNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper Labels
  const getMethodLabel = (m: PaymentMethod) => {
    switch (m) {
      case 'cash': return 'نقداً (كاش)';
      case 'card': return 'بطاقة مدى / ائتمان';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'pos': return 'جهاز نقاط البيع (POS)';
      case 'cheque': return 'شيك بنكي';
      default: return m;
    }
  };

  const getCategoryLabel = (c: PaymentCategory) => {
    switch (c) {
      case 'service_fee': return 'أجور صيانة وخدمات';
      case 'part_sale': return 'بيع قطع غيار';
      case 'advance_deposit': return 'دفعة مقدمة / عربون';
      case 'maintenance_settlement': return 'تسوية حساب حجز';
      case 'other': return 'أخرى';
      default: return c;
    }
  };

  const getStatusLabel = (s: PaymentStatus) => {
    switch (s) {
      case 'pending': return 'معلقة (بانتظار الاعتماد)';
      case 'approved': return 'معتمدة ومرحلة';
      case 'rejected': return 'مرفوضة';
      case 'cancelled': return 'ملغاة';
      default: return s;
    }
  };

  // Filtered Payments List
  const filteredPayments = payments.filter(p => {
    const matchSearch = 
      p.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payerPhone?.includes(searchQuery) ||
      p.referenceNumber?.includes(searchQuery);

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

    return matchSearch && matchStatus && matchMethod && matchCategory;
  });

  // Calculate Metrics
  const approvedTotal = payments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingTotal = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const approvedCount = payments.filter(p => p.status === 'approved').length;

  // --- Technician / Strict Permission Guard Screen ---
  if (!can('view_payments') && !can('view_financial_reports')) {
    return (
      <div className={`glass-card p-8 text-center border-red-500/20 max-w-2xl mx-auto my-8 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-brand-red">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">تم تقييد الوصول إلى النظام المالي والمدفوعات</h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          حسابك الحالي (<span className="text-white font-bold">{activeUser.name}</span> - بصلاحية <span className="text-brand-red font-bold">{roles.find(r => r.id === activeUser.roleId)?.name || activeUser.roleId}</span>) 
          لا يملك صلاحية استعراض المدفوعات اليدوية أو البيانات المالية وفقاً لسياسة الأمان والرقابة.
        </p>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-right text-xs space-y-2 mb-6">
          <div className="text-gray-400">💡 لتجربة واختبار الصلاحيات الأخرى، يمكنك التبديل لحساب مخول من شريط المستخدمين أدناه:</div>
          <div className="flex flex-wrap gap-2 pt-2">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => setActiveUserId(u.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  u.id === activeUserId 
                    ? 'bg-brand-red text-white' 
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {u.name} ({roles.find(r => r.id === u.roleId)?.code || u.roleId})
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Active User & RBAC Context Bar */}
      <div className="glass-card p-4 border-white/10 bg-gradient-to-r from-brand-black via-brand-gray/30 to-brand-black">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* User Profile & Role info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-red to-red-700 flex items-center justify-center text-white font-bold shadow-md shadow-brand-red/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">المستخدم النشط للمحاسبة:</span>
                <span className="text-sm font-bold text-white">{activeUser.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-red/20 text-brand-red border border-brand-red/30">
                  {roles.find(r => r.id === activeUser.roleId)?.name || activeUser.roleId}
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                <span>الصلاحيات الفعالة:</span>
                <span className="font-mono text-white font-bold">{activeUserPermissions.size} / 10</span>
                <span className="text-gray-500">•</span>
                <span className="text-[11px] text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  محمي بنظام الرقابة و Firebase Rules
                </span>
              </div>
            </div>
          </div>

          {/* Quick Switcher for Testing/Switching Users */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">تبديل المستخدم:</span>
            <select
              value={activeUserId}
              onChange={(e) => setActiveUserId(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-brand-red outline-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — [{roles.find(r => r.id === u.roleId)?.name || u.roleId}]
                </option>
              ))}
            </select>

            {can('manage_payment_permissions') && (
              <button
                onClick={() => setCurrentTab('roles')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="إدارة الأدوار والصلاحيات"
              >
                <Shield className="w-3.5 h-3.5 text-brand-red" />
                <span>إدارة الصلاحيات</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Permissions Badges Drawer */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 flex-wrap overflow-x-auto">
          <span className="text-[11px] text-gray-500 ml-1">الصلاحيات الممنوحة:</span>
          {ALL_PAYMENT_PERMISSIONS.map((perm) => {
            const isGranted = can(perm.id);
            return (
              <span
                key={perm.id}
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                  isGranted
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-white/5 text-gray-600 border border-white/5 line-through opacity-40'
                }`}
                title={`${perm.name}: ${perm.description} (${isGranted ? 'ممنوحة' : 'محجوبة'})`}
              >
                {isGranted ? <Check className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {perm.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            currentTab === 'payments'
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>المدفوعات وسندات القبض ({payments.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            currentTab === 'audit'
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل الرقابة والتدقيق ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            currentTab === 'roles'
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>الأدوار والصلاحيات ({roles.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            currentTab === 'users'
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمين والموظفين ({users.length})</span>
        </button>
      </div>

      {/* --- TAB 1: PAYMENTS LIST & ACTIONS --- */}
      {currentTab === 'payments' && (
        <div className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1">المقبوضات المعتمدة</div>
              <div className="text-2xl font-black font-display text-green-400">
                {approvedTotal.toLocaleString()} <span className="text-xs font-normal text-gray-400">ريال</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span>{approvedCount} سند معتمد ومرحل</span>
              </div>
            </div>

            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1">المدفوعات المعلقة (قيد المراجعة)</div>
              <div className="text-2xl font-black font-display text-amber-400">
                {pendingTotal.toLocaleString()} <span className="text-xs font-normal text-gray-400">ريال</span>
              </div>
              <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{pendingCount} سند بانتظار الاعتماد</span>
              </div>
            </div>

            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1">إجمالي السندات المسجلة</div>
              <div className="text-2xl font-black font-display text-white">
                {payments.length} <span className="text-xs font-normal text-gray-400">سند</span>
              </div>
              <div className="mt-2 text-[11px] text-blue-400">سندات قبض يدوية</div>
            </div>

            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1">متوسط قيمة السند</div>
              <div className="text-2xl font-black font-display text-white">
                {approvedCount > 0 ? Math.round(approvedTotal / approvedCount) : 0} <span className="text-xs font-normal text-gray-400">ريال</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-400">لكل عملية قبض معتمدة</div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم السند، اسم العميل، الجوال أو المرجع..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-gray-500 focus:border-brand-red outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-red outline-none cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="pending">⏳ معلقة</option>
                <option value="approved">✅ معتمدة</option>
                <option value="rejected">❌ مرفوضة</option>
                <option value="cancelled">⚠️ ملغاة</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-red outline-none cursor-pointer"
              >
                <option value="all">طرق الدفع</option>
                <option value="cash">نقداً (كاش)</option>
                <option value="card">بطاقة مدى / ائتمان</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="pos">جهاز POS</option>
                <option value="cheque">شيك</option>
              </select>

              {/* Export Word Button (Guarded by export_financial_reports) */}
              <button
                onClick={handleExportPaymentsReport}
                disabled={!can('export_financial_reports')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  can('export_financial_reports')
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/20'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5 opacity-50'
                }`}
                title={can('export_financial_reports') ? 'تصدير تقرير المدفوعات لملف Word' : 'يتطلب صلاحية export_financial_reports'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Word (.doc)</span>
              </button>

              {/* Add Payment Button (Guarded by create_payment) */}
              <button
                onClick={() => {
                  if (!can('create_payment')) {
                    alert('ليس لديك صلاحية إضافة دفعة يدوية (create_payment).');
                    return;
                  }
                  setIsAddPaymentOpen(true);
                }}
                disabled={!can('create_payment')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                  can('create_payment')
                    ? 'bg-brand-red hover:bg-red-700 text-white cursor-pointer shadow-brand-red/20'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5 opacity-50'
                }`}
                title={can('create_payment') ? 'تسجيل دفعة يدوية جديدة' : 'يتطلب صلاحية create_payment'}
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة دفعة جديدة</span>
              </button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="glass-card overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                    <th className="px-4 py-3 font-bold">رقم السند</th>
                    <th className="px-4 py-3 font-bold">العميل / الدافع</th>
                    <th className="px-4 py-3 font-bold">المبلغ</th>
                    <th className="px-4 py-3 font-bold">طريقة الدفع</th>
                    <th className="px-4 py-3 font-bold">التصنيف</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                    <th className="px-4 py-3 font-bold">المسؤول والتاريخ</th>
                    <th className="px-4 py-3 font-bold text-center">الإجراءات والصلاحيات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-red" />
                        <span>جاري تحميل سجلات المدفوعات والرقابة...</span>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <div className="font-bold text-white mb-1">لا توجد سندات مدفوعات مطابقة</div>
                        <p className="text-xs text-gray-500">جرب تغيير معايير البحث أو إضافة دفعة جديدة</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const isApproved = payment.status === 'approved';
                      const isPending = payment.status === 'pending';
                      const isCancelled = payment.status === 'cancelled';
                      const isRejected = payment.status === 'rejected';

                      // Check permissions per action
                      const canApprove = can('approve_payment') && isPending;
                      const canReject = can('reject_payment') && isPending;
                      const canCancel = can('cancel_payment') && !isCancelled;
                      const editCheck = checkCanEditPayment(activeUser, payment, roles);
                      const deleteCheck = checkCanDeletePayment(activeUser, payment, roles);

                      return (
                        <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <FileCheck className="w-3.5 h-3.5 text-brand-red" />
                              <span>{payment.paymentNumber}</span>
                            </div>
                            {payment.bookingId && (
                              <div className="text-[10px] text-gray-500 font-normal">حجز: #{payment.bookingId}</div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{payment.payerName}</div>
                            <div className="text-gray-400 font-mono text-[11px]" style={{ direction: 'ltr', textAlign: 'right' }}>
                              {payment.payerPhone || '-'}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-black text-sm text-white">
                            <span className="text-green-400">{payment.amount.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 mr-1">ريال</span>
                            {payment.editHistory && payment.editHistory.length > 0 && (
                              <div className="text-[10px] text-amber-400 font-normal" title="تم تعديل القيمة مع توثيق السبب">
                                (معدلة {payment.editHistory.length}x)
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-300">
                            <div>{getMethodLabel(payment.paymentMethod)}</div>
                            {payment.referenceNumber && (
                              <div className="text-[10px] text-gray-500 font-mono">مرجع: {payment.referenceNumber}</div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-300">
                            {getCategoryLabel(payment.category)}
                          </td>

                          <td className="px-4 py-3">
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-max">
                                <CheckCircle2 className="w-3 h-3" />
                                معتمدة
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                                <AlertTriangle className="w-3 h-3" />
                                بانتظار الاعتماد
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-max">
                                <XCircle className="w-3 h-3" />
                                مرفوضة
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1 w-max">
                                <AlertCircle className="w-3 h-3" />
                                ملغاة
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-[11px] text-gray-400">
                            <div>بواسطة: {payment.createdBy?.name || 'النظام'}</div>
                            <div className="text-[10px] text-gray-500">
                              {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString('ar-SA') : 'اليوم'}
                            </div>
                            {payment.approvedBy && (
                              <div className="text-[10px] text-green-400/80">
                                اعتماد: {payment.approvedBy.name}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {/* View Voucher */}
                              <button
                                onClick={() => setViewingVoucher(payment)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                                title="عرض سند القبض والتفاصيل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Print / Word Export */}
                              <button
                                onClick={() => handleExportVoucher(payment)}
                                disabled={!can('export_financial_reports')}
                                className={`p-1.5 rounded-lg transition-all ${
                                  can('export_financial_reports')
                                    ? 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 cursor-pointer'
                                    : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                }`}
                                title="تحميل سند القبض Word (.doc)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Approve Button */}
                              {isPending && (
                                <button
                                  onClick={() => handleApprovePayment(payment)}
                                  disabled={!canApprove}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                    canApprove
                                      ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer shadow-sm shadow-green-600/20'
                                      : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                  }`}
                                  title={canApprove ? 'اعتماد الدفعة وترحيلها' : 'يتطلب صلاحية approve_payment'}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>اعتماد</span>
                                </button>
                              )}

                              {/* Reject Button */}
                              {isPending && (
                                <button
                                  onClick={() => {
                                    if (!canReject) {
                                      alert('ليس لديك صلاحية رفض المدفوعات (reject_payment)');
                                      return;
                                    }
                                    setReasonModal({
                                      open: true,
                                      type: 'reject',
                                      payment,
                                      reason: ''
                                    });
                                  }}
                                  disabled={!canReject}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    canReject
                                      ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400 cursor-pointer'
                                      : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                  }`}
                                  title="رفض الدفعة مع ذكر السبب"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  if (!editCheck.allowed) {
                                    alert(editCheck.message || 'لا تملك صلاحية التعديل');
                                    return;
                                  }
                                  setPaymentForm({
                                    amount: String(payment.amount),
                                    payerName: payment.payerName,
                                    payerPhone: payment.payerPhone || '',
                                    paymentMethod: payment.paymentMethod,
                                    referenceNumber: payment.referenceNumber || '',
                                    category: payment.category,
                                    bookingId: payment.bookingId || '',
                                    notes: payment.notes || ''
                                  });
                                  setEditingPayment(payment);
                                }}
                                disabled={!editCheck.allowed}
                                className={`p-1.5 rounded-lg transition-all ${
                                  editCheck.allowed
                                    ? isApproved 
                                      ? 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 cursor-pointer'
                                      : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white cursor-pointer'
                                    : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                }`}
                                title={
                                  !editCheck.allowed 
                                    ? editCheck.message 
                                    : isApproved 
                                      ? 'تعديل دفعة معتمدة (يتطلب سبب إلزامي)' 
                                      : 'تعديل الدفعة'
                                }
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancel Button */}
                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    if (!canCancel) {
                                      alert('ليس لديك صلاحية إلغاء المدفوعات (cancel_payment)');
                                      return;
                                    }
                                    setReasonModal({
                                      open: true,
                                      type: 'cancel',
                                      payment,
                                      reason: ''
                                    });
                                  }}
                                  disabled={!canCancel}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    canCancel
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer'
                                      : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                  }`}
                                  title="إلغاء السند وتوثيق السبب"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeletePayment(payment)}
                                disabled={!deleteCheck.allowed}
                                className={`p-1.5 rounded-lg transition-all ${
                                  deleteCheck.allowed
                                    ? 'bg-red-600/20 hover:bg-red-600/40 text-red-400 cursor-pointer'
                                    : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-30'
                                }`}
                                title={deleteCheck.allowed ? 'حذف السند' : deleteCheck.message}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: AUDIT LOG TRAIL --- */}
      {currentTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-brand-red" />
                <span>سجل الرقابة والتدقيق غير القابل للتعديل (Audit Log Trail)</span>
              </h3>
              <p className="text-xs text-gray-400">
                توثيق فوري وكامل لجميع عمليات إضافة، تعديل، اعتماد، رفض، وإلغاء المدفوعات وتعديل الصلاحيات.
              </p>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              إجمالي السجلات: {auditLogs.length}
            </div>
          </div>

          <div className="glass-card divide-y divide-white/5 border-white/5">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <div className="text-sm font-bold text-white mb-1">لا توجد عمليات مسجلة بعد</div>
                <p className="text-xs text-gray-500">سيتم تسجيل أي عملية محاسبية أو تغيير صلاحيات هنا تلقائياً</p>
              </div>
            ) : (
              auditLogs.map((log) => {
                const isCreate = log.action === 'CREATE_PAYMENT';
                const isEdit = log.action === 'EDIT_PAYMENT';
                const isApprove = log.action === 'APPROVE_PAYMENT';
                const isReject = log.action === 'REJECT_PAYMENT';
                const isCancel = log.action === 'CANCEL_PAYMENT';
                const isDelete = log.action === 'DELETE_PAYMENT';
                const isRole = log.action.includes('ROLE') || log.action.includes('USER');

                let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                if (isApprove) badgeColor = 'bg-green-500/10 text-green-400 border-green-500/20';
                if (isReject || isDelete) badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                if (isEdit || isCancel) badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                if (isRole) badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

                return (
                  <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {log.action}
                        </span>
                        <span className="font-bold text-white">{log.title}</span>
                      </div>

                      {log.details?.reason && (
                        <div className="text-amber-400/90 text-xs bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg mt-1">
                          <strong>سبب العملية الموثق:</strong> {log.details.reason}
                        </div>
                      )}

                      {log.details?.oldValue && log.details?.newValue && (
                        <div className="text-gray-400 text-[11px] font-mono mt-1">
                          القيمة السابقة: {JSON.stringify(log.details.oldValue)} ➔ الجديدة: {JSON.stringify(log.details.newValue)}
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-gray-300 font-bold flex items-center sm:justify-end gap-1">
                        <UserCheck className="w-3 h-3 text-brand-red" />
                        <span>{log.performedBy?.name || 'مستخدم'}</span>
                        <span className="text-[10px] text-gray-500">({log.performedBy?.role})</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('ar-SA') : new Date().toLocaleString('ar-SA')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: ROLES & PERMISSIONS MATRIX --- */}
      {currentTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-red" />
                <span>مصفوفة الأدوار والصلاحيات (Role-Based Access Control)</span>
              </h3>
              <p className="text-xs text-gray-400">
                استعراض الأدوار القياسية وإمكانية إنشاء Roles مخصصة وتحديد صلاحيات المدفوعات الـ 10 بدقة.
              </p>
            </div>

            {can('manage_payment_permissions') && (
              <button
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-red/20 flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إنشاء دور مخصص (Custom Role)</span>
              </button>
            )}
          </div>

          {/* Roles Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="glass-card p-5 border-white/5 space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{role.name}</span>
                      {role.isSystem && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-gray-300">
                          نظامي
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-brand-red">{role.code}</span>
                  </div>

                  {!role.isSystem && can('manage_payment_permissions') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setIsRoleModalOpen(true);
                        }}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                        title="تعديل الدور"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`هل أنت متأكد من حذف الدور المخصص (${role.name})؟`)) return;
                          setRoles(prev => prev.filter(r => r.id !== role.id));
                          await recordPaymentAuditLog(
                            'DELETE_ROLE',
                            `حذف الدور المخصص: ${role.name}`,
                            role.id,
                            'role',
                            { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
                            { oldValue: role }
                          );
                        }}
                        className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                        title="حذف الدور"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed min-h-[36px]">
                  {role.description}
                </p>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-[11px] text-gray-400 mb-2 flex justify-between">
                    <span>الصلاحيات الممنوحة:</span>
                    <span className="font-bold text-white">{role.permissions.length} / 10</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_PAYMENT_PERMISSIONS.map(p => {
                      const hasIt = role.permissions.includes(p.id);
                      return (
                        <span
                          key={p.id}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            hasIt 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-white/5 text-gray-600 opacity-40 line-through'
                          }`}
                          title={p.description}
                        >
                          {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Permissions Matrix Table */}
          <div className="glass-card overflow-hidden border-white/5 mt-6">
            <div className="p-4 bg-white/5 border-b border-white/10">
              <h4 className="font-bold text-xs text-white">جدول الصلاحيات التفصيلي الشامل</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="px-4 py-3 font-bold">الصلاحية</th>
                    <th className="px-4 py-3 font-bold">الوصف المحاسبي</th>
                    {roles.map(r => (
                      <th key={r.id} className="px-3 py-3 text-center font-bold">
                        <span className="text-white block">{r.code}</span>
                        <span className="text-[10px] text-gray-500 font-normal">{r.name.split(' ')[0]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ALL_PAYMENT_PERMISSIONS.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                          <span>{p.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono block mr-3">{p.id}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{p.description}</td>
                      {roles.map(r => {
                        const granted = r.permissions.includes(p.id);
                        return (
                          <td key={r.id} className="px-3 py-3 text-center">
                            {granted ? (
                              <span className="w-6 h-6 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 inline-flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-white/5 text-gray-600 inline-flex items-center justify-center opacity-30">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ACCOUNTING USERS --- */}
      {currentTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-red" />
                <span>مستخدمي البرنامج المحاسبي والموظفين</span>
              </h3>
              <p className="text-xs text-gray-400">
                إدارة الحسابات وتعيين الأدوار والصلاحيات المخصصة لكل مستخدم.
              </p>
            </div>

            {can('manage_payment_permissions') && (
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsUserModalOpen(true);
                }}
                className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-red/20 flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            )}
          </div>

          <div className="glass-card overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                    <th className="px-4 py-3 font-bold">اسم المستخدم</th>
                    <th className="px-4 py-3 font-bold">الاسم الكامل</th>
                    <th className="px-4 py-3 font-bold">البريد والجوال</th>
                    <th className="px-4 py-3 font-bold">الدور المعين</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                    <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const role = roles.find(r => r.id === u.roleId);
                    const isCurrent = u.id === activeUserId;

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>@{u.username}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] bg-green-500/20 text-green-400 border border-green-500/30">
                                الحساب الحالي
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-bold text-gray-200">
                          {u.name}
                        </td>

                        <td className="px-4 py-3 text-gray-400">
                          <div>{u.email || '-'}</div>
                          <div className="font-mono text-[11px] text-gray-500">{u.phone || '-'}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-red/10 text-brand-red border border-brand-red/20">
                            {role?.name || u.roleId}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              نشط
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              معطل
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setActiveUserId(u.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCurrent 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
                              }`}
                            >
                              {isCurrent ? 'نشط الآن' : 'تسجيل دخول'}
                            </button>

                            {can('manage_payment_permissions') && (
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setIsUserModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"
                                title="تعديل الدور والصلاحيات"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT PAYMENT --- */}
      {(isAddPaymentOpen || editingPayment) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-xl border-brand-red/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-red" />
                <h3 className="font-bold text-base text-white">
                  {editingPayment ? `تعديل سند القبض (#${editingPayment.paymentNumber})` : 'تسجيل سند قبض ودفع يدوي جديد'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddPaymentOpen(false);
                  setEditingPayment(null);
                }}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editingPayment && editingPayment.status === 'approved' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-brand-red" />
                  <span>تنبيه حماية المدفوعات المعتمدة</span>
                </div>
                <p>
                  هذه الدفعة معتمدة رسمياً. المتابعة ستطلب إدخال سبب التعديل الإلزامي وسيتم تسجيل كل التغييرات والقيمة القديمة والجديدة في السجل الرقابي.
                </p>
              </div>
            )}

            <form onSubmit={editingPayment ? handleEditPendingPayment : handleCreatePayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1 font-bold">المبلغ (ريال سعودي) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="مثال: 350"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-brand-red outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-bold">طريقة الدفع *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  >
                    <option value="cash">نقداً (كاش)</option>
                    <option value="card">بطاقة مدى / ائتمان</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="pos">جهاز نقاط البيع (POS)</option>
                    <option value="cheque">شيك بنكي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1 font-bold">اسم العميل / الدافع *</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.payerName}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payerName: e.target.value }))}
                    placeholder="اسم الدافع أو المنشأة"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={paymentForm.payerPhone}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payerPhone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1 font-bold">تصنيف الدفعة *</label>
                  <select
                    value={paymentForm.category}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  >
                    <option value="service_fee">أجور صيانة وخدمات</option>
                    <option value="part_sale">بيع قطع غيار</option>
                    <option value="advance_deposit">دفعة مقدمة / عربون</option>
                    <option value="maintenance_settlement">تسوية حساب حجز صيانة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">رقم المرجع / الإيصال البنكي</label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="رقم الحوالة أو إيصال مدى"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">رقم حجز الصيانة المرتبط (اختياري)</label>
                <input
                  type="text"
                  value={paymentForm.bookingId}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, bookingId: e.target.value }))}
                  placeholder="مثال: DRF-1025"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي تفاصيل أو ملاحظات خاصة بالدفعة..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPaymentOpen(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                >
                  {editingPayment ? 'متابعة التعديل' : 'حفظ وتسجيل السند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MANDATORY REASON MODAL (PROTECTION & AUDIT) --- */}
      {reasonModal.open && reasonModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {reasonModal.type === 'reject' && 'تأكيد رفض الدفعة'}
                  {reasonModal.type === 'cancel' && 'تأكيد إلغاء سند القبض'}
                  {reasonModal.type === 'edit_approved' && 'طلب تعديل دفعة معتمدة (حماية الدفعات)'}
                  {reasonModal.type === 'delete_approved' && 'حذف دفعة معتمدة (صلاحية مالك)'}
                </h3>
                <div className="text-xs text-gray-400 font-mono">سند: #{reasonModal.payment.paymentNumber} ({reasonModal.payment.amount} ريال)</div>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              وفقاً لسياسة الحسابات والرقابة المالية، يتطلب إتمام هذا الإجراء توثيق <strong>سبب إلزامي</strong> سيتم حفظه مع اسم المستخدم (<span className="text-white font-bold">{activeUser.name}</span>) وتاريخ اليوم في السجل الرقابي غير القابل للتعديل.
            </p>

            <div className="space-y-2">
              <label className="block text-xs text-amber-400 font-bold">سبب الإجراء * (إلزامي)</label>
              <textarea
                rows={3}
                required
                value={reasonModal.reason}
                onChange={(e) => setReasonModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="أدخل السبب المبرر لهذا الإجراء بالتفصيل..."
                className="w-full bg-black/50 border border-amber-500/30 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setReasonModal({ open: false, type: 'reject', payment: null, reason: '' })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleReasonSubmit}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
              >
                تأكيد وتوثيق بالسجل الرقابي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: VIEW VOUCHER --- */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-base text-white">سند قبض مالي #{viewingVoucher.paymentNumber}</h3>
                <div className="text-xs text-gray-400">مركز DR.FIX لصيانة السيارات المتنقلة بجدة</div>
              </div>
              <button
                onClick={() => setViewingVoucher(null)}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">المبلغ المقبوض:</span>
                <span className="text-lg font-black text-green-400">{viewingVoucher.amount} ريال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">الدافع:</span>
                <span className="font-bold text-white">{viewingVoucher.payerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">رقم الجوال:</span>
                <span className="font-mono text-gray-200">{viewingVoucher.payerPhone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">طريقة الدفع:</span>
                <span className="text-gray-200">{getMethodLabel(viewingVoucher.paymentMethod)}</span>
              </div>
              {viewingVoucher.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-400">رقم المرجع / الحوالة:</span>
                  <span className="font-mono text-gray-200">{viewingVoucher.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">التصنيف:</span>
                <span className="text-gray-200">{getCategoryLabel(viewingVoucher.category)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">حالة السند:</span>
                <span className="font-bold">{getStatusLabel(viewingVoucher.status)}</span>
              </div>
              {viewingVoucher.notes && (
                <div className="pt-2 border-t border-white/5 text-gray-300">
                  <strong>ملاحظات:</strong> {viewingVoucher.notes}
                </div>
              )}
            </div>

            {/* Edit history if any */}
            {viewingVoucher.editHistory && viewingVoucher.editHistory.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                <div className="font-bold text-amber-400">سجل التعديلات الموثق على السند:</div>
                {viewingVoucher.editHistory.map((h, i) => (
                  <div key={i} className="text-[11px] text-gray-300 border-b border-amber-500/10 pb-1">
                    <div>• تم التعديل بواسطة <strong>{h.modifiedBy.name}</strong>: من {h.oldAmount} إلى {h.newAmount} ريال</div>
                    <div className="text-amber-300/80">السبب: {h.reason}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => handleExportVoucher(viewingVoucher)}
                disabled={!can('export_financial_reports')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل Word (.doc)</span>
              </button>

              <button
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CUSTOM ROLE EDITOR --- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-xl border-purple-500/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  {editingRole ? `تعديل الدور: ${editingRole.name}` : 'إنشاء دور مخصص جديد (Custom Role)'}
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formEl = e.currentTarget;
                const code = (formEl.elements.namedItem('roleCode') as HTMLInputElement).value.trim().toUpperCase();
                const name = (formEl.elements.namedItem('roleName') as HTMLInputElement).value.trim();
                const description = (formEl.elements.namedItem('roleDesc') as HTMLInputElement).value.trim();

                const selectedPerms: PaymentPermission[] = [];
                ALL_PAYMENT_PERMISSIONS.forEach(p => {
                  const check = formEl.elements.namedItem(`perm_${p.id}`) as HTMLInputElement;
                  if (check && check.checked) selectedPerms.push(p.id);
                });

                if (!name || !code) {
                  alert('يرجى ملء الاسم والكود');
                  return;
                }

                if (editingRole) {
                  setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, code, name, description, permissions: selectedPerms } : r));
                  await recordPaymentAuditLog(
                    'UPDATE_ROLE',
                    `تحديث الدور: ${name} (${selectedPerms.length} صلاحيات)`,
                    editingRole.id,
                    'role',
                    { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
                    { newValue: { code, name, permissions: selectedPerms } }
                  );
                } else {
                  const newRole: PaymentRole = {
                    id: `role_${Date.now()}`,
                    code,
                    name,
                    description,
                    isSystem: false,
                    permissions: selectedPerms,
                    createdAt: new Date().toISOString()
                  };
                  setRoles(prev => [...prev, newRole]);
                  await recordPaymentAuditLog(
                    'CREATE_ROLE',
                    `إنشاء دور مخصص جديد: ${name}`,
                    newRole.id,
                    'role',
                    { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
                    { newValue: newRole }
                  );
                }

                setIsRoleModalOpen(false);
                alert('تم حفظ الدور والصلاحيات بنجاح');
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1 font-bold">اسم الدور *</label>
                  <input
                    name="roleName"
                    defaultValue={editingRole?.name || ''}
                    required
                    placeholder="مثال: مدقق مالي / محاسب فرع"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-bold">رمز الكود (Code) *</label>
                  <input
                    name="roleCode"
                    defaultValue={editingRole?.code || ''}
                    required
                    placeholder="AUDITOR"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">وصف الدور والمسؤوليات</label>
                <input
                  name="roleDesc"
                  defaultValue={editingRole?.description || ''}
                  placeholder="وصف مختصر للمهام المنوطة بهذا الدور..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 font-bold">تحديد الصلاحيات الممنوحة لهذا الدور:</label>
                <div className="space-y-2 max-h-[260px] overflow-y-auto p-3 rounded-xl bg-black/40 border border-white/5">
                  {ALL_PAYMENT_PERMISSIONS.map(p => {
                    const defaultChecked = editingRole ? editingRole.permissions.includes(p.id) : false;
                    return (
                      <label key={p.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          name={`perm_${p.id}`}
                          defaultChecked={defaultChecked}
                          className="mt-0.5 accent-brand-red w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-white">{p.name} <span className="text-[10px] text-gray-500 font-mono">({p.id})</span></div>
                          <div className="text-[11px] text-gray-400">{p.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  حفظ الدور والصلاحيات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: USER EDITOR --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md border-brand-red/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-red" />
                <h3 className="font-bold text-base text-white">
                  {editingUser ? `تعديل المستخدم: ${editingUser.name}` : 'إضافة مستخدم جديد للنظام المحاسبي'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formEl = e.currentTarget;
                const username = (formEl.elements.namedItem('username') as HTMLInputElement).value.trim();
                const name = (formEl.elements.namedItem('name') as HTMLInputElement).value.trim();
                const email = (formEl.elements.namedItem('email') as HTMLInputElement).value.trim();
                const phone = (formEl.elements.namedItem('phone') as HTMLInputElement).value.trim();
                const roleId = (formEl.elements.namedItem('roleId') as HTMLSelectElement).value;

                if (editingUser) {
                  setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, username, name, email, phone, roleId } : u));
                  await recordPaymentAuditLog(
                    'UPDATE_USER',
                    `تحديث بيانات المستخدم: ${name} (دور: ${roleId})`,
                    editingUser.id,
                    'user',
                    { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
                    { newValue: { username, name, email, roleId } }
                  );
                } else {
                  const newUser: AccountingUser = {
                    id: `usr_${Date.now()}`,
                    username,
                    name,
                    email,
                    phone,
                    roleId,
                    isActive: true,
                    createdAt: new Date().toISOString()
                  };
                  setUsers(prev => [...prev, newUser]);
                  await recordPaymentAuditLog(
                    'CREATE_USER',
                    `إضافة مستخدم جديد: ${name} (دور: ${roleId})`,
                    newUser.id,
                    'user',
                    { id: activeUser.id, name: activeUser.name, role: activeUser.roleId, email: activeUser.email },
                    { newValue: newUser }
                  );
                }

                setIsUserModalOpen(false);
                alert('تم حفظ المستخدم بنجاح');
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-gray-300 mb-1 font-bold">اسم المستخدم (Login Username) *</label>
                <input
                  name="username"
                  defaultValue={editingUser?.username || ''}
                  required
                  placeholder="ahmed_acc"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-bold">الاسم الكامل *</label>
                <input
                  name="name"
                  defaultValue={editingUser?.name || ''}
                  required
                  placeholder="أحمد سالم المحاسب"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1">البريد الإلكتروني</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email || ''}
                    placeholder="user@drfix.repair"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">رقم الجوال</label>
                  <input
                    name="phone"
                    defaultValue={editingUser?.phone || ''}
                    placeholder="0500000000"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-bold">الدور المحاسبي والصلاحيات *</label>
                <select
                  name="roleId"
                  defaultValue={editingUser?.roleId || 'staff'}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-brand-red outline-none"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                >
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
