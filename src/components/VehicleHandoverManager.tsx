import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Video, 
  FileText, 
  User, 
  Phone, 
  Wrench, 
  ShieldCheck, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Upload, 
  Play, 
  RotateCcw, 
  MessageCircle, 
  ExternalLink, 
  Calendar, 
  Check, 
  PenTool, 
  History, 
  Eye, 
  Layers, 
  Gauge, 
  Sparkles,
  Filter,
  RefreshCw,
  AlertTriangle,
  Lock,
  Download
} from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { StaffUser, MaintenanceRecord } from '../types';
import { 
  VehicleHandoverRecord, 
  VehicleHandoverStatus, 
  PreExistingDamage, 
  VehicleFault, 
  FaultStatus, 
  HandoverMedia, 
  HandoverAuditLog, 
  HandoverAuditAction 
} from '../types/handover';
import { uploadHandoverMediaFile, UploadProgress } from '../lib/handoverStorage';
import { DigitalSignaturePad } from './common/DigitalSignaturePad';

interface VehicleHandoverManagerProps {
  currentStaffUser?: StaffUser | null;
  staffList?: StaffUser[];
  lang?: 'ar' | 'en';
  systemRecords?: MaintenanceRecord[];
}

export const VehicleHandoverManager: React.FC<VehicleHandoverManagerProps> = ({
  currentStaffUser,
  staffList = [],
  lang = 'ar',
  systemRecords = []
}) => {
  const isSuperAdmin = !currentStaffUser || currentStaffUser.role === 'super_admin';
  const hasWorkshopIntake = currentStaffUser?.permissions?.workshop_vehicle_intake === true;
  const isTechnician = currentStaffUser?.role === 'technician';
  const isWorkshopUser = isTechnician || hasWorkshopIntake;
  const isRestrictedWorkshopUser = isWorkshopUser && !isSuperAdmin && !currentStaffUser?.permissions?.canManageBookings;
  const isEn = lang === 'en';

  // Core records state
  const [handovers, setHandovers] = useState<VehicleHandoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleHandoverStatus>('all');
  const [selectedRecord, setSelectedRecord] = useState<VehicleHandoverRecord | null>(null);

  // Modals & Panels
  const [showNewIntakeModal, setShowNewIntakeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMechanicAcceptModal, setShowMechanicAcceptModal] = useState(false);
  const [showAddFaultModal, setShowAddFaultModal] = useState(false);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [showHandoverRequestModal, setShowHandoverRequestModal] = useState(false);
  const [showFinalDeliveryModal, setShowFinalDeliveryModal] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<{ url: string; type: 'image' | 'video'; caption?: string } | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<HandoverAuditLog[]>([]);

  // -------------------------------------------------------------
  // Realtime subscription to `vehicle_handovers`
  // -------------------------------------------------------------
  useEffect(() => {
    setLoading(true);
    const qHandovers = query(collection(db, 'vehicle_handovers'), orderBy('createdAt', 'desc'));
    const unsubHandovers = onSnapshot(qHandovers, (snapshot) => {
      const records: VehicleHandoverRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...docSnap.data() } as VehicleHandoverRecord);
      });
      setHandovers(records);
      setLoading(false);

      // Keep selectedRecord in sync if opened
      if (selectedRecord) {
        const updated = records.find(r => r.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    }, (error) => {
      console.error('Error fetching vehicle handovers:', error);
      setLoading(false);
    });

    // Realtime subscription to `handover_audit_logs`
    const qLogs = query(collection(db, 'handover_audit_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs: HandoverAuditLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as HandoverAuditLog);
      });
      setAuditLogs(logs);
    }, (err) => {
      console.warn('Audit logs subscription error:', err);
    });

    return () => {
      unsubHandovers();
      unsubLogs();
    };
  }, []);

  // Filter mechanics from staffList
  const activeMechanics = useMemo(() => {
    return staffList.filter(s => s.role === 'technician' || s.roleTitleAr?.includes('فني') || s.roleTitleAr?.includes('ميكانيكي'));
  }, [staffList]);

  // Record Audit Trail Helper
  const recordAudit = async (
    handoverId: string,
    handoverCode: string,
    plateNumber: string,
    action: HandoverAuditAction,
    actionTitle: string,
    details: string
  ) => {
    try {
      const logEntry: Omit<HandoverAuditLog, 'id'> = {
        handoverId,
        handoverCode,
        plateNumber,
        action,
        actionTitle,
        details,
        performedByStaffId: currentStaffUser?.id || 'admin',
        performedByStaffName: currentStaffUser?.fullName || 'الإدارة',
        performedByRole: currentStaffUser?.role || 'super_admin',
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'handover_audit_logs'), logEntry);
    } catch (e) {
      console.warn('Failed to record audit log:', e);
    }
  };

  // -------------------------------------------------------------
  // Filter records based on role and search query
  // -------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    return handovers.filter(record => {
      // 1. Role constraint: Restricted workshop staff see ONLY assigned vehicles
      if (isRestrictedWorkshopUser) {
        const matchesId = record.assignedMechanicId === currentStaffUser?.id;
        const matchesName = record.assignedMechanicName && currentStaffUser?.fullName && 
          record.assignedMechanicName.trim().toLowerCase() === currentStaffUser.fullName.trim().toLowerCase();
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'received') {
          if (record.status !== 'received') return false;
        } else if (record.status !== statusFilter) {
          return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPlate = record.plateNumber?.toLowerCase().includes(q);
        const matchCar = `${record.carMake} ${record.carModel}`.toLowerCase().includes(q);
        const matchCode = record.handoverCode?.toLowerCase().includes(q);
        const matchCustomer = (record.customerName || '').toLowerCase().includes(q) || (record.customerPhone || '').includes(q);
        const matchMechanic = (record.assignedMechanicName || '').toLowerCase().includes(q);
        return matchPlate || matchCar || matchCode || matchCustomer || matchMechanic;
      }

      return true;
    });
  }, [handovers, isRestrictedWorkshopUser, currentStaffUser?.id, currentStaffUser?.fullName, statusFilter, searchQuery]);

  // Counts for KPI tabs
  const kpiCounts = useMemo(() => {
    const list = isRestrictedWorkshopUser 
      ? handovers.filter(r => 
          r.assignedMechanicId === currentStaffUser?.id ||
          (r.assignedMechanicName && currentStaffUser?.fullName && r.assignedMechanicName.trim().toLowerCase() === currentStaffUser.fullName.trim().toLowerCase())
        )
      : handovers;

    return {
      total: list.length,
      pending_workshop: list.filter(r => r.status === 'received' && !r.mechanicAccepted).length,
      received: list.filter(r => r.status === 'received').length,
      under_inspection: list.filter(r => r.status === 'under_inspection').length,
      in_repair: list.filter(r => r.status === 'in_repair').length,
      ready_for_handover: list.filter(r => r.status === 'ready_for_handover').length,
      delivered: list.filter(r => r.status === 'delivered').length
    };
  }, [handovers, isRestrictedWorkshopUser, currentStaffUser?.id, currentStaffUser?.fullName]);

  const getStatusBadge = (status: VehicleHandoverStatus, record?: VehicleHandoverRecord) => {
    switch (status) {
      case 'received':
        if (record && !record.mechanicAccepted) {
          return {
            label: 'بانتظار استلام الورشة ⏳',
            badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
            dotClass: 'bg-amber-400',
            icon: Clock
          };
        }
        if (record && record.mechanicAccepted) {
          return {
            label: 'تم الاستلام بالورشة ✓',
            badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            dotClass: 'bg-emerald-400',
            icon: CheckCircle2
          };
        }
        return {
          label: 'بانتظار استلام الورشة',
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400',
          icon: Clock
        };
      case 'under_inspection':
        return {
          label: 'تم الاستلام بالورشة - قيد الفحص',
          badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          dotClass: 'bg-blue-400',
          icon: Gauge
        };
      case 'in_repair':
        return {
          label: 'قيد الإصلاح المباشر بالورشة',
          badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
          dotClass: 'bg-orange-400',
          icon: Wrench
        };
      case 'ready_for_handover':
        return {
          label: 'جاهزة للتسليم للإدارة',
          badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          dotClass: 'bg-purple-400',
          icon: CheckCircle2
        };
      case 'delivered':
        return {
          label: 'تم التسليم النهائي للعميل ✓',
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400',
          icon: ShieldCheck
        };
      case 'cancelled':
        return {
          label: 'ملغية',
          badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
          dotClass: 'bg-red-400',
          icon: AlertCircle
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
          dotClass: 'bg-gray-400',
          icon: Clock
        };
    }
  };

  // =========================================================================
  // SUB-COMPONENT: New Intake Modal (Admin)
  // =========================================================================
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('تويوتا');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2024');
  const [newVin, setNewVin] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newOdometer, setNewOdometer] = useState<number | ''>('');
  const [newFuelLevel, setNewFuelLevel] = useState('1/2');
  const [newIntakeNotes, setNewIntakeNotes] = useState('');
  const [newAssignedMechId, setNewAssignedMechId] = useState('');

  // Structured photo slots with instant object preview, upload progress, retry, and cloud persistence
  interface IntakePhotoSlot {
    file: File | null;
    previewUrl: string;
    savedUrl: string;
    status: 'idle' | 'uploading' | 'saved' | 'error';
    progress: number;
    errorMessage?: string;
  }

  const initialPhotoSlots: Record<'odometer' | 'front' | 'rear' | 'left' | 'right', IntakePhotoSlot> = {
    odometer: { file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 },
    front: { file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 },
    rear: { file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 },
    left: { file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 },
    right: { file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 }
  };

  const [intakePhotos, setIntakePhotos] = useState(initialPhotoSlots);

  const [damageSlot, setDamageSlot] = useState<IntakePhotoSlot>({
    file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0
  });

  // Pre-existing damages list
  const [damagesList, setDamagesList] = useState<PreExistingDamage[]>([]);
  const [damageLoc, setDamageLoc] = useState('');
  const [damageDesc, setDamageDesc] = useState('');

  // Intake Digital Signature
  const [intakeSignature, setIntakeSignature] = useState<string>('');
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);

  // Quick Select from existing system records / bookings (No redundant data entry)
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState<string>('');

  const matchingBookings = useMemo(() => {
    if (!systemRecords || systemRecords.length === 0) return [];
    const q = bookingSearchQuery.trim().toLowerCase();
    if (!q) return systemRecords.slice(0, 6);
    return systemRecords.filter(r => {
      const matchName = (r.customerName || '').toLowerCase().includes(q);
      const matchPhone = (r.customerPhone || '').includes(q);
      const matchCar = (r.carModel || '').toLowerCase().includes(q);
      const matchPlate = (r.plateNumber || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchCar || matchPlate;
    }).slice(0, 8);
  }, [systemRecords, bookingSearchQuery]);

  const handleSelectBooking = (rec: MaintenanceRecord) => {
    setSelectedBookingId(rec.id);
    if (rec.plateNumber) setNewPlate(rec.plateNumber);

    const car = (rec.carModel || '').trim();
    const parts = car.split(/\s+/);
    if (parts.length > 1) {
      setNewMake(parts[0]);
      setNewModel(parts.slice(1).join(' '));
    } else if (parts.length === 1 && parts[0]) {
      setNewModel(parts[0]);
    }

    if (rec.customerName) setNewCustName(rec.customerName);
    if (rec.customerPhone) setNewCustPhone(rec.customerPhone);

    if (rec.assignedStaffId) {
      const mech = activeMechanics.find(m => m.id === rec.assignedStaffId);
      if (mech) setNewAssignedMechId(mech.id);
    }

    const preNotes = [
      rec.serviceType ? `الخدمة المطلوبة: ${rec.serviceType}` : '',
      rec.notes ? `ملاحظات الحجز: ${rec.notes}` : ''
    ].filter(Boolean).join(' • ');
    if (preNotes) setNewIntakeNotes(preNotes);

    setBookingSearchQuery('');
  };

  const handleClearSelectedBooking = () => {
    setSelectedBookingId('');
  };

  // Immediate preview + robust cloud upload with retry
  const uploadSinglePhoto = async (file: File, key: 'odometer' | 'front' | 'rear' | 'left' | 'right' | 'damage') => {
    // 1. Instant local object URL preview (0ms latency for mobile camera)
    const localPreview = URL.createObjectURL(file);
    if (key === 'damage') {
      setDamageSlot({
        file,
        previewUrl: localPreview,
        savedUrl: '',
        status: 'uploading',
        progress: 10
      });
    } else {
      setIntakePhotos(prev => ({
        ...prev,
        [key]: {
          file,
          previewUrl: localPreview,
          savedUrl: '',
          status: 'uploading',
          progress: 10
        }
      }));
    }

    // 2. Perform resilient Firebase Storage upload
    try {
      const code = newPlate.trim() ? `VH-${newPlate.replace(/\s+/g, '_')}` : `VH-${Date.now().toString().slice(-4)}`;
      const res = await uploadHandoverMediaFile(file, 'intake', code, (prog) => {
        if (key === 'damage') {
          setDamageSlot(prev => ({ ...prev, progress: Math.max(10, prog.progressPercent) }));
        } else {
          setIntakePhotos(prev => ({
            ...prev,
            [key]: { ...prev[key], progress: Math.max(10, prog.progressPercent) }
          }));
        }
      });

      if (key === 'damage') {
        setDamageSlot(prev => ({
          ...prev,
          savedUrl: res.downloadUrl,
          status: 'saved',
          progress: 100,
          errorMessage: undefined
        }));
      } else {
        setIntakePhotos(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            savedUrl: res.downloadUrl,
            status: 'saved',
            progress: 100,
            errorMessage: undefined
          }
        }));
      }
    } catch (err: any) {
      console.error(`Failed uploading ${key}:`, err);
      if (key === 'damage') {
        setDamageSlot(prev => ({
          ...prev,
          status: 'error',
          errorMessage: err?.message || 'فشل رفع الصورة للسحابة'
        }));
      } else {
        setIntakePhotos(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            status: 'error',
            errorMessage: err?.message || 'فشل رفع الصورة للسحابة'
          }
        }));
      }
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'odometer' | 'front' | 'rear' | 'left' | 'right' | 'damage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadSinglePhoto(file, key);
  };

  const handleRetryPhotoUpload = (key: 'odometer' | 'front' | 'rear' | 'left' | 'right' | 'damage') => {
    const targetFile = key === 'damage' ? damageSlot.file : intakePhotos[key].file;
    if (targetFile) {
      uploadSinglePhoto(targetFile, key);
    }
  };

  const handleAddDamageItem = () => {
    if (!damageLoc.trim() || !damageDesc.trim()) {
      alert('يرجى تحديد مكان ووصف الضرر المسبق');
      return;
    }
    const newDamage: PreExistingDamage = {
      id: `dmg_${Date.now()}`,
      location: damageLoc.trim(),
      description: damageDesc.trim(),
      photoUrl: damageSlot.savedUrl || damageSlot.previewUrl || ''
    };
    setDamagesList(prev => [...prev, newDamage]);
    setDamageLoc('');
    setDamageDesc('');
    setDamageSlot({ file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 });
  };

  const handleCreateNewIntake = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Field Validations
    if (!newPlate.trim()) return alert('يرجى كتابة رقم اللوحة');
    if (!newMake.trim() || !newModel.trim()) return alert('يرجى تحديد صانع وموديل السيارة');
    if (newOdometer === '' || Number(newOdometer) < 0) return alert('يرجى إدخال قراءة عداد المسافة بالكيلومترات');

    // 2. Strict cloud persistence validation for all 5 mandatory photos
    const mandatoryKeys: ('odometer' | 'front' | 'rear' | 'left' | 'right')[] = ['odometer', 'front', 'rear', 'left', 'right'];
    const labelsMap: Record<string, string> = {
      odometer: 'صورة عداد المسافة',
      front: 'صورة البودي من الأمام',
      rear: 'صورة البودي من الخلف',
      left: 'صورة الجانب الأيسر',
      right: 'صورة الجانب الأيمن'
    };

    for (const k of mandatoryKeys) {
      const slot = intakePhotos[k];
      if (!slot.savedUrl || slot.status !== 'saved') {
        if (slot.status === 'uploading') {
          alert(`يرجى الانتظار، ${labelsMap[k]} قيد الرفع إلى السحابة حالياً (${slot.progress}%)...`);
        } else if (slot.status === 'error') {
          alert(`تعذر رفع ${labelsMap[k]} إلى السحابة. يرجى الضغط على زر "إعادة المحاولة 🔄" بجوار الصورة لحفظها.`);
        } else {
          alert(`يرجى التقاط أو رفع ${labelsMap[k]} (إلزامية لتوثيق استلام السيارة).`);
        }
        return;
      }
    }

    if (!newAssignedMechId) {
      return alert('يرجى اختيار وتعيين الميكانيكي المسؤول عن استلام وفحص السيارة');
    }

    setIntakeSubmitting(true);
    try {
      const handoverCode = `VH-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedMech = activeMechanics.find(m => m.id === newAssignedMechId);

      const newRecord: Omit<VehicleHandoverRecord, 'id'> = {
        handoverCode,
        bookingId: selectedBookingId || undefined,
        plateNumber: newPlate.trim(),
        carMake: newMake.trim(),
        carModel: newModel.trim(),
        carYear: newYear.trim() || '2024',
        vin: newVin.trim() || undefined,
        customerName: newCustName.trim() || 'عميل كريم',
        customerPhone: newCustPhone.trim() || '',
        status: 'received',
        intake: {
          odometer: Number(newOdometer),
          odometerPhotoUrl: intakePhotos.odometer.savedUrl,
          frontPhotoUrl: intakePhotos.front.savedUrl,
          rearPhotoUrl: intakePhotos.rear.savedUrl,
          leftSidePhotoUrl: intakePhotos.left.savedUrl,
          rightSidePhotoUrl: intakePhotos.right.savedUrl,
          fuelLevel: newFuelLevel,
          preExistingDamages: damagesList,
          notes: newIntakeNotes.trim(),
          date: new Date().toISOString(),
          staffId: currentStaffUser?.id || 'admin',
          staffName: currentStaffUser?.fullName || 'مسؤول الاستقبال',
          signatureUrl: intakeSignature || undefined,
          signatureTimestamp: intakeSignature ? new Date().toISOString() : undefined
        },
        assignedMechanicId: selectedMech?.id || newAssignedMechId,
        assignedMechanicName: selectedMech?.fullName || 'فني صيانة',
        assignedMechanicPhone: selectedMech?.phone || '',
        assignedAt: new Date().toISOString(),
        mechanicAccepted: false,
        faults: [],
        repairMedia: [
          {
            id: `media_${Date.now()}_1`,
            url: intakePhotos.odometer.savedUrl,
            mediaType: 'image',
            caption: `عداد المسافة عند الاستلام (${newOdometer} كم)`,
            stage: 'intake',
            uploadedByStaffId: currentStaffUser?.id || 'admin',
            uploadedByStaffName: currentStaffUser?.fullName || 'الإدارة',
            uploadedByRole: currentStaffUser?.role || 'admin',
            uploadedAt: new Date().toISOString()
          },
          {
            id: `media_${Date.now()}_2`,
            url: intakePhotos.front.savedUrl,
            mediaType: 'image',
            caption: 'البودي من الأمام (الاستلام الأولي)',
            stage: 'intake',
            uploadedByStaffId: currentStaffUser?.id || 'admin',
            uploadedByStaffName: currentStaffUser?.fullName || 'الإدارة',
            uploadedByRole: currentStaffUser?.role || 'admin',
            uploadedAt: new Date().toISOString()
          },
          {
            id: `media_${Date.now()}_3`,
            url: intakePhotos.rear.savedUrl,
            mediaType: 'image',
            caption: 'البودي من الخلف (الاستلام الأولي)',
            stage: 'intake',
            uploadedByStaffId: currentStaffUser?.id || 'admin',
            uploadedByStaffName: currentStaffUser?.fullName || 'الإدارة',
            uploadedByRole: currentStaffUser?.role || 'admin',
            uploadedAt: new Date().toISOString()
          },
          {
            id: `media_${Date.now()}_4`,
            url: intakePhotos.left.savedUrl,
            mediaType: 'image',
            caption: 'الجانب الأيسر (الاستلام الأولي)',
            stage: 'intake',
            uploadedByStaffId: currentStaffUser?.id || 'admin',
            uploadedByStaffName: currentStaffUser?.fullName || 'الإدارة',
            uploadedByRole: currentStaffUser?.role || 'admin',
            uploadedAt: new Date().toISOString()
          },
          {
            id: `media_${Date.now()}_5`,
            url: intakePhotos.right.savedUrl,
            mediaType: 'image',
            caption: 'الجانب الأيمن (الاستلام الأولي)',
            stage: 'intake',
            uploadedByStaffId: currentStaffUser?.id || 'admin',
            uploadedByStaffName: currentStaffUser?.fullName || 'الإدارة',
            uploadedByRole: currentStaffUser?.role || 'admin',
            uploadedAt: new Date().toISOString()
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'vehicle_handovers'), newRecord);

      // Audit logs
      await recordAudit(
        docRef.id,
        handoverCode,
        newPlate.trim(),
        'created',
        'إنشاء وتوثيق استلام السيارة وتحويلها للورشة',
        `تم تسليم السيارة ${newMake} ${newModel} (لوحة: ${newPlate.trim()}) للورشة بعد توثيق العداد ${newOdometer} كم والصور الخمس وتعيين الميكانيكي ${selectedMech?.fullName || newAssignedMechId}`
      );

      if (intakeSignature) {
        await recordAudit(
          docRef.id,
          handoverCode,
          newPlate.trim(),
          'intake_signed',
          'توقيع الاستلام الأولي',
          `تم توقيع استلام السيارة من قبل الموظف ${currentStaffUser?.fullName || 'الإدارة'}`
        );
      }

      // Reset Form & Close
      setShowNewIntakeModal(false);
      setNewPlate('');
      setNewModel('');
      setNewOdometer('');
      setIntakePhotos(initialPhotoSlots);
      setDamageSlot({ file: null, previewUrl: '', savedUrl: '', status: 'idle', progress: 0 });
      setDamagesList([]);
      setIntakeSignature('');
      setSelectedBookingId('');
      alert('تم إنشاء وتوثيق استلام السيارة وتحويلها للورشة بنجاح!');
    } catch (err: any) {
      console.error('Error creating intake record:', err);
      alert(`فشل إنشاء السجل: ${err?.message}`);
    } finally {
      setIntakeSubmitting(false);
    }
  };

  // =========================================================================
  // SUB-ACTION: Mechanic Confirms Receipt with Digital Signature
  // =========================================================================
  const [mechanicSignature, setMechanicSignature] = useState('');
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [acceptingRecord, setAcceptingRecord] = useState(false);

  const handleMechanicAcceptance = async () => {
    if (!selectedRecord) return;
    if (!mechanicSignature) {
      alert('يرجى التوقيع داخل المربع لتأكيد استلام السيارة عهدة ومسؤولية الفحص والإصلاح');
      return;
    }

    setAcceptingRecord(true);
    try {
      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      const updateData = {
        status: 'under_inspection' as VehicleHandoverStatus,
        mechanicAccepted: true,
        mechanicAcceptanceSignatureUrl: mechanicSignature,
        mechanicAcceptanceTimestamp: new Date().toISOString(),
        mechanicAcceptedByStaffId: currentStaffUser?.id || 'workshop_staff',
        mechanicAcceptedByStaffName: currentStaffUser?.fullName || selectedRecord.assignedMechanicName || 'الميكانيكي المسؤول',
        mechanicAcceptanceNotes: mechanicNotes.trim() || undefined,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Record immutable audit
      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'mechanic_accepted',
        'تأكيد استلام الميكانيكي للسيارة بالتوقيع',
        `قام الميكانيكي ${currentStaffUser?.fullName || 'المسؤول'} (معرف: ${currentStaffUser?.id}) بمراجعة بيانات الاستلام والعداد وتأكيد الاستلام بتوقيع إلكتروني.`
      );

      setShowMechanicAcceptModal(false);
      setMechanicSignature('');
      setMechanicNotes('');
      alert('تم تأكيد استلام السيارة بنجاح وبدء مرحلة الفحص وتسجيل الأعطال!');
    } catch (err: any) {
      alert(`فشل تأكيد الاستلام: ${err?.message}`);
    } finally {
      setAcceptingRecord(false);
    }
  };

  // =========================================================================
  // SUB-ACTION: Add Fault & Diagnostics (Mechanic / Admin)
  // =========================================================================
  const [faultTitle, setFaultTitle] = useState('');
  const [faultDesc, setFaultDesc] = useState('');
  const [faultDiagnosis, setFaultDiagnosis] = useState('');
  const [faultStatus, setFaultStatus] = useState<FaultStatus>('new');
  const [faultIsDraft, setFaultIsDraft] = useState(false);
  const [faultMediaList, setFaultMediaList] = useState<{ url: string; isVideo: boolean; caption?: string }[]>([]);
  const [uploadingFaultMedia, setUploadingFaultMedia] = useState(false);
  const [savingFault, setSavingFault] = useState(false);

  const handleUploadFaultMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;

    setUploadingFaultMedia(true);
    try {
      const res = await uploadHandoverMediaFile(file, 'faults', selectedRecord.handoverCode);
      setFaultMediaList(prev => [...prev, { url: res.downloadUrl, isVideo: res.isVideo }]);
    } catch (err: any) {
      alert(`فشل رفع وسائط العطل: ${err?.message}`);
    } finally {
      setUploadingFaultMedia(false);
    }
  };

  const handleSaveFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!faultTitle.trim() || !faultDesc.trim()) {
      alert('يرجى إدخال عنوان ووصف العطل');
      return;
    }

    setSavingFault(true);
    try {
      const newFault: VehicleFault = {
        id: `fault_${Date.now()}`,
        title: faultTitle.trim(),
        description: faultDesc.trim(),
        diagnosisNotes: faultDiagnosis.trim() || undefined,
        status: faultStatus,
        isDraft: faultIsDraft,
        media: faultMediaList.map(m => ({
          id: `fmed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: m.url,
          mediaType: m.isVideo ? 'video' : 'image',
          uploadedAt: new Date().toISOString(),
          caption: m.caption
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reportedByMechanicId: currentStaffUser?.id || 'admin',
        reportedByMechanicName: currentStaffUser?.fullName || 'الميكانيكي المسؤول'
      };

      const updatedFaults = [...(selectedRecord.faults || []), newFault];
      
      // If adding an in_repair or approved fault, ensure status reflects repair
      let nextStatus = selectedRecord.status;
      if (selectedRecord.status === 'under_inspection' && faultStatus === 'in_repair') {
        nextStatus = 'in_repair';
      }

      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      await updateDoc(docRef, {
        faults: updatedFaults,
        status: nextStatus,
        updatedAt: serverTimestamp()
      });

      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'fault_added',
        `تسجيل عطل: ${newFault.title}${newFault.isDraft ? ' (مسودة)' : ''}`,
        `تم تسجيل العطل بواسطة ${newFault.reportedByMechanicName}. الحالة: ${newFault.status}. الوصف: ${newFault.description}`
      );

      setShowAddFaultModal(false);
      setFaultTitle('');
      setFaultDesc('');
      setFaultDiagnosis('');
      setFaultMediaList([]);
      setFaultIsDraft(false);
      setFaultStatus('new');
    } catch (err: any) {
      alert(`فشل حفظ العطل: ${err?.message}`);
    } finally {
      setSavingFault(false);
    }
  };

  const handleUpdateFaultStatus = async (faultId: string, newStatus: FaultStatus, outcomeNotes?: string) => {
    if (!selectedRecord) return;
    try {
      const updatedFaults = (selectedRecord.faults || []).map(f => {
        if (f.id === faultId) {
          return {
            ...f,
            status: newStatus,
            isDraft: false,
            repairOutcomeNotes: outcomeNotes !== undefined ? outcomeNotes : f.repairOutcomeNotes,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      });

      // Update vehicle status to in_repair if any fault is in repair
      let targetCarStatus = selectedRecord.status;
      if (newStatus === 'in_repair' && selectedRecord.status === 'under_inspection') {
        targetCarStatus = 'in_repair';
      }

      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      await updateDoc(docRef, {
        faults: updatedFaults,
        status: targetCarStatus,
        updatedAt: serverTimestamp()
      });

      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'fault_updated',
        `تحديث حالة العطل إلى (${newStatus})`,
        `قام ${currentStaffUser?.fullName || 'المستخدم'} بتحديث حالة العطل`
      );
    } catch (e: any) {
      alert(`فشل تحديث حالة العطل: ${e?.message}`);
    }
  };

  // =========================================================================
  // SUB-ACTION: Upload Media to Flexible Gallery (Images & Videos)
  // =========================================================================
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaStage, setMediaStage] = useState<'inspection' | 'during_repair' | 'final'>('during_repair');
  const [uploadProgressState, setUploadProgressState] = useState<UploadProgress | null>(null);
  const [uploadingGeneralMedia, setUploadingGeneralMedia] = useState(false);

  const handleUploadGeneralMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;

    setUploadingGeneralMedia(true);
    try {
      const res = await uploadHandoverMediaFile(
        file, 
        'repair', 
        selectedRecord.handoverCode,
        (progress) => setUploadProgressState(progress)
      );

      const newMedia: HandoverMedia = {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: res.downloadUrl,
        storagePath: res.storagePath,
        mediaType: res.isVideo ? 'video' : 'image',
        caption: mediaCaption.trim() || (res.isVideo ? 'فيديو توثيق الأعمال' : 'صورة توثيق الأعمال'),
        stage: mediaStage,
        uploadedByStaffId: currentStaffUser?.id || 'admin',
        uploadedByStaffName: currentStaffUser?.fullName || 'الميكانيكي',
        uploadedByRole: currentStaffUser?.role || 'technician',
        uploadedAt: new Date().toISOString(),
        fileSizeBytes: file.size
      };

      const updatedMediaList = [...(selectedRecord.repairMedia || []), newMedia];
      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      await updateDoc(docRef, {
        repairMedia: updatedMediaList,
        status: selectedRecord.status === 'under_inspection' ? 'in_repair' : selectedRecord.status,
        updatedAt: serverTimestamp()
      });

      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'media_uploaded',
        `رفع ملف وسائط جديد (${newMedia.mediaType === 'video' ? 'فيديو' : 'صورة'})`,
        `تم رفع الوسائط بواسطة ${newMedia.uploadedByStaffName} في مرحلة ${newMedia.stage}. الوصف: ${newMedia.caption || 'بدون وصف'}`
      );

      setShowMediaUploadModal(false);
      setMediaCaption('');
      setUploadProgressState(null);
    } catch (err: any) {
      alert(`فشل رفع الملف: ${err?.message}`);
    } finally {
      setUploadingGeneralMedia(false);
    }
  };

  // =========================================================================
  // SUB-ACTION: Handover Request (Mechanic -> Admin)
  // =========================================================================
  const [handoverSummaryNotes, setHandoverSummaryNotes] = useState('');
  const [requestingHandover, setRequestingHandover] = useState(false);

  const handleRequestHandover = async () => {
    if (!selectedRecord) return;

    // Check if there are un-repaired active faults
    const unresolvedFaults = (selectedRecord.faults || []).filter(f => f.status !== 'repaired' && !f.isDraft);
    if (unresolvedFaults.length > 0) {
      const confirmContinue = window.confirm(
        `تنبيه: يوجد (${unresolvedFaults.length}) عطل لم يتم تعيين حالته إلى "تم الإصلاح". هل أنت متأكد من رغبتك في إرسال طلب التسليم للإدارة الآن؟`
      );
      if (!confirmContinue) return;
    }

    setRequestingHandover(true);
    try {
      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      await updateDoc(docRef, {
        status: 'ready_for_handover' as VehicleHandoverStatus,
        handoverRequested: true,
        handoverRequestedAt: new Date().toISOString(),
        handoverRequestNotes: handoverSummaryNotes.trim() || 'اكتملت أعمال الصيانة والإصلاح والسيارة جاهزة للفحص النهائي والتسليم.',
        updatedAt: serverTimestamp()
      });

      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'handover_requested',
        'طلب تسليم السيارة من الميكانيكي للإدارة',
        `طلب الميكانيكي ${currentStaffUser?.fullName} تسليم السيارة. الملاحظات: ${handoverSummaryNotes || 'اكتملت الأعمال'}`
      );

      setShowHandoverRequestModal(false);
      setHandoverSummaryNotes('');
      alert('تم إرسال طلب تسليم السيارة بنجاح إلى الإدارة للفحص النهائي والاعتماد!');
    } catch (err: any) {
      alert(`فشل إرسال طلب التسليم: ${err?.message}`);
    } finally {
      setRequestingHandover(false);
    }
  };

  // =========================================================================
  // SUB-ACTION: Final Delivery & Closure (Admin)
  // =========================================================================
  const [finalOdometerVal, setFinalOdometerVal] = useState<number | ''>('');
  const [finalOdoPhoto, setFinalOdoPhoto] = useState('');
  const [finalBodyPhotoList, setFinalBodyPhotoList] = useState<string[]>([]);
  const [finalAdminNotes, setFinalAdminNotes] = useState('');
  const [finalAdminSignature, setFinalAdminSignature] = useState('');
  const [completingFinalDelivery, setCompletingFinalDelivery] = useState(false);
  const [uploadingFinalPhoto, setUploadingFinalPhoto] = useState(false);

  const handleUploadFinalPhoto = async (e: React.ChangeEvent<HTMLInputElement>, isOdometer: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRecord) return;

    setUploadingFinalPhoto(true);
    try {
      const res = await uploadHandoverMediaFile(file, 'final', selectedRecord.handoverCode);
      if (isOdometer) {
        setFinalOdoPhoto(res.downloadUrl);
      } else {
        setFinalBodyPhotoList(prev => [...prev, res.downloadUrl]);
      }
    } catch (err: any) {
      alert(`فشل رفع الصورة: ${err?.message}`);
    } finally {
      setUploadingFinalPhoto(false);
    }
  };

  const handleCompleteFinalDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (finalOdometerVal === '' || Number(finalOdometerVal) < (selectedRecord.intake?.odometer || 0)) {
      return alert('قراءة العداد النهائية يجب أن تكون مساوية أو أكبر من قراءة الاستلام');
    }
    if (!finalAdminSignature) {
      return alert('توقيع الإدارة الإلكتروني إلزامي لاعتماد التسليم النهائي وإغلاق السجل');
    }

    setCompletingFinalDelivery(true);
    try {
      const docRef = doc(db, 'vehicle_handovers', selectedRecord.id);
      const deliveryData = {
        status: 'delivered' as VehicleHandoverStatus,
        finalDelivery: {
          finalOdometer: Number(finalOdometerVal),
          finalOdometerPhotoUrl: finalOdoPhoto || undefined,
          finalBodyPhotos: finalBodyPhotoList,
          notes: finalAdminNotes.trim() || undefined,
          adminSignatureUrl: finalAdminSignature,
          adminSignatureTimestamp: new Date().toISOString(),
          adminStaffId: currentStaffUser?.id || 'admin',
          adminStaffName: currentStaffUser?.fullName || 'الإدارة',
          deliveredAt: new Date().toISOString()
        },
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, deliveryData);

      await recordAudit(
        selectedRecord.id,
        selectedRecord.handoverCode,
        selectedRecord.plateNumber,
        'final_delivered',
        'اعتماد التسليم النهائي وإغلاق السجل بالتوقيع',
        `تم الفحص النهائي والاعتماد بواسطة ${currentStaffUser?.fullName || 'الإدارة'} بقراءة عداد نهائية ${finalOdometerVal} كم وإغلاق السجل بشكل رسمي.`
      );

      setShowFinalDeliveryModal(false);
      setFinalOdometerVal('');
      setFinalOdoPhoto('');
      setFinalBodyPhotoList([]);
      setFinalAdminSignature('');
      alert('تم اعتماد تسليم السيارة وإغلاق سجل الصيانة بنجاح وبشكل نهائي!');
    } catch (err: any) {
      alert(`فشل اعتماد التسليم: ${err?.message}`);
    } finally {
      setCompletingFinalDelivery(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 select-none" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Header Banner & Title                                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-neutral-900 via-black to-neutral-950 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F52B35]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F52B35]/15 border border-[#F52B35]/30 text-[#FF414A] text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام استلام وتسليم وتتبع صيانة السيارات (Vehicle Handover & Repair Tracking)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>استلام وتسليم السيارات والتوثيق الميداني</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
            {isTechnician ? (
              <span className="text-emerald-400 font-bold">
                👨‍🔧 لوحة الميكانيكي: تظهر لك فقط السيارات المسندة إليك للمعاينة وتأكيد الاستلام وتسجيل الأعطال ورفع الصور والفيديوهات وطلب التسليم.
              </span>
            ) : (
              'توثيق استلام المركبات، العدادات، صور البودي، إسناد الميكانيكي، التواقيع الإلكترونية، تتبع الأعطال، واعتماد التسليم النهائي.'
            )}
          </p>
        </div>

        {/* Action Button: Only admin / non-technician can create new intakes */}
        {!isTechnician && (
          <div className="relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewIntakeModal(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F52B35] to-[#B3121B] hover:from-[#FF414A] hover:to-[#C91620] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F52B35]/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>استلام سيارة جديدة (Intake)</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Top KPI Status Chips                                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'all', label: 'كافة السيارات', count: kpiCounts.total, color: 'text-white', border: 'border-white/10' },
          { key: 'received', label: 'مستلمة (انتظار الفني)', count: kpiCounts.received, color: 'text-amber-400', border: 'border-amber-500/30' },
          { key: 'under_inspection', label: 'قيد الفحص والتشخيص', count: kpiCounts.under_inspection, color: 'text-blue-400', border: 'border-blue-500/30' },
          { key: 'in_repair', label: 'قيد الإصلاح المباشر', count: kpiCounts.in_repair, color: 'text-orange-400', border: 'border-orange-500/30' },
          { key: 'ready_for_handover', label: 'جاهزة للتسليم', count: kpiCounts.ready_for_handover, color: 'text-purple-400', border: 'border-purple-500/30' },
          { key: 'delivered', label: 'مسلّمة ومعتمدة', count: kpiCounts.delivered, color: 'text-emerald-400', border: 'border-emerald-500/30' }
        ].map(item => {
          const isSelected = statusFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key as any)}
              className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-white/10 border-[#F52B35] ring-2 ring-[#F52B35]/40 shadow-lg' 
                  : 'bg-black/40 hover:bg-white/5 border-white/10'
              }`}
            >
              <span className="text-[11px] font-bold text-gray-400 block mb-1">{item.label}</span>
              <span className={`text-2xl font-black font-mono ${item.color}`}>{item.count}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. Search and Action Bar                                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 p-3 rounded-2xl border border-white/10">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم اللوحة، الموديل، الميكانيكي، أو اسم العميل..."
            className="w-full bg-black/60 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white outline-none focus:border-[#F52B35]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-gray-400 font-bold">
            عدد النتائج: <span className="text-white font-mono">{filteredRecords.length}</span>
          </span>
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="text-[11px] text-[#F52B35] hover:underline font-bold"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Records List / Grid                                                    */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="text-center py-16 bg-black/30 rounded-3xl border border-white/10">
          <div className="inline-block w-8 h-8 border-2 border-[#F52B35] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-gray-400">جاري تحميل سجلات استلام وتسليم السيارات...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-black/30 rounded-3xl border border-white/10 p-6 space-y-3">
          <Car className="w-12 h-12 text-gray-600 mx-auto opacity-50" />
          <h4 className="text-sm font-bold text-white">لا توجد سيارات مطابقة</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {isTechnician 
              ? 'لا توجد سيارات مسندة إليك حالياً في هذا التصنيف.'
              : 'لم يتم العثور على أي سيارة مستلمة. يمكنك الضغط على "استلام سيارة جديدة" لتوثيق أول عملية استلام.'}
          </p>
          {!isTechnician && (
            <button
              type="button"
              onClick={() => setShowNewIntakeModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#F52B35] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل استلام سيارة الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const stBadge = getStatusBadge(record.status, record);
            const faultsCount = record.faults?.length || 0;
            const repairedCount = record.faults?.filter(f => f.status === 'repaired').length || 0;
            const mediaCount = record.repairMedia?.length || 0;

            return (
              <div
                key={record.id}
                onClick={() => {
                  setSelectedRecord(record);
                  setShowDetailModal(true);
                }}
                className="p-5 rounded-3xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-[#F52B35]/40 transition-all cursor-pointer space-y-4 shadow-lg group relative flex flex-col justify-between"
              >
                {/* Card Top: Code & Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#F52B35] text-white text-[10px] font-black uppercase tracking-wider font-mono">
                          {record.handoverCode}
                        </span>
                        <span className="text-xs font-mono font-bold text-gray-300">
                          لوحة: {record.plateNumber}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-white mt-1 group-hover:text-[#FF414A] transition-colors">
                        {record.carMake} {record.carModel} <span className="text-xs text-gray-400">({record.carYear})</span>
                      </h4>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 ${stBadge.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stBadge.dotClass}`} />
                      <span>{stBadge.label}</span>
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-3">
                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">عداد الاستلام:</span>
                      <span className="font-bold text-gray-200 font-mono flex items-center gap-1 mt-0.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" />
                        <span>{record.intake?.odometer?.toLocaleString() || 0} كم</span>
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">الميكانيكي المسؤول:</span>
                      <span className="font-bold text-gray-200 truncate block mt-0.5 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-[#F52B35]" />
                        <span>{record.assignedMechanicName || 'غير مسند'}</span>
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">العميل:</span>
                      <span className="font-bold text-gray-200 truncate block mt-0.5">
                        {record.customerName}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">الأعطال المسجلة:</span>
                      <span className="font-bold text-gray-200 font-mono mt-0.5 block">
                        {faultsCount > 0 ? `${repairedCount} / ${faultsCount} مُصلح` : 'لا يوجد أعطال'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Progress & CTA */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Camera className="w-3.5 h-3.5 text-gray-400" />
                    <span>{mediaCount} وسائط</span>
                    {record.intake?.preExistingDamages?.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                        {record.intake.preExistingDamages.length} خدوش مسبقة
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-[#F52B35] group-hover:underline flex items-center gap-1">
                    <span>فتح السجل الكامل</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: Single-Page Comprehensive Vehicle Detail View                    */}
      {/* ========================================================================= */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-4xl bg-[#0E1117] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0C10] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F52B35] to-[#B3121B] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#F52B35]/25">
                  <Car className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#F52B35] text-white text-[10px] font-black uppercase font-mono">
                      {selectedRecord.handoverCode}
                    </span>
                    <h3 className="font-display font-black text-base sm:text-lg text-white truncate">
                      {selectedRecord.carMake} {selectedRecord.carModel} ({selectedRecord.carYear})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>لوحة: <strong className="text-white font-mono">{selectedRecord.plateNumber}</strong></span>
                    <span>•</span>
                    <span>العميل: <strong className="text-gray-200">{selectedRecord.customerName}</strong> ({selectedRecord.customerPhone})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Comprehensive View */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">

              {/* Status & Immediate Action Banner */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full border text-xs font-bold inline-flex items-center gap-2 ${getStatusBadge(selectedRecord.status, selectedRecord).badgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusBadge(selectedRecord.status, selectedRecord).dotClass}`} />
                    <span>الحالة الحالية: {getStatusBadge(selectedRecord.status, selectedRecord).label}</span>
                  </span>
                  {selectedRecord.mechanicAccepted ? (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تم استلام وتوقيع الورشة</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>بانتظار توقيع الورشة</span>
                    </span>
                  )}
                </div>

                {/* Mechanic / Workshop Direct Action: Confirm Receipt */}
                {(isWorkshopUser || isSuperAdmin) && selectedRecord.status === 'received' && !selectedRecord.mechanicAccepted && (
                  <button
                    type="button"
                    onClick={() => setShowMechanicAcceptModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 animate-pulse"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>تأكيد استلام السيارة (ورشة) والتوقيع إلكترونياً ✍️</span>
                  </button>
                )}

                {/* Mechanic / Workshop Direct Action: Request Handover */}
                {(isWorkshopUser || isSuperAdmin) && (selectedRecord.status === 'under_inspection' || selectedRecord.status === 'in_repair') && (
                  <button
                    type="button"
                    onClick={() => setShowHandoverRequestModal(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>طلب تسليم السيارة للإدارة ↗️</span>
                  </button>
                )}

                {/* Admin Direct Action: Final Handover & Closure */}
                {!isRestrictedWorkshopUser && !isTechnician && selectedRecord.status === 'ready_for_handover' && (
                  <button
                    type="button"
                    onClick={() => setShowFinalDeliveryModal(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>الفحص النهائي واعتماد التسليم وإغلاق السجل</span>
                  </button>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION A: Initial Intake Documentation (الإدارة)              */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span>1. توثيق الاستلام الأولي (المسافة، البودي، والخدوش)</span>
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    وثّقه: <strong className="text-gray-200">{selectedRecord.intake?.staffName}</strong> • {new Date(selectedRecord.intake?.date || '').toLocaleString('ar-SA')}
                  </span>
                </div>

                {/* Workshop Intake Receipt Status Card */}
                {selectedRecord.mechanicAccepted ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block text-xs">تم توقيع وتأكيد استلام السيارة بالورشة ✓</span>
                        <span className="text-[11px] text-gray-300">
                          المستلم: <strong>{selectedRecord.assignedMechanicName || 'الميكانيكي المسؤول'}</strong> • {selectedRecord.mechanicAcceptanceTimestamp ? new Date(selectedRecord.mechanicAcceptanceTimestamp).toLocaleString('ar-SA') : ''}
                        </span>
                      </div>
                    </div>
                    {selectedRecord.mechanicAcceptanceSignatureUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewMediaUrl({ url: selectedRecord.mechanicAcceptanceSignatureUrl!, type: 'image', caption: 'توقيع استلام الورشة الإلكتروني' })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        عرض توقيع الورشة
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-300 block text-xs">السيارة مسلّمة للورشة وبانتظار توقيع الاستلام</span>
                        <span className="text-[11px] text-gray-400">
                          المسؤول: <strong>{selectedRecord.assignedMechanicName || 'غير محدد'}</strong> (لم يوقع الاستلام بعد)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-gray-400 block">عداد المسافة:</span>
                    <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">
                      {selectedRecord.intake?.odometer?.toLocaleString()} كم
                    </span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-gray-400 block">مستوى الوقود:</span>
                    <span className="text-xs font-bold text-gray-200 mt-0.5 block">
                      {selectedRecord.intake?.fuelLevel || 'غير محدد'}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-gray-400 block">الميكانيكي المسؤول:</span>
                    <span className="text-xs font-bold text-gray-200 mt-0.5 block">
                      {selectedRecord.assignedMechanicName || 'لم يتم التعيين'}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] text-gray-400 block">توقيع الاستلام:</span>
                    {selectedRecord.intake?.signatureUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewMediaUrl({ url: selectedRecord.intake.signatureUrl!, type: 'image', caption: 'توقيع استلام السيارة الأولي' })}
                        className="text-[11px] text-[#F52B35] hover:underline font-bold mt-0.5 block"
                      >
                        عرض التوقيع المعتمد
                      </button>
                    ) : (
                      <span className="text-gray-400 mt-0.5 block">بدون توقيع</span>
                    )}
                  </div>
                </div>

                {/* Mandatory Intake Photos Carousel */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-gray-300 block">صور الاستلام الإلزامية:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { title: 'العداد', url: selectedRecord.intake?.odometerPhotoUrl },
                      { title: 'البودي (أمام)', url: selectedRecord.intake?.frontPhotoUrl },
                      { title: 'البودي (خلف)', url: selectedRecord.intake?.rearPhotoUrl },
                      { title: 'الجانب الأيسر', url: selectedRecord.intake?.leftSidePhotoUrl },
                      { title: 'الجانب الأيمن', url: selectedRecord.intake?.rightSidePhotoUrl }
                    ].map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => item.url && setPreviewMediaUrl({ url: item.url, type: 'image', caption: item.title })}
                        className="p-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#F52B35]/50 transition-all cursor-pointer group text-center"
                      >
                        {item.url ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 mb-1">
                            <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-lg bg-black/40 flex items-center justify-center text-gray-500 mb-1">
                            <Camera className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-gray-300 truncate block">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-existing Scratches / Damages */}
                {selectedRecord.intake?.preExistingDamages && selectedRecord.intake.preExistingDamages.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-xs font-bold text-amber-400 block">الخدوش والصدمات المسبقة المثبتة ({selectedRecord.intake.preExistingDamages.length}):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedRecord.intake.preExistingDamages.map((dmg) => (
                        <div key={dmg.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{dmg.location}</span>
                            <span className="text-[11px] text-gray-400 block truncate">{dmg.description}</span>
                          </div>
                          {dmg.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewMediaUrl({ url: dmg.photoUrl, type: 'image', caption: `${dmg.location} - ${dmg.description}` })}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                            >
                              عرض الصورة
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecord.intake?.notes && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block mb-0.5">ملاحظات الاستلام:</span>
                    <p className="text-gray-200">{selectedRecord.intake.notes}</p>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION B: Faults & Diagnostics (الأعطال والتشخيص)            */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#F52B35]" />
                      <span>2. تقرير فحص الأعطال والتشخيص ({selectedRecord.faults?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">إضافة الأعطال، تشخيصها، وحالات إصلاحها</p>
                  </div>

                  {/* Add Fault button (allowed for mechanic assigned or admin) */}
                  <button
                    type="button"
                    onClick={() => setShowAddFaultModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#F52B35] hover:bg-[#D11C25] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة عطل</span>
                  </button>
                </div>

                {(!selectedRecord.faults || selectedRecord.faults.length === 0) ? (
                  <p className="text-xs text-gray-400 py-4 text-center bg-white/5 rounded-xl">
                    لم يتم تسجيل أي أعطال حتى الآن. اضغط على "إضافة عطل" لبدء الفحص والتشخيص.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedRecord.faults.map((fault) => (
                      <div 
                        key={fault.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          fault.status === 'repaired' 
                            ? 'bg-emerald-950/20 border-emerald-500/30' 
                            : fault.isDraft 
                            ? 'bg-amber-950/20 border-amber-500/30' 
                            : 'bg-white/5 border-white/10'
                        } space-y-2.5`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-white text-xs sm:text-sm">{fault.title}</h5>
                              {fault.isDraft && (
                                <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  مسودة
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 text-xs mt-1 leading-relaxed">{fault.description}</p>
                          </div>

                          {/* Fault Status Selector */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              value={fault.status}
                              onChange={e => handleUpdateFaultStatus(fault.id, e.target.value as FaultStatus)}
                              className="bg-black/60 border border-white/15 rounded-xl px-2.5 py-1 text-[11px] font-bold text-white outline-none focus:border-[#F52B35] cursor-pointer"
                            >
                              <option value="new">جديد</option>
                              <option value="inspecting">قيد الفحص</option>
                              <option value="needs_approval">يحتاج موافقة</option>
                              <option value="in_repair">قيد الإصلاح</option>
                              <option value="repaired">تم الإصلاح ✓</option>
                            </select>
                          </div>
                        </div>

                        {fault.diagnosisNotes && (
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px]">
                            <strong className="text-gray-400 block mb-0.5">ملاحظات التشخيص والإصلاح المطلوب:</strong>
                            <p className="text-gray-200">{fault.diagnosisNotes}</p>
                          </div>
                        )}

                        {fault.repairOutcomeNotes && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px]">
                            <strong className="text-emerald-400 block mb-0.5">نتيجة الإصلاح:</strong>
                            <p className="text-emerald-200">{fault.repairOutcomeNotes}</p>
                          </div>
                        )}

                        {/* Fault Media Photos & Videos */}
                        {fault.media && fault.media.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {fault.media.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPreviewMediaUrl({ url: m.url, type: m.mediaType, caption: `${fault.title} - ${m.caption || ''}` })}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {m.mediaType === 'video' ? <Video className="w-3.5 h-3.5 text-purple-400" /> : <Camera className="w-3.5 h-3.5 text-blue-400" />}
                                <span>{m.mediaType === 'video' ? 'فيديو العطل' : 'صورة العطل'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION C: Flexible Media Gallery (صور وفيديوهات الإصلاح)     */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span>3. معرض أعمال الإصلاح والفحص بالصور والفيديو ({selectedRecord.repairMedia?.length || 0})</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">توثيق مرن بكاميرا الجوال أثناء العمل لضمان الشفافية وحفظ الملفات الأصلية</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMediaUploadModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة / فيديو</span>
                  </button>
                </div>

                {(!selectedRecord.repairMedia || selectedRecord.repairMedia.length === 0) ? (
                  <p className="text-xs text-gray-400 py-4 text-center bg-white/5 rounded-xl">
                    لا توجد وسائط إضافية بعد. يمكنك تصوير العمل مباشرة من الجوال أو رفع فيديوهات وصور الفحص.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedRecord.repairMedia.map((media) => (
                      <div 
                        key={media.id}
                        onClick={() => setPreviewMediaUrl({ url: media.url, type: media.mediaType, caption: media.caption })}
                        className="p-2 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 mb-1.5 flex items-center justify-center">
                          {media.mediaType === 'video' ? (
                            <>
                              <video src={media.url} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                              </div>
                            </>
                          ) : (
                            <img src={media.url} alt={media.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )}
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-bold text-white">
                            {media.mediaType === 'video' ? 'فيديو' : 'صورة'}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="font-bold text-gray-200 text-[11px] block truncate">{media.caption || 'بدون وصف'}</span>
                          <span className="text-[9px] text-gray-400 block truncate">
                            {media.uploadedByStaffName} • {new Date(media.uploadedAt).toLocaleTimeString('ar-SA')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION D: Final Delivery Record (إذا كانت مسلّمة)              */}
              {/* ------------------------------------------------------------- */}
              {selectedRecord.finalDelivery && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>4. وثيقة التسليم النهائي وإغلاق السجل المعتمدة</span>
                    </h4>
                    <span className="text-[11px] text-emerald-300">
                      معتمد في: {new Date(selectedRecord.finalDelivery.deliveredAt).toLocaleString('ar-SA')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">عداد المسافة النهائي:</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {selectedRecord.finalDelivery.finalOdometer?.toLocaleString()} كم
                      </span>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">المسؤول عن الاعتماد:</span>
                      <span className="font-bold text-gray-200">
                        {selectedRecord.finalDelivery.adminStaffName}
                      </span>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-gray-400 block">توقيع الإدارة النهائي:</span>
                      {selectedRecord.finalDelivery.adminSignatureUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewMediaUrl({ url: selectedRecord.finalDelivery!.adminSignatureUrl, type: 'image', caption: 'توقيع الإدارة النهائي المعتمد' })}
                          className="text-[11px] text-[#F52B35] hover:underline font-bold"
                        >
                          عرض التوقيع المعتمد
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedRecord.finalDelivery.notes && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px]">
                      <span className="text-gray-400 block mb-0.5">ملاحظات التسليم النهائي:</span>
                      <p className="text-gray-200">{selectedRecord.finalDelivery.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SECTION E: Immutable Audit Trail Timeline                     */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-400" />
                    <span>5. سجل التدقيق غير القابل للتعديل (Audit Trail)</span>
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">سجل أمني موثق بالخادم</span>
                </div>

                {auditLogs.filter(l => l.handoverId === selectedRecord.id).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد سجلات تدقيق مسجلة بعد.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {auditLogs
                      .filter(l => l.handoverId === selectedRecord.id)
                      .map((log) => (
                        <div key={log.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-bold text-white block">{log.actionTitle}</span>
                            <p className="text-gray-300 text-[11px] leading-relaxed">{log.details}</p>
                            <span className="text-[10px] text-gray-400 block">
                              بواسطة: <strong className="text-gray-300">{log.performedByStaffName}</strong> ({log.performedByRole})
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0A0C10] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-400">
                رقم السجل: <strong className="text-white font-mono">{selectedRecord.handoverCode}</strong>
              </span>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: New Intake Form (Admin)                                         */}
      {/* ========================================================================= */}
      {showNewIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-3xl bg-[#0E1117] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0C10] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F52B35] flex items-center justify-center text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">توثيق استلام سيارة جديدة (Vehicle Intake)</h3>
                  <p className="text-xs text-gray-400">تسجيل بيانات السيارة، العداد، صور البودي، والخدوش المسبقة وإسناد الميكانيكي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewIntakeModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewIntake} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* 1. Quick Select From Existing Bookings (No redundant data entry) */}
              {systemRecords && systemRecords.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-brand-red/10 via-black to-black border border-brand-red/30 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-red/20 text-brand-red flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white">استيراد سيارة من حجوزات النظام (دون تكرار الإدخال)</span>
                    </div>
                    {selectedBookingId ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        تم ربط حجز #{selectedBookingId.slice(0, 6)} ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">اختر الحجز لملء الحقول تلقائيًا</span>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bookingSearchQuery}
                      onChange={e => setBookingSearchQuery(e.target.value)}
                      placeholder="ابحث باسم العميل أو رقم اللوحة أو موديل السيارة..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-brand-red"
                    />
                  </div>

                  {selectedBookingId ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        تمت تعبئة بيانات السيارة والعميل بنجاح من سجلات المركز
                      </span>
                      <button
                        type="button"
                        onClick={handleClearSelectedBooking}
                        className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        إلغاء وتفريغ
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar pt-1">
                      {matchingBookings.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBooking(b)}
                          className="text-right px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand-red/20 hover:border-brand-red/40 border border-white/5 transition-all text-[11px] text-gray-200 cursor-pointer flex items-center gap-2"
                        >
                          <span className="font-bold text-white">{b.customerName || 'عميل'}</span>
                          <span className="text-gray-400">({b.carModel || 'سيارة'}{b.plateNumber ? ` • ${b.plateNumber}` : ''})</span>
                          <span className="text-brand-red font-bold text-[10px]">استيراد ↵</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Car & Customer Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">رقم اللوحة *</label>
                  <input
                    type="text"
                    required
                    value={newPlate}
                    onChange={e => setNewPlate(e.target.value)}
                    placeholder="أ ب ج 1234"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">صانع السيارة *</label>
                  <input
                    type="text"
                    required
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    placeholder="تويوتا، هونداي، مرسيدس..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">الموديل وسنة الصنع *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={e => setNewModel(e.target.value)}
                      placeholder="كامري، سوناتا..."
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                    />
                    <input
                      type="text"
                      value={newYear}
                      onChange={e => setNewYear(e.target.value)}
                      placeholder="2024"
                      className="w-20 bg-black/50 border border-white/10 rounded-xl px-2 py-2 text-white outline-none focus:border-[#F52B35] text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">اسم العميل</label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    placeholder="اسم العميل الكريم"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">جوال العميل</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35] text-right font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">الميكانيكي المسؤول (المستلم بالورشة) *</label>
                  <select
                    required
                    value={newAssignedMechId}
                    onChange={e => setNewAssignedMechId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35] cursor-pointer"
                  >
                    <option value="">-- اختر الميكانيكي المسؤول بالورشة --</option>
                    {activeMechanics.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.roleTitleAr || 'فني صيانة'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Odometer & Fuel Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">قراءة عداد المسافة (كم) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newOdometer}
                    onChange={e => setNewOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 45200"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35] font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">مستوى الوقود</label>
                  <select
                    value={newFuelLevel}
                    onChange={e => setNewFuelLevel(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35] cursor-pointer"
                  >
                    <option value="1/4">ربع تانكي (1/4)</option>
                    <option value="1/2">نصف تانكي (1/2)</option>
                    <option value="3/4">ثلاثة أرباع (3/4)</option>
                    <option value="full">فل تانكي (Full)</option>
                  </select>
                </div>
              </div>

              {/* 5 Mandatory Photos Grid with Instant Preview & Retry */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 block">
                    الصور الإلزامية لتوثيق حالة السيارة (كاميرا الجوال أو الألبوم) *
                  </span>
                  <span className="text-[10px] text-gray-400">معاينة فورية وحفظ سحابي مباشر</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  لا يسمح بإسناد السيارة إلا بعد استكمال جميع الصور الخمس وحفظها في السحابة
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                  {[
                    { key: 'odometer' as const, label: 'صورة العداد *' },
                    { key: 'front' as const, label: 'البودي (أمام) *' },
                    { key: 'rear' as const, label: 'البودي (خلف) *' },
                    { key: 'left' as const, label: 'الجانب الأيسر *' },
                    { key: 'right' as const, label: 'الجانب الأيمن *' }
                  ].map((p) => {
                    const slot = intakePhotos[p.key];
                    const hasPreview = !!slot.previewUrl;
                    const isUploading = slot.status === 'uploading';
                    const isSaved = slot.status === 'saved';
                    const isError = slot.status === 'error';

                    return (
                      <div 
                        key={p.key}
                        className={`p-2 rounded-xl border flex flex-col justify-between text-center transition-all min-h-[140px] relative overflow-hidden ${
                          isSaved 
                            ? 'border-emerald-500/50 bg-emerald-950/20' 
                            : isError
                            ? 'border-red-500/50 bg-red-950/20'
                            : isUploading
                            ? 'border-amber-500/50 bg-amber-950/20'
                            : 'border-white/15 hover:border-brand-red/50 bg-white/5'
                        }`}
                      >
                        {/* Instant visual preview if captured/selected */}
                        {hasPreview ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 mb-2">
                            <img 
                              src={slot.previewUrl} 
                              alt={p.label} 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                // If blob URL is released, fallback to savedUrl
                                if (slot.savedUrl) (e.currentTarget as HTMLImageElement).src = slot.savedUrl;
                              }}
                            />
                            
                            {/* Overlay Status Badge */}
                            {isUploading && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-1 text-amber-300">
                                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-1" />
                                <span className="text-[10px] font-bold">جاري الرفع ({slot.progress}%)</span>
                              </div>
                            )}

                            {isSaved && (
                              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[9px] font-bold flex items-center gap-1 shadow">
                                <Check className="w-3 h-3" /> محفوظة في السحابة
                              </div>
                            )}

                            {isError && (
                              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-1 text-red-300">
                                <AlertTriangle className="w-5 h-5 text-red-400 mb-1" />
                                <span className="text-[10px] font-bold">فشل الحفظ</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-video rounded-lg bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-400 mb-2 p-1">
                            <Camera className="w-5 h-5 text-gray-500 mb-1" />
                            <span className="text-[9px] text-gray-400">لم يتم التصوير</span>
                          </div>
                        )}

                        <span className="text-[11px] font-bold text-gray-200 block truncate">{p.label}</span>

                        {/* Action Buttons: Pick Photo or Retry */}
                        <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-center gap-1">
                          {isError ? (
                            <button
                              type="button"
                              onClick={() => handleRetryPhotoUpload(p.key)}
                              className="w-full py-1 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>إعادة المحاولة 🔄</span>
                            </button>
                          ) : (
                            <label className="w-full py-1 px-2 rounded-lg bg-white/10 hover:bg-brand-red text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={e => handlePhotoFileChange(e, p.key)}
                                disabled={isUploading}
                                className="hidden"
                              />
                              <Camera className="w-3 h-3" />
                              <span>{hasPreview ? 'تغيير الصورة' : 'التقاط الصورة'}</span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pre-existing Damages / Scratches */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-xs font-bold text-amber-400 block">
                  إثبات الخدوش والصدمات الموجودة مسبقًا (اختياري / موصى به)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={damageLoc}
                    onChange={e => setDamageLoc(e.target.value)}
                    placeholder="مكان الخدش (مثال: صدام أمامي)"
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#F52B35]"
                  />
                  <input
                    type="text"
                    value={damageDesc}
                    onChange={e => setDamageDesc(e.target.value)}
                    placeholder="الوصف (مثال: حكة عميقة 10 سم)"
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#F52B35]"
                  />
                  <div className="flex gap-2">
                    <label className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-center cursor-pointer truncate flex items-center justify-center gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handlePhotoFileChange(e, 'damage')}
                        disabled={damageSlot.status === 'uploading'}
                        className="hidden"
                      />
                      <Camera className="w-3.5 h-3.5 text-gray-400" />
                      <span>{damageSlot.savedUrl || damageSlot.previewUrl ? 'تمت إضافة صورة ✓' : 'إرفاق صورة'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDamageItem}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0 cursor-pointer"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                {damagesList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {damagesList.map((dmg, i) => (
                      <div key={dmg.id} className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]">
                        <span>#{i+1} <strong>{dmg.location}:</strong> {dmg.description}</span>
                        <button
                          type="button"
                          onClick={() => setDamagesList(prev => prev.filter(d => d.id !== dmg.id))}
                          className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">ملاحظات إضافية عن حالة السيارة</label>
                <textarea
                  rows={2}
                  value={newIntakeNotes}
                  onChange={e => setNewIntakeNotes(e.target.value)}
                  placeholder="أي ملاحظات فنية أو إضافات خاصة بالسيارة..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                />
              </div>

              {/* Electronic Signature */}
              <DigitalSignaturePad
                title="توقيع موظف الاستقبال الإلكتروني"
                subtitle="وقّع لتأكيد اكتمال الفحص المبدئي ومطابقة الصور مع واقع السيارة"
                signerName={currentStaffUser?.fullName || 'موظف الاستقبال'}
                onSave={sig => setIntakeSignature(sig)}
                onClear={() => setIntakeSignature('')}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={intakeSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F52B35] to-[#B3121B] hover:from-[#FF414A] text-white font-bold text-sm shadow-xl shadow-[#F52B35]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {intakeSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري حفظ السجل وإسناد السيارة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>اعتماد الاستلام وإسناد السيارة للميكانيكي</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: Mechanic Acceptance Signature Modal                             */}
      {/* ========================================================================= */}
      {showMechanicAcceptModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-lg bg-[#0E1117] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">تأكيد استلام السيارة (الميكانيكي المسؤول)</h4>
              </div>
              <button type="button" onClick={() => setShowMechanicAcceptModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>السيارة: <strong className="text-white">{selectedRecord.carMake} {selectedRecord.carModel} ({selectedRecord.plateNumber})</strong></div>
                <div>عداد الاستلام: <strong className="text-amber-400 font-mono">{selectedRecord.intake?.odometer?.toLocaleString()} كم</strong></div>
              </div>

              {/* Photos inspection preview */}
              <div className="space-y-1 pt-1 border-t border-white/10">
                <span className="text-[10px] text-gray-400 block font-bold">صور توثيق الاستلام الأولي للمعاينة:</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'العداد', url: selectedRecord.intake?.odometerPhotoUrl },
                    { label: 'أمام', url: selectedRecord.intake?.frontPhotoUrl },
                    { label: 'خلف', url: selectedRecord.intake?.rearPhotoUrl },
                    { label: 'يسار', url: selectedRecord.intake?.leftSidePhotoUrl },
                    { label: 'يمين', url: selectedRecord.intake?.rightSidePhotoUrl },
                  ].map((p, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => p.url && setPreviewMediaUrl({ url: p.url, type: 'image', caption: p.label })}
                      className="aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/10 relative cursor-pointer group"
                    >
                      {p.url ? (
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">{p.label}</div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center text-gray-300 py-0.5">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 pt-1">
                بتوقيعك أدناه تؤكد استلامك الفعلي للمركبة، ومطابقة حالة البودي والعداد مع توثيق الإدارة، وبدء مهام الفحص والإصلاح بالورشة.
              </p>
            </div>

            <div>
              <label className="text-gray-300 font-bold block mb-1 text-xs">ملاحظات الميكانيكي عند الاستلام (اختياري)</label>
              <textarea
                rows={2}
                value={mechanicNotes}
                onChange={e => setMechanicNotes(e.target.value)}
                placeholder="ملاحظاتك الفنية عند فحص السيارة المبدئي..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <DigitalSignaturePad
              title="توقيع الميكانيكي المعتمد"
              signerName={currentStaffUser?.fullName || 'الميكانيكي المسؤول'}
              required
              onSave={sig => setMechanicSignature(sig)}
              onClear={() => setMechanicSignature('')}
            />

            <button
              type="button"
              disabled={acceptingRecord || !mechanicSignature}
              onClick={handleMechanicAcceptance}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {acceptingRecord ? 'جاري توثيق الاستلام...' : 'تأكيد الاستلام وبدء الفحص ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: Add Fault & Diagnostics                                         */}
      {/* ========================================================================= */}
      {showAddFaultModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-lg bg-[#0E1117] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#F52B35]" />
                <h4 className="font-bold text-white text-sm">تسجيل عطل وتشخيص جديد</h4>
              </div>
              <button type="button" onClick={() => setShowAddFaultModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFault} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">عنوان العطل *</label>
                <input
                  type="text"
                  required
                  value={faultTitle}
                  onChange={e => setFaultTitle(e.target.value)}
                  placeholder="مثال: تهريب زيت في طرمبة الدركسون"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">وصف العطل بالتفصيل *</label>
                <textarea
                  rows={3}
                  required
                  value={faultDesc}
                  onChange={e => setFaultDesc(e.target.value)}
                  placeholder="شرح العطل، الأعراض، والمشاهدات الفنية..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">التشخيص والإصلاح المطلوب</label>
                <textarea
                  rows={2}
                  value={faultDiagnosis}
                  onChange={e => setFaultDiagnosis(e.target.value)}
                  placeholder="قطع الغيار المطلوبة، خطة الإصلاح، والتكلفة التقديرية..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">حالة العطل المبدئية</label>
                  <select
                    value={faultStatus}
                    onChange={e => setFaultStatus(e.target.value as FaultStatus)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#F52B35] cursor-pointer"
                  >
                    <option value="new">جديد</option>
                    <option value="inspecting">قيد الفحص</option>
                    <option value="needs_approval">يحتاج موافقة</option>
                    <option value="in_repair">قيد الإصلاح</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="faultDraftCheck"
                    checked={faultIsDraft}
                    onChange={e => setFaultIsDraft(e.target.checked)}
                    className="w-4 h-4 accent-[#F52B35] cursor-pointer"
                  />
                  <label htmlFor="faultDraftCheck" className="text-gray-300 font-bold cursor-pointer">
                    حفظ كمسودة (Draft)
                  </label>
                </div>
              </div>

              {/* Attach Photos/Videos to Fault */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">إرفاق صور أو فيديو للعطل</label>
                <label className="p-3 rounded-xl border border-dashed border-white/20 hover:border-[#F52B35]/50 bg-white/5 flex items-center justify-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUploadFaultMedia}
                    disabled={uploadingFaultMedia}
                    className="hidden"
                  />
                  {uploadingFaultMedia ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#F52B35] border-t-transparent rounded-full animate-spin" />
                      <span>جاري رفع وسائط العطل...</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-[#F52B35]" />
                      <span>التقاط صورة أو فيديو للعطل</span>
                    </>
                  )}
                </label>

                {faultMediaList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {faultMediaList.map((m, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-white/10 text-emerald-400 text-[10px] font-bold">
                        {m.isVideo ? 'فيديو مرفق ✓' : 'صورة مرفقة ✓'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingFault}
                className="w-full py-3 rounded-xl bg-[#F52B35] hover:bg-[#D11C25] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingFault ? 'جاري حفظ العطل...' : 'حفظ وتسجيل العطل ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: Upload to Flexible Media Gallery                                */}
      {/* ========================================================================= */}
      {showMediaUploadModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-md bg-[#0E1117] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white text-sm">رفع صورة أو فيديو لتوثيق الإصلاح</h4>
              </div>
              <button type="button" onClick={() => setShowMediaUploadModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">وصف الملف (اختياري)</label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={e => setMediaCaption(e.target.value)}
                  placeholder="مثال: فك الراديتر، تركيب الفحمات الجديدة..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">مرحلة التوثيق</label>
                <select
                  value={mediaStage}
                  onChange={e => setMediaStage(e.target.value as any)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="inspection">مرحلة الفحص والتشخيص</option>
                  <option value="during_repair">أثناء أعمال الإصلاح والفك والتركيب</option>
                  <option value="final">بعد اكتمال الإصلاح</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">اختيار أو تصوير الملف</label>
                <label className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-500/50 bg-white/5 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleUploadGeneralMedia}
                    disabled={uploadingGeneralMedia}
                    className="hidden"
                  />
                  {uploadingGeneralMedia ? (
                    <div className="space-y-2">
                      <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <span className="text-xs text-purple-400 font-bold block">
                        جاري الرفع ({uploadProgressState?.progressPercent || 0}%)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-purple-400 mb-2" />
                      <span className="text-xs font-bold text-white block">اضغط لاختيار صورة أو فيديو</span>
                      <span className="text-[10px] text-gray-400 mt-1">يدعم تصوير الكاميرا المباشر أو من ألبوم الجهاز</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: Mechanic Handover Request Prompt                               */}
      {/* ========================================================================= */}
      {showHandoverRequestModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-lg bg-[#0E1117] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white text-sm">طلب تسليم السيارة إلى الإدارة</h4>
              </div>
              <button type="button" onClick={() => setShowHandoverRequestModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
              سيتم نقل حالة السيارة إلى <strong>«جاهزة للتسليم»</strong> وإشعار إدارة الورشة لإجراء الفحص النهائي، مطابقة الأعطال، وتوقيع استلام السيارة وإغلاق السجل.
            </div>

            <div>
              <label className="text-gray-300 font-bold block mb-1 text-xs">ملخص الأعمال المنفذة ونتائج الإصلاح *</label>
              <textarea
                rows={3}
                required
                value={handoverSummaryNotes}
                onChange={e => setHandoverSummaryNotes(e.target.value)}
                placeholder="تم إنهاء كافة الإصلاحات، تغيير القطع، واختبار السيارة على الطريق والتأكد من زوال المشكلة..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="button"
              disabled={requestingHandover}
              onClick={handleRequestHandover}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {requestingHandover ? 'جاري إرسال الطلب...' : 'إرسال طلب التسليم للإدارة ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL: Admin Final Handover & Closure                                  */}
      {/* ========================================================================= */}
      {showFinalDeliveryModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-2xl bg-[#0E1117] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0C10] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">الفحص النهائي واعتماد تسليم السيارة وإغلاق السجل</h3>
                  <p className="text-xs text-gray-400">مراجعة أعمال الميكانيكي، تسجيل العداد النهائي، وتوقيع الإدارة المعتمد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalDeliveryModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteFinalDelivery} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div>السيارة: <strong className="text-white">{selectedRecord.carMake} {selectedRecord.carModel} ({selectedRecord.plateNumber})</strong></div>
                <div>عداد الاستلام المبدئي: <strong className="text-amber-400 font-mono">{selectedRecord.intake?.odometer} كم</strong></div>
                <div>الميكانيكي المنفذ: <strong className="text-gray-200">{selectedRecord.assignedMechanicName}</strong></div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">قراءة عداد المسافة النهائية (كم) *</label>
                <input
                  type="number"
                  required
                  min={selectedRecord.intake?.odometer || 0}
                  value={finalOdometerVal}
                  onChange={e => setFinalOdometerVal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={`يجب أن تكون مساوية أو أكبر من ${selectedRecord.intake?.odometer || 0} كم`}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Photos of final odometer and body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">صورة العداد النهائي (اختياري)</label>
                  <label className="p-3 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/50 bg-white/5 flex items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleUploadFinalPhoto(e, true)}
                      disabled={uploadingFinalPhoto}
                      className="hidden"
                    />
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{finalOdoPhoto ? 'تم رفع صورة العداد ✓' : 'تصوير العداد النهائي'}</span>
                  </label>
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">صور البودي بعد الإصلاح (اختياري)</label>
                  <label className="p-3 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/50 bg-white/5 flex items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleUploadFinalPhoto(e, false)}
                      disabled={uploadingFinalPhoto}
                      className="hidden"
                    />
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{finalBodyPhotoList.length > 0 ? `تم إضافة (${finalBodyPhotoList.length}) صور ✓` : 'إضافة صورة بودي'}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">ملاحظات الفحص النهائي والتسليم</label>
                <textarea
                  rows={2}
                  value={finalAdminNotes}
                  onChange={e => setFinalAdminNotes(e.target.value)}
                  placeholder="ملاحظات الإدارة عند استلام السيارة من الميكانيكي وتسليمها للعميل..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <DigitalSignaturePad
                title="توقيع الإدارة النهائي المعتمد لإغلاق السجل"
                subtitle="التوقيع إلزامي لإتمام الإغلاق النهائي ولا يُغلق السجل بدونه"
                signerName={currentStaffUser?.fullName || 'إدارة DR.FIX'}
                required
                onSave={sig => setFinalAdminSignature(sig)}
                onClear={() => setFinalAdminSignature('')}
              />

              <button
                type="submit"
                disabled={completingFinalDelivery || !finalAdminSignature}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {completingFinalDelivery ? 'جاري الاعتماد النهائي...' : 'اعتماد التسليم وإغلاق السجل نهائياً ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. LIGHTBOX: Media Zoom / Player                                         */}
      {/* ========================================================================= */}
      {previewMediaUrl && (
        <div 
          onClick={() => setPreviewMediaUrl(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-fadeIn cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="relative max-w-4xl max-h-[90vh] bg-black/60 rounded-3xl p-3 border border-white/15 overflow-hidden flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-white hover:bg-white/20 transition-colors z-20"
            >
              <X className="w-6 h-6" />
            </button>

            {previewMediaUrl.type === 'video' ? (
              <video src={previewMediaUrl.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-2xl" />
            ) : (
              <img src={previewMediaUrl.url} alt="معاينة" className="max-w-full max-h-[75vh] object-contain rounded-2xl" />
            )}

            {previewMediaUrl.caption && (
              <div className="pt-3 text-center text-xs font-bold text-gray-200">
                {previewMediaUrl.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
