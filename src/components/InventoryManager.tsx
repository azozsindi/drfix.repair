import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  X, 
  Check, 
  History, 
  Download, 
  Filter, 
  RefreshCw,
  Truck,
  Wrench,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { InventoryItem, InventoryCategory, InventoryTransaction, StaffUser } from '../types';
import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useScrollLock } from '../lib/scrollLock';

interface InventoryManagerProps {
  currentStaffUser?: StaffUser | null;
  isAdmin?: boolean;
}

const DEFAULT_ITEMS: Omit<InventoryItem, 'id'>[] = [
  {
    sku: 'OIL-5W30-SYN',
    nameAr: 'زيت محرك 5W-30 تخليقي كامل (بالبيد / بترومين)',
    category: 'oil',
    quantity: 48,
    unit: 'علبة',
    minAlertLevel: 12,
    costPrice: 28,
    sellingPrice: 45,
    supplier: 'شركة بالبيد المحدودة',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'جميع سيارات تويوتا، نيسان، هيونداي، كيا، فورد الحديثة',
    notes: 'معتمد ديكسوس 1 جيل 3'
  },
  {
    sku: 'OIL-10W40-SEMI',
    nameAr: 'زيت محرك كاسترول ماجناتيك 10W-40 نصف تخليقي',
    category: 'oil',
    quantity: 36,
    unit: 'علبة',
    minAlertLevel: 10,
    costPrice: 24,
    sellingPrice: 40,
    supplier: 'كاسترول السعودية',
    storageLocation: 'سيارة الخدمة 1',
    compatibility: 'السيارات فوق 100 ألف كم والشاحنات الخفيفة'
  },
  {
    sku: 'FLT-TY-OIL',
    nameAr: 'فلتر زيت محرك أصلي تويوتا (كامري، كورولا، يارس)',
    category: 'filter',
    quantity: 24,
    unit: 'حبة',
    minAlertLevel: 8,
    costPrice: 18,
    sellingPrice: 35,
    supplier: 'عبداللطيف جميل للسيارات',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'تويوتا كامري، كورولا، راف4، يارس (2012-2024)'
  },
  {
    sku: 'FLT-HY-OIL',
    nameAr: 'فلتر زيت محرك أصلي هيونداي / كيا (سوناتا، النترا، توسان)',
    category: 'filter',
    quantity: 20,
    unit: 'حبة',
    minAlertLevel: 6,
    costPrice: 16,
    sellingPrice: 30,
    supplier: 'الوعلان للتجارة',
    storageLocation: 'سيارة الخدمة 2',
    compatibility: 'النترا، سوناتا، سبورتاج، أوبتيما، توسان'
  },
  {
    sku: 'BAT-HK-60AH',
    nameAr: 'بطارية هانكوك كورديال 60 أمبير جافة مع ضمان سنة',
    category: 'battery',
    quantity: 8,
    unit: 'حبة',
    minAlertLevel: 3,
    costPrice: 195,
    sellingPrice: 280,
    supplier: 'وكيل هانكوك بجدة',
    storageLocation: 'سيارة الخدمة 1',
    compatibility: 'سيارات السيدان 4 سلندر',
    notes: 'يشمل كرت الضمان الأصلي وتاريخ إنتاج حديث'
  },
  {
    sku: 'BAT-VR-70AH',
    nameAr: 'بطارية فارتا الألمانية VARTA 70 أمبير EFB مع ضمان 18 شهر',
    category: 'battery',
    quantity: 6,
    unit: 'حبة',
    minAlertLevel: 2,
    costPrice: 285,
    sellingPrice: 390,
    supplier: 'شركة البابطين للتجارة',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'سيارات SUV ومحركات 6 سلندر وأنظمة Start/Stop'
  },
  {
    sku: 'BRK-TY-FR',
    nameAr: 'أقمشة فرامل أمامية سيراميك عالية التحمل (تويوتا كامري/أفالون)',
    category: 'brake',
    quantity: 10,
    unit: 'طقم',
    minAlertLevel: 4,
    costPrice: 110,
    sellingPrice: 185,
    supplier: 'أكيبونو لقطع الغيار',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'تويوتا كامري 2018-2024، أفالون، لكزس ES'
  },
  {
    sku: 'SPK-NGK-IRID',
    nameAr: 'بواجي إيريديوم ليزر NGK Laser Iridium (طقم 4 حبات)',
    category: 'spark_plug',
    quantity: 14,
    unit: 'طقم',
    minAlertLevel: 5,
    costPrice: 120,
    sellingPrice: 195,
    supplier: 'مؤسسة السليمان لقطع الغيار',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'محركات 4 سلندر ياباني وكوري',
    notes: 'عمر تشغيلي يصل إلى 100,000 كم'
  },
  {
    sku: 'FLD-TY-COOL',
    nameAr: 'سائل تبريد راديتر أحمر مسبق الخلط 50/50 تويوتا أصلي (4 لتر)',
    category: 'fluids',
    quantity: 16,
    unit: 'علبة',
    minAlertLevel: 5,
    costPrice: 55,
    sellingPrice: 85,
    supplier: 'عبداللطيف جميل للسيارات',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: 'جميع أنواع السيارات الحديثة'
  },
  {
    sku: 'FLD-DOT4-BRK',
    nameAr: 'زيت فرامل بوش دوت 4 عالي درجات الغليان BOSCH DOT4 (500 مل)',
    category: 'fluids',
    quantity: 22,
    unit: 'علبة',
    minAlertLevel: 8,
    costPrice: 18,
    sellingPrice: 35,
    supplier: 'بوش الشرق الأوسط',
    storageLocation: 'سيارة الخدمة 1',
    compatibility: 'جميع أنظمة الفرامل الهيدروليكية وABS'
  },
  {
    sku: 'WPR-SIL-24',
    nameAr: 'مساحات زجاج سيليكون مقاومة لحرارة جدة (مقاس 24 / 18 بوصة)',
    category: 'other',
    quantity: 18,
    unit: 'طقم',
    minAlertLevel: 5,
    costPrice: 28,
    sellingPrice: 55,
    supplier: 'مورد معتمد بجدة',
    storageLocation: 'سيارة الخدمة 2',
    compatibility: 'معظم سيارات السيدان والكروس أوفر'
  }
];

const CATEGORY_NAMES: Record<InventoryCategory, { nameAr: string; icon: string }> = {
  oil: { nameAr: 'زيوت المحرك والتشحيم', icon: '🛢️' },
  filter: { nameAr: 'الفلاتر (زيت / هواء / مكيف)', icon: '🔄' },
  brake: { nameAr: 'الفرامل والأقمشة والهوبات', icon: '🛑' },
  battery: { nameAr: 'البطاريات والشواحن', icon: '🔋' },
  spark_plug: { nameAr: 'البواجي ونظام الاشتعال', icon: '⚡' },
  fluids: { nameAr: 'سوائل التبريد والهيدروليك', icon: '💧' },
  belts: { nameAr: 'السيور وخراطيش التبريد', icon: '➰' },
  electrical: { nameAr: 'كهرباء وفيوزات ولمبات', icon: '💡' },
  other: { nameAr: 'قطع وأدوات أخرى', icon: '📦' }
};

export const InventoryManager: React.FC<InventoryManagerProps> = ({ currentStaffUser, isAdmin = true }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    sku: '',
    nameAr: '',
    category: 'oil',
    quantity: 10,
    unit: 'علبة',
    minAlertLevel: 5,
    costPrice: 25,
    sellingPrice: 40,
    supplier: '',
    storageLocation: 'مستودع المركز الرئيسي',
    compatibility: '',
    notes: ''
  });

  // Quick Adjustment Modal
  const [quickAdjustItem, setQuickAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // History Log Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Lock background scrolling when any modal in InventoryManager is open
  useScrollLock(isModalOpen || !!quickAdjustItem || isHistoryModalOpen);

  // Load from Firestore / LocalStorage
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const invRef = collection(db, 'inventory');
      unsubscribe = onSnapshot(invRef, (snapshot) => {
        if (!snapshot.empty) {
          const loaded: InventoryItem[] = [];
          snapshot.forEach(docSnap => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as InventoryItem);
          });
          setItems(loaded);
          localStorage.setItem('drfix_inventory_items', JSON.stringify(loaded));
          setLoading(false);
        } else {
          // Initialize with default items if empty
          initializeDefaultItems();
        }
      }, (err) => {
        console.warn('Firestore inventory onSnapshot warning, falling back to local storage:', err);
        loadLocalFallback();
      });
    } catch (e) {
      console.warn('Firestore not ready, loading local storage:', e);
      loadLocalFallback();
    }

    // Load transactions from localStorage
    try {
      const cachedTx = localStorage.getItem('drfix_inventory_tx');
      if (cachedTx) {
        setTransactions(JSON.parse(cachedTx));
      }
    } catch (e) {
      console.warn('Error reading cached transactions', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadLocalFallback = () => {
    try {
      const cached = localStorage.getItem('drfix_inventory_items');
      if (cached) {
        setItems(JSON.parse(cached));
      } else {
        const seeded = DEFAULT_ITEMS.map((item, idx) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`
        }));
        setItems(seeded);
        localStorage.setItem('drfix_inventory_items', JSON.stringify(seeded));
      }
    } catch {
      const seeded = DEFAULT_ITEMS.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}`
      }));
      setItems(seeded);
    }
    setLoading(false);
  };

  const initializeDefaultItems = async () => {
    const seeded = DEFAULT_ITEMS.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`
    }));
    setItems(seeded);
    try {
      localStorage.setItem('drfix_inventory_items', JSON.stringify(seeded));
      for (const it of seeded) {
        await setDoc(doc(db, 'inventory', it.id), it);
      }
    } catch (e) {
      console.warn('Seeding firestore inventory error:', e);
    }
    setLoading(false);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalCostValue = items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.costPrice || 0)), 0);
    const totalSalesValue = items.reduce((sum, it) => sum + ((it.quantity || 0) * (it.sellingPrice || 0)), 0);
    const expectedProfit = totalSalesValue - totalCostValue;
    const lowStockCount = items.filter(it => it.quantity <= it.minAlertLevel).length;

    return {
      totalItems,
      totalUnits,
      totalCostValue,
      totalSalesValue,
      expectedProfit,
      lowStockCount
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Low stock only
      if (filterLowStockOnly && item.quantity > item.minAlertLevel) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nameAr.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchCompat = (item.compatibility || '').toLowerCase().includes(q);
        const matchLocation = (item.storageLocation || '').toLowerCase().includes(q);
        return matchName || matchSku || matchCompat || matchLocation;
      }
      return true;
    });
  }, [items, selectedCategory, filterLowStockOnly, searchQuery]);

  // Handle Save Item (Add / Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.sku) {
      alert('يرجى كتابة اسم الصنف ورمز الكود (SKU)');
      return;
    }

    const itemData: InventoryItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku: (formData.sku || '').trim().toUpperCase(),
      nameAr: formData.nameAr.trim(),
      nameEn: formData.nameEn?.trim(),
      category: formData.category || 'oil',
      quantity: Number(formData.quantity) || 0,
      unit: formData.unit || 'حبة',
      minAlertLevel: Number(formData.minAlertLevel) || 5,
      costPrice: Number(formData.costPrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      supplier: formData.supplier?.trim() || '',
      storageLocation: formData.storageLocation?.trim() || 'مستودع المركز الرئيسي',
      compatibility: formData.compatibility?.trim() || '',
      notes: formData.notes?.trim() || '',
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'inventory', itemData.id), itemData);
      setItems(prev => {
        const exists = prev.some(i => i.id === itemData.id);
        const updated = exists ? prev.map(i => i.id === itemData.id ? itemData : i) : [itemData, ...prev];
        localStorage.setItem('drfix_inventory_items', JSON.stringify(updated));
        return updated;
      });
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving inventory item to firestore:', err);
      // Local fallback
      setItems(prev => {
        const exists = prev.some(i => i.id === itemData.id);
        const updated = exists ? prev.map(i => i.id === itemData.id ? itemData : i) : [itemData, ...prev];
        localStorage.setItem('drfix_inventory_items', JSON.stringify(updated));
        return updated;
      });
      setIsModalOpen(false);
      setEditingItem(null);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الصنف (${name}) نهائياً من المخزون؟`)) return;

    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (e) {
      console.warn('Error deleting doc from firestore', e);
    }

    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem('drfix_inventory_items', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle Quick Stock Adjust (+ / -)
  const handleConfirmAdjust = async () => {
    if (!quickAdjustItem) return;
    const change = adjustType === 'in' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    const newQty = Math.max(0, quickAdjustItem.quantity + change);

    const updatedItem: InventoryItem = {
      ...quickAdjustItem,
      quantity: newQty,
      lastRestockedAt: adjustType === 'in' ? new Date().toISOString() : quickAdjustItem.lastRestockedAt,
      updatedAt: new Date().toISOString()
    };

    // Log Transaction
    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      itemId: quickAdjustItem.id,
      itemName: quickAdjustItem.nameAr,
      type: adjustType,
      quantityChange: change,
      newQuantity: newQty,
      technicianName: currentStaffUser?.fullName || 'مسؤول المستودع',
      reason: adjustReason.trim() || (adjustType === 'in' ? 'توريد كمية جديدة للمخزون' : 'صرف لعملية صيانة'),
      timestamp: new Date().toISOString()
    };

    const updatedTx = [newTx, ...transactions].slice(0, 200);
    setTransactions(updatedTx);
    try {
      localStorage.setItem('drfix_inventory_tx', JSON.stringify(updatedTx));
    } catch {}

    try {
      await updateDoc(doc(db, 'inventory', quickAdjustItem.id), {
        quantity: newQty,
        lastRestockedAt: updatedItem.lastRestockedAt,
        updatedAt: updatedItem.updatedAt
      });
    } catch (e) {
      console.warn('Error updating inventory item in firestore:', e);
    }

    setItems(prev => {
      const next = prev.map(i => i.id === quickAdjustItem.id ? updatedItem : i);
      localStorage.setItem('drfix_inventory_items', JSON.stringify(next));
      return next;
    });

    setQuickAdjustItem(null);
    setAdjustAmount(1);
    setAdjustReason('');
  };

  // Export Inventory to printable HTML / Word / CSV
  const handleExportCSV = () => {
    const headers = ['الكود (SKU)', 'اسم الصنف', 'التصنيف', 'الكمية', 'الوحدة', 'حد التنبيه', 'سعر التكلفة', 'سعر البيع', 'القيمة الإجمالية', 'الموقع', 'المورد'];
    const rows = items.map(i => [
      `"${i.sku}"`,
      `"${i.nameAr}"`,
      `"${CATEGORY_NAMES[i.category]?.nameAr || i.category}"`,
      i.quantity,
      `"${i.unit}"`,
      i.minAlertLevel,
      i.costPrice,
      i.sellingPrice,
      i.quantity * i.costPrice,
      `"${i.storageLocation || ''}"`,
      `"${i.supplier || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_مخزون_DRFIX_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="glass-card p-5 sm:p-6 border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>إدارة مخزون قطع الغيار والزيوت</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  حي ومحدث ⚡
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                تتبع كميات زيوت المحرك، الفلاتر، البطاريات، الأقمشة، وسوائل التبريد المتاحة في المستودع وسيارات الخدمة الميدانية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                  nameAr: '',
                  category: 'oil',
                  quantity: 10,
                  unit: 'علبة',
                  minAlertLevel: 5,
                  costPrice: 25,
                  sellingPrice: 40,
                  supplier: '',
                  storageLocation: 'مستودع المركز الرئيسي',
                  compatibility: '',
                  notes: ''
                });
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-red/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة صنف جديد</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              title="عرض سجل حركات التوريد والصرف"
            >
              <History className="w-4 h-4 text-white" />
              <span className="hidden md:inline">سجل الحركات</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تصدير جدول المخزون ملف إكسل CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">تصدير إكسل</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Card 1: Total items & units */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 text-xs font-bold">
              <span>إجمالي الأصناف</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats.totalItems} <span className="text-xs font-normal text-gray-400">صنف</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium">
              إجمالي القطع المخزنة: <span className="text-white font-bold">{stats.totalUnits}</span> وحدة
            </div>
          </div>

          {/* Card 2: Cost Value */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 text-xs font-bold">
              <span>قيمة المخزون (بالتكلفة)</span>
              <DollarSign className="w-4 h-4 text-brand-red" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats.totalCostValue.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium">
              رأس مال القطع المتاحة حالياً
            </div>
          </div>

          {/* Card 3: Expected Sales Value & Profit */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 text-xs font-bold">
              <span>القيمة البيعية المتوقعة</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {stats.totalSalesValue.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
            </div>
            <div className="text-[11px] text-emerald-300/80 font-medium">
              صافي الربح التقديري: +{stats.expectedProfit.toLocaleString('ar-SA')} ر.س
            </div>
          </div>

          {/* Card 4: Low stock alerts */}
          <div 
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`border rounded-2xl p-4 space-y-1 relative overflow-hidden cursor-pointer transition-all ${
              stats.lowStockCount > 0 
                ? filterLowStockOnly
                  ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/50'
                  : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15' 
                : 'bg-white/5 border-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={stats.lowStockCount > 0 ? 'text-red-400' : 'text-gray-400'}>
                تنبيهات نقص المخزون
              </span>
              <AlertTriangle className={`w-4 h-4 ${stats.lowStockCount > 0 ? 'text-brand-red animate-pulse' : 'text-gray-500'}`} />
            </div>
            <div className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-brand-red' : 'text-gray-400'}`}>
              {stats.lowStockCount} <span className="text-xs font-normal text-gray-400">أصناف قاربت النفاد</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <span>{filterLowStockOnly ? 'إلغاء فلتر النواقص ✕' : 'اضغط لعرض النواقص فقط ⚡'}</span>
            </div>
          </div>
        </div>

        {/* Search and Category Filter Bar */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث باسم القطعة، كود الصنف (SKU)، السيارات المتوافقة، أو مكان التخزين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filterLowStockOnly && (
              <button
                type="button"
                onClick={() => setFilterLowStockOnly(false)}
                className="px-3 py-2 bg-brand-red/20 text-brand-red border border-brand-red/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>عرض كل المخزون</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>جميع التصنيفات</span>
              <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded-full">{items.length}</span>
            </button>

            {(Object.keys(CATEGORY_NAMES) as InventoryCategory[]).map(catKey => {
              const count = items.filter(i => i.category === catKey).length;
              if (count === 0 && selectedCategory !== catKey) return null;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === catKey
                      ? 'bg-brand-red text-white shadow-md shadow-brand-red/25'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{CATEGORY_NAMES[catKey].icon}</span>
                  <span>{CATEGORY_NAMES[catKey].nameAr}</span>
                  <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory Items Table / Cards */}
      <div className="glass-card border-white/5 overflow-hidden rounded-2xl">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-black/40 text-gray-400 font-bold border-b border-white/10 uppercase">
              <tr>
                <th className="px-5 py-3.5">الكود والاسم</th>
                <th className="px-4 py-3.5">التصنيف</th>
                <th className="px-4 py-3.5">الكمية المتوفرة</th>
                <th className="px-4 py-3.5">التكلفة والبيع</th>
                <th className="px-4 py-3.5">الموقع والتوافق</th>
                <th className="px-4 py-3.5 text-center">تعديل سريع</th>
                <th className="px-4 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredItems.map(item => {
                const isLow = item.quantity <= item.minAlertLevel;
                const isCritical = item.quantity === 0;

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isCritical ? 'bg-red-500/10' : isLow ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{item.nameAr}</span>
                        {isCritical ? (
                          <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                            نفد المخزون!
                          </span>
                        ) : isLow ? (
                          <span className="bg-brand-red/20 text-red-200 border border-brand-red/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            قارب النفاد ⚠️
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.sku}</span>
                        {item.supplier && <span className="text-gray-500">• مورد: {item.supplier}</span>}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-300 inline-flex items-center gap-1">
                        <span>{CATEGORY_NAMES[item.category]?.icon}</span>
                        <span>{CATEGORY_NAMES[item.category]?.nameAr.split(' ')[0]}</span>
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-black ${
                          isCritical ? 'text-red-400' : isLow ? 'text-white' : 'text-emerald-400'
                        }`}>
                          {item.quantity}
                        </span>
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        الحد الأدنى: {item.minAlertLevel} {item.unit}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <div className="text-white font-bold text-xs flex items-center gap-1">
                          <span className="text-gray-400">البيع:</span>
                          <span className="text-emerald-400">{item.sellingPrice} ر.س</span>
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span>التكلفة:</span>
                          <span>{item.costPrice} ر.س</span>
                          <span className="text-gray-500 text-[10px]">
                            (ربح: +{item.sellingPrice - item.costPrice})
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 max-w-xs">
                      <div className="text-xs text-gray-300 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{item.storageLocation || 'المستودع الرئيسي'}</span>
                      </div>
                      {item.compatibility && (
                        <div className="text-[11px] text-gray-400 truncate mt-0.5" title={item.compatibility}>
                          🚗 {item.compatibility}
                        </div>
                      )}
                    </td>

                    {/* Quick + / - Adjuster */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAdjustItem(item);
                            setAdjustType('in');
                            setAdjustAmount(1);
                            setAdjustReason('توريد وشراء جديد');
                          }}
                          className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                          title="إضافة وتوريد كمية (+)"
                        >
                          +
                        </button>
                        <span className="w-8 text-center font-bold text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAdjustItem(item);
                            setAdjustType('out');
                            setAdjustAmount(1);
                            setAdjustReason('صرف لسيارة صيانة');
                          }}
                          className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors disabled:opacity-30"
                          title="صرف كمية (-)"
                          disabled={item.quantity <= 0}
                        >
                          -
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({ ...item });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                          title="تعديل بيانات الصنف"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.nameAr)}
                          className="p-2 text-gray-400 hover:text-brand-red hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                          title="حذف الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-contrast touch friendly cards */}
        <div className="lg:hidden divide-y divide-white/5">
          {filteredItems.map(item => {
            const isLow = item.quantity <= item.minAlertLevel;
            const isCritical = item.quantity === 0;

            return (
              <div 
                key={item.id} 
                className={`p-4 space-y-3 ${
                  isCritical ? 'bg-red-500/10' : isLow ? 'bg-white/5' : 'bg-black/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                      <span>{item.nameAr}</span>
                      {isCritical ? (
                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                          نفد!
                        </span>
                      ) : isLow ? (
                        <span className="bg-brand-red/20 text-red-200 border border-brand-red/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ⚠️ قارب النفاد
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 mt-1 flex items-center gap-2">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.sku}</span>
                      <span>• {CATEGORY_NAMES[item.category]?.nameAr}</span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="text-emerald-400 font-bold text-sm">
                      {item.sellingPrice} <span className="text-[10px] text-gray-400">ر.س</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      تكلفة: {item.costPrice} ر.س
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="text-gray-400 text-[11px]">الموقع التخزيني:</div>
                    <div className="text-white font-bold flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-400" />
                      <span>{item.storageLocation || 'المستودع الرئيسي'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAdjustItem(item);
                        setAdjustType('in');
                        setAdjustAmount(1);
                        setAdjustReason('توريد كمية جديدة');
                      }}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base cursor-pointer"
                    >
                      +
                    </button>
                    <div className="px-2 text-center">
                      <div className="text-sm font-black text-white">{item.quantity}</div>
                      <div className="text-[9px] text-gray-400">{item.unit}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAdjustItem(item);
                        setAdjustType('out');
                        setAdjustAmount(1);
                        setAdjustReason('صرف لسيارة صيانة');
                      }}
                      className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-black text-base cursor-pointer disabled:opacity-30"
                      disabled={item.quantity <= 0}
                    >
                      -
                    </button>
                  </div>
                </div>

                {item.compatibility && (
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-brand-red shrink-0" />
                    <span>التوافق: {item.compatibility}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setFormData({ ...item });
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.nameAr)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="py-16 text-center text-gray-500 space-y-3">
            <Package className="w-12 h-12 text-gray-700 mx-auto" />
            <p className="font-bold">لا توجد أي أصناف مطابقة للبحث أو الفلتر المختار</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setFilterLowStockOnly(false);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Item Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
          <div className="glass-card max-w-xl w-full p-4 sm:p-6 border-brand-red/30 rounded-2xl sm:rounded-3xl bg-[#0f0f12] shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[94dvh] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingItem ? 'تعديل بيانات صنف المخزون' : 'إضافة صنف جديد للمخزون'}
                  </h3>
                  <p className="text-xs text-gray-400">إدارة تفاصيل القطعة وأسعار الشراء والبيع والكميات</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-300 font-bold">اسم الصنف / القطعة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: زيت محرك 5W-30 تخليقي بالبيد"
                    value={formData.nameAr || ''}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">كود الصنف (SKU) *</label>
                  <input
                    type="text"
                    required
                    placeholder="OIL-5W30-SYN"
                    value={formData.sku || ''}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">التصنيف الرئيسي *</label>
                  <select
                    value={formData.category || 'oil'}
                    onChange={e => setFormData({ ...formData, category: e.target.value as InventoryCategory })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red cursor-pointer"
                  >
                    {(Object.keys(CATEGORY_NAMES) as InventoryCategory[]).map(catKey => (
                      <option key={catKey} value={catKey} className="bg-brand-dark text-white">
                        {CATEGORY_NAMES[catKey].nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">الكمية المتوفرة بالمخزون *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity ?? 0}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">وحدة القياس</label>
                  <select
                    value={formData.unit || 'علبة'}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red cursor-pointer"
                  >
                    <option value="علبة" className="bg-brand-dark">علبة</option>
                    <option value="حبة" className="bg-brand-dark">حبة</option>
                    <option value="طقم" className="bg-brand-dark">طقم</option>
                    <option value="لتر" className="bg-brand-dark">لتر</option>
                    <option value="كرتون" className="bg-brand-dark">كرتون</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">سعر التكلفة والشراء (ر.س) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.costPrice ?? 0}
                    onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">سعر البيع للعميل (ر.س) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.sellingPrice ?? 0}
                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">حد التنبيه عند نقص المخزون</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minAlertLevel ?? 5}
                    onChange={e => setFormData({ ...formData, minAlertLevel: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-bold">مكان التخزين</label>
                  <input
                    type="text"
                    placeholder="مستودع المركز أو سيارة الخدمة 1"
                    value={formData.storageLocation || ''}
                    onChange={e => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-300 font-bold">التوافق مع السيارات</label>
                  <input
                    type="text"
                    placeholder="مثال: تويوتا كامري، كورولا، هيونداي سوناتا"
                    value={formData.compatibility || ''}
                    onChange={e => setFormData({ ...formData, compatibility: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-300 font-bold">اسم المورد أو الشركة</label>
                  <input
                    type="text"
                    placeholder="مثال: شركة بالبيد المحدودة"
                    value={formData.supplier || ''}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-gray-300 font-bold">ملاحظات إضافية أو شروط الضمان</label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات تشغيلية، تاريخ صلاحية الزيت أو كرت الضمان..."
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-black shadow-lg shadow-brand-red/25 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'حفظ التعديلات' : 'إضافة الصنف للمخزون'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Movement Modal (+ / -) */}
      {quickAdjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-md overscroll-contain">
          <div className="glass-card max-w-md w-full p-4 sm:p-6 border-white/10 rounded-2xl sm:rounded-3xl bg-[#0f0f12] shadow-2xl space-y-4 my-auto max-h-[94dvh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                  adjustType === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {adjustType === 'in' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {adjustType === 'in' ? 'توريد وإضافة كمية للمخزون' : 'صرف واستهلاك كمية من المخزون'}
                  </h3>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{quickAdjustItem.nameAr}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setQuickAdjustItem(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl flex items-center justify-between">
                <span className="text-gray-400">الكمية الحالية المتوفرة:</span>
                <span className="text-white font-bold text-sm">
                  {quickAdjustItem.quantity} {quickAdjustItem.unit}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">الكمية المراد {adjustType === 'in' ? 'إضافتها' : 'صرفها'}:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={adjustType === 'out' ? quickAdjustItem.quantity : 9999}
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl text-center py-2.5 text-white font-black text-base outline-none focus:border-brand-red"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustAmount(adjustAmount + 1)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">سبب الحركة أو رقم الحجز الميداني:</label>
                <input
                  type="text"
                  placeholder={adjustType === 'in' ? 'مثال: فاتورة شراء رقم 104' : 'مثال: صرف لصيانة كامري حجز #108'}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-brand-red"
                />
              </div>

              <div className="bg-brand-red/10 border border-brand-red/20 p-3 rounded-xl text-center">
                <div className="text-gray-300 text-[11px]">الكمية الإجمالية الجديدة بعد الحركة ستكون:</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {adjustType === 'in' ? quickAdjustItem.quantity + adjustAmount : Math.max(0, quickAdjustItem.quantity - adjustAmount)} {quickAdjustItem.unit}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustItem(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdjust}
                  className={`px-5 py-2.5 rounded-xl font-black text-white shadow-lg cursor-pointer flex items-center gap-1.5 ${
                    adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' : 'bg-brand-red hover:bg-red-700 shadow-brand-red/25'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد تسجيل الحركة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Log Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
          <div className="glass-card max-w-2xl w-full p-4 sm:p-6 border-white/10 rounded-2xl sm:rounded-3xl bg-[#0f0f12] shadow-2xl space-y-4 my-auto max-h-[94dvh] sm:max-h-[88vh] flex flex-col overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">سجل حركات المخزون والمواد</h3>
                  <p className="text-xs text-gray-400">توثيق جميع عمليات التوريد والصرف والتعديل الميداني</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-white/5 space-y-2 pr-1">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <History className="w-8 h-8 text-gray-700 mx-auto" />
                  <p className="font-bold text-xs">لا توجد حركات مسجلة بعد. استخدم أزرار (+) و (-) لتسجيل حركات التوريد والصرف.</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="pt-2 pb-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type === 'in' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{tx.itemName}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>{tx.reason || (tx.type === 'in' ? 'توريد' : 'صرف')}</span>
                          <span>• المسؤول: {tx.technicianName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className={`font-black text-sm ${tx.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'in' ? `+${Math.abs(tx.quantityChange)}` : `-${Math.abs(tx.quantityChange)}`}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        الرصيد: {tx.newQuantity} • {new Date(tx.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل تريد مسح سجل الحركات؟')) {
                    setTransactions([]);
                    localStorage.removeItem('drfix_inventory_tx');
                  }
                }}
                className="text-[11px] text-gray-500 hover:text-red-400"
              >
                مسح السجل
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
