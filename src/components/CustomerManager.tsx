import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceRecord } from '../types';
import { 
  User, 
  Users, 
  Phone, 
  Car, 
  Calendar, 
  DollarSign, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  CheckSquare, 
  Square, 
  FileText, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  X, 
  MessageCircle, 
  Star, 
  Filter, 
  ExternalLink,
  Edit3,
  Clock,
  ChevronLeft,
  Wrench,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { phoneMatchesSearch, unifySaudiPhone, formatSaudiPhoneForWhatsApp } from '../lib/phoneUtils';
import { exportSingleBookingWord } from '../lib/reportUtils';

export interface CustomerVehicle {
  make?: string;
  model: string;
  year?: string;
  plateNumber?: string;
  notes?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  vehicles: CustomerVehicle[];
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: any;
  firstVisitDate?: any;
  status: 'vip' | 'regular' | 'new' | 'inactive';
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface CustomerManagerProps {
  records?: MaintenanceRecord[];
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ records = [] }) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vip' | 'regular' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'visits' | 'vehicles' | 'recent' | 'name'>('recent');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<CustomerProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Form State for New / Edit Customer
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('جدة');
  const [formStatus, setFormStatus] = useState<'vip' | 'regular' | 'new'>('regular');
  const [formNotes, setFormNotes] = useState('');
  const [formVehicles, setFormVehicles] = useState<CustomerVehicle[]>([{ model: '', year: '', plateNumber: '' }]);

  // Show temporary feedback toast
  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // 1. Listen to real-time customers collection from Firestore
  useEffect(() => {
    const q = query(collection(db, 'customers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CustomerProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const parsedVehicles: CustomerVehicle[] = [];
        if (Array.isArray(data.vehicles)) {
          data.vehicles.forEach((v: any) => {
            if (v && (v.model || v.year || v.plateNumber)) {
              parsedVehicles.push({
                model: v.model || '',
                year: v.year || '',
                plateNumber: v.plateNumber || '',
                notes: v.notes || ''
              });
            }
          });
        }
        if (Array.isArray(data.cars)) {
          data.cars.forEach((c: any) => {
            if (c) {
              const fullModel = [c.make, c.model].filter(Boolean).join(' ').trim() || c.model || '';
              const exists = parsedVehicles.some(v => 
                (v.model.toLowerCase() === fullModel.toLowerCase() && v.plateNumber === (c.plateNumber || '')) ||
                (c.plateNumber && v.plateNumber === c.plateNumber)
              );
              if (!exists && (fullModel || c.plateNumber)) {
                parsedVehicles.push({
                  model: fullModel,
                  year: c.year || '',
                  plateNumber: c.plateNumber || '',
                  notes: c.notes || ''
                });
              }
            }
          });
        }

        list.push({
          id: docSnap.id,
          name: data.name || 'عميل كريم',
          phone: data.phone || '',
          email: data.email || '',
          city: data.city || 'جدة',
          address: data.address || '',
          vehicles: parsedVehicles,
          totalVisits: Number(data.totalVisits || 0),
          totalSpent: Number(data.totalSpent || 0),
          lastVisitDate: data.lastVisitDate || null,
          firstVisitDate: data.firstVisitDate || null,
          status: data.status || 'regular',
          notes: data.notes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setCustomers(list);
      setLoading(false);
    }, (err) => {
      console.error('Firestore customers listener error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Auto-sync or manual sync from maintenance records & bookings into customers collection
  const handleSyncFromRecords = async () => {
    if (!records || records.length === 0) {
      showToast('لا توجد سجلات صيانة أو حجوزات للمزامنة حالياً');
      return;
    }

    setIsSyncing(true);
    try {
      const groupedByPhone = new Map<string, {
        name: string;
        phone: string;
        vehicles: Set<string>;
        totalSpent: number;
        visitDates: Date[];
        notes: string[];
      }>();

      records.forEach((rec) => {
        const cleanPhone = unifySaudiPhone(rec.customerPhone || '');
        if (!cleanPhone) return;

        const rawCost = typeof rec.cost === 'string' ? parseFloat(rec.cost) || 0 : (rec.cost || 0);
        const name = rec.customerName || rec.name || 'عميل';
        const car = [rec.carMake, rec.carModel, rec.carYear].filter(Boolean).join(' ').trim() || rec.carModel;
        
        let d = new Date();
        if (rec.serviceDate?.toDate) d = rec.serviceDate.toDate();
        else if (rec.createdAt?.toDate) d = rec.createdAt.toDate();
        else if (rec.serviceDate) d = new Date(rec.serviceDate);

        if (!groupedByPhone.has(cleanPhone)) {
          groupedByPhone.set(cleanPhone, {
            name: name !== 'عميل' ? name : '',
            phone: cleanPhone,
            vehicles: new Set(car ? [car] : []),
            totalSpent: rawCost,
            visitDates: [d],
            notes: rec.notes ? [rec.notes] : []
          });
        } else {
          const entry = groupedByPhone.get(cleanPhone)!;
          if (!entry.name && name !== 'عميل') entry.name = name;
          if (car) entry.vehicles.add(car);
          entry.totalSpent += rawCost;
          entry.visitDates.push(d);
          if (rec.notes) entry.notes.push(rec.notes);
        }
      });

      // Save into Firestore
      const batch = writeBatch(db);
      let count = 0;

      groupedByPhone.forEach((entry, phoneKey) => {
        const sortedDates = entry.visitDates.sort((a, b) => b.getTime() - a.getTime());
        const lastDate = sortedDates[0] ? sortedDates[0].toISOString() : new Date().toISOString();
        const firstDate = sortedDates[sortedDates.length - 1] ? sortedDates[sortedDates.length - 1].toISOString() : lastDate;

        // Check if customer doc already exists
        const existing = customers.find(c => unifySaudiPhone(c.phone) === phoneKey);
        const docRef = existing ? doc(db, 'customers', existing.id) : doc(collection(db, 'customers'));

        const vehicleObjs: CustomerVehicle[] = Array.from(entry.vehicles).map(vStr => ({
          model: vStr
        }));

        batch.set(docRef, {
          name: existing?.name || entry.name || `عميل (${phoneKey.slice(-4)})`,
          phone: existing?.phone ? (unifySaudiPhone(existing.phone) || existing.phone) : phoneKey,
          vehicles: existing?.vehicles && existing.vehicles.length > 0 ? existing.vehicles : vehicleObjs,
          totalVisits: Math.max(existing?.totalVisits || 0, entry.visitDates.length),
          totalSpent: Math.max(existing?.totalSpent || 0, entry.totalSpent),
          lastVisitDate: existing?.lastVisitDate || lastDate,
          firstVisitDate: existing?.firstVisitDate || firstDate,
          status: entry.visitDates.length >= 3 ? 'vip' : 'regular',
          notes: existing?.notes || (entry.notes.length > 0 ? entry.notes.join(' | ') : ''),
          updatedAt: serverTimestamp(),
          createdAt: existing?.createdAt || serverTimestamp()
        }, { merge: true });

        count++;
      });

      await batch.commit();
      showToast(`تمت مزامنة وتحديث ملفات (${count}) عميل بنجاح! 🎉`);
    } catch (err) {
      console.error('Sync error:', err);
      showToast('حدث خطأ أثناء المزامنة، يرجى المحاولة ثانية');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter and Sort Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch = 
        !searchQuery.trim() ||
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phoneMatchesSearch(cust.phone, searchQuery) ||
        cust.vehicles.some(v => v.model.toLowerCase().includes(searchQuery.toLowerCase()) || (v.plateNumber && v.plateNumber.includes(searchQuery))) ||
        (cust.notes && cust.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || cust.status === statusFilter;

      return matchSearch && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'visits') return b.totalVisits - a.totalVisits;
      if (sortBy === 'vehicles') return (b.vehicles?.length || 0) - (a.vehicles?.length || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      // recent default
      const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
      const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [customers, searchQuery, statusFilter, sortBy]);

  // Batch Select Handlers
  const isAllSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerIds.has(c.id));
  const isSomeSelected = selectedCustomerIds.size > 0;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCustomerIds(new Set());
    } else {
      const allIds = new Set(filteredCustomers.map(c => c.id));
      setSelectedCustomerIds(allIds);
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCustomerIds(next);
  };

  // 3. Export to Excel / CSV (with UTF-8 BOM for Arabic support)
  const handleExportSelected = (exportAll = false) => {
    const listToExport = exportAll 
      ? filteredCustomers 
      : filteredCustomers.filter(c => selectedCustomerIds.has(c.id));

    if (listToExport.length === 0) {
      showToast('يرجى تحديد عميل واحد على الأقل للتصدير');
      return;
    }

    const headers = [
      'اسم العميل',
      'رقم الجوال',
      'التصنيف',
      'المركبات والسيارات',
      'إجمالي الزيارات',
      'تاريخ آخر صيانة',
      'المدينة',
      'ملاحظات خاصة'
    ];

    const statusLabels: Record<string, string> = {
      vip: 'عميل مميز (VIP)',
      regular: 'عميل دائم',
      new: 'عميل جديد',
      inactive: 'غير نشط'
    };

    const rows = listToExport.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${statusLabels[c.status] || c.status}"`,
      `"${c.vehicles.map(v => `${v.model}${v.year ? ` ${v.year}` : ''}${v.plateNumber ? ` [${v.plateNumber}]` : ''}`).join(' - ').replace(/"/g, '""')}"`,
      c.totalVisits || 0,
      c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('ar-SA') : 'لا يوجد',
      `"${c.city || 'جدة'}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DRFIX_كشف_العملاء_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`تم تصدير ملفات (${listToExport.length}) عميل بصيغة Excel/CSV بنجاح! 📥`);
  };

  // 4. Batch Delete Selected
  const handleConfirmBatchDelete = async () => {
    if (selectedCustomerIds.size === 0) return;

    try {
      const batch = writeBatch(db);
      selectedCustomerIds.forEach((id) => {
        batch.delete(doc(db, 'customers', id));
      });
      await batch.commit();

      const deletedCount = selectedCustomerIds.size;
      setSelectedCustomerIds(new Set());
      setIsDeleteBatchModalOpen(false);
      showToast(`تم حذف (${deletedCount}) من ملفات العملاء المحددة بنجاح 🗑️`);
    } catch (err) {
      console.error('Delete error:', err);
      showToast('حدث خطأ أثناء الحذف، يرجى المحاولة ثانية');
    }
  };

  // 5. Delete Individual Customer
  const handleConfirmSingleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      if (selectedCustomerForDetail?.id === customerToDelete.id) {
        setSelectedCustomerForDetail(null);
      }
      setCustomerToDelete(null);
      showToast(`تم حذف ملف العميل "${customerToDelete.name}" بنجاح`);
    } catch (err) {
      console.error('Delete single error:', err);
      showToast('حدث خطأ أثناء حذف العميل');
    }
  };

  // 6. Save or Edit Customer Profile
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast('يرجى إدخال اسم العميل ورقم الجوال');
      return;
    }

    try {
      const validVehicles = formVehicles.filter(v => v.model.trim().length > 0);

      const unifiedPhone = unifySaudiPhone(formPhone) || formPhone.trim();

      const payload = {
        name: formName.trim(),
        phone: unifiedPhone,
        email: formEmail.trim(),
        city: formCity.trim() || 'جدة',
        status: formStatus,
        notes: formNotes.trim(),
        vehicles: validVehicles,
        updatedAt: serverTimestamp()
      };

      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), payload);
        showToast('تم تحديث ملف العميل بنجاح ✨');
      } else {
        await addDoc(collection(db, 'customers'), {
          ...payload,
          totalVisits: 0,
          totalSpent: 0,
          firstVisitDate: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
        showToast('تم إنشاء ملف العميل الجديد بنجاح 🎉');
      }

      setIsAddModalOpen(false);
      setEditingCustomer(null);
      resetForm();
    } catch (err) {
      console.error('Save customer error:', err);
      showToast('حدث خطأ أثناء حفظ ملف العميل');
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditingCustomer(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (customer: CustomerProfile) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormCity(customer.city || 'جدة');
    setFormStatus(customer.status === 'inactive' ? 'regular' : customer.status);
    setFormNotes(customer.notes || '');
    setFormVehicles(customer.vehicles.length > 0 ? customer.vehicles : [{ model: '', year: '', plateNumber: '' }]);
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormCity('جدة');
    setFormStatus('regular');
    setFormNotes('');
    setFormVehicles([{ model: '', year: '', plateNumber: '' }]);
  };

  // Helper to format WhatsApp phone link
  const getWhatsAppLink = (phone: string, customerName: string) => {
    const intl = formatSaudiPhoneForWhatsApp(phone);
    const msg = encodeURIComponent(`مرحباً بك أستاذ ${customerName} 👋\nمعك مركز DR.FIX للصيانة المتنقلة بجدة. نتشرف بخدمتك دائماً.`);
    return `https://api.whatsapp.com/send?phone=${intl}&text=${msg}`;
  };

  // Find all service records belonging to a customer
  const getCustomerRecords = (phone: string) => {
    return records.filter(r => phoneMatchesSearch(r.customerPhone, phone));
  };

  // Helper to determine live maintenance stage and details for a specific car
  const getCarStageInfo = (car: CustomerVehicle, customerRecords: MaintenanceRecord[]) => {
    const carModelClean = (car.model || '').toLowerCase().trim();
    const carPlateClean = (car.plateNumber || '').toLowerCase().trim();

    // Match records for this car
    const matchedRecords = customerRecords.filter(rec => {
      const recCar = [rec.carMake, rec.carModel].filter(Boolean).join(' ').toLowerCase();
      const recModel = (rec.carModel || '').toLowerCase();
      const recPlate = (rec.plateNumber || '').toLowerCase().trim();
      
      if (carPlateClean && recPlate && carPlateClean === recPlate) return true;
      if (carModelClean && (recCar.includes(carModelClean) || carModelClean.includes(recModel))) return true;
      return false;
    });

    // Sort by date descending
    matchedRecords.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis?.() || (a.serviceDate as any)?.toMillis?.() || (a.serviceDate ? new Date(a.serviceDate as any).getTime() : 0);
      const timeB = (b.createdAt as any)?.toMillis?.() || (b.serviceDate as any)?.toMillis?.() || (b.serviceDate ? new Date(b.serviceDate as any).getTime() : 0);
      return timeB - timeA;
    });

    // If no direct car match, but customer has only 1 car or records exist, link the most recent
    let latestRecord = matchedRecords[0] || null;
    if (!latestRecord && customerRecords.length === 1) {
      latestRecord = customerRecords[0];
    }

    let stageStep = 1;
    let stageTitle = 'سيارة مسجلة - جاهزة للخدمة';
    let stageBadgeClass = 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    let isLive = false;
    let stageDescription = 'لا توجد أعمال صيانة جارية حالياً. المركبة جاهزة لأي موعد صيانة جديد.';

    if (latestRecord) {
      switch (latestRecord.status as string) {
        case 'on_the_way':
          stageStep = 3;
          stageTitle = 'المرحلة 3: الفني بالطريق للعميل';
          stageBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20';
          stageDescription = 'تم انطلاق مهندس الصيانة الميداني، وهو في طريقه لموقع العميل الآن.';
          isLive = true;
          break;
        case 'in-progress':
        case 'in_progress':
          stageStep = 4;
          stageTitle = 'المرحلة 4: قيد الفحص والعمل الميداني';
          stageBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/20';
          stageDescription = 'جاري تنفيذ أعمال الفحص والصيانة الميدانية الشاملة على المركبة.';
          isLive = true;
          break;
        case 'accepted':
          stageStep = 2;
          stageTitle = 'المرحلة 2: تم تأكيد الحجز وتعيين الفني';
          stageBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
          stageDescription = 'تم تأكيد طلب الحجز وتعيين الفني المختص، وسيتحرك بالموعد المحدد.';
          isLive = true;
          break;
        case 'completed':
          stageStep = 5;
          stageTitle = 'المرحلة 5: صيانة مكتملة ومعتمدة بضمان المركز';
          stageBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
          stageDescription = 'تم إنجاز كافة أعمال الصيانة بنجاح وإصدار أمر السند المعتمد.';
          isLive = false;
          break;
        case 'cancelled':
          stageStep = 0;
          stageTitle = 'تم إلغاء الحجز';
          stageBadgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
          stageDescription = 'تم إلغاء هذا الطلب بناءً على رغبة العميل أو إدارة المركز.';
          isLive = false;
          break;
        default:
          stageStep = 1;
          stageTitle = 'المرحلة 1: حجز جديد قيد المراجعة والجدولة';
          stageBadgeClass = 'bg-brand-red/20 text-red-200 border-brand-red/40 shadow-sm shadow-brand-red/20';
          stageDescription = 'طلب الحجز مستلم لدى الإدارة، وجاري تعيين الفني المناسب وتحديد الوقت.';
          isLive = true;
          break;
      }
    }

    return { latestRecord, stageStep, stageTitle, stageBadgeClass, stageDescription, isLive, totalRecords: matchedRecords.length };
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-red text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border border-white/20 animate-bounce">
          <Check className="w-5 h-5" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Header & Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-red/20 text-brand-red flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-mono">إجمالي العملاء</div>
            <div className="text-2xl font-display font-black text-white">{customers.length}</div>
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-red/20 text-brand-red flex items-center justify-center font-black">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-mono">العملاء المميزون (VIP)</div>
            <div className="text-2xl font-display font-black text-brand-red">
              {customers.filter(c => c.status === 'vip').length}
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-mono">إجمالي المركبات</div>
            <div className="text-2xl font-display font-black text-blue-400">
              {customers.reduce((sum, c) => sum + (c.vehicles?.length || 0), 0)}
            </div>
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-gray-400 text-xs font-mono">إجمالي زيارات الصيانة</div>
            <div className="text-2xl font-display font-black text-emerald-400">
              {customers.reduce((sum, c) => sum + (c.totalVisits || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="glass-card p-5 border-white/5 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، رقم الجوال، موديل السيارة، رقم اللوحة..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pr-12 pl-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-red transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={openAddModal}
              className="px-4 py-2.5 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95 transition-all shadow-lg shadow-brand-red/20"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ملف عميل</span>
            </button>

            <button 
              onClick={() => handleExportSelected(true)}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
              title="تصدير جميع العملاء بصيغة Excel / CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير الكل (Excel)</span>
            </button>

            <button 
              onClick={handleSyncFromRecords}
              disabled={isSyncing}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              title="مزامنة وتجميع العملاء من سجلات الحجوزات والصيانة تلقائياً"
            >
              <RefreshCw className={cn("w-4 h-4 text-brand-red", isSyncing && "animate-spin")} />
              <span>{isSyncing ? 'جارِ المزامنة...' : 'مزامنة السجلات'}</span>
            </button>
          </div>
        </div>

        {/* Filters and Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'vip', label: 'مميز (VIP)' },
              { id: 'regular', label: 'دائم' },
              { id: 'new', label: 'جديد' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  statusFilter === tab.id 
                    ? "bg-brand-red text-white shadow" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-2 text-gray-400">
            <span>ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-brand-red cursor-pointer"
            >
              <option value="recent">الأحدث زيارة</option>
              <option value="vehicles">الأكثر مركبات</option>
              <option value="visits">الأكثر زيارات</option>
              <option value="name">أبجدياً (أ-ي)</option>
            </select>
          </div>
        </div>
      </div>

      {/* BATCH ACTION BAR (ميزة تحديد الكل وتصدير ولا حذف) */}
      <div className={cn(
        "p-4 rounded-2xl border transition-all duration-300 flex flex-wrap items-center justify-between gap-4",
        isSomeSelected 
          ? "bg-brand-red/10 border-brand-red/30 shadow-xl shadow-brand-red/5" 
          : "bg-white/[0.02] border-white/5"
      )}>
        {/* Select All Checkbox & Count */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-200 hover:text-white"
          >
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-brand-red" />
            ) : isSomeSelected ? (
              <div className="w-5 h-5 rounded bg-brand-red/30 border border-brand-red flex items-center justify-center text-white text-xs font-black">
                -
              </div>
            ) : (
              <Square className="w-5 h-5 text-gray-500" />
            )}
            <span>تحديد الكل ({filteredCustomers.length})</span>
          </button>

          {isSomeSelected && (
            <span className="px-3 py-1 bg-brand-red/20 text-brand-red border border-brand-red/30 rounded-full text-xs font-bold">
              تم تحديد {selectedCustomerIds.size} عميل
            </span>
          )}
        </div>

        {/* Batch Operations */}
        {isSomeSelected && (
          <div className="flex items-center gap-2.5 animate-fadeIn">
            <button
              onClick={() => handleExportSelected(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تصدير المحدد ({selectedCustomerIds.size})</span>
            </button>

            <button
              onClick={() => setIsDeleteBatchModalOpen(true)}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-red-900/20 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedCustomerIds.size})</span>
            </button>

            <button
              onClick={() => setSelectedCustomerIds(new Set())}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              إلغاء التحديد
            </button>
          </div>
        )}
      </div>

      {/* Customer List / Cards Grid */}
      {loading ? (
        <div className="py-24 text-center glass-card border-white/5">
          <RefreshCw className="w-8 h-8 text-brand-red animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">جارِ تحميل ملفات العملاء...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-16 text-center glass-card border-dashed border-white/10 space-y-4">
          <Users className="w-12 h-12 text-gray-600 mx-auto" />
          <h4 className="text-lg font-bold text-gray-300">لا توجد ملفات عملاء مطابقة</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {searchQuery 
              ? 'لم نجد أي عميل يطابق معايير البحث الحالية.'
              : 'لم يتم إضافة عملاء بعد، يمكنك إضافة عميل جديد أو المزامنة التلقائية من سجلات الحجوزات السابقة.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button 
              onClick={openAddModal}
              className="px-5 py-2.5 bg-brand-red text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة عميل جديد
            </button>
            {records.length > 0 && (
              <button 
                onClick={handleSyncFromRecords}
                className="px-5 py-2.5 bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-brand-red" />
                مزامنة من {records.length} حجز
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const isSelected = selectedCustomerIds.has(customer.id);
            const waLink = getWhatsAppLink(customer.phone, customer.name);

            return (
              <div 
                key={customer.id}
                className={cn(
                  "glass-card p-5 border transition-all duration-200 relative group flex flex-col justify-between",
                  isSelected 
                    ? "border-brand-red/50 bg-brand-red/[0.04] shadow-lg shadow-brand-red/10" 
                    : "border-white/5 hover:border-white/20"
                )}
              >
                <div>
                  {/* Top Bar: Checkbox, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button 
                        onClick={() => handleToggleSelectCustomer(customer.id)}
                        className="cursor-pointer text-gray-400 hover:text-brand-red transition-colors pt-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-red" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-600 hover:text-gray-300" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-brand-red shrink-0">
                        {customer.name ? customer.name.charAt(0) : 'ع'}
                      </div>

                      <div className="truncate">
                        <h4 className="font-bold text-white text-base truncate flex items-center gap-2">
                          <span>{customer.name}</span>
                          {customer.status === 'vip' && (
                            <Star className="w-3.5 h-3.5 text-brand-red fill-brand-red shrink-0" />
                          )}
                        </h4>
                        <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5" dir="ltr">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0",
                      customer.status === 'vip' ? "bg-brand-red/20 text-white border border-brand-red/30" :
                      customer.status === 'new' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                      "bg-white/10 text-gray-300 border border-white/10"
                    )}>
                      {customer.status === 'vip' ? 'VIP مميز' : customer.status === 'new' ? 'جديد' : 'دائم'}
                    </span>
                  </div>

                  {/* Vehicle Tag */}
                  <div className="mb-4">
                    {customer.vehicles && customer.vehicles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {customer.vehicles.map((v, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-300 flex items-center gap-1.5">
                            <Car className="w-3 h-3 text-brand-red" />
                            <span>{v.model}</span>
                            {v.year && <span className="text-gray-500">{v.year}</span>}
                            {v.plateNumber && <span className="font-mono bg-black/40 px-1 rounded text-[10px] text-white">{v.plateNumber}</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-500 italic">لم تسجل مركبة محددة</span>
                    )}
                  </div>

                  {/* Stats Mini Row */}
                  <div className="grid grid-cols-2 gap-2 mb-4 bg-black/30 p-2.5 rounded-xl border border-white/5 text-xs">
                    <div>
                      <div className="text-gray-500 text-[10px]">الزيارات والخدمات</div>
                      <div className="font-bold text-white flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-red" />
                        <span>{customer.totalVisits || 0} زيارة</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-[10px]">آخر موعد صيانة</div>
                      <div className="font-bold text-gray-300 flex items-center gap-1 text-[11px]">
                        <span>{customer.lastVisitDate ? new Date(customer.lastVisitDate).toLocaleDateString('ar-SA') : 'لا يوجد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes snippet if exists */}
                  {customer.notes && (
                    <p className="text-xs text-gray-400 line-clamp-1 italic mb-3 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                      💬 {customer.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCustomerForDetail(customer)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-brand-red/20 border border-white/10 hover:border-brand-red/40 text-xs font-bold text-gray-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-red" />
                    <span>ملف العميل</span>
                  </button>

                  <a 
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                    title="مراسلة العميل عبر الواتساب"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => openEditModal(customer)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer"
                    title="تعديل بيانات العميل"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCustomerToDelete(customer)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                    title="حذف ملف العميل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📂 COMPREHENSIVE CUSTOMER FILE MODAL (الملف الخاص المتكامل للعميل) */}
      {/* ========================================================================= */}
      {selectedCustomerForDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-brand-card border border-white/10 rounded-3xl max-w-4xl w-full p-6 sm:p-8 md:p-10 space-y-8 max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-brand-red/30 to-brand-red/10 border-2 border-brand-red/40 flex items-center justify-center text-brand-red font-display font-black text-2xl sm:text-3xl shadow-lg shrink-0">
                  {selectedCustomerForDetail.name.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-white">
                      {selectedCustomerForDetail.name}
                    </h3>
                    {selectedCustomerForDetail.status === 'vip' && (
                      <span className="px-3 py-1 rounded-full bg-brand-red/20 text-white border border-brand-red/40 text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <Star className="w-3.5 h-3.5 fill-brand-red" />
                        عميل مميز VIP
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-bold">
                      {selectedCustomerForDetail.city || 'جدة'}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base text-gray-400 font-mono font-bold mt-1.5" dir="ltr">
                    {selectedCustomerForDetail.phone}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedCustomerForDetail(null)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white cursor-pointer transition-all border border-white/5"
                title="إغلاق النافذة"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <a 
                href={getWhatsAppLink(selectedCustomerForDetail.phone, selectedCustomerForDetail.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 min-h-[46px] rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="whitespace-nowrap">مراسلة واتساب</span>
              </a>

              <a 
                href={`tel:${selectedCustomerForDetail.phone}`}
                className="py-3 px-4 min-h-[46px] rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="whitespace-nowrap">اتصال هاتفي</span>
              </a>

              <button 
                onClick={() => {
                  openEditModal(selectedCustomerForDetail);
                  setSelectedCustomerForDetail(null);
                }}
                className="py-3 px-4 min-h-[46px] rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
              >
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="whitespace-nowrap">تعديل الملف</span>
              </button>

              <button 
                onClick={() => {
                  setCustomerToDelete(selectedCustomerForDetail);
                }}
                className="py-3 px-4 min-h-[46px] rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="whitespace-nowrap">حذف العميل</span>
              </button>
            </div>

            {/* Customer Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4.5 bg-black/60 p-5 sm:p-6 rounded-2xl border border-white/10 text-center">
              <div className="space-y-1">
                <div className="text-gray-400 text-xs font-bold">الزيارات المكتملة</div>
                <div className="text-2xl sm:text-3xl font-black text-white">{selectedCustomerForDetail.totalVisits || 0}</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-400 text-xs font-bold">عدد المركبات</div>
                <div className="text-2xl sm:text-3xl font-black text-brand-red">
                  {selectedCustomerForDetail.vehicles?.length || 1} <span className="text-xs sm:text-sm font-bold text-gray-300">سيارات</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-400 text-xs font-bold">تاريخ أول تعامل</div>
                <div className="text-xs sm:text-sm font-bold text-gray-300 mt-1">
                  {selectedCustomerForDetail.firstVisitDate ? new Date(selectedCustomerForDetail.firstVisitDate).toLocaleDateString('ar-SA') : 'عميل جديد'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-400 text-xs font-bold">آخر موعد صيانة</div>
                <div className="text-xs sm:text-sm font-bold text-brand-red mt-1">
                  {selectedCustomerForDetail.lastVisitDate ? new Date(selectedCustomerForDetail.lastVisitDate).toLocaleDateString('ar-SA') : 'لا يوجد موعد'}
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* 🚗 REGISTERED VEHICLES & DIRECT LIVE STAGES (عرض مباشر وشامل) */}
            {/* ================================================================= */}
            {(() => {
              const history = getCustomerRecords(selectedCustomerForDetail.phone);
              
              // Assemble list of vehicles to show
              let vehiclesToShow: CustomerVehicle[] = [...(selectedCustomerForDetail.vehicles || [])];
              
              // Also add any vehicles that exist in records if not in customer.vehicles list
              history.forEach(rec => {
                const recModel = [rec.carMake, rec.carModel].filter(Boolean).join(' ').trim() || rec.carModel;
                const recPlate = rec.plateNumber || '';
                const alreadyExists = vehiclesToShow.some(v => 
                  (recModel && v.model.toLowerCase() === recModel.toLowerCase()) || 
                  (recPlate && v.plateNumber === recPlate)
                );
                if (!alreadyExists && (recModel || recPlate)) {
                  vehiclesToShow.push({
                    model: recModel || 'سيارة مسجلة',
                    year: rec.carYear || '',
                    plateNumber: recPlate,
                    notes: ''
                  });
                }
              });

              // Fallback if empty
              if (vehiclesToShow.length === 0) {
                vehiclesToShow = [{ model: 'سيارة مسجلة', year: '', plateNumber: '' }];
              }

              return (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                        <Car className="w-5 h-5 text-brand-red" />
                        <span>المركبات والسيارات المسجلة ومراحل الصيانة المباشرة</span>
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        عرض فوري ومباشر لكل سيارة والمرحلة الحالية التي وصلت إليها دون الحاجة للضغط أو التنقل
                      </p>
                    </div>

                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30">
                      {vehiclesToShow.length} {vehiclesToShow.length === 1 ? 'مركبة' : 'مركبات'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {vehiclesToShow.map((veh, idx) => {
                      const stageInfo = getCarStageInfo(veh, history);
                      const rec = stageInfo.latestRecord;

                      return (
                        <div 
                          key={idx}
                          className={`p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border ${
                            stageInfo.isLive ? 'border-brand-red/50 shadow-xl shadow-brand-red/10' : 'border-white/10'
                          } space-y-5 transition-all`}
                        >
                          {/* Card Header: Car Title + Plate + Stage Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 rounded-xl bg-brand-red/20 border border-brand-red/30 text-brand-red flex items-center justify-center font-bold text-sm shrink-0">
                                <Car className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <h5 className="font-bold text-white text-base sm:text-lg">
                                    {veh.model} {veh.year ? `(${veh.year})` : ''}
                                  </h5>
                                  {veh.plateNumber && (
                                    <span className="font-mono bg-white text-black px-3 py-1 rounded-md text-xs sm:text-sm font-black border border-neutral-300 shadow-sm tracking-widest" dir="ltr">
                                      {veh.plateNumber}
                                    </span>
                                  )}
                                </div>
                                {veh.notes && (
                                  <div className="text-xs text-gray-400 mt-1">{veh.notes}</div>
                                )}
                              </div>
                            </div>

                            {/* Stage Badge with Animated Pulse */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap ${stageInfo.stageBadgeClass}`}>
                                {stageInfo.isLive && (
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-red"></span>
                                  </span>
                                )}
                                <span>{stageInfo.stageTitle}</span>
                              </span>
                            </div>
                          </div>

                          {/* 5-Step Visual Stepper (مراحل إنجاز الصيانة الخمس) */}
                          <div className="bg-black/60 p-4 sm:p-5 rounded-xl border border-white/5 space-y-4">
                            <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2">
                              <span className="text-gray-400">مراحل إنجاز الخدمة والصيانة:</span>
                              <span className="text-white font-medium">{stageInfo.stageDescription}</span>
                            </div>

                            {/* Stepper Bar */}
                            <div className="relative flex items-center justify-between pt-2 pb-2 px-2 sm:px-4">
                              {/* Background Line */}
                              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1.5 bg-white/10 -z-0 rounded-full" />
                              
                              {/* Filled Gradient Line */}
                              <div 
                                className="absolute top-1/2 right-6 -translate-y-1/2 h-1.5 bg-gradient-to-l from-brand-red to-emerald-500 transition-all duration-700 -z-0 rounded-full"
                                style={{
                                  width: stageInfo.stageStep === 0 ? '0%' :
                                         stageInfo.stageStep === 5 ? 'calc(100% - 48px)' :
                                         stageInfo.stageStep === 4 ? '75%' :
                                         stageInfo.stageStep === 3 ? '50%' :
                                         stageInfo.stageStep === 2 ? '25%' : '8%'
                                }}
                              />

                              {[
                                { step: 1, title: 'الاستلام', icon: FileText },
                                { step: 2, title: 'تم القبول', icon: CheckCircle2 },
                                { step: 3, title: 'بالطريق', icon: Car },
                                { step: 4, title: 'فحص وصيانة', icon: Wrench },
                                { step: 5, title: 'جاهزة ومعتمدة', icon: Sparkles }
                              ].map(st => {
                                const isDone = (stageInfo.stageStep > st.step) || (stageInfo.stageStep === 5);
                                const isCurrent = (stageInfo.stageStep === st.step) && (stageInfo.stageStep !== 5);
                                const Icon = st.icon;

                                return (
                                  <div key={st.step} className="relative z-10 flex flex-col items-center gap-1.5">
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                      isDone 
                                        ? 'bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/30' 
                                        : isCurrent
                                        ? 'bg-brand-red text-white ring-4 ring-brand-red/30 shadow-lg shadow-brand-red/40 animate-pulse font-bold'
                                        : 'bg-neutral-800 text-gray-400 border border-white/10'
                                    }`}>
                                      {isDone ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </div>
                                    <span className={`text-[11px] sm:text-xs font-bold whitespace-nowrap ${
                                      isCurrent ? 'text-brand-red font-black' : isDone ? 'text-emerald-400' : 'text-gray-400'
                                    }`}>
                                      {st.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Direct Service Details Box (تفاصيل عملية الصيانة الحالية) */}
                          {rec ? (
                            <div className="bg-white/5 p-4 sm:p-5 rounded-xl border border-white/10 space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
                                <div>
                                  <div className="text-gray-400 font-bold mb-1">نوع الصيانة المطلوبة:</div>
                                  <div className="font-bold text-white text-sm">{rec.serviceType || 'صيانة عامة'}</div>
                                </div>

                                <div>
                                  <div className="text-gray-400 font-bold mb-1">الفني الميداني المكلف:</div>
                                  <div className="font-bold text-white text-sm">
                                    {rec.assignedTechnicianName || rec.technicianName || 'الفريق الميداني المعتمد'}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-gray-400 font-bold mb-1">رقم كرت الحجز:</div>
                                  <div className="font-mono font-bold text-blue-400 text-sm">
                                    #{rec.bookingId || rec.id.slice(0, 7).toUpperCase()}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-gray-400 font-bold mb-1">التكلفة والضمان:</div>
                                  <div className="font-bold text-emerald-400 text-sm">
                                    {rec.cost ? `${rec.cost} ريال` : 'قيد التسعير والاعتماد'}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons for this specific car */}
                              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-gray-400">
                                  {rec.serviceDate ? (
                                    <span>الموعد المحدد: {new Date(rec.serviceDate as any).toLocaleDateString('ar-SA')}</span>
                                  ) : (
                                    <span>تاريخ التسجيل: {rec.createdAt ? new Date(rec.createdAt as any).toLocaleDateString('ar-SA') : 'مسجل حالياً'}</span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  <button
                                    onClick={() => exportSingleBookingWord(rec as any)}
                                    className="py-2 px-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                                  >
                                    <Download className="w-4 h-4 shrink-0" />
                                    <span>تحميل سند الصيانة (.doc)</span>
                                  </button>

                                  <a
                                    href={getWhatsAppLink(selectedCustomerForDetail.phone, `${selectedCustomerForDetail.name} بخصوص سيارتك (${veh.model})`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                                  >
                                    <MessageCircle className="w-4 h-4 shrink-0" />
                                    <span>تحديث العميل عبر واتساب</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-gray-400">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>السيارة جاهزة وبحالة ممتازة - لا توجد صيانة قيد التنفيذ حالياً.</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ================================================================= */}
            {/* 📋 COMPLETE SERVICE HISTORY (سجل الصيانات والعمليات السابقة الشامل) */}
            {/* ================================================================= */}
            <div className="space-y-4">
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-brand-red" />
                <span>سجل كافة الصيانات والعمليات السابقة</span>
              </h4>
              
              {(() => {
                const history = getCustomerRecords(selectedCustomerForDetail.phone);
                if (history.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-xs sm:text-sm text-gray-400">
                      لا توجد عمليات مسجلة برقم هذا العميل حتى الآن
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {history.map((rec) => {
                      let dateStr = 'تاريخ سابق';
                      if (rec.serviceDate?.toDate) dateStr = rec.serviceDate.toDate().toLocaleDateString('ar-SA');
                      else if (rec.serviceDate) dateStr = new Date(rec.serviceDate).toLocaleDateString('ar-SA');

                      return (
                        <div 
                          key={rec.id} 
                          className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                              <span>{rec.serviceType}</span>
                              <span className="font-mono text-xs text-gray-400 font-normal">
                                #{rec.bookingId || rec.id.slice(0, 6)}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs flex flex-wrap items-center gap-2">
                              <span className="text-brand-red font-bold">{rec.carModel}</span>
                              <span>•</span>
                              <span>{dateStr}</span>
                              {rec.assignedTechnicianName && (
                                <>
                                  <span>•</span>
                                  <span className="text-white">الفني: {rec.assignedTechnicianName}</span>
                                </>
                              )}
                            </div>
                            {rec.notes && <div className="text-gray-400 text-xs italic mt-1">{rec.notes}</div>}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <span className={cn(
                              "text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap",
                              rec.status === 'completed' ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30" :
                              rec.status === 'on_the_way' ? "text-purple-400 bg-purple-500/15 border border-purple-500/30" :
                              rec.status === 'in-progress' ? "text-blue-400 bg-blue-500/15 border border-blue-500/30" :
                              "text-white bg-white/10 border border-white/20"
                            )}>
                              {rec.status === 'completed' ? 'صيانة مكتملة' :
                               rec.status === 'on_the_way' ? 'الفني بالطريق' :
                               rec.status === 'in-progress' ? 'قيد العمل' : 'قيد المعالجة'}
                            </span>

                            <button
                              onClick={() => exportSingleBookingWord(rec as any)}
                              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                              title="تصدير سند الصيانة Word"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>سند Word</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Notes Section */}
            {selectedCustomerForDetail.notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-300">ملاحظات الفني والمركز:</h4>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedCustomerForDetail.notes}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedCustomerForDetail(null)}
                className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold cursor-pointer transition-all min-h-[46px]"
              >
                إغلاق الملف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ ADD / EDIT CUSTOMER MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-brand-card border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-red" />
                <span>{editingCustomer ? 'تعديل ملف العميل' : 'إضافة ملف عميل جديد'}</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">اسم العميل *</label>
                <input 
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: محمد العمري"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">رقم الجوال *</label>
                  <input 
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red text-left font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">التصنيف</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red cursor-pointer"
                  >
                    <option value="regular">عميل دائم</option>
                    <option value="vip">عميل مميز (VIP)</option>
                    <option value="new">عميل جديد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">المدينة / المنطقة</label>
                <input 
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="مثال: جدة - حي الروضة"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red"
                />
              </div>

              {/* Vehicles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-bold">مركبات وسيارات العميل</label>
                  <button
                    type="button"
                    onClick={() => setFormVehicles([...formVehicles, { model: '', year: '', plateNumber: '' }])}
                    className="text-brand-red hover:underline text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سيارة أخرى</span>
                  </button>
                </div>

                {formVehicles.map((veh, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="text"
                        value={veh.model}
                        onChange={(e) => {
                          const updated = [...formVehicles];
                          updated[idx].model = e.target.value;
                          setFormVehicles(updated);
                        }}
                        placeholder="موديل السيارة (كامري..)"
                        className="col-span-2 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-red"
                      />
                      <input 
                        type="text"
                        value={veh.year || ''}
                        onChange={(e) => {
                          const updated = [...formVehicles];
                          updated[idx].year = e.target.value;
                          setFormVehicles(updated);
                        }}
                        placeholder="السنة (2022)"
                        className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-red font-mono text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={veh.plateNumber || ''}
                        onChange={(e) => {
                          const updated = [...formVehicles];
                          updated[idx].plateNumber = e.target.value;
                          setFormVehicles(updated);
                        }}
                        placeholder="رقم اللوحة (أ ب ج 1234)"
                        className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-brand-red font-mono"
                      />
                      {formVehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormVehicles(formVehicles.filter((_, i) => i !== idx))}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          title="حذف هذه السيارة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">ملاحظات خاصة عن العميل أو تفضيلاته</label>
                <textarea 
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: يفضل الاتصال في المساء، يطلب زيت أصلي 5W30 دائماً..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-brand-red resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold cursor-pointer transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl font-bold cursor-pointer transition-all shadow-lg shadow-brand-red/20"
                >
                  {editingCustomer ? 'حفظ التعديلات' : 'حفظ ملف العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ BATCH DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isDeleteBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-red-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">تأكيد حذف ملفات العملاء المحددة</h3>
            <p className="text-sm text-gray-400">
              هل أنت متأكد من رغبتك في حذف <span className="font-bold text-white">({selectedCustomerIds.size})</span> من ملفات العملاء نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteBatchModalOpen(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-red-900/30"
              >
                نعم، احذف الملفات المحددة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ SINGLE DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-card border border-red-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">تأكيد حذف العميل</h3>
            <p className="text-sm text-gray-400">
              هل أنت متأكد من رغبتك في حذف ملف العميل <span className="font-bold text-white">"{customerToDelete.name}"</span> نهائياً؟
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-red-900/30"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
