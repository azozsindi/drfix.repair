import React, { useState } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Truck, 
  Wrench, 
  Package, 
  CheckCircle2, 
  X, 
  Share2,
  AlertCircle
} from 'lucide-react';
import { MaintenanceRecord, PricingBreakdown, StaffUser } from '../types';

interface PricingBreakdownModalProps {
  record: MaintenanceRecord;
  currentStaffUser: StaffUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePricing: (pricing: PricingBreakdown) => Promise<void>;
}

export const PricingBreakdownModal: React.FC<PricingBreakdownModalProps> = ({
  record,
  currentStaffUser,
  isOpen,
  onClose,
  onSavePricing
}) => {
  if (!isOpen) return null;

  const initialPricing = record.pricing || {
    laborCost: typeof record.cost === 'number' ? record.cost : 150,
    partsCost: 0,
    travelFee: 50,
    discount: 0,
    taxRate: 15,
    taxAmount: 30,
    grandTotal: (typeof record.cost === 'number' ? record.cost : 150) + 50 + 30,
    notes: ''
  };

  const [laborCost, setLaborCost] = useState<number>(initialPricing.laborCost);
  const [partsCost, setPartsCost] = useState<number>(initialPricing.partsCost);
  const [travelFee, setTravelFee] = useState<number>(initialPricing.travelFee);
  const [discount, setDiscount] = useState<number>(initialPricing.discount);
  const [taxRate, setTaxRate] = useState<number>(initialPricing.taxRate || 15);
  const [notes, setNotes] = useState<string>(initialPricing.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Math calculation
  const subtotalBeforeDiscount = Math.max(0, (laborCost || 0) + (partsCost || 0) + (travelFee || 0));
  const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - (discount || 0));
  const taxAmount = Math.round(subtotalAfterDiscount * ((taxRate || 15) / 100));
  const grandTotal = subtotalAfterDiscount + taxAmount;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const breakdown: PricingBreakdown = {
        laborCost: Number(laborCost) || 0,
        partsCost: Number(partsCost) || 0,
        travelFee: Number(travelFee) || 0,
        discount: Number(discount) || 0,
        taxRate: Number(taxRate) || 15,
        taxAmount,
        grandTotal,
        notes,
        updatedBy: currentStaffUser?.fullName || 'الإدارة',
        updatedAt: new Date().toISOString()
      };
      await onSavePricing(breakdown);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareBreakdownWhatsApp = () => {
    const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') ? cleanPhone : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);

    const msg = `🚗⚡ DR.FIX | تفاصيل التسعير والفاتورة\n\n` +
      `عزيزنا العميل: ${(record.customerName || 'المحترم')}\n` +
      `رقم السند: #${record.bookingId || record.id}\n` +
      `السيارة: ${record.carModel}\n\n` +
      `📋 تفاصيل التكلفة الشفافة:\n` +
      `• أجور اليد وفحص الموقع: ${laborCost} ر.س\n` +
      `• قطع الغيار والمستهلكات: ${partsCost} ر.س\n` +
      `• رسوم الانتقال الميداني: ${travelFee} ر.س\n` +
      (discount > 0 ? `• الخصم الممنوح: -${discount} ر.س\n` : '') +
      `• ضريبة القيمة المضافة (${taxRate}%): ${taxAmount} ر.س\n\n` +
      `💰 الإجمالي النهائي المستحق: ${grandTotal} ر.س\n\n` +
      `شكراً لثقتكم بفريق DR.FIX 🤍`;

    const url = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121418] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-auto text-white flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-900/20 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">تسعير واضح وتفصيلي للسند</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                سند #{record.bookingId || record.id} • {record.carModel} • {record.serviceType}
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

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Labor Cost */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-brand-red" />
                <span>أجور اليد والخدمة (Labor Cost) *</span>
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min="0"
                  value={laborCost}
                  onChange={e => setLaborCost(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">ر.س</span>
              </div>
            </div>

            {/* Parts Cost */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span>تكلفة قطع الغيار (Parts Cost)</span>
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min="0"
                  value={partsCost}
                  onChange={e => setPartsCost(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">ر.س</span>
              </div>
            </div>

            {/* Travel Fee */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-yellow-400" />
                <span>رسوم الانتقال والميدان (Travel Fee)</span>
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min="0"
                  value={travelFee}
                  onChange={e => setTravelFee(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">ر.س</span>
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-pink-400" />
                <span>الخصم الممنوح (Discount)</span>
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">ر.س</span>
              </div>
            </div>
          </div>

          {/* Tax Rate Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-xs text-gray-400">نسبة ضريبة القيمة المضافة (VAT)</span>
            <div className="flex items-center gap-2">
              {[0, 15].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTaxRate(rate)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    taxRate === rate
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Live Summary Calculation Box */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>المجموع قبل الخصم:</span>
              <span className="font-mono">{subtotalBeforeDiscount} ر.س</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-pink-400">
                <span>الخصم الممنوح:</span>
                <span className="font-mono">-{discount} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>الضريبة المضافة ({taxRate}%):</span>
              <span className="font-mono text-gray-300">{taxAmount} ر.س</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
              <span className="text-emerald-400">الإجمالي النهائي للطلب:</span>
              <span className="font-mono font-black text-lg text-brand-red">{grandTotal} ر.س</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">ملاحظات التسعير والفاتورة</label>
            <input 
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: خصم 10% بمناسبة اليوم الوطني، قطع غيار وكالة تويوتا أصلية"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleShareBreakdownWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>إرسال تفاصيل السعر للعميل واتساب 📲</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>حفظ وتحديث السند</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
