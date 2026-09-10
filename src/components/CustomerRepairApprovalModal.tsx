import React, { useState } from 'react';
import { 
  FileCheck, 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  X, 
  Share2, 
  DollarSign, 
  AlertTriangle,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { MaintenanceRecord, CustomerRepairApproval, QuotationItem, StaffUser } from '../types';
import { useScrollLock } from '../lib/scrollLock';

interface CustomerRepairApprovalModalProps {
  record: MaintenanceRecord;
  currentStaffUser: StaffUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveApproval: (approval: CustomerRepairApproval) => Promise<void>;
}

export const CustomerRepairApprovalModal: React.FC<CustomerRepairApprovalModalProps> = ({
  record,
  currentStaffUser,
  isOpen,
  onClose,
  onSaveApproval
}) => {
  // Prevent background scroll when approval modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const existing = record.repairApproval;
  const initialItems: QuotationItem[] = existing?.items?.length ? existing.items : [
    { id: '1', description: record.serviceType || 'فحص وصيانة ميكانيكية إضافية', quantity: 1, unitPrice: typeof record.cost === 'number' ? record.cost : 150, total: typeof record.cost === 'number' ? record.cost : 150, isPart: false }
  ];

  const [items, setItems] = useState<QuotationItem[]>(initialItems);
  const [title, setTitle] = useState(existing?.title || `عرض أسعار وموافقة إصلاح لسيارة ${record.carModel}`);
  const [notes, setNotes] = useState(existing?.notes || 'يشمل العرض قطع الغيار الموضحة وأجور اليد الميدانية مع الضمان المعتمد.');
  const [customerSignature, setCustomerSignature] = useState(existing?.customerSignature || '');
  const [approverName, setApproverName] = useState(existing?.approvedByName || record.customerName || record.name || '');
  const [rejectionReason, setRejectionReason] = useState(existing?.rejectionReason || '');
  const [isSaving, setIsSaving] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'view' | 'sign' | 'reject'>('view');

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const taxAmount = Math.round(subtotal * 0.15); // 15% VAT
  const grandTotal = subtotal + taxAmount;

  const handleAddItem = (isPart: boolean = false) => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      description: isPart ? 'قطعة غيار أصلية جديدة' : 'أجور يد وفحص إضافي',
      quantity: 1,
      unitPrice: 100,
      total: 100,
      isPart
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof QuotationItem, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(val) : item.quantity;
        const p = field === 'unitPrice' ? Number(val) : item.unitPrice;
        updated.total = Math.max(0, (isNaN(q) ? 1 : q) * (isNaN(p) ? 0 : p));
      }
      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSendToCustomerWhatsApp = async () => {
    setIsSaving(true);
    try {
      const qNum = existing?.quotationNumber || `Q-${Date.now().toString().slice(-5)}`;
      const approvalData: CustomerRepairApproval = {
        id: existing?.id || `appr-${Date.now()}`,
        quotationNumber: qNum,
        title,
        items,
        subtotal,
        taxAmount,
        grandTotal,
        notes,
        status: 'sent_to_customer',
        sentAt: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdByStaffName: currentStaffUser?.fullName || 'فريق DR.FIX',
        createdByStaffId: currentStaffUser?.id || ''
      };
      await onSaveApproval(approvalData);

      // WhatsApp message with direct approval breakdown
      const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
      const waPhone = cleanPhone.startsWith('966') ? cleanPhone : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);
      const itemsList = items.map((it, idx) => `${idx + 1}. ${it.description} (${it.isPart ? 'قطعة' : 'أجور'}): ${it.total} ر.س`).join('\n');
      
      const msg = `🚗⚡ DR.FIX | عرض أسعار وطلب موافقة على الإصلاح\n\n` +
        `عزيزنا العميل (${record.customerName || 'المحترم'})\n` +
        `بخصوص صيانة سيارتك: ${record.carModel}\n` +
        `رقم السند: #${record.bookingId || record.id}\n\n` +
        `📋 تفاصيل الأعمال المطلوبة:\n${itemsList}\n\n` +
        `💵 الإجمالي غير شامل الضريبة: ${subtotal} ر.س\n` +
        `🏛️ ضريبة القيمة المضافة (15%): ${taxAmount} ر.س\n` +
        `💰 الإجمالي النهائي المطلوب اعتماده: ${grandTotal} ر.س\n\n` +
        `⚠️ تنبيه: التزاماً بسياسة DR.FIX، لن يبدأ الفني بأي أعمال أو تركيب قطع إضافية إلا بعد موافقتك الصريحة.\n\n` +
        `الرجاء الرد بـ (موافق) للبدء المباشر في الإصلاح، أو ذكر أي ملاحظة. 🔧⚡`;

      const url = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmElectronicApproval = async () => {
    if (!approverName.trim()) {
      alert('يرجى كتابة اسم العميل أو المعتمد');
      return;
    }
    setIsSaving(true);
    try {
      const qNum = existing?.quotationNumber || `Q-${Date.now().toString().slice(-5)}`;
      const approvalData: CustomerRepairApproval = {
        id: existing?.id || `appr-${Date.now()}`,
        quotationNumber: qNum,
        title,
        items,
        subtotal,
        taxAmount,
        grandTotal,
        notes,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedByName: approverName.trim(),
        customerSignature: customerSignature || `موافقة إلكترونية موثقة عبر الجوال (${new Date().toLocaleTimeString('ar-SA')})`,
        sentAt: existing?.sentAt || new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdByStaffName: currentStaffUser?.fullName || 'فريق DR.FIX',
        createdByStaffId: currentStaffUser?.id || ''
      };
      await onSaveApproval(approvalData);
      setApprovalMode('view');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectQuotation = async () => {
    if (!rejectionReason.trim()) {
      alert('يرجى توضيح سبب الرفض أو الاعتذار');
      return;
    }
    setIsSaving(true);
    try {
      const qNum = existing?.quotationNumber || `Q-${Date.now().toString().slice(-5)}`;
      const approvalData: CustomerRepairApproval = {
        id: existing?.id || `appr-${Date.now()}`,
        quotationNumber: qNum,
        title,
        items,
        subtotal,
        taxAmount,
        grandTotal,
        notes,
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        sentAt: existing?.sentAt || new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdByStaffName: currentStaffUser?.fullName || 'فريق DR.FIX',
        createdByStaffId: currentStaffUser?.id || ''
      };
      await onSaveApproval(approvalData);
      setApprovalMode('view');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
      <div className="bg-[#121418] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto text-white flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-brand-red/20 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">موافقة العميل على الإصلاح</h3>
                {existing?.status === 'approved' && (
                  <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    معتمد إلكترونياً
                  </span>
                )}
                {existing?.status === 'sent_to_customer' && (
                  <span className="bg-white/10 text-white border border-white/20 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    بانتظار موافقة العميل
                  </span>
                )}
                {existing?.status === 'rejected' && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    تم الرفض
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                سند #{record.bookingId || record.id} • {record.carModel} • العميل: {record.customerName || record.name || record.customerPhone}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="bg-brand-red/10 border-b border-brand-red/20 px-5 py-2.5 flex items-start gap-2.5 text-xs text-red-200">
          <AlertTriangle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
          <span>
            <strong>سياسة الحماية والشفافية:</strong> لا يُسمح للفني ببدء فك أو تركيب قطع إضافية إلا بعد إرسال هذا العرض وتوثيق موافقة العميل لحماية المركز وتوثيق التكلفة مسبقاً.
          </span>
        </div>

        {/* Body Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 flex-1 text-sm">
          {/* Approved Summary Badge if already approved */}
          {existing?.status === 'approved' && approvalMode === 'view' && (
            <div className="p-4 rounded-2xl bg-green-950/40 border border-green-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>تم اعتماد العرض وبدء الإصلاح رسمياً</span>
                </div>
                <span className="text-xs text-green-300 font-mono">
                  {new Date(existing.approvedAt).toLocaleString('ar-SA')}
                </span>
              </div>
              <div className="text-xs text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-green-500/20">
                <div>المعتمد: <strong className="text-white">{existing.approvedByName || record.customerName}</strong></div>
                <div>التوقيع / التوثيق: <strong className="text-green-300 font-mono">{existing.customerSignature || 'موافقة رقمية موثقة'}</strong></div>
              </div>
            </div>
          )}

          {/* Quotation Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">عنوان عرض الإصلاح</label>
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-red/60"
              placeholder="مثال: فحص وإصلاح دينامو وتغيير فحمات الفرامل"
            />
          </div>

          {/* Quotation Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">بنود الإصلاح وقطع الغيار المقترحة</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem(false)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-brand-red" />
                  + أجور يد
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem(true)}
                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-blue-400" />
                  + قطعة غيار
                </button>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
              <div className="divide-y divide-white/5">
                {items.map((item, index) => (
                  <div key={item.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    <span className="w-6 text-center text-xs text-gray-500 font-mono">{index + 1}</span>
                    <div className="flex-1 min-w-[180px]">
                      <input 
                        type="text"
                        value={item.description}
                        onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500"
                        placeholder="بيان العمل أو اسم القطعة"
                      />
                    </div>
                    <div className="w-24">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full block text-center font-bold ${
                        item.isPart ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white'
                      }`}>
                        {item.isPart ? 'قطعة غيار' : 'أجور فحص/يد'}
                      </span>
                    </div>
                    <div className="w-16">
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-center text-white"
                        title="الكمية"
                      />
                    </div>
                    <div className="w-24">
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={e => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                          className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-center text-white font-mono"
                          title="السعر الفردي"
                        />
                      </div>
                    </div>
                    <div className="w-20 text-left font-mono font-bold text-xs text-brand-red">
                      {item.total} ر.س
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="حذف البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="bg-white/5 p-4 border-t border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>المجموع الفرعي (قبل الضريبة):</span>
                  <span className="font-mono font-bold text-white">{subtotal} ر.س</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono font-bold text-gray-300">{taxAmount} ر.س</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span className="text-white">الإجمالي النهائي المطلوب اعتماده:</span>
                  <span className="font-mono text-base font-black text-brand-red">{grandTotal} ر.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">شروط وملاحظات العرض والضمان</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-brand-red/60 resize-none"
              placeholder="مثال: الضمان 3 أشهر على القطعة المستبدلة مع إبراز السند الإلكتروني"
            />
          </div>

          {/* Direct Electronic Signature / Customer Approval Mode */}
          {approvalMode === 'sign' && (
            <div className="p-4 rounded-2xl bg-brand-red/10 border border-brand-red/30 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-red" />
                <span>توثيق اعتماد العميل المباشر (إلكترونياً أو هاتفياً)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">اسم العميل المعتمد *</label>
                  <input 
                    type="text"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="اسم العميل كاملاً"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">طريقة الاعتماد / التوقيع</label>
                  <input 
                    type="text"
                    value={customerSignature}
                    onChange={e => setCustomerSignature(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    placeholder="مثال: موافقة شفهية في الموقع / موافقة عبر محادثة الواتساب"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setApprovalMode('view')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmElectronicApproval}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأكيد اعتماد العميل وبدء الإصلاح</span>
                </button>
              </div>
            </div>
          )}

          {/* Rejection Mode */}
          {approvalMode === 'reject' && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 space-y-3">
              <h4 className="text-xs font-bold text-red-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span>تسجيل رفض العميل للإصلاح أو إلغاء العرض</span>
              </h4>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">سبب الرفض أو الاعتذار *</label>
                <textarea 
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white resize-none"
                  placeholder="مثال: يفضل شراء القطعة بنفسه / السعر مرتفع / أجل الصيانة لوقت لاحق"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setApprovalMode('view')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleRejectQuotation}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>حفظ قرار الرفض</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {existing?.status === 'approved' ? (
              <span className="text-green-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم التوثيق والموافقة رسمياً
              </span>
            ) : (
              <span>المبلغ المطلوب اعتماده: <strong className="text-white font-mono">{grandTotal} ر.س</strong></span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleSendToCustomerWhatsApp}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="إرسال العرض للعميل عبر الواتساب للاعتماد"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>إرسال العرض للعميل واتساب 📲</span>
            </button>

            {/* Electronic Sign Button */}
            {existing?.status !== 'approved' && approvalMode === 'view' && (
              <>
                <button
                  type="button"
                  onClick={() => setApprovalMode('sign')}
                  className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>اعتماد العميل المباشر ✅</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalMode('reject')}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 text-xs rounded-xl transition-all cursor-pointer"
                >
                  تسجيل رفض
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-xs rounded-xl transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
