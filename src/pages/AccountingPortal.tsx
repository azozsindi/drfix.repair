import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Paperclip,
  Clock,
  Car,
  User,
  Phone,
  Trash2,
  ArrowRightLeft,
  UserPlus,
  X
} from 'lucide-react';
import {
  AccountingServiceInvoice,
  AccountingVoucher,
  AccountingPurchase,
  AccountingExpense,
  CustomerFinancialAccount,
  AccountingAuditLog,
  FinancialSummaryReport,
  PurchaseCategory,
  ExpenseCategory,
  AccountingPaymentMethod
} from '../types/accounting';
import { formatCurrency, calculateServiceTotals } from '../lib/accountingPermissions';

// Safe accounting fetch helper that attaches session token for iframe and cross-origin compatibility
const getStoredAccountingToken = () => {
  try {
    return sessionStorage.getItem('drfix_acc_token') || localStorage.getItem('drfix_acc_token') || '';
  } catch {
    return '';
  }
};

const accountingFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getStoredAccountingToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });
};

export default function AccountingPortal() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  // Auth State
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking');
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Portal Tab
  const [activeTab, setActiveTab] = useState<'services' | 'purchases' | 'expenses' | 'reports'>('services');

  // Audit Log Drawer
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AccountingAuditLog[]>([]);

  // Print Modal
  const [printInvoice, setPrintInvoice] = useState<AccountingServiceInvoice | null>(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ---------------------------------------------------------
  // Check Session on Mount
  // ---------------------------------------------------------
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await accountingFetch('/api/accounting/auth/me');
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setSessionUser(data.user);
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('unauthenticated');
      }
    } catch {
      setAuthStatus('unauthenticated');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/accounting/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try {
            sessionStorage.setItem('drfix_acc_token', data.token);
            localStorage.setItem('drfix_acc_token', data.token);
          } catch {}
        }
        setSessionUser(data.user);
        setAuthStatus('authenticated');
        showToast(isAr ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
      } else {
        setLoginError(data.message || (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials'));
      }
    } catch {
      setLoginError(isAr ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await accountingFetch('/api/accounting/auth/logout', { method: 'POST' });
    } catch {}
    try {
      sessionStorage.removeItem('drfix_acc_token');
      localStorage.removeItem('drfix_acc_token');
    } catch {}
    setSessionUser(null);
    setAuthStatus('unauthenticated');
  };

  const loadAuditLogs = async () => {
    try {
      const res = await accountingFetch('/api/accounting/audit-logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditLogs(data.logs || []);
        setShowAuditModal(true);
      }
    } catch {
      showToast(isAr ? 'فشل تحميل سجل الرقابة' : 'Failed to load audit logs', 'error');
    }
  };

  // =========================================================
  // SUB-SECTION: SERVICES & INVOICES
  // =========================================================
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [hasSearchedCustomer, setHasSearchedCustomer] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<AccountingServiceInvoice[]>([]);
  const [customerVouchers, setCustomerVouchers] = useState<AccountingVoucher[]>([]);
  const [customerFinancialAccount, setCustomerFinancialAccount] = useState<CustomerFinancialAccount | null>(null);

  // Quick Customer Creation Modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustCarModel, setQuickCustCarModel] = useState('');
  const [quickCustCarPlate, setQuickCustCarPlate] = useState('');
  const [isCreatingQuickCust, setIsCreatingQuickCust] = useState(false);

  // Debounced Customer Search Effect
  useEffect(() => {
    const trimmed = customerSearchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setHasSearchedCustomer(false);
      setCustomerSearchError('');
      return;
    }

    const timer = setTimeout(() => {
      performCustomerSearch(trimmed);
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  const performCustomerSearch = async (q: string) => {
    setIsSearchingCustomer(true);
    setCustomerSearchError('');
    try {
      const res = await accountingFetch(`/api/accounting/customers/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.customers || []);
      } else {
        setSearchResults([]);
        if (data.message) setCustomerSearchError(data.message);
      }
    } catch {
      setCustomerSearchError(isAr ? 'فشل الاتصال بخادم البحث' : 'Search connection failed');
      setSearchResults([]);
    } finally {
      setIsSearchingCustomer(false);
      setHasSearchedCustomer(true);
    }
  };

  const openQuickCustomerModalFromSearch = () => {
    const q = customerSearchQuery.trim();
    const isDigits = /^[0-9٠-٩+\s-]+$/.test(q);
    if (isDigits) {
      setQuickCustPhone(q);
      setQuickCustName('');
    } else {
      setQuickCustName(q);
      setQuickCustPhone('');
    }
    setQuickCustCarModel('');
    setQuickCustCarPlate('');
    setShowQuickCustomerModal(true);
  };

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      showToast(isAr ? 'يرجى كتابة اسم العميل' : 'Customer name is required', 'error');
      return;
    }
    setIsCreatingQuickCust(true);
    try {
      const res = await accountingFetch('/api/accounting/customers/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCustName.trim(),
          phone: quickCustPhone.trim(),
          carModel: quickCustCarModel.trim(),
          carPlate: quickCustCarPlate.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? 'تم إنشاء الملف المالي للعميل بنجاح' : 'Customer financial file created successfully');
        setShowQuickCustomerModal(false);
        selectCustomer(data.customer);
      } else {
        showToast(data.message || (isAr ? 'فشل إنشاء ملف العميل' : 'Failed to create customer file'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error', 'error');
    } finally {
      setIsCreatingQuickCust(false);
    }
  };

  // New Invoice Modal
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceDiscountReason, setInvoiceDiscountReason] = useState('');
  const [invoiceVatRate, setInvoiceVatRate] = useState<number>(0.15);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<AccountingPaymentMethod>('cash');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<number>(0);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Voucher / Payment Modal
  const [voucherModalInvoice, setVoucherModalInvoice] = useState<AccountingServiceInvoice | null>(null);
  const [voucherType, setVoucherType] = useState<'receipt' | 'refund'>('receipt');
  const [voucherAmount, setVoucherAmount] = useState<number>(0);
  const [voucherMethod, setVoucherMethod] = useState<AccountingPaymentMethod>('cash');
  const [voucherBankRef, setVoucherBankRef] = useState('');
  const [voucherReason, setVoucherReason] = useState('');
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState(false);

  // Cancel Invoice Modal
  const [cancelModalInvoice, setCancelModalInvoice] = useState<AccountingServiceInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const selectCustomer = async (cust: any) => {
    setSelectedCustomer(cust);
    setSearchResults([]);
    setCustomerSearchQuery('');
    setHasSearchedCustomer(false);
    try {
      const res = await accountingFetch(`/api/accounting/customers/${cust.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerFinancialAccount(data.financialAccount);
        setCustomerInvoices(data.invoices || []);
        setCustomerVouchers(data.vouchers || []);
      }
    } catch {
      showToast(isAr ? 'فشل جلب الملف المالي للعميل' : 'Failed to fetch customer file', 'error');
    }
  };

  const refreshCustomerFile = () => {
    if (selectedCustomer) selectCustomer(selectedCustomer);
  };

  // Add Item to New Invoice
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeInvoiceItem = (id: string) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter(i => i.id !== id));
  };

  const updateInvoiceItem = (id: string, field: string, value: any) => {
    setInvoiceItems(invoiceItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const newInvoiceCalculations = useMemo(() => {
    return calculateServiceTotals(invoiceItems, invoiceDiscount, invoiceVatRate);
  }, [invoiceItems, invoiceDiscount, invoiceVatRate]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      showToast(isAr ? 'يرجى اختيار العميل أولاً' : 'Please select customer first', 'error');
      return;
    }
    if (invoiceDiscount > 0 && (!invoiceDiscountReason || invoiceDiscountReason.trim().length < 3)) {
      showToast(isAr ? 'سبب الخصم إلزامي عند إدخال أي خصم مالي' : 'Discount reason is mandatory', 'error');
      return;
    }

    setIsSubmittingInvoice(true);
    try {
      const payload: any = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        items: invoiceItems,
        discountAmount: invoiceDiscount,
        discountReason: invoiceDiscountReason,
        vatRate: invoiceVatRate
      };

      if (initialPaymentAmount > 0) {
        payload.initialVoucher = {
          amount: initialPaymentAmount,
          paymentMethod: initialPaymentMethod
        };
      }

      const res = await accountingFetch('/api/accounting/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? 'تم إصدار فاتورة الخدمة بنجاح' : 'Invoice created successfully');
        setShowNewInvoiceModal(false);
        setInvoiceItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
        setInvoiceDiscount(0);
        setInvoiceDiscountReason('');
        setInitialPaymentAmount(0);
        refreshCustomerFile();
      } else {
        showToast(data.message || (isAr ? 'فشل حفظ الفاتورة' : 'Failed to save invoice'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في الاتصال بالخادم' : 'Server error', 'error');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || voucherAmount <= 0) {
      showToast(isAr ? 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' : 'Valid amount required', 'error');
      return;
    }
    if (voucherType === 'refund' && (!voucherReason || voucherReason.trim().length < 3)) {
      showToast(isAr ? 'سبب الاسترجاع إلزامي ومطلوب لتوثيقه' : 'Refund reason is mandatory', 'error');
      return;
    }

    setIsSubmittingVoucher(true);
    try {
      const res = await accountingFetch('/api/accounting/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceInvoiceId: voucherModalInvoice?.id,
          customerId: selectedCustomer.id,
          voucherType,
          amount: voucherAmount,
          paymentMethod: voucherMethod,
          bankReference: voucherBankRef,
          reason: voucherReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(voucherType === 'refund' ? (isAr ? 'تم تسجيل الاسترجاع بنجاح' : 'Refund recorded') : (isAr ? 'تم تسجيل سند القبض بنجاح' : 'Payment receipt recorded'));
        setVoucherModalInvoice(null);
        setVoucherAmount(0);
        setVoucherReason('');
        setVoucherBankRef('');
        refreshCustomerFile();
      } else {
        showToast(data.message || (isAr ? 'فشل حفظ السند' : 'Failed to save voucher'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في حفظ السند' : 'Error saving voucher', 'error');
    } finally {
      setIsSubmittingVoucher(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalInvoice || !cancelReason || cancelReason.trim().length < 3) {
      showToast(isAr ? 'سبب الإلغاء إلزامي' : 'Cancellation reason required', 'error');
      return;
    }
    setIsSubmittingCancel(true);
    try {
      const res = await accountingFetch(`/api/accounting/services/${cancelModalInvoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? 'تم إلغاء الفاتورة وتوثيق السبب' : 'Invoice cancelled');
        setCancelModalInvoice(null);
        setCancelReason('');
        refreshCustomerFile();
      } else {
        showToast(data.message || (isAr ? 'فشل إلغاء الفاتورة' : 'Failed to cancel'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // =========================================================
  // SUB-SECTION: PURCHASES (Financial Only)
  // =========================================================
  const [purchasesList, setPurchasesList] = useState<AccountingPurchase[]>([]);
  const [selectedPurchaseCategory, setSelectedPurchaseCategory] = useState<string>('all');
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [purchaseItemName, setPurchaseItemName] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseCategory>('spare_parts');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<number>(0);
  const [purchaseIsTaxable, setPurchaseIsTaxable] = useState(true);
  const [purchaseSupplierName, setPurchaseSupplierName] = useState('');
  const [purchaseSupplierInvoiceNo, setPurchaseSupplierInvoiceNo] = useState('');
  const [purchaseMethod, setPurchaseMethod] = useState<AccountingPaymentMethod>('card');
  const [purchaseAttachmentUrl, setPurchaseAttachmentUrl] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  const loadPurchases = async () => {
    try {
      const res = await accountingFetch('/api/accounting/purchases');
      const data = await res.json();
      if (res.ok && data.success) {
        setPurchasesList(data.purchases || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && activeTab === 'purchases') {
      loadPurchases();
    }
  }, [authStatus, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAttachment(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await accountingFetch('/api/accounting/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPurchaseAttachmentUrl(data.url);
        showToast(isAr ? 'تم رفع صورة الإيصال بنجاح' : 'Receipt uploaded successfully');
      } else {
        showToast(data.message || (isAr ? 'فشل رفع الملف' : 'Upload failed'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ أثناء رفع الملف' : 'Upload error', 'error');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseItemName || purchaseUnitPrice <= 0) {
      showToast(isAr ? 'اسم المادة أو القطعة وسعر الوحدة مطلوبان' : 'Item name and unit price required', 'error');
      return;
    }
    setIsSubmittingPurchase(true);
    try {
      const res = await accountingFetch('/api/accounting/purchases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: purchaseCategory,
          itemName: purchaseItemName,
          quantity: purchaseQuantity,
          unitPrice: purchaseUnitPrice,
          isTaxable: purchaseIsTaxable,
          vatRate: 0.15,
          supplierName: purchaseSupplierName,
          supplierInvoiceNumber: purchaseSupplierInvoiceNo,
          paymentMethod: purchaseMethod,
          receiptAttachmentUrl: purchaseAttachmentUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? 'تم حفظ عملية الشراء بنجاح' : 'Purchase recorded successfully');
        setShowNewPurchaseModal(false);
        setPurchaseItemName('');
        setPurchaseUnitPrice(0);
        setPurchaseSupplierName('');
        setPurchaseSupplierInvoiceNo('');
        setPurchaseAttachmentUrl('');
        loadPurchases();
      } else {
        showToast(data.message || (isAr ? 'فشل حفظ عملية الشراء' : 'Save failed'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في الخادم' : 'Server error', 'error');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // =========================================================
  // SUB-SECTION: EXPENSES
  // =========================================================
  const [expensesList, setExpensesList] = useState<AccountingExpense[]>([]);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('all');
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('salaries');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseIsTaxable, setExpenseIsTaxable] = useState(false);
  const [expensePayee, setExpensePayee] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<AccountingPaymentMethod>('cash');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const loadExpenses = async () => {
    try {
      const res = await accountingFetch('/api/accounting/expenses');
      const data = await res.json();
      if (res.ok && data.success) {
        setExpensesList(data.expenses || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && activeTab === 'expenses') {
      loadExpenses();
    }
  }, [authStatus, activeTab]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || expenseAmount <= 0) {
      showToast(isAr ? 'عنوان المصروف والمبلغ مطلوبان' : 'Title and amount required', 'error');
      return;
    }
    setIsSubmittingExpense(true);
    try {
      const res = await accountingFetch('/api/accounting/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseCategory,
          title: expenseTitle,
          amountBeforeVat: expenseAmount,
          isTaxable: expenseIsTaxable,
          vatRate: 0.15,
          paymentMethod: expenseMethod,
          payeeOrVendor: expensePayee,
          notes: expenseNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? 'تم حفظ المصروف بنجاح' : 'Expense recorded successfully');
        setShowNewExpenseModal(false);
        setExpenseTitle('');
        setExpenseAmount(0);
        setExpensePayee('');
        setExpenseNotes('');
        loadExpenses();
      } else {
        showToast(data.message || (isAr ? 'فشل حفظ المصروف' : 'Save failed'), 'error');
      }
    } catch {
      showToast(isAr ? 'خطأ في الاتصال' : 'Connection error', 'error');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // =========================================================
  // SUB-SECTION: FINANCIAL REPORTS & CASH FLOW
  // =========================================================
  const [reportData, setReportData] = useState<FinancialSummaryReport | null>(null);
  const [reportPeriodFilter, setReportPeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadReport = async () => {
    setIsLoadingReport(true);
    let from = '';
    const now = new Date();
    if (reportPeriodFilter === 'today') {
      from = now.toISOString().split('T')[0];
    } else if (reportPeriodFilter === 'week') {
      const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      from = d.toISOString().split('T')[0];
    } else if (reportPeriodFilter === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = d.toISOString().split('T')[0];
    }
    const to = now.toISOString().split('T')[0];

    try {
      const res = await accountingFetch(`/api/accounting/reports/summary?from=${from}&to=${to}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReportData(data.report);
      }
    } catch {}
    finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && activeTab === 'reports') {
      loadReport();
    }
  }, [authStatus, activeTab, reportPeriodFilter]);

  // =========================================================
  // RENDER: LOADING STATE
  // =========================================================
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#090A0C] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">جاري فحص جلسة وصلاحيات الحسابات...</p>
      </div>
    );
  }

  // =========================================================
  // RENDER: UNAUTHENTICATED LOGIN SCREEN
  // =========================================================
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-center items-center p-4 selection:bg-red-600 selection:text-white" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-md bg-[#101216] border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 rounded-2xl flex items-center justify-center text-red-500 mb-3 shadow-lg shadow-red-600/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              DR.FIX <span className="text-red-500">ACCOUNTS</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? 'بوابة إدارة الحسابات والمالية الداخلية المحمية' : 'Internal Protected Accounting Portal'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-300 text-[11px] font-semibold mt-3">
              <Lock className="w-3 h-3 text-red-400" />
              <span>{isAr ? 'صلاحية accounting_admin مطلوبة حصراً' : 'accounting_admin required strictly'}</span>
            </div>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-600/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {isAr ? 'اسم المستخدم' : 'Username'}
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                placeholder={isAr ? 'اسم مستخدم الموظف المعتمد' : 'Staff username'}
                className="w-full bg-[#181B20] border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181B20] border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-red-600/20 text-sm flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isAr ? 'جاري التحقق الخادمي...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{isAr ? 'دخول بوابة الحسابات' : 'Access Accounting'}</span>
              )}
            </button>
          </form>

          {/* Lang toggle & note */}
          <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
            <button
              type="button"
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="hover:text-white transition-colors"
            >
              {isAr ? 'English Interface' : 'الواجهة العربية'}
            </button>
            <span className="text-[11px] text-gray-400">DR.FIX Engine v2026</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: AUTHENTICATED PORTAL
  // =========================================================
  return (
    <div className="min-h-screen bg-[#07080A] text-white flex flex-col selection:bg-red-600 selection:text-white" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-top duration-200 bg-gray-900 border border-gray-700 text-white">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-[#0E1014] border-b border-gray-800/90 sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/40 flex items-center justify-center text-red-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight">DR.FIX</span>
                <span className="text-red-500 font-black text-sm">ACCOUNTS</span>
              </div>
              <p className="text-[10px] text-gray-400 hidden sm:block">
                {isAr ? 'نظام إدارة الحسابات المالية والتحصيل الداخلي' : 'Internal Accounting & Financial Portal'}
              </p>
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-2.5">
            {/* User Info */}
            <div className="hidden sm:flex flex-col text-right px-2.5 py-1 rounded-lg bg-gray-900/60 border border-gray-800">
              <span className="text-xs font-bold text-gray-200">{sessionUser?.fullName || 'المحاسب'}</span>
              <span className="text-[10px] text-emerald-400 font-mono">accounting_admin</span>
            </div>

            {/* Audit Log Button */}
            <button
              onClick={loadAuditLogs}
              title={isAr ? 'سجل الرقابة والتدقيق' : 'Audit Logs'}
              className="p-2 rounded-xl bg-[#16191E] border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="hidden md:inline">{isAr ? 'الرقابة' : 'Audit'}</span>
            </button>

            {/* Language Switch */}
            <button
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-xl bg-[#16191E] border border-gray-800 hover:border-gray-700 text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
              {isAr ? 'EN' : 'عربي'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
              className="p-2 rounded-xl bg-red-950/40 border border-red-900/50 hover:bg-red-900/60 text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Main Tabs Navigation */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-gray-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'services'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isAr ? '1. الخدمات والتحصيل' : '1. Services & Billing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'purchases'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isAr ? '2. المشتريات' : '2. Purchases'}</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'expenses'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? '3. المصروفات' : '3. Expenses'}</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'reports'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? '4. التقارير والتدفق النقدي' : '4. Reports & Cash Flow'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* ================================================= */}
        {/* TAB 1: SERVICES & BILLING                         */}
        {/* ================================================= */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Customer Search & Picker */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Search className="w-4 h-4 text-red-500" />
                  <span>{isAr ? 'البحث عن العميل بالسجل المالي' : 'Search Customer Financial File'}</span>
                </h2>
                <button
                  type="button"
                  onClick={openQuickCustomerModalFromSearch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-xs font-semibold text-gray-200 transition-colors self-start sm:self-auto"
                >
                  <UserPlus className="w-3.5 h-3.5 text-red-500" />
                  <span>{isAr ? '+ فتح ملف لعميل جديد' : '+ New Customer File'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder={isAr ? 'أدخل رقم الجوال (مثل 0501234567) أو اسم العميل (عربي / English)...' : 'Enter phone or customer name (Arabic / English)...'}
                  className="w-full bg-[#181B20] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 pr-10 rtl:pr-4 rtl:pl-16"
                />

                {/* Clear Button */}
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery('');
                      setSearchResults([]);
                      setHasSearchedCustomer(false);
                    }}
                    className="absolute left-8 top-3.5 rtl:left-8 rtl:right-auto text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {isSearchingCustomer && (
                  <div className="absolute left-3 top-3.5 rtl:left-3 rtl:right-auto">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Dropdown Results */}
                {customerSearchQuery.trim().length >= 2 && (
                  <div className="absolute top-full mt-2 w-full bg-[#16191E] border border-gray-700 rounded-xl shadow-2xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-800">
                    {/* Searching State */}
                    {isSearchingCustomer && searchResults.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span>{isAr ? 'جاري البحث في قاعدة البيانات والسجل المالي...' : 'Searching customer records...'}</span>
                      </div>
                    )}

                    {/* Results list */}
                    {searchResults.length > 0 && searchResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full p-3 text-right rtl:text-right ltr:text-left hover:bg-gray-800/70 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{c.name}</span>
                              {c.source === 'maintenance' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40">
                                  {isAr ? 'حجز ورشة' : 'Booking'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>{c.phone || (isAr ? 'بدون جوال' : 'No phone')}</span>
                              {c.cars && c.cars.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-gray-400">
                                    {[c.cars[0].make, c.cars[0].model, c.cars[0].year, c.cars[0].plateNumber].filter(Boolean).join(' ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-900 border border-gray-700 text-gray-300">
                          {isAr ? 'الرصيد: ' : 'Balance: '}
                          <span className={c.currentBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {formatCurrency(c.currentBalance, lang)}
                          </span>
                        </div>
                      </button>
                    ))}

                    {/* No Results Empty State */}
                    {!isSearchingCustomer && hasSearchedCustomer && searchResults.length === 0 && (
                      <div className="p-5 text-center">
                        <div className="text-sm font-medium text-gray-200 mb-1">
                          {isAr ? `لم يتم العثور على عميل يطابق: "${customerSearchQuery}"` : `No customer found matching "${customerSearchQuery}"`}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          {isAr ? 'يمكنك فتح ملف مالي وتسجيل العميل فوراً لإصدار الفاتورة بدون مغادرة الصفحة:' : 'You can register a new customer and open their file now:'}
                        </p>
                        <button
                          type="button"
                          onClick={openQuickCustomerModalFromSearch}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{isAr ? '+ فتح ملف مالي وتسجيل العميل' : '+ Open Financial File'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customer Card */}
              {selectedCustomer && (
                <div className="mt-4 p-4 rounded-xl bg-[#16191E] border border-gray-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white flex items-center gap-2">
                        <span>{selectedCustomer.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">
                          {selectedCustomer.phone}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                        <span>
                          {isAr ? 'الرصيد المالي المستحق: ' : 'Outstanding: '}
                          <strong className={customerFinancialAccount && customerFinancialAccount.currentBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            {formatCurrency(customerFinancialAccount?.currentBalance || 0, lang)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          {isAr ? 'إجمالي المفوتر: ' : 'Total Billed: '}
                          {formatCurrency(customerFinancialAccount?.totalBilled || 0, lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowNewInvoiceModal(true)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-red-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? 'إصدار فاتورة صيانة' : 'New Service Invoice'}</span>
                    </button>
                    <button
                      onClick={refreshCustomerFile}
                      className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                      title={isAr ? 'تحديث السجل' : 'Refresh'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices Table for Selected Customer */}
            {selectedCustomer && (
              <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span>{isAr ? 'سجل الفواتير وسندات السداد لهذا العميل' : 'Customer Invoices & Vouchers'}</span>
                  </h3>
                  <span className="text-xs text-gray-400">
                    {customerInvoices.length} {isAr ? 'فاتورة' : 'invoices'}
                  </span>
                </div>

                {customerInvoices.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-xs">
                    {isAr ? 'لا توجد فواتير سابقة مسجلة لهذا العميل' : 'No previous invoices recorded for this customer'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right rtl:text-right ltr:text-left divide-y divide-gray-800">
                      <thead>
                        <tr className="text-gray-400 font-semibold bg-[#16191E]">
                          <th className="py-2.5 px-3"># الفاتورة</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">الإجمالي المستحق</th>
                          <th className="py-2.5 px-3">المسدد بالسندات</th>
                          <th className="py-2.5 px-3">المتبقي</th>
                          <th className="py-2.5 px-3">الحالة</th>
                          <th className="py-2.5 px-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-medium">
                        {customerInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 text-gray-400">{inv.createdAt.substring(0, 10)}</td>
                            <td className="py-3 px-3 font-bold text-white">{formatCurrency(inv.grandTotal, lang)}</td>
                            <td className="py-3 px-3 text-emerald-400 font-bold">{formatCurrency(inv.paidAmount, lang)}</td>
                            <td className="py-3 px-3 font-bold text-amber-400">{formatCurrency(inv.remainingBalance, lang)}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'paid' ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300' :
                                inv.status === 'partially_paid' ? 'bg-amber-950/70 border border-amber-800 text-amber-300' :
                                inv.status === 'cancelled' ? 'bg-gray-900 border border-gray-700 text-gray-400 line-through' :
                                'bg-blue-950/70 border border-blue-800 text-blue-300'
                              }`}>
                                {inv.status === 'paid' ? 'مسددة بالكامل' :
                                 inv.status === 'partially_paid' ? 'سداد جزئي' :
                                 inv.status === 'cancelled' ? 'ملغاة' : 'صادرة'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {inv.status !== 'cancelled' && inv.remainingBalance > 0 && (
                                  <button
                                    onClick={() => {
                                      setVoucherModalInvoice(inv);
                                      setVoucherType('receipt');
                                      setVoucherAmount(inv.remainingBalance);
                                    }}
                                    className="px-2 py-1 rounded bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-800/60 text-emerald-300 text-[10px] font-bold transition-colors"
                                  >
                                    قبض دفعة
                                  </button>
                                )}

                                {inv.status !== 'cancelled' && inv.paidAmount > 0 && (
                                  <button
                                    onClick={() => {
                                      setVoucherModalInvoice(inv);
                                      setVoucherType('refund');
                                      setVoucherAmount(0);
                                    }}
                                    className="px-2 py-1 rounded bg-amber-900/40 border border-amber-700 hover:bg-amber-800/60 text-amber-300 text-[10px] font-bold transition-colors"
                                  >
                                    استرجاع
                                  </button>
                                )}

                                {inv.status !== 'cancelled' && (
                                  <button
                                    onClick={() => setCancelModalInvoice(inv)}
                                    className="px-2 py-1 rounded bg-red-950/40 border border-red-900 hover:bg-red-900/60 text-red-400 text-[10px] font-bold transition-colors"
                                  >
                                    إلغاء
                                  </button>
                                )}

                                <button
                                  onClick={() => setPrintInvoice(inv)}
                                  className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                                  title="طباعة"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 2: PURCHASES (Financial Only)                 */}
        {/* ================================================= */}
        {activeTab === 'purchases' && (
          <div className="space-y-6">
            {/* Header & New Purchase */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-500" />
                  <span>{isAr ? 'سجل المشتريات وفواتير الموردين (مالي فقط)' : 'Purchases & Supplier Invoices (Financial Only)'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'تسجيل فواتير الشراء لقطع الغيار والمستلزمات لحساب التكلفة المباشرة دون جرد مستودعي' : 'Direct cost recording without stock tracking'}
                </p>
              </div>

              <button
                onClick={() => setShowNewPurchaseModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'تسجيل عملية شراء جديدة' : 'Record New Purchase'}</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'spare_parts', label: 'قطع غيار' },
                { id: 'oils_fluids', label: 'زيوت وسوائل' },
                { id: 'tools_equipment', label: 'أدوات ومعدات' },
                { id: 'operating_supplies', label: 'مستلزمات تشغيل' },
                { id: 'other', label: 'أخرى' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedPurchaseCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedPurchaseCategory === cat.id
                      ? 'bg-gray-200 text-black'
                      : 'bg-[#16191E] border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Purchases Table */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left divide-y divide-gray-800">
                  <thead>
                    <tr className="bg-[#16191E] text-gray-400 font-semibold">
                      <th className="py-3 px-4"># العملية</th>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">المادة / القطعة</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">المورد / رقم الفاتورة</th>
                      <th className="py-3 px-4">الكمية × السعر</th>
                      <th className="py-3 px-4">الضريبة</th>
                      <th className="py-3 px-4">الإجمالي المدفوع</th>
                      <th className="py-3 px-4">وسيلة الدفع</th>
                      <th className="py-3 px-4 text-center">المرفق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {purchasesList
                      .filter(p => selectedPurchaseCategory === 'all' || p.category === selectedPurchaseCategory)
                      .map(p => (
                        <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">{p.purchaseNumber}</td>
                          <td className="py-3 px-4 text-gray-400">{p.purchaseDate}</td>
                          <td className="py-3 px-4 text-white font-bold">{p.itemName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 text-[10px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            <div>{p.supplierName}</div>
                            <div className="text-[10px] text-gray-500 font-mono">فاتورة: {p.supplierInvoiceNumber}</div>
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {p.quantity} × {formatCurrency(p.unitPrice, lang)}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{formatCurrency(p.vatAmount, lang)}</td>
                          <td className="py-3 px-4 font-bold text-white">{formatCurrency(p.finalTotal, lang)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
                              {p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'card' ? 'شبكة' : 'تحويل'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.receiptAttachmentUrl ? (
                              <a
                                href={p.receiptAttachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1 rounded bg-gray-800 hover:bg-gray-700 text-red-400"
                                title="عرض الإيصال"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {purchasesList.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-gray-500 text-xs">
                          {isAr ? 'لا توجد عمليات شراء مسجلة' : 'No purchases recorded'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 3: EXPENSES                                   */}
        {/* ================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Header & New Expense */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-red-500" />
                  <span>{isAr ? 'سجل المصروفات التشغيلية والنثرية للمركز' : 'Operating & Administrative Expenses'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'تسجيل إيجار المركز، رواتب، فواتير الاتصالات، النثريات، والرسوم الحكومية' : 'Rent, salaries, utilities, and general center expenses'}
                </p>
              </div>

              <button
                onClick={() => setShowNewExpenseModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'تسجيل مصروف جديد' : 'Record New Expense'}</span>
              </button>
            </div>

            {/* Expense Categories Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'salaries', label: 'رواتب' },
                { id: 'rent', label: 'إيجار' },
                { id: 'fuel_transportation', label: 'وقود ونقل' },
                { id: 'maintenance', label: 'صيانة' },
                { id: 'telecom', label: 'اتصالات' },
                { id: 'marketing', label: 'تسويق' },
                { id: 'government_fees', label: 'رسوم حكومية' },
                { id: 'software_subscriptions', label: 'برامج واشتراكات' },
                { id: 'admin_expenses', label: 'إدارية' },
                { id: 'other', label: 'أخرى' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedExpenseCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedExpenseCategory === cat.id
                      ? 'bg-gray-200 text-black'
                      : 'bg-[#16191E] border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Expenses Table */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left divide-y divide-gray-800">
                  <thead>
                    <tr className="bg-[#16191E] text-gray-400 font-semibold">
                      <th className="py-3 px-4"># المصروف</th>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">بيان المصروف</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">المستفيد / الجهة</th>
                      <th className="py-3 px-4">المبلغ قبل الضريبة</th>
                      <th className="py-3 px-4">الضريبة</th>
                      <th className="py-3 px-4">الإجمالي المدفوع</th>
                      <th className="py-3 px-4">وسيلة الدفع</th>
                      <th className="py-3 px-4">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {expensesList
                      .filter(e => selectedExpenseCategory === 'all' || e.category === selectedExpenseCategory)
                      .map(e => (
                        <tr key={e.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">{e.expenseNumber}</td>
                          <td className="py-3 px-4 text-gray-400">{e.expenseDate}</td>
                          <td className="py-3 px-4 font-bold text-white">{e.title}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{e.payeeOrVendor}</td>
                          <td className="py-3 px-4 text-gray-300">{formatCurrency(e.amountBeforeVat, lang)}</td>
                          <td className="py-3 px-4 text-gray-400">{formatCurrency(e.vatAmount, lang)}</td>
                          <td className="py-3 px-4 font-bold text-white">{formatCurrency(e.totalAmount, lang)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
                              {e.paymentMethod === 'cash' ? 'نقدي' : e.paymentMethod === 'card' ? 'شبكة' : 'تحويل'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{e.notes || '—'}</td>
                        </tr>
                      ))}
                    {expensesList.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-gray-500 text-xs">
                          {isAr ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TAB 4: REPORTS & CASH FLOW                        */}
        {/* ================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Filter Header */}
            <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  <span>{isAr ? 'التقارير المالية والتدفقات النقدية التشغيلية' : 'Financial Reports & Operational Cash Flow'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'متابعة حركة النقدية والمقبوضات الفعلية والمصروفات دون خلط مع الاستحقاقات المفوترة' : 'Track actual cash inflows and outflows distinct from accruals'}
                </p>
              </div>

              {/* Period Select */}
              <div className="flex items-center gap-1.5 p-1 bg-[#16191E] border border-gray-800 rounded-xl">
                {[
                  { id: 'today', label: 'اليوم' },
                  { id: 'week', label: 'هذا الأسبوع' },
                  { id: 'month', label: 'هذا الشهر' },
                  { id: 'all', label: 'كامل الفترة' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setReportPeriodFilter(p.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      reportPeriodFilter === p.id
                        ? 'bg-red-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice Disclaimer */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isAr
                  ? 'تنبيه تنظيمي: هذه تقارير تشغيلية وإدارية داخلية لمتابعة التدفق النقدي والخزينة اليومية، ولا تمثل قوائم مالية ختامية مدققة.'
                  : 'Notice: Operational cash flow reports for internal tracking only, not formal audited financial statements.'}
              </span>
            </div>

            {/* 8 Primary Financial KPI Cards */}
            {reportData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Invoiced */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">إجمالي الخدمات المفوترة</span>
                  <div className="text-xl font-black text-white mt-1">
                    {formatCurrency(reportData.services.totalInvoiced, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {reportData.services.invoiceCount} فاتورة صادرة
                  </span>
                </div>

                {/* 2. Total Discounts */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">إجمالي الخصومات المعتمدة</span>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    {formatCurrency(reportData.services.totalDiscounts, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">بأسباب موثقة بالرقابة</span>
                </div>

                {/* 3. Total VAT */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">ضريبة القيمة المضافة المحسوبة</span>
                  <div className="text-xl font-black text-blue-400 mt-1">
                    {formatCurrency(reportData.services.totalVat, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">منفصلة عن أجور اليد</span>
                </div>

                {/* 4. Actual Collected */}
                <div className="bg-[#101216] border border-emerald-900/60 rounded-2xl p-4 bg-emerald-950/10">
                  <span className="text-[11px] font-semibold text-emerald-400">إجمالي النقد المحصل فعلياً</span>
                  <div className="text-xl font-black text-emerald-300 mt-1">
                    {formatCurrency(reportData.collections.totalCollected, lang)}
                  </div>
                  <span className="text-[10px] text-emerald-500 mt-1 block">
                    {reportData.collections.vouchersCount} سند قبض مفعل
                  </span>
                </div>

                {/* 5. Outstanding Receivables */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">الأرصدة المتبقية على العملاء</span>
                  <div className="text-xl font-black text-orange-400 mt-1">
                    {formatCurrency(reportData.receivables.totalOutstanding, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">ذمم مدينة قيد التحصيل</span>
                </div>

                {/* 6. Total Purchases */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">إجمالي المشتريات المدفوعة</span>
                  <div className="text-xl font-black text-red-400 mt-1">
                    {formatCurrency(reportData.purchases.totalPurchases, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {reportData.purchases.purchasesCount} عملية شراء
                  </span>
                </div>

                {/* 7. Total Expenses */}
                <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4">
                  <span className="text-[11px] font-semibold text-gray-400">المصروفات التشغيلية</span>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    {formatCurrency(reportData.expenses.totalExpenses, lang)}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {reportData.expenses.expensesCount} مصروف مسجل
                  </span>
                </div>

                {/* 8. Net Operational Cash Movement */}
                <div className={`border rounded-2xl p-4 ${
                  reportData.cashFlow.netCashMovement >= 0
                    ? 'bg-emerald-950/20 border-emerald-800'
                    : 'bg-red-950/20 border-red-800'
                }`}>
                  <span className="text-[11px] font-semibold text-gray-300">صافي السيولة النقدية للفترة</span>
                  <div className={`text-xl font-black mt-1 ${
                    reportData.cashFlow.netCashMovement >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(reportData.cashFlow.netCashMovement, lang)}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    المحصل - (المشتريات + المصروفات)
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method Breakdown Box */}
            {reportData && (
              <div className="bg-[#101216] border border-gray-800 rounded-2xl p-4 sm:p-6">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>توزيع المقبوضات حسب وسيلة السداد المعتمدة</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#16191E] border border-gray-800">
                    <span className="text-xs text-gray-400">نقد في الخزينة (Cash)</span>
                    <div className="text-lg font-black text-white mt-1">
                      {formatCurrency(reportData.collections.cashAmount, lang)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#16191E] border border-gray-800">
                    <span className="text-xs text-gray-400">شبكة / مدى / بطاقة (Card)</span>
                    <div className="text-lg font-black text-white mt-1">
                      {formatCurrency(reportData.collections.cardAmount, lang)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#16191E] border border-gray-800">
                    <span className="text-xs text-gray-400">تحويلات بنكية (Bank Transfer)</span>
                    <div className="text-lg font-black text-white mt-1">
                      {formatCurrency(reportData.collections.bankTransferAmount, lang)}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#16191E] border border-red-950/60 bg-red-950/10">
                    <span className="text-xs text-red-400">استرجاعات مخصومة (Refunds)</span>
                    <div className="text-lg font-black text-red-300 mt-1">
                      {formatCurrency(reportData.collections.refundsAmount, lang)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: NEW SERVICE INVOICE                                */}
      {/* ========================================================= */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-red-500" />
                  <span>إصدار فاتورة خدمة صيانة جديدة</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  العميل: <strong className="text-white">{selectedCustomer?.name}</strong> ({selectedCustomer?.phone})
                </p>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">بنود الخدمات وقطع الغيار:</label>
                  <button
                    type="button"
                    onClick={addInvoiceItem}
                    className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {invoiceItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 bg-[#181B20] p-2 rounded-xl border border-gray-800">
                      <input
                        type="text"
                        required
                        placeholder="وصف الخدمة أو القطعة"
                        value={item.description}
                        onChange={e => updateInvoiceItem(item.id, 'description', e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="الكمية"
                        value={item.quantity}
                        onChange={e => updateInvoiceItem(item.id, 'quantity', e.target.value)}
                        className="w-16 bg-[#101216] border border-gray-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="السعر"
                        value={item.unitPrice || ''}
                        onChange={e => updateInvoiceItem(item.id, 'unitPrice', e.target.value)}
                        className="w-24 bg-[#101216] border border-gray-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(item.id)}
                        disabled={invoiceItems.length === 1}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-30 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount with MANDATORY REASON */}
              <div className="p-3.5 rounded-xl bg-[#181B20] border border-gray-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      مبلغ الخصم (ر.س) إن وجد:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceDiscount || ''}
                      onChange={e => setInvoiceDiscount(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-[#101216] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      نسبة ضريبة القيمة المضافة:
                    </label>
                    <select
                      value={invoiceVatRate}
                      onChange={e => setInvoiceVatRate(Number(e.target.value))}
                      className="w-full bg-[#101216] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value={0.15}>15% (النسبة النظامية المعتمدة)</option>
                      <option value={0}>0% (غير خاضع للضريبة)</option>
                    </select>
                  </div>
                </div>

                {/* Mandatory Reason Alert & Input */}
                {invoiceDiscount > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-700/60 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-red-400 flex items-center gap-1">
                      <span>سبب الخصم (إلزامي للتوثيق الرقابي):</span>
                      <span className="text-[10px] text-gray-400">* مطلوب</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceDiscountReason}
                      onChange={e => setInvoiceDiscountReason(e.target.value)}
                      placeholder="مثال: خصم بموافقة المدير، عميل أسطول، تعويض عن تأخير..."
                      className="w-full bg-[#101216] border border-red-500/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}
              </div>

              {/* Calculations Summary Box */}
              <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>المجموع الفرعي:</span>
                  <span>{formatCurrency(newInvoiceCalculations.subtotal, lang)}</span>
                </div>
                {newInvoiceCalculations.discount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>الخصم المعتمد:</span>
                    <span>- {formatCurrency(newInvoiceCalculations.discount, lang)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>المبلغ الخاضع للضريبة:</span>
                  <span>{formatCurrency(newInvoiceCalculations.taxableAmount, lang)}</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>ضريبة القيمة المضافة ({Number(invoiceVatRate * 100)}%):</span>
                  <span>+ {formatCurrency(newInvoiceCalculations.vatAmount, lang)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-gray-800">
                  <span>الإجمالي النهائي المستحق:</span>
                  <span className="text-red-400">{formatCurrency(newInvoiceCalculations.grandTotal, lang)}</span>
                </div>
              </div>

              {/* Optional Immediate Payment */}
              <div className="p-3.5 rounded-xl bg-[#181B20] border border-gray-800 space-y-2">
                <label className="block text-xs font-bold text-emerald-400">
                  تسجيل دفعة مبدئية فورية (اختياري):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    max={newInvoiceCalculations.grandTotal}
                    step="0.01"
                    placeholder="مبلغ الدفعة إن وجد"
                    value={initialPaymentAmount || ''}
                    onChange={e => setInitialPaymentAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#101216] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <select
                    value={initialPaymentMethod}
                    onChange={e => setInitialPaymentMethod(e.target.value as any)}
                    className="w-full bg-[#101216] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="cash">نقدي (Cash)</option>
                    <option value="card">شبكة / بطاقة (Card / Mada)</option>
                    <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/20"
                >
                  {isSubmittingInvoice ? 'جاري الإصدار...' : 'حفظ وإصدار الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VOUCHER / PAYMENT / REFUND                         */}
      {/* ========================================================= */}
      {voucherModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>
                  {voucherType === 'refund' ? 'تسجيل سند استرجاع مالي' : 'تسجيل سند قبض دفعة'}
                </span>
              </h3>
              <button onClick={() => setVoucherModalInvoice(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-gray-900 text-xs space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>الفاتورة:</span>
                  <span className="font-mono text-white">{voucherModalInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>المتبقي غير المسدد:</span>
                  <span className="font-bold text-amber-400">{formatCurrency(voucherModalInvoice.remainingBalance, lang)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">المبلغ (ر.س):</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={voucherAmount || ''}
                  onChange={e => setVoucherAmount(Number(e.target.value) || 0)}
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">طريقة السداد:</label>
                <select
                  value={voucherMethod}
                  onChange={e => setVoucherMethod(e.target.value as any)}
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="cash">نقدي (Cash)</option>
                  <option value="card">شبكة / بطاقة (Card / Mada)</option>
                  <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                </select>
              </div>

              {voucherMethod !== 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">رقم الحوالة أو إيصال الشبكة:</label>
                  <input
                    type="text"
                    value={voucherBankRef}
                    onChange={e => setVoucherBankRef(e.target.value)}
                    placeholder="رقم مرجعي اختياري"
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              {voucherType === 'refund' && (
                <div>
                  <label className="block text-xs font-bold text-red-400 mb-1">سبب الاسترجاع (إلزامي):</label>
                  <input
                    type="text"
                    required
                    value={voucherReason}
                    onChange={e => setVoucherReason(e.target.value)}
                    placeholder="سبب الاسترجاع لتوثيقه في السجل الرقابي"
                    className="w-full bg-[#181B20] border border-red-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoucherModalInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoucher}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
                >
                  {isSubmittingVoucher ? 'جاري الحفظ...' : 'حفظ السند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANCEL INVOICE                                     */}
      {/* ========================================================= */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>إلغاء الفاتورة رقم: {cancelModalInvoice.invoiceNumber}</span>
              </h3>
              <button onClick={() => setCancelModalInvoice(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCancelInvoice} className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                سيتم إلغاء الفاتورة وعكس أثرها المالي على حساب العميل. لا يُسمح بالحذف الصامت، ويجب تسجيل سبب الإلغاء.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">سبب الإلغاء الإلزامي:</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="سبب إلغاء الفاتورة..."
                  className="w-full bg-[#181B20] border border-red-500 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                >
                  {isSubmittingCancel ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW PURCHASE (Financial Only)                      */}
      {/* ========================================================= */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-red-500" />
                <span>تسجيل عملية شراء جديدة (سجل مالي)</span>
              </h3>
              <button onClick={() => setShowNewPurchaseModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">التصنيف المالي:</label>
                <select
                  value={purchaseCategory}
                  onChange={e => setPurchaseCategory(e.target.value as any)}
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="spare_parts">قطع غيار (Spare Parts)</option>
                  <option value="oils_fluids">زيوت وسوائل (Oils & Fluids)</option>
                  <option value="tools_equipment">أدوات ومعدات (Tools & Equipment)</option>
                  <option value="operating_supplies">مستلزمات تشغيل (Operating Supplies)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">اسم المادة / القطعة:</label>
                <input
                  type="text"
                  required
                  value={purchaseItemName}
                  onChange={e => setPurchaseItemName(e.target.value)}
                  placeholder="مثال: فحمات فرامل أمامية أصلي..."
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">الكمية:</label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseQuantity}
                    onChange={e => setPurchaseQuantity(Number(e.target.value) || 1)}
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">سعر الوحدة قبل الضريبة:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={purchaseUnitPrice || ''}
                    onChange={e => setPurchaseUnitPrice(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                <input
                  type="checkbox"
                  id="purTaxable"
                  checked={purchaseIsTaxable}
                  onChange={e => setPurchaseIsTaxable(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0"
                />
                <label htmlFor="purTaxable" className="text-xs text-gray-300 cursor-pointer">
                  فاتورة المورد ضريبية (إضافة 15% ضريبة مدخلات)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">اسم المورد:</label>
                  <input
                    type="text"
                    value={purchaseSupplierName}
                    onChange={e => setPurchaseSupplierName(e.target.value)}
                    placeholder="شركة الوعلان، منيف..."
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">رقم فاتورة المورد:</label>
                  <input
                    type="text"
                    value={purchaseSupplierInvoiceNo}
                    onChange={e => setPurchaseSupplierInvoiceNo(e.target.value)}
                    placeholder="INV-9921"
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">طريقة الدفع:</label>
                  <select
                    value={purchaseMethod}
                    onChange={e => setPurchaseMethod(e.target.value as any)}
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="card">شبكة / بطاقة (Card)</option>
                    <option value="cash">نقدي (Cash)</option>
                    <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">صورة الفاتورة / الإيصال:</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-gray-800 file:text-xs file:text-white"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 rounded-xl bg-gray-900 flex justify-between items-center text-xs">
                <span className="text-gray-400">الإجمالي النهائي المدفوع:</span>
                <span className="text-base font-black text-white">
                  {formatCurrency(
                    Number(((purchaseQuantity * purchaseUnitPrice) * (purchaseIsTaxable ? 1.15 : 1)).toFixed(2)),
                    lang
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase || isUploadingAttachment}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/20"
                >
                  {isSubmittingPurchase ? 'جاري الحفظ...' : 'حفظ عملية الشراء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NEW EXPENSE                                        */}
      {/* ========================================================= */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <span>تسجيل مصروف تشغيلي / إداري جديد</span>
              </h3>
              <button onClick={() => setShowNewExpenseModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">تصنيف المصروف:</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="salaries">رواتب وأجور (Salaries)</option>
                  <option value="rent">إيجار الورشة والمقر (Rent)</option>
                  <option value="fuel_transportation">وقود ونقليات (Fuel & Transport)</option>
                  <option value="maintenance">صيانة مرافق ومعدات (Maintenance)</option>
                  <option value="telecom">اتصالات وإنترنت (Telecom)</option>
                  <option value="marketing">تسويق وإعلانات (Marketing)</option>
                  <option value="government_fees">رسوم حكومية وتراخيص (Government)</option>
                  <option value="software_subscriptions">برامج واشتراكات سحابية (Software)</option>
                  <option value="admin_expenses">مصروفات إدارية وضيافة (Admin)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">بيان المصروف:</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={e => setExpenseTitle(e.target.value)}
                  placeholder="مثال: فاتورة كهرباء المركز، وقود سيارة الخدمة..."
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">المبلغ:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={expenseAmount || ''}
                    onChange={e => setExpenseAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">طريقة الدفع:</label>
                  <select
                    value={expenseMethod}
                    onChange={e => setExpenseMethod(e.target.value as any)}
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="cash">نقدي (Cash)</option>
                    <option value="card">شبكة / بطاقة (Card)</option>
                    <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">المستفيد / جهة الصرف:</label>
                <input
                  type="text"
                  value={expensePayee}
                  onChange={e => setExpensePayee(e.target.value)}
                  placeholder="شركة الكهرباء، مالك العقار، الموظف..."
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">ملاحظات إضافية:</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={e => setExpenseNotes(e.target.value)}
                  placeholder="أي تفاصيل اختيارية..."
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/20"
                >
                  {isSubmittingExpense ? 'جاري الحفظ...' : 'حفظ المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AUDIT LOGS DRAWER                                  */}
      {/* ========================================================= */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                <span>سجل التدقيق والرقابة المحاسبية غير القابل للتعديل</span>
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">لا توجد سجلات رقابية</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#181B20] border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-gray-800 text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(log.timestamp).toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      بواسطة: <strong className="text-white">{log.performedBy?.name}</strong> ({log.performedBy?.username})
                    </div>
                    {log.reason && (
                      <div className="text-amber-400 text-[11px]">السبب الموثق: {log.reason}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK REGISTER NEW CUSTOMER                       */}
      {/* ========================================================= */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-500" />
                <span>{isAr ? 'فتح ملف مالي لعميل جديد' : 'New Customer Financial File'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {isAr ? 'اسم العميل *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={quickCustName}
                  onChange={e => setQuickCustName(e.target.value)}
                  placeholder={isAr ? 'الاسم أو اسم العميل / المؤسسة...' : 'Customer or company name...'}
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {isAr ? 'رقم الجوال (اختياري / موصى به)' : 'Mobile Phone'}
                </label>
                <input
                  type="tel"
                  value={quickCustPhone}
                  onChange={e => setQuickCustPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {isAr ? 'نوع وموديل السيارة' : 'Car Make / Model'}
                  </label>
                  <input
                    type="text"
                    value={quickCustCarModel}
                    onChange={e => setQuickCustCarModel(e.target.value)}
                    placeholder={isAr ? 'مثال: كامري 2023' : 'e.g. Camry 2023'}
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {isAr ? 'رقم اللوحة' : 'Plate Number'}
                  </label>
                  <input
                    type="text"
                    value={quickCustCarPlate}
                    onChange={e => setQuickCustCarPlate(e.target.value)}
                    placeholder={isAr ? 'مثال: أ ب ج 1234' : 'e.g. ABC 1234'}
                    className="w-full bg-[#181B20] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-[11px] text-gray-400">
                {isAr
                  ? 'سيتم إنشاء سجل العميل وحسابه المالي فوراً، ويمكنك بعد الحفظ مباشرة إصدار الفواتير وسندات القبض له.'
                  : 'Customer and financial record will be initialized immediately for billing.'}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingQuickCust || !quickCustName.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5"
                >
                  {isCreatingQuickCust && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isCreatingQuickCust ? (isAr ? 'جاري الفتح...' : 'Creating...') : (isAr ? 'حفظ وفتح الملف المالي' : 'Save & Open File')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PRINTABLE A4 INVOICE / VOUCHER                     */}
      {/* ========================================================= */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black rounded-2xl w-full max-w-2xl p-8 shadow-2xl my-8 print:p-0 print:shadow-none" dir="rtl">
            {/* Action Bar (hidden on print) */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 print:hidden">
              <span className="text-xs font-bold text-gray-500">معاينة الفاتورة قبل الطباعة</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>
                <button
                  onClick={() => setPrintInvoice(null)}
                  className="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Formal Header */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">DR.FIX AUTO SERVICE</h1>
                <p className="text-xs text-gray-600 font-medium mt-0.5">مركز د.فكس لصيانة وتعديل السيارات</p>
                <p className="text-[11px] text-gray-500 mt-1">المملكة العربية السعودية • الرقم الضريبي المعتمد</p>
              </div>
              <div className="text-left font-mono">
                <div className="text-sm font-black text-red-600">{printInvoice.invoiceNumber}</div>
                <div className="text-xs text-gray-500 mt-1">{printInvoice.createdAt.substring(0, 10)}</div>
              </div>
            </div>

            {/* Customer & Vehicle Info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl mb-4 text-xs">
              <div>
                <span className="text-gray-500">اسم العميل:</span>
                <span className="font-bold text-gray-900 mr-2">{printInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-gray-500">رقم الجوال:</span>
                <span className="font-bold text-gray-900 mr-2 font-mono">{printInvoice.customerPhone}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-right divide-y divide-gray-200 mb-6">
              <thead>
                <tr className="bg-gray-100 font-bold text-gray-700">
                  <th className="py-2 px-3">م</th>
                  <th className="py-2 px-3">البيان / الخدمة</th>
                  <th className="py-2 px-3 text-center">الكمية</th>
                  <th className="py-2 px-3">السعر الإفرادي</th>
                  <th className="py-2 px-3">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {printInvoice.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900">{it.description}</td>
                    <td className="py-2 px-3 text-center">{it.quantity}</td>
                    <td className="py-2 px-3 font-mono">{it.unitPrice.toFixed(2)} ر.س</td>
                    <td className="py-2 px-3 font-mono font-bold text-gray-900">{it.totalPrice.toFixed(2)} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="w-64 mr-auto space-y-1.5 text-xs border-t border-gray-300 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{printInvoice.subtotal.toFixed(2)} ر.س</span>
              </div>
              {printInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>الخصم ({printInvoice.discountReason}):</span>
                  <span className="font-mono">- {printInvoice.discountAmount.toFixed(2)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>ضريبة القيمة المضافة ({Number(printInvoice.vatRate * 100)}%):</span>
                <span className="font-mono">+ {printInvoice.vatAmount.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-300 pt-2">
                <span>الإجمالي النهائي المستحق:</span>
                <span className="text-red-600 font-mono">{printInvoice.grandTotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-700">
                <span>المسدد بالسندات:</span>
                <span className="font-mono">{printInvoice.paidAmount.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-amber-800">
                <span>المتبقي:</span>
                <span className="font-mono">{printInvoice.remainingBalance.toFixed(2)} ر.س</span>
              </div>
            </div>

            {/* Footer Signature Box */}
            <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between text-xs text-gray-500">
              <div>
                <span>المحاسب المسؤول: </span>
                <strong className="text-gray-800">{printInvoice.createdByStaffName}</strong>
              </div>
              <div>
                <span>توقيع وختم المركز: </span>
                <span className="inline-block w-28 border-b border-gray-400"></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
