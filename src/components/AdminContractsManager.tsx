import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Handshake,
  Building2,
  Wrench,
  Car,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Printer,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
  FileText,
  DollarSign,
  Truck,
  Sparkles,
  Check,
  Tag,
  MapPin,
  HelpCircle,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Contract, ContractType, ContractStatus, ContractVehicle, ContractVehicleStatus, DEFAULT_SAMPLE_CONTRACTS } from '../types';
import { cn } from '../lib/utils';
import { formatSaudiPhoneForWhatsApp } from '../lib/phoneUtils';

interface AdminContractsManagerProps {
  contracts: Contract[];
  onAddContract: (contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateContract: (id: string, updates: Partial<Contract>) => Promise<void>;
  onDeleteContract: (id: string) => Promise<void>;
  onAddVehicleToContract: (contractId: string, vehicle: Omit<ContractVehicle, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateVehicleInContract: (contractId: string, vehicleId: string, updates: Partial<ContractVehicle>) => Promise<void>;
  onDeleteVehicleFromContract: (contractId: string, vehicleId: string) => Promise<void>;
  lang?: 'ar' | 'en';
}

const WORKSHOP_SPECIALIZATIONS = [
  'سمكرة ودهان أفران حرارية',
  'ميكانيكا وتوضيب قيرات ومحركات',
  'كهرباء وبرمجة سيارات وكمبيوتر',
  'تكييف وتبريد وراديترات',
  'مخرطة وتعديل شاسيه ومقصات',
  'تعديل صدمات على البارد (PDR)',
  'ميزان وترصيص وأذرعة وهيدروليك',
  'زجاج وتنجيد وفرش سيارات',
  'صيانة عامة وفحص شامل'
];

const FLEET_SCOPES = [
  'صيانة دورية وقائية وتغيير زيوت وفلاتر',
  'صيانة أسطول فانات وشاحنات خفيفة شاملة',
  'فحص فرامل وأنظمة سلامة دوري',
  'إصلاح كهرباء وتكييف وسوائل تبريد',
  'خدمة صيانة متنقلة وطوارئ ميدانية',
  'فحص شامل قبل تجديد الاستمارة والفحص الدوري',
  'صيانة وإصلاح أعطال ميكانيكية عامة'
];

const DEFAULT_WORKSHOP_TERMS = `1. التزام الورشة بتوفير فنيين مؤهلين ومعدات فحص متطورة لإنجاز الأعمال المسندة إليها.
2. استخدام مواد أصلية ودهانات معتمدة مع تقديم ضمان جودة لا يقل عن 12 شهراً على أعمال السمكرة والرش والدهان.
3. الالتزام بالمواعيد المتفق عليها لتسليم المركبات (خلال 3 إلى 7 أيام عمل حسب طبيعة الإصلاح).
4. توفير صور وتقرير فني يوضح حالة المركبة قبل بدء العمل وبعد إتمامه.
5. تسوية المستحقات المالية بموجب كشف حساب شهري مفصل معتمد من الطرفين.`;

const DEFAULT_FLEET_TERMS = `1. منح أسطول الشركة المتعاقدة أولوية قصوى للدخول واستلام أعمال الصيانة السريعة دون حجز مسبق.
2. تطبيق الخصم المتفق عليه على أجور اليد وقطع الغيار الأصلية المعتمدة.
3. تقديم ضمان رسمي لمدة 6 أشهر أو 10,000 كم على كافة أعمال الصيانة والإصلاح المنجزة.
4. إصدار فواتير ضريبية إلكترونية موحدة لكل مركبة مع كشف شهري شامل يوضح مصروفات الأسطول.
5. توفير خدمة فحص سلامة وقائي مجاني مع كل غيار زيت وصيانة دورية.`;

export const AdminContractsManager: React.FC<AdminContractsManagerProps> = ({
  contracts,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  onAddVehicleToContract,
  onUpdateVehicleInContract,
  onDeleteVehicleFromContract,
  lang = 'ar'
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'workshop_outbound' | 'company_inbound'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteConfirmContract, setDeleteConfirmContract] = useState<Contract | null>(null);
  const [vehiclesModalContract, setVehiclesModalContract] = useState<Contract | null>(null);
  const [printContract, setPrintContract] = useState<Contract | null>(null);

  // Quick action to add a vehicle from the contract card
  const [quickAddVehicleContractId, setQuickAddVehicleContractId] = useState<string | null>(null);

  // Form inputs state
  const [formType, setFormType] = useState<ContractType>('workshop_outbound');
  const [formData, setFormData] = useState({
    title: '',
    contractNumber: '',
    partyName: '',
    crNumber: '',
    taxNumber: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    city: 'جدة',
    address: '',
    specializationOrScope: '',
    estimatedVehiclesCount: 0,
    commissionOrDiscount: '20%',
    paymentTerms: 'monthly_billing' as Contract['paymentTerms'],
    paymentTermsDetails: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active' as ContractStatus,
    termsConditions: DEFAULT_WORKSHOP_TERMS,
    notes: ''
  });

  // Vehicle form state
  const [newVehicleData, setNewVehicleData] = useState({
    plateNumber: '',
    carModel: '',
    carYear: new Date().getFullYear().toString(),
    driverOrContact: '',
    driverPhone: '',
    serviceRequired: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    expectedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workshopCost: '',
    billingAmount: '',
    status: 'in_progress' as ContractVehicleStatus,
    workNotes: ''
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const total = contracts.length;
    const workshops = contracts.filter(c => c.type === 'workshop_outbound').length;
    const fleets = contracts.filter(c => c.type === 'company_inbound').length;
    const active = contracts.filter(c => c.status === 'active').length;

    let totalVehicles = 0;
    let inProgressVehicles = 0;
    let readyVehicles = 0;

    contracts.forEach(c => {
      const vList = c.vehicles || [];
      totalVehicles += vList.length;
      inProgressVehicles += vList.filter(v => v.status === 'in_progress' || v.status === 'dispatched').length;
      readyVehicles += vList.filter(v => v.status === 'ready').length;
    });

    return { total, workshops, fleets, active, totalVehicles, inProgressVehicles, readyVehicles };
  }, [contracts]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      // Type filter
      if (activeFilter !== 'all' && contract.type !== activeFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && contract.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesContract = 
          (contract.title || '').toLowerCase().includes(q) ||
          (contract.contractNumber || '').toLowerCase().includes(q) ||
          (contract.partyName || '').toLowerCase().includes(q) ||
          (contract.contactPerson || '').toLowerCase().includes(q) ||
          (contract.contactPhone || '').includes(q) ||
          (contract.specializationOrScope || '').toLowerCase().includes(q);

        const matchesVehicle = (contract.vehicles || []).some(v => 
          (v.plateNumber || '').toLowerCase().includes(q) ||
          (v.carModel || '').toLowerCase().includes(q) ||
          (v.serviceRequired || '').toLowerCase().includes(q)
        );

        if (!matchesContract && !matchesVehicle) return false;
      }
      return true;
    });
  }, [contracts, activeFilter, statusFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = (type: ContractType = 'workshop_outbound') => {
    setEditingContract(null);
    setFormType(type);
    const datePrefix = new Date().getFullYear();
    const randNum = Math.floor(100 + Math.random() * 900);
    const generatedNum = type === 'workshop_outbound' 
      ? `CTR-WRK-${datePrefix}-${randNum}` 
      : `CTR-CORP-${datePrefix}-${randNum}`;

    setFormData({
      title: type === 'workshop_outbound' 
        ? 'اتفاقية إسناد أعمال صيانة وخدمات متخصصة' 
        : 'اتفاقية صيانة دورية وإصلاح أسطول مركبات تجاري',
      contractNumber: generatedNum,
      partyName: '',
      crNumber: '',
      taxNumber: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      city: 'جدة',
      address: '',
      specializationOrScope: type === 'workshop_outbound' ? WORKSHOP_SPECIALIZATIONS[0] : FLEET_SCOPES[0],
      estimatedVehiclesCount: type === 'company_inbound' ? 20 : 0,
      commissionOrDiscount: type === 'workshop_outbound' ? '20% خصم خاص للمركز' : '15% خصم أسطول سنوي',
      paymentTerms: type === 'workshop_outbound' ? 'monthly_billing' : 'credit_30',
      paymentTermsDetails: type === 'workshop_outbound' 
        ? 'كشف حساب تسوية شهري مع فاتورة إلكترونية' 
        : 'سداد آجل خلال 30 يوم من صدور الفاتورة الضريبية',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      termsConditions: type === 'workshop_outbound' ? DEFAULT_WORKSHOP_TERMS : DEFAULT_FLEET_TERMS,
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (contract: Contract) => {
    setEditingContract(contract);
    setFormType(contract.type);
    setFormData({
      title: contract.title || '',
      contractNumber: contract.contractNumber || '',
      partyName: contract.partyName || '',
      crNumber: contract.crNumber || '',
      taxNumber: contract.taxNumber || '',
      contactPerson: contract.contactPerson || '',
      contactPhone: contract.contactPhone || '',
      contactEmail: contract.contactEmail || '',
      city: contract.city || 'جدة',
      address: contract.address || '',
      specializationOrScope: contract.specializationOrScope || '',
      estimatedVehiclesCount: contract.estimatedVehiclesCount || 0,
      commissionOrDiscount: contract.commissionOrDiscount || '',
      paymentTerms: contract.paymentTerms || 'monthly_billing',
      paymentTermsDetails: contract.paymentTermsDetails || '',
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      status: contract.status || 'active',
      termsConditions: contract.termsConditions || '',
      notes: contract.notes || ''
    });
    setIsFormModalOpen(true);
  };

  // Submit Contract Form
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال اسم الورشة أو الشركة المتعاقد معها' : 'Please enter the party name');
      return;
    }
    if (!formData.contactPhone.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال رقم هاتف المسؤول' : 'Please enter contact phone');
      return;
    }

    try {
      if (editingContract) {
        await onUpdateContract(editingContract.id, {
          ...formData,
          type: formType
        });
      } else {
        await onAddContract({
          ...formData,
          type: formType,
          vehicles: []
        });
      }
      setIsFormModalOpen(false);
      setEditingContract(null);
    } catch (err) {
      console.error('Error saving contract:', err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء حفظ بيانات العقد' : 'Failed to save contract');
    }
  };

  // Add Vehicle to Contract
  const handleAddVehicle = async (contractId: string) => {
    if (!newVehicleData.plateNumber.trim() || !newVehicleData.carModel.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال رقم اللوحة ونوع السيارة على الأقل' : 'Please enter plate number and car model');
      return;
    }

    try {
      await onAddVehicleToContract(contractId, {
        contractId,
        plateNumber: newVehicleData.plateNumber.trim(),
        carModel: newVehicleData.carModel.trim(),
        carYear: newVehicleData.carYear.trim(),
        driverOrContact: newVehicleData.driverOrContact.trim(),
        driverPhone: newVehicleData.driverPhone.trim(),
        serviceRequired: newVehicleData.serviceRequired.trim(),
        dispatchDate: newVehicleData.dispatchDate,
        expectedCompletionDate: newVehicleData.expectedCompletionDate,
        workshopCost: newVehicleData.workshopCost ? parseFloat(newVehicleData.workshopCost) : undefined,
        billingAmount: newVehicleData.billingAmount ? parseFloat(newVehicleData.billingAmount) : undefined,
        status: newVehicleData.status,
        workNotes: newVehicleData.workNotes.trim()
      });

      // Reset vehicle form
      setNewVehicleData({
        plateNumber: '',
        carModel: '',
        carYear: new Date().getFullYear().toString(),
        driverOrContact: '',
        driverPhone: '',
        serviceRequired: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        expectedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        workshopCost: '',
        billingAmount: '',
        status: 'in_progress',
        workNotes: ''
      });

      setQuickAddVehicleContractId(null);
      // Keep vehicles modal updated if open
      if (vehiclesModalContract && vehiclesModalContract.id === contractId) {
        const updated = contracts.find(c => c.id === contractId);
        if (updated) setVehiclesModalContract(updated);
      }
    } catch (err) {
      console.error('Error adding vehicle to contract:', err);
      alert(lang === 'ar' ? 'فشل إضافة السيارة للعقد' : 'Failed to add vehicle');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn w-full max-w-full text-right" dir="rtl">
      
      {/* Header Banner & Title */}
      <div className="glass-card p-5 sm:p-7 border-brand-red/20 rounded-3xl relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand-black to-black">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-bold mb-2.5">
              <Handshake className="w-3.5 h-3.5" />
              <span>نظام إدارة عقود الورش والشركات والأساطيل</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black italic text-white mb-2">
              إدارة <span className="text-brand-red">العقود والاتفاقيات</span> الرسمية
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              إدارة التعاقدات الخارجية: إسناد وتصدير أعمال لورش صيانة متخصصة (سمكرة، دهان، توضيب، تكييف)، 
              أو التعاقد مع شركات ومؤسسات تجارية لاستلام وصيانة أساطيل سياراتهم مع متابعة السيارات المسندة والمستلمة.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => handleOpenAddModal('workshop_outbound')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-brand-red/20 transition-all cursor-pointer group"
            >
              <Wrench className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>+ عقد ورشة (إسناد سيارات)</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('company_inbound')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer group"
            >
              <Building2 className="w-4 h-4 text-brand-red group-hover:scale-110 transition-transform" />
              <span>+ عقد شركة (استلام أسطول)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1">إجمالي العقود</div>
            <div className="text-xl sm:text-2xl font-display font-black text-white">{stats.total}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{stats.active} عقد ساري</div>
          </div>

          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-brand-red" />
              <span>عقود ورش خارجية</span>
            </div>
            <div className="text-xl sm:text-2xl font-display font-black text-brand-red">{stats.workshops}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">إسناد وتصدير أعمال</div>
          </div>

          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-white" />
              <span>عقود شركات وأساطيل</span>
            </div>
            <div className="text-xl sm:text-2xl font-display font-black text-white">{stats.fleets}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">استلام وصيانة أسطول</div>
          </div>

          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <Car className="w-3 h-3 text-brand-red" />
              <span>إجمالي سيارات العقود</span>
            </div>
            <div className="text-xl sm:text-2xl font-display font-black text-white">{stats.totalVehicles}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">مسندة ومستلمة</div>
          </div>

          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>سيارات قيد العمل</span>
            </div>
            <div className="text-xl sm:text-2xl font-display font-black text-amber-400">{stats.inProgressVehicles}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">بالورش / قيد الصيانة</div>
          </div>

          <div className="bg-white/5 p-3 sm:p-3.5 rounded-2xl border border-white/5">
            <div className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-brand-red" />
              <span>سيارات جاهزة للتسليم</span>
            </div>
            <div className="text-xl sm:text-2xl font-display font-black text-white">{stats.readyVehicles}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">تم إنجازها بنجاح</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 bg-white/5 p-2.5 sm:p-3 rounded-2xl border border-white/10">
        
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeFilter === 'all'
                ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            جميع العقود ({contracts.length})
          </button>
          
          <button
            onClick={() => setActiveFilter('workshop_outbound')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeFilter === 'workshop_outbound'
                ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>عقود الورش (إسناد سيارات) ({stats.workshops})</span>
          </button>

          <button
            onClick={() => setActiveFilter('company_inbound')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeFilter === 'company_inbound'
                ? "bg-brand-red text-white shadow-md shadow-brand-red/25"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>عقود الشركات (استلام أساطيل) ({stats.fleets})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، رقم العقد، اللوحة..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-500 focus:border-brand-red focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:border-brand-red focus:outline-none cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="active">عقود سارية</option>
            <option value="draft">مسودات</option>
            <option value="suspended">معلقة</option>
            <option value="expired">منتهية</option>
          </select>
        </div>
      </div>

      {/* Contracts List / Grid */}
      {filteredContracts.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border-white/5">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-gray-500">
            <Handshake className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">لا توجد عقود تطابق خيارات البحث</h3>
          <p className="text-gray-400 text-xs max-w-md mx-auto mb-6">
            يمكنك إنشاء أول عقد لورشة صيانة شريكة لإسناد أعمال أو عقد لشركة تجارية لصيانة أسطولها.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleOpenAddModal('workshop_outbound')}
              className="px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-red-700 transition-colors"
            >
              + إنشاء عقد ورشة
            </button>
            <button
              onClick={() => handleOpenAddModal('company_inbound')}
              className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-white/15 transition-colors"
            >
              + إنشاء عقد شركة
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredContracts.map((contract) => {
            const isWorkshop = contract.type === 'workshop_outbound';
            const vList = contract.vehicles || [];
            const inProgressCount = vList.filter(v => v.status === 'in_progress' || v.status === 'dispatched').length;
            const readyCount = vList.filter(v => v.status === 'ready').length;
            const deliveredCount = vList.filter(v => v.status === 'delivered').length;

            return (
              <div
                key={contract.id}
                className={cn(
                  "glass-card p-5 sm:p-6 rounded-3xl border transition-all duration-300 relative flex flex-col justify-between group",
                  isWorkshop 
                    ? "border-brand-red/20 hover:border-brand-red/50 bg-gradient-to-br from-white/[0.03] to-transparent" 
                    : "border-white/10 hover:border-white/30 bg-gradient-to-br from-white/[0.02] to-transparent"
                )}
              >
                {/* Top badges */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border",
                        isWorkshop 
                          ? "bg-brand-red/15 border-brand-red/30 text-brand-red" 
                          : "bg-white/10 border-white/20 text-white"
                      )}>
                        {isWorkshop ? <Wrench className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                        <span>{isWorkshop ? 'ورشة شريكة (إسناد سيارات)' : 'شركة تجارية (استلام أسطول)'}</span>
                      </span>

                      <span className="font-mono text-[11px] text-gray-400 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5" dir="ltr">
                        {contract.contractNumber}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 border",
                      contract.status === 'active' && "bg-brand-red/20 text-white border-brand-red/40",
                      contract.status === 'draft' && "bg-white/10 text-gray-300 border-white/20",
                      contract.status === 'suspended' && "bg-amber-500/15 text-amber-300 border-amber-500/30",
                      contract.status === 'expired' && "bg-red-500/15 text-red-300 border-red-500/30"
                    )}>
                      {contract.status === 'active' && 'ساري المفعول'}
                      {contract.status === 'draft' && 'مسودة عقد'}
                      {contract.status === 'suspended' && 'معلق مؤقتاً'}
                      {contract.status === 'expired' && 'منتهي'}
                    </span>
                  </div>

                  {/* Title & Party Name */}
                  <h3 className="text-base sm:text-lg font-display font-black text-white mb-1 group-hover:text-brand-red transition-colors">
                    {contract.partyName}
                  </h3>
                  <div className="text-xs text-gray-400 font-medium mb-4 leading-relaxed">
                    {contract.title}
                  </div>

                  {/* Scope / Specialization Badge */}
                  {contract.specializationOrScope && (
                    <div className="p-3 bg-black/40 rounded-2xl border border-white/5 mb-4 text-xs">
                      <div className="text-[10px] text-gray-500 font-bold mb-1">
                        {isWorkshop ? 'مجال التخصص والإسناد:' : 'نطاق الصيانة المتفق عليه:'}
                      </div>
                      <div className="text-gray-200 leading-relaxed font-medium">
                        {contract.specializationOrScope}
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-0.5">المسؤول والمفوض:</div>
                      <div className="font-bold text-white truncate">{contract.contactPerson}</div>
                      <div className="text-[11px] text-gray-400 font-mono" dir="ltr">{contract.contactPhone}</div>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-0.5">
                        {isWorkshop ? 'نسبة الخصم / العمولة:' : 'خصم العقد المعتمد:'}
                      </div>
                      <div className="font-bold text-brand-red truncate">
                        {contract.commissionOrDiscount || 'حسب الاتفاق'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {contract.paymentTerms === 'monthly_billing' && 'تسوية شهرية'}
                        {contract.paymentTerms === 'credit_30' && 'آجل 30 يوم'}
                        {contract.paymentTerms === 'per_vehicle' && 'دفع بالسيارة'}
                        {contract.paymentTerms === 'advance_deposit' && 'دفعة مقدمة'}
                        {contract.paymentTerms === 'custom' && 'شروط خاصة'}
                      </div>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-0.5">سريان العقد:</div>
                      <div className="text-[11px] text-gray-300 font-mono" dir="ltr">
                        {contract.startDate} → {contract.endDate}
                      </div>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-0.5">الموقع والمدينة:</div>
                      <div className="text-gray-300 truncate">{contract.city || 'جدة'} {contract.address ? `- ${contract.address}` : ''}</div>
                    </div>
                  </div>

                  {/* Vehicles Progress Banner */}
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/5 mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-brand-red" />
                        <span>{isWorkshop ? 'السيارات المسندة للورشة:' : 'سيارات الأسطول المستلمة:'}</span>
                        <span className="font-mono text-brand-red font-black">({vList.length})</span>
                      </span>

                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        {inProgressCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                            {inProgressCount} قيد العمل
                          </span>
                        )}
                        {readyCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                            {readyCount} جاهزة
                          </span>
                        )}
                      </div>
                    </div>

                    {vList.length === 0 ? (
                      <div className="text-[11px] text-gray-500 py-1 text-center">
                        لم يتم تسجيل أي سيارات على هذا العقد حتى الآن
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar pt-1">
                        {vList.slice(0, 3).map((v) => (
                          <div key={v.id} className="flex items-center justify-between text-xs bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-white bg-white/5 px-1.5 py-0.5 rounded text-[10px] border border-white/10 shrink-0">
                                {v.plateNumber}
                              </span>
                              <span className="text-gray-300 truncate text-[11px]">{v.carModel}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                              v.status === 'in_progress' && "text-amber-400 bg-amber-500/10",
                              v.status === 'ready' && "text-white bg-brand-red/30",
                              v.status === 'delivered' && "text-gray-400 bg-white/5",
                              v.status === 'dispatched' && "text-blue-400 bg-blue-500/10"
                            )}>
                              {v.status === 'in_progress' && 'بالورشة'}
                              {v.status === 'ready' && 'جاهزة'}
                              {v.status === 'delivered' && 'تم التسليم'}
                              {v.status === 'dispatched' && 'بانتظار الإرسال'}
                            </span>
                          </div>
                        ))}
                        {vList.length > 3 && (
                          <div className="text-[10px] text-gray-500 text-center">
                            +{vList.length - 3} سيارات إضافية مسجلة
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom Toolbar */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Vehicles Manager Button */}
                    <button
                      onClick={() => setVehiclesModalContract(contract)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                      title="فتح سجل وإدارة سيارات هذا العقد"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>سجل السيارات ({vList.length})</span>
                    </button>

                    {/* Quick Add Car */}
                    <button
                      onClick={() => {
                        setVehiclesModalContract(contract);
                        setQuickAddVehicleContractId(contract.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-2 bg-white/10 hover:bg-white/15 text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title={isWorkshop ? "إرسال سيارة جديدة لهذه الورشة" : "استلام سيارة جديدة من هذه الشركة"}
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-red" />
                      <span className="hidden sm:inline">{isWorkshop ? 'إرسال سيارة' : 'استلام سيارة'}</span>
                    </button>

                    {/* Print Agreement */}
                    <button
                      onClick={() => setPrintContract(contract)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                      title="معاينة وطباعة نص الاتفاقية الرسمية"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Direct Contact & Edit */}
                  <div className="flex items-center gap-1.5">
                    {contract.contactPhone && (
                      <a
                        href={`https://wa.me/${formatSaudiPhoneForWhatsApp(contract.contactPhone)}?text=${encodeURIComponent(
                          `السلام عليكم ورحمة الله وبركاته، تحية طيبة من مركز DR.FIX لصيانة السيارات بخصوص ${contract.title} (رقم العقد: ${contract.contractNumber}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                        title="مراسلة واتساب مباشرة"
                      >
                        <MessageCircle className="w-4 h-4 text-brand-red" />
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(contract)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                      title="تعديل بيانات العقد"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmContract(contract)}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                      title="حذف العقد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT CONTRACT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl bg-brand-dark border-brand-red/30 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-right max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                    <Handshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-black text-white">
                      {editingContract ? 'تعديل بيانات الاتفاقية' : 'إنشاء اتفاقية عقد جديدة'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      توثيق الشروط والخصومات والفوترة لورش الصيانة الخارجية أو أساطيل الشركات
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/50 rounded-2xl border border-white/10 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('workshop_outbound');
                    if (!editingContract) {
                      setFormData(prev => ({
                        ...prev,
                        title: 'اتفاقية إسناد أعمال صيانة وخدمات متخصصة',
                        specializationOrScope: WORKSHOP_SPECIALIZATIONS[0],
                        termsConditions: DEFAULT_WORKSHOP_TERMS,
                        commissionOrDiscount: '20% خصم خاص للمركز'
                      }));
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    formType === 'workshop_outbound'
                      ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Wrench className="w-4 h-4" />
                  <span>عقد ورشة (إسناد سيارات)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormType('company_inbound');
                    if (!editingContract) {
                      setFormData(prev => ({
                        ...prev,
                        title: 'اتفاقية صيانة دورية وإصلاح أسطول مركبات تجاري',
                        specializationOrScope: FLEET_SCOPES[0],
                        termsConditions: DEFAULT_FLEET_TERMS,
                        commissionOrDiscount: '15% خصم أسطول سنوي'
                      }));
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    formType === 'company_inbound'
                      ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  <span>عقد شركة (استلام أسطول)</span>
                </button>
              </div>

              <form onSubmit={handleSubmitContract} className="space-y-4 text-xs">
                {/* Contract Title & Number */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-gray-300 font-bold block">مسمى الاتفاقية والعقد *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مثال: اتفاقية أعمال سمكرة ودهان أفران"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">رقم العقد المرجعي *</label>
                    <input
                      type="text"
                      required
                      value={formData.contractNumber}
                      onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Party Name & Commercial Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">
                      {formType === 'workshop_outbound' ? 'اسم الورشة المتعاقد معها *' : 'اسم الشركة / المؤسسة *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.partyName}
                      onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                      placeholder={formType === 'workshop_outbound' ? 'ورشة الأمانة للسمكرة' : 'شركة نقل كبرى'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">رقم السجل التجاري (CR)</label>
                    <input
                      type="text"
                      value={formData.crNumber}
                      onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                      placeholder="4030XXXXXX"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">الرقم الضريبي (VAT)</label>
                    <input
                      type="text"
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                      placeholder="300XXXXXXXXXXXX"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Contact Person & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">اسم المسؤول / مدير الأسطول *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="أ. عبدالله السالم"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">رقم الجوال والواتساب *</label>
                    <input
                      type="text"
                      required
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="05XXXXXXXX"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-mono text-white focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* City & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">المدينة</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="جدة"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">الحي أو الموقع التفصيلي</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="صناعية عسفان / الخمرة / شارع الورش"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                </div>

                {/* Scope & Terms */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-bold block">
                      {formType === 'workshop_outbound' ? 'تخصص الصيانة المسندة للورشة' : 'نطاق صيانة الأسطول للشركة'}
                    </label>
                    <span className="text-[10px] text-gray-500">اختر من القائمة أو اكتب بحرية</span>
                  </div>
                  <input
                    type="text"
                    value={formData.specializationOrScope}
                    onChange={(e) => setFormData({ ...formData, specializationOrScope: e.target.value })}
                    placeholder="سمكرة ودهان، تغيير زيوت، فحص شامل..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                  />
                  {/* Presets Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(formType === 'workshop_outbound' ? WORKSHOP_SPECIALIZATIONS : FLEET_SCOPES).slice(0, 4).map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setFormData({ ...formData, specializationOrScope: preset })}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financial & Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">نسبة الخصم / العمولة</label>
                    <input
                      type="text"
                      value={formData.commissionOrDiscount}
                      onChange={(e) => setFormData({ ...formData, commissionOrDiscount: e.target.value })}
                      placeholder="مثال: 20% أو عمولة 15%"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">طريقة وشروط الدفع</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                      className="w-full bg-brand-dark border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none cursor-pointer"
                    >
                      <option value="monthly_billing">تسوية فواتير شهرية</option>
                      <option value="credit_30">آجل 30 يوم من الفاتورة</option>
                      <option value="per_vehicle">تسوية فورية لكل سيارة</option>
                      <option value="advance_deposit">دفعة مقدمة مع رصيد</option>
                      <option value="custom">شروط دفع مخصصة</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">حالة العقد</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-brand-dark border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none cursor-pointer"
                    >
                      <option value="active">ساري المفعول</option>
                      <option value="draft">مسودة</option>
                      <option value="suspended">معلق مؤقتاً</option>
                      <option value="expired">منتهي</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">تاريخ بدء العقد</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-300 font-bold block">تاريخ انتهاء العقد</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-bold block">بنود وشروط الاتفاقية الرسمية</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        termsConditions: formType === 'workshop_outbound' ? DEFAULT_WORKSHOP_TERMS : DEFAULT_FLEET_TERMS 
                      })}
                      className="text-[10px] text-brand-red hover:underline font-bold"
                    >
                      استعادة البنود النموذجية
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.termsConditions}
                    onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red focus:outline-none leading-relaxed text-xs"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block">ملاحظات إدارية داخلية (اختياري)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات تظهر لإدارة المركز فقط..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white focus:border-brand-red focus:outline-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-brand-red/25 cursor-pointer"
                  >
                    {editingContract ? 'حفظ التعديلات' : 'اعتماد العقد'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. CONTRACT VEHICLES LOG MODAL (إدارة سيارات العقد) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {vehiclesModalContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-4xl bg-brand-dark border-brand-red/30 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-right max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-bold border",
                      vehiclesModalContract.type === 'workshop_outbound'
                        ? "bg-brand-red/15 border-brand-red/30 text-brand-red"
                        : "bg-white/10 border-white/20 text-white"
                    )}>
                      {vehiclesModalContract.type === 'workshop_outbound' ? 'ورشة شريكة' : 'شركة أسطول'}
                    </span>
                    <span className="font-mono text-xs text-gray-400" dir="ltr">{vehiclesModalContract.contractNumber}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-black text-white">
                    سجل السيارات: <span className="text-brand-red">{vehiclesModalContract.partyName}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {vehiclesModalContract.type === 'workshop_outbound'
                      ? 'متابعة السيارات المسندة لهذه الورشة وتكاليفها وحالة الإنجاز'
                      : 'متابعة سيارات الأسطول المستلمة من الشركة وتفاصيل الصيانة والفواتير'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setVehiclesModalContract(null);
                    setQuickAddVehicleContractId(null);
                  }}
                  className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add New Car to this Contract Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand-red" />
                    <span>
                      {vehiclesModalContract.type === 'workshop_outbound' 
                        ? 'إسناد وتصدير سيارة جديدة للورشة' 
                        : 'استلام سيارة جديدة من أسطول الشركة'}
                    </span>
                  </h4>
                  <span className="text-[10px] text-gray-500">تسجيل وتوثيق حركة المركبة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">رقم اللوحة *</label>
                    <input
                      type="text"
                      value={newVehicleData.plateNumber}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, plateNumber: e.target.value })}
                      placeholder="أ ب ج 1234"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">نوع وموديل السيارة *</label>
                    <input
                      type="text"
                      value={newVehicleData.carModel}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, carModel: e.target.value })}
                      placeholder="تويوتا كامري 2024"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">اسم السائق أو العميل</label>
                    <input
                      type="text"
                      value={newVehicleData.driverOrContact}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, driverOrContact: e.target.value })}
                      placeholder="محمد أحمد"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">جوال السائق / التواصل</label>
                    <input
                      type="text"
                      value={newVehicleData.driverPhone}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, driverPhone: e.target.value })}
                      placeholder="05XXXXXXXX"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red focus:outline-none text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-gray-400 block mb-1">العطل أو الخدمة المطلوبة بالتفصيل *</label>
                    <input
                      type="text"
                      value={newVehicleData.serviceRequired}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, serviceRequired: e.target.value })}
                      placeholder={vehiclesModalContract.type === 'workshop_outbound' 
                        ? "سمكرة باب يمين ورش فرن حراري مطابقة أصلية" 
                        : "صيانة دورية 30 ألف كم وتغيير فحمات وفحص مكيف"}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">تاريخ الإرسال / الاستلام</label>
                    <input
                      type="date"
                      value={newVehicleData.dispatchDate}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, dispatchDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">تاريخ الإنجاز المتوقع</label>
                    <input
                      type="date"
                      value={newVehicleData.expectedCompletionDate}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, expectedCompletionDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  {vehiclesModalContract.type === 'workshop_outbound' ? (
                    <>
                      <div>
                        <label className="text-gray-400 block mb-1">تكلفة الورشة علينا (ريال)</label>
                        <input
                          type="number"
                          value={newVehicleData.workshopCost}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, workshopCost: e.target.value })}
                          placeholder="1200"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red focus:outline-none text-left"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">سعر المركز للعميل (ريال)</label>
                        <input
                          type="number"
                          value={newVehicleData.billingAmount}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, billingAmount: e.target.value })}
                          placeholder="1600"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red focus:outline-none text-left"
                          dir="ltr"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2">
                      <label className="text-gray-400 block mb-1">قيمة الفاتورة للشركة (ريال)</label>
                      <input
                        type="number"
                        value={newVehicleData.billingAmount}
                        onChange={(e) => setNewVehicleData({ ...newVehicleData, billingAmount: e.target.value })}
                        placeholder="850"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-red focus:outline-none text-left"
                        dir="ltr"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="text-gray-400 block mb-1">ملاحظات العمل والإصلاح</label>
                    <input
                      type="text"
                      value={newVehicleData.workNotes}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, workNotes: e.target.value })}
                      placeholder="تم توفير قطع الغيار، بانتظار الفحص..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleAddVehicle(vehiclesModalContract.id)}
                      className="w-full py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-red/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {vehiclesModalContract.type === 'workshop_outbound' ? 'تسجيل إسناد السيارة' : 'تسجيل استلام السيارة'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Vehicles Table */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-white">
                    السيارات المسجلة بهذا العقد ({(vehiclesModalContract.vehicles || []).length})
                  </h4>
                  <span className="text-[11px] text-gray-400">يمكنك تحديث حالة أي سيارة بنقرة زر واحدة</span>
                </div>

                {(vehiclesModalContract.vehicles || []).length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                    <Car className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">لا توجد سيارات مسجلة حتى الآن</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(vehiclesModalContract.vehicles || []).map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                      >
                        {/* Vehicle Info */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center justify-center text-center p-1 shrink-0">
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">KSA</span>
                            <span className="font-mono font-black text-white text-xs">{vehicle.plateNumber}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">{vehicle.carModel}</span>
                              {vehicle.driverOrContact && (
                                <span className="text-gray-400 text-[11px]">
                                  (المفوض: {vehicle.driverOrContact})
                                </span>
                              )}
                            </div>
                            <div className="text-gray-300 text-xs mt-0.5 font-medium">
                              {vehicle.serviceRequired}
                            </div>
                            {vehicle.workNotes && (
                              <div className="text-[11px] text-gray-500 mt-1 italic">
                                ملاحظة: {vehicle.workNotes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dates & Financials */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] font-mono">
                            <div className="text-gray-500 text-[9px]">التاريخ:</div>
                            <div className="text-gray-300" dir="ltr">{vehicle.dispatchDate}</div>
                          </div>

                          {vehiclesModalContract.type === 'workshop_outbound' ? (
                            <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] font-mono">
                              <div className="text-gray-500 text-[9px]">التكلفة / البيع:</div>
                              <div className="text-white">
                                {vehicle.workshopCost ? `${vehicle.workshopCost} ر.س` : '-'} / 
                                <span className="text-brand-red font-bold"> {vehicle.billingAmount ? `${vehicle.billingAmount} ر.س` : '-'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] font-mono">
                              <div className="text-gray-500 text-[9px]">الفاتورة:</div>
                              <div className="text-brand-red font-bold">
                                {vehicle.billingAmount ? `${vehicle.billingAmount} ر.س` : 'قيد التسعير'}
                              </div>
                            </div>
                          )}

                          {/* Status Dropdown Selector */}
                          <select
                            value={vehicle.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as ContractVehicleStatus;
                              await onUpdateVehicleInContract(vehiclesModalContract.id, vehicle.id, {
                                status: newStatus,
                                actualCompletionDate: (newStatus === 'ready' || newStatus === 'delivered') 
                                  ? new Date().toISOString().split('T')[0] 
                                  : undefined
                              });
                            }}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl font-bold text-xs border cursor-pointer focus:outline-none",
                              vehicle.status === 'in_progress' && "bg-amber-500/15 text-amber-300 border-amber-500/30",
                              vehicle.status === 'ready' && "bg-white/15 text-white border-white/30",
                              vehicle.status === 'delivered' && "bg-white/5 text-gray-400 border-white/10",
                              vehicle.status === 'dispatched' && "bg-blue-500/15 text-blue-300 border-blue-500/30",
                              vehicle.status === 'cancelled' && "bg-red-500/15 text-red-300 border-red-500/30"
                            )}
                          >
                            <option value="dispatched" className="bg-brand-dark text-white">بانتظار الإرسال</option>
                            <option value="in_progress" className="bg-brand-dark text-white">بالورشة / قيد الصيانة</option>
                            <option value="ready" className="bg-brand-dark text-white">جاهزة للتسليم ✓</option>
                            <option value="delivered" className="bg-brand-dark text-white">تم التسليم النهائي</option>
                            <option value="cancelled" className="bg-brand-dark text-white">ملغاة</option>
                          </select>

                          {/* Quick WhatsApp update for vehicle */}
                          {vehicle.driverPhone && (
                            <a
                              href={`https://wa.me/${formatSaudiPhoneForWhatsApp(vehicle.driverPhone)}?text=${encodeURIComponent(
                                `السلام عليكم، نفيدكم بخصوص سيارتكم (${vehicle.carModel} - لوحة ${vehicle.plateNumber}) المتعاقد عليها بمركز DR.FIX بأن حالتها الحالية هي: ${
                                  vehicle.status === 'ready' ? 'جاهزة للاستلام بعد إتمام الصيانة' : 
                                  vehicle.status === 'in_progress' ? 'قيد العمل والإصلاح' : 'مستلمة بالمركز'
                                }.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white/5 hover:bg-white/15 text-white rounded-xl transition-colors"
                              title="إرسال إشعار حالة السيارة بالواتساب"
                            >
                              <MessageCircle className="w-4 h-4 text-brand-red" />
                            </a>
                          )}

                          {/* Delete Vehicle */}
                          <button
                            onClick={async () => {
                              if (confirm('هل تريد حذف هذه السيارة من سجل العقد؟')) {
                                await onDeleteVehicleFromContract(vehiclesModalContract.id, vehicle.id);
                              }
                            }}
                            className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                            title="حذف السيارة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. OFFICIAL PRINTABLE CONTRACT AGREEMENT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {printContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white text-gray-900 rounded-3xl p-6 sm:p-10 shadow-2xl w-full max-w-3xl my-auto text-right print-area"
              id="official-contract-print"
            >
              {/* Top Controls (Hidden during print) */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-brand-red" />
                  <span className="font-bold text-sm text-gray-800">معاينة وطباعة الاتفاقية الرسمية</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة العقد (Print)</span>
                  </button>
                  <button
                    onClick={() => setPrintContract(null)}
                    className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Content */}
              <div className="space-y-6 text-sm text-gray-800 leading-relaxed font-sans">
                {/* Official Letterhead */}
                <div className="flex items-center justify-between border-b-2 border-red-600 pb-5">
                  <div className="text-right">
                    <h1 className="text-2xl font-black font-display tracking-tight text-gray-950">
                      مركز <span className="text-red-600">DR.FIX</span> لصيانة السيارات
                    </h1>
                    <div className="text-xs text-gray-600 mt-0.5">
                      المملكة العربية السعودية - جدة | خدمة متنقلة ومراكز متخصصة
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5" dir="ltr">
                      CR: 4030123456 | VAT: 310023456700003
                    </div>
                  </div>

                  <div className="text-left font-mono text-xs text-gray-700" dir="ltr">
                    <div className="font-bold text-red-600 text-sm">OFFICIAL CONTRACT</div>
                    <div>No: {printContract.contractNumber}</div>
                    <div>Date: {printContract.startDate}</div>
                  </div>
                </div>

                {/* Contract Title */}
                <div className="text-center py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <h2 className="text-lg font-black text-gray-900">
                    {printContract.title}
                  </h2>
                  <div className="text-xs text-gray-600 font-bold mt-1">
                    {printContract.type === 'workshop_outbound' 
                      ? 'اتفاقية إسناد وتصدير أعمال صيانة لورشة متخصصة' 
                      : 'اتفاقية صيانة وإصلاح أسطول مركبات تجاري'}
                  </div>
                </div>

                {/* Parties Introduction */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <div className="font-bold text-gray-900 mb-1">أطراف الاتفاقية:</div>
                  
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-red-600 min-w-[90px]">الطرف الأول:</span>
                    <div>
                      <span className="font-bold">مركز DR.FIX لصيانة السيارات</span>، ويمثله الإدارة العامة، هاتف المركز: 0500000000، مدينة جدة.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-red-600 min-w-[90px]">الطرف الثاني:</span>
                    <div>
                      <span className="font-bold">{printContract.partyName}</span>
                      {printContract.crNumber && <span>، سجل تجاري رقم ({printContract.crNumber})</span>}
                      {printContract.taxNumber && <span>، الرقم الضريبي ({printContract.taxNumber})</span>}
                      <span>، ويمثلها المسؤول: {printContract.contactPerson}</span>
                      <span>، هاتف: {printContract.contactPhone}</span>
                      <span>، العنوان: {printContract.city || 'جدة'} {printContract.address ? `- ${printContract.address}` : ''}.</span>
                    </div>
                  </div>
                </div>

                {/* Scope & Terms */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-gray-900 border-b pb-1 text-sm">البند الأول: موضوع ونطاق الاتفاقية</h3>
                  <p className="text-gray-700">
                    {printContract.specializationOrScope || (printContract.type === 'workshop_outbound' 
                      ? 'إسناد أعمال السمكرة والدهان والميكانيكا المتخصصة للطرف الثاني مع الالتزام بأعلى معايير الجودة.' 
                      : 'تولي الطرف الأول صيانة أسطول مركبات الطرف الثاني بموجب جداول الصيانة الدورية المعتمدة.')}
                  </p>
                </div>

                {/* Financial Clauses */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-gray-900 border-b pb-1 text-sm">البند الثاني: المقابل المالي وشروط السداد</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-500 block">نسبة الخصم / العمولة:</span>
                      <span className="font-bold text-gray-900">{printContract.commissionOrDiscount || 'حسب الاتفاق'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">شروط وفترة السداد:</span>
                      <span className="font-bold text-gray-900">
                        {printContract.paymentTermsDetails || (
                          printContract.paymentTerms === 'monthly_billing' ? 'تسوية فواتير شهرية' : 'سداد آجل 30 يوم'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-gray-900 border-b pb-1 text-sm">البند الثالث: التزامات وشروط الاتفاقية</h3>
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200">
                    {printContract.termsConditions || DEFAULT_WORKSHOP_TERMS}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-gray-900 border-b pb-1 text-sm">البند الرابع: سريان العقد وتجديده</h3>
                  <p className="text-gray-700">
                    يسري هذا العقد اعتباراً من تاريخ <span className="font-bold font-mono">{printContract.startDate}</span> وحتى 
                    تاريخ <span className="font-bold font-mono">{printContract.endDate}</span>، ويتجدد تلقائياً ما لم يُخطر أحد الطرفين الآخر كتابياً برغبته في عدم التجديد قبل 30 يوماً من انتهائه.
                  </p>
                </div>

                {/* Signatures and Stamps */}
                <div className="pt-8 border-t-2 border-gray-300 grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="space-y-12">
                    <div className="font-bold text-gray-900">توقيع وختم الطرف الأول (مركز DR.FIX):</div>
                    <div className="border-b border-gray-400 w-44 mx-auto" />
                    <div className="text-gray-500 text-[10px]">الختم الرسمي المعتمد</div>
                  </div>

                  <div className="space-y-12">
                    <div className="font-bold text-gray-900">توقيع وختم الطرف الثاني ({printContract.partyName}):</div>
                    <div className="border-b border-gray-400 w-44 mx-auto" />
                    <div className="text-gray-500 text-[10px]">المفوض بالتوقيع والختم الرسمي</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md bg-brand-dark border-brand-red/40 rounded-3xl p-6 text-center text-white"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">تأكيد حذف العقد</h3>
              <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                هل أنت متأكد من حذف عقد <b>{deleteConfirmContract.partyName}</b> (رقم: {deleteConfirmContract.contractNumber})؟
                سيتم حذف سجل المركبات المرتبطة بهذا العقد أيضاً.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirmContract(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onDeleteContract(deleteConfirmContract.id);
                      setDeleteConfirmContract(null);
                    } catch (e) {
                      alert('فشل حذف العقد');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-red-600/20"
                >
                  نعم، تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
