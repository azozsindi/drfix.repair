import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  MessageSquare, 
  Share2, 
  Navigation, 
  Plus, 
  Check, 
  Send, 
  Sparkles, 
  ChevronRight, 
  Wrench, 
  ShieldCheck, 
  ZoomIn, 
  Bell, 
  Lock, 
  Globe, 
  Timer, 
  CheckCheck,
  ChevronDown,
  Video,
  Play,
  Film,
  MessageCircle,
  ExternalLink,
  Copy,
  UploadCloud,
  Zap
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceRecord, ServiceStepLog, ServiceStepPhoto, ServiceStepKey, StaffUser } from '../types';
import { generateVideoThumbnail, storeInspectionVideo } from '../lib/videoStorage';
import { generateTechnicianAssignmentWhatsAppUrl, getTechnicianAssignmentMessage } from '../lib/whatsappUtils';
import { InspectionVideoPlayer } from './InspectionVideoPlayer';
import { FastVideoRecorderModal } from './FastVideoRecorderModal';
import { useScrollLock } from '../lib/scrollLock';
import { cn } from '../lib/utils';
import { playTaskAssignedSound } from '../lib/audioAlerts';

interface ServiceTimelineModalProps {
  record: MaintenanceRecord;
  staffList: StaffUser[];
  allRecords?: MaintenanceRecord[];
  currentStaffUser?: StaffUser | null;
  telegramConfig?: {
    botToken?: string;
    chatId?: string;
  };
  initialTab?: 'workflow' | 'timeline' | 'details' | 'add_step' | 'assign';
  initialStage?: 1 | 2 | 3 | 4 | 5;
  onClose: () => void;
  onUpdateRecord: (updatedRecord: MaintenanceRecord) => void;
}

// Browser Canvas Image Compressor (compresses to max 800px, JPEG ~35-45KB for fast, safe Firestore storage)
export const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Deep sanitization for Firestore payloads.
 * Strips out any `undefined` values that cause Firestore to reject updateDoc
 * with "Unsupported field value: undefined".
 */
export function cleanFirestorePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanFirestorePayload(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

// 5-Step Streamlined Technician Workflow
export const STANDARD_WORKFLOW_STEPS = [
  {
    step: 1,
    id: 'arrival',
    stepKey: 'arrival',
    title: 'المرحلة 1: وصول الفني للموقع 📍',
    shortTitle: '1. وصول الفني 📍',
    badge: 'المرحلة الأولى',
    icon: '📍',
    color: 'emerald',
    desc: 'تأكيد وصول الفني لموقع العميل بالوقت الفعلي وبدء الاستعداد.'
  },
  {
    step: 2,
    id: 'car_and_odometer_video',
    stepKey: 'car_and_odometer_video',
    title: 'المرحلة 2: تصوير فيديو للسيارة كامل والعداد 🎥',
    shortTitle: '2. فيديو السيارة والعداد 🎥',
    badge: 'المرحلة الثانية',
    icon: '🎥',
    color: 'purple',
    desc: 'فيديو سريع (15-20 ثانية) يوثق محيط البودي والخدوش السابقة وقراءة العداد بدقة.'
  },
  {
    step: 3,
    id: 'fault_documentation',
    stepKey: 'fault_documentation',
    title: 'المرحلة 3: تصوير الخراب أو شرح العطل ⚠️',
    shortTitle: '3. تصوير الخراب / الشرح ⚠️',
    badge: 'المرحلة الثالثة',
    icon: '⚠️',
    color: 'amber',
    desc: 'صورة واضحة أو تسجيل فيديو شرح فني للقطعة المتضررة وتوضيح أسباب الإصلاح.'
  },
  {
    step: 4,
    id: 'new_part_after_repair',
    stepKey: 'new_part_after_repair',
    title: 'المرحلة 4: تصوير القطعة الجديدة أو بعد الإصلاح 📦',
    shortTitle: '4. القطعة الجديدة / بعد الإصلاح 📦',
    badge: 'المرحلة الرابعة',
    icon: '📦',
    color: 'blue',
    desc: 'توثيق القطعة الجديدة الأصلية أو بعد إتمام التجميع والإصلاح لضمان الجودة.'
  },
  {
    step: 5,
    id: 'completion_and_delivery',
    stepKey: 'completion_and_delivery',
    title: 'المرحلة 5: تصوير إتمام العمل والانتهاء 🏁',
    shortTitle: '5. إتمام العمل والانتهاء 🏁',
    badge: 'المرحلة الخامسة',
    icon: '🏁',
    color: 'emerald',
    desc: 'توثيق نهائي لاختبار تشغيل السيارة واكتمال السند وإشعار الإدارة والتسليم.'
  }
];

// Preset categories for continuous in-progress updates
const IN_PROGRESS_CATEGORIES = [
  {
    id: 'arrival_video_inspection',
    title: 'فيديو وصور فحص السيارة عند الوصول 🎥',
    icon: '🎥',
    defaultNote: 'تم الوصول لموقع العميل وتوثيق الحالة الخارجية للسيارة والعداد بفيديو الفحص الأولي.'
  },
  {
    id: 'start_inspection',
    title: 'فحص أولي وبدء العمل',
    icon: '🔍',
    defaultNote: 'تم الوصول وبدأت عملية الفحص الشامل للسيارة والمعاينة الأولية.'
  },
  {
    id: 'fault_part',
    title: 'قطعة تحتاج تغيير أو فحص',
    icon: '⚠️',
    defaultNote: 'تحتاج السيارة إلى استبدال هذه القطعة المتضررة لضمان أداء سليم وآمن.'
  },
  {
    id: 'spare_parts',
    title: 'توفير واستلام قطع الغيار',
    icon: '📦',
    defaultNote: 'تم توفير قطع الغيار الأصلية والمطابقة وفحص سلامتها قبل التركيب.'
  },
  {
    id: 'installation',
    title: 'أثناء التركيب والتنفيذ',
    icon: '🔧',
    defaultNote: 'جاري تركيب القطع الجديدة وشد الأجزاء وضبط المعايير الميكانيكية.'
  },
  {
    id: 'general_update',
    title: 'تحديث عام أو ملاحظة إضافية',
    icon: '📝',
    defaultNote: 'ملاحظة فنية ميدانية حول تقدم أعمال الصيانة.'
  }
];

export const ServiceTimelineModal: React.FC<ServiceTimelineModalProps> = ({
  record,
  staffList,
  allRecords = [],
  currentStaffUser,
  telegramConfig,
  initialTab,
  initialStage,
  onClose,
  onUpdateRecord
}) => {
  const isTechnician = currentStaffUser?.role === 'technician';

  // Determine starting tab
  const getInitialTab = () => {
    if (initialTab === 'assign' && !isTechnician) return 'assign';
    if (initialTab === 'timeline') return 'timeline';
    if (initialTab === 'details') return 'details';
    return 'workflow';
  };

  const [activeTab, setActiveTab] = useState<'workflow' | 'timeline' | 'details' | 'assign'>(getInitialTab());
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'media'>('all');
  const [showCompletedExtraForm, setShowCompletedExtraForm] = useState(false);
  const [techAvailabilityFilter, setTechAvailabilityFilter] = useState<'all' | 'free' | 'busy'>('all');

  const steps: ServiceStepLog[] = record.serviceSteps || [];
  const totalPhotosCount = useMemo(() => steps.reduce((sum, s) => sum + (s.photos?.length || 0), 0), [steps]);

  // Existing inspection video if present in any step
  const existingInspectionVideo = useMemo(() => {
    for (const step of steps) {
      for (const p of step.photos || []) {
        if (p.mediaType === 'video' || p.videoUrl) {
          return {
            videoUrl: p.videoUrl || p.url,
            thumbnailUrl: p.url,
            caption: p.caption || step.title,
            recordedAt: step.recordedAt || Date.now()
          };
        }
      }
    }
    return null;
  }, [steps]);

  // Check completion for each of the 5 standard steps
  const isStepCompleted = (stepNumber: number): boolean => {
    if (record.status === 'completed') return true;
    if (stepNumber === 1) {
      return (
        record.status === 'in-progress' ||
        record.status === 'completed' ||
        steps.some(s => s.stepKey === 'arrival' || s.title?.includes('وصول') || s.stepKey === 'accepted' || s.stepKey === 'on_the_way')
      );
    }
    if (stepNumber === 2) {
      return steps.some(
        s => (s.photos || []).some(p => p.mediaType === 'video' || !!p.videoUrl) ||
             s.stepKey === 'car_and_odometer_video' ||
             s.title?.includes('فيديو') ||
             s.title?.includes('العداد')
      );
    }
    if (stepNumber === 3) {
      return steps.some(
        s => s.stepKey === 'fault_documentation' ||
             s.title?.includes('الخراب') ||
             s.title?.includes('العطل') ||
             (s.stepKey as string) === 'fault_part'
      );
    }
    if (stepNumber === 4) {
      return steps.some(
        s => s.stepKey === 'new_part_after_repair' ||
             s.title?.includes('الجديدة') ||
             s.title?.includes('بعد الإصلاح') ||
             (s.stepKey as string) === 'spare_parts' ||
             (s.stepKey as string) === 'installation'
      );
    }
    if (stepNumber === 5) {
      return (
        record.status === 'completed' ||
        steps.some(s => s.stepKey === 'completed' || s.stepKey === 'completion_and_delivery' || s.title?.includes('اكتمال') || s.title?.includes('إتمام'))
      );
    }
    return false;
  };

  // Determine active workflow stage based on record status & step completions
  const getInitialWorkflowStage = (): 1 | 2 | 3 | 4 | 5 => {
    if (initialStage) return initialStage;
    if (record.status === 'completed') return 5;
    if (isStepCompleted(4)) return 5;
    if (isStepCompleted(3)) return 4;
    if (isStepCompleted(2)) return 3;
    if (isStepCompleted(1)) return 2;
    return 1;
  };

  const [workflowStage, setWorkflowStage] = useState<1 | 2 | 3 | 4 | 5>(getInitialWorkflowStage);

  // Stage 1 State: وصول الفني للموقع 📍
  const [stage1Note, setStage1Note] = useState('');
  const [isSavingStage1, setIsSavingStage1] = useState(false);
  const [acceptedNote, setAcceptedNote] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [etaTime, setEtaTime] = useState(record.estimatedArrival || 'متوقع الوصول خلال 30 دقيقة');
  const [onTheWayNote, setOnTheWayNote] = useState('');
  const [isOnTheWaySaving, setIsOnTheWaySaving] = useState(false);

  // Stage 2 State: تصوير فيديو للسيارة كامل والعداد 🎥
  const [stage2Photos, setStage2Photos] = useState<{ 
    url: string; 
    caption: string; 
    isInternalOnly: boolean;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  }[]>([]);
  const [stage2Note, setStage2Note] = useState('فيديو توثيق فحص واستلام السيارة ومحيط البودي وقراءة العداد عند الوصول 🎥');
  const [isSavingStage2, setIsSavingStage2] = useState(false);

  // Stage 3 State: تصوير الخراب أو شرح العطل ⚠️
  const [stage3Photos, setStage3Photos] = useState<{ 
    url: string; 
    caption: string; 
    isInternalOnly: boolean;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  }[]>([]);
  const [stage3Note, setStage3Note] = useState('توثيق وتشخيص العطل / الخراب في القطعة المتضررة وتوضيح أسباب الصيانة ⚠️');
  const [stage3CustomerVisible, setStage3CustomerVisible] = useState(true);
  const [isSavingStage3, setIsSavingStage3] = useState(false);

  // Stage 4 State: تصوير القطعة الجديدة أو بعد الإصلاح 📦
  const [stage4Photos, setStage4Photos] = useState<{ 
    url: string; 
    caption: string; 
    isInternalOnly: boolean;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  }[]>([]);
  const [stage4Note, setStage4Note] = useState('توثيق القطعة الجديدة الأصلية والتأكد من مطابقتها وسلامة التركيب بعد الإصلاح 📦');
  const [stage4CustomerVisible, setStage4CustomerVisible] = useState(true);
  const [isSavingStage4, setIsSavingStage4] = useState(false);

  // Stage 5 State: تصوير إتمام العمل والانتهاء 🏁
  const [completedNote, setCompletedNote] = useState('تم إتمام الصيانة بنجاح واختبار تشغيل السيارة وجاهزيتها التامة للتسليم للعميل 🏁');
  const [completedPhotos, setCompletedPhotos] = useState<{ 
    url: string; 
    caption: string; 
    isInternalOnly: boolean;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  }[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  // Legacy in-progress category support for custom step addition
  const [inProgressCategory, setInProgressCategory] = useState(IN_PROGRESS_CATEGORIES[0]);
  const [inProgressNote, setInProgressNote] = useState('');
  const [inProgressPhotos, setInProgressPhotos] = useState<{ 
    url: string; 
    caption: string; 
    isInternalOnly: boolean;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  }[]>([]);
  const [isCustomerVisible, setIsCustomerVisible] = useState<boolean>(true);
  const [isInProgressSaving, setIsInProgressSaving] = useState(false);
  const [stageSuccessMsg, setStageSuccessMsg] = useState('');
  const [fastVideoTargetStage, setFastVideoTargetStage] = useState<2 | 3 | 4 | 5>(2);

  // Lock body scrolling while modal is open so background never moves
  useScrollLock(true);

  // Shared Photo & Video Media State
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoProgressStatus, setVideoProgressStatus] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{ 
    url: string; 
    caption?: string; 
    title?: string;
    mediaType?: 'image' | 'video';
    videoUrl?: string;
  } | null>(null);

  // Strictly filter technicians: ONLY active staff with technician role or 'فني' in their title
  const technicians = useMemo(() => {
    return (staffList || []).filter(s => {
      if (s.isActive === false) return false;
      // Exclude administrative/support roles
      if (s.role === 'super_admin' || s.role === 'dispatcher' || s.role === 'support') {
        return false;
      }
      if (s.role === 'technician') return true;
      const roleStr = String(s.role || '').toLowerCase();
      const titleStr = String(s.roleTitleAr || '').trim().toLowerCase();
      return roleStr === 'tech' || roleStr.includes('technician') || titleStr.includes('فني') || titleStr.includes('technician');
    });
  }, [staffList]);

  // Technician Assignment State
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(() => {
    if (record.assignedStaffId && !record.assignedStaffId.startsWith('manual_')) {
      return record.assignedStaffId;
    }
    return '';
  });
  const [assignmentMode, setAssignmentMode] = useState<'staff_list' | 'manual'>(() => {
    if (record.assignedStaffId?.startsWith('manual_')) return 'manual';
    const hasTechs = (staffList || []).some(s => {
      if (s.isActive === false) return false;
      if (s.role === 'super_admin' || s.role === 'dispatcher' || s.role === 'support') return false;
      if (s.role === 'technician') return true;
      const titleStr = String(s.roleTitleAr || '').trim().toLowerCase();
      return titleStr.includes('فني') || titleStr.includes('technician');
    });
    return hasTechs ? 'staff_list' : 'manual';
  });
  const [manualTechName, setManualTechName] = useState(record.assignedStaffName || '');
  const [manualTechPhone, setManualTechPhone] = useState(record.assignedStaffPhone || '');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');
  const [assignedWhatsAppDialog, setAssignedWhatsAppDialog] = useState<{
    isOpen: boolean;
    url: string;
    techName: string;
    techPhone: string;
    message: string;
  }>({
    isOpen: false,
    url: '',
    techName: '',
    techPhone: '',
    message: ''
  });
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Stage 4: مشاركة طلب أو استلام القطعة مع الإدارة
  const [stage4ShareDialog, setStage4ShareDialog] = useState<{
    isOpen: boolean;
    type: 'order' | 'pickup' | 'general';
    adminPhone: string;
    message: string;
    url: string;
  }>({
    isOpen: false,
    type: 'order',
    adminPhone: '',
    message: '',
    url: ''
  });
  const [copiedStage4Share, setCopiedStage4Share] = useState(false);

  const inProgressFileInputRef = useRef<HTMLInputElement>(null);
  const completedFileInputRef = useRef<HTMLInputElement>(null);
  const arrivalVideoInputRef = useRef<HTMLInputElement>(null);
  const stage3FileInputRef = useRef<HTMLInputElement>(null);
  const stage3VideoInputRef = useRef<HTMLInputElement>(null);
  const stage4FileInputRef = useRef<HTMLInputElement>(null);
  const stage4VideoInputRef = useRef<HTMLInputElement>(null);
  const [showFastCameraModal, setShowFastCameraModal] = useState(false);

  // Real-time calculation of technician availability and active workloads
  const techWorkloadMap = useMemo(() => {
    const map = new Map<string, {
      activeJobsCount: number;
      activeRecords: MaintenanceRecord[];
      isBusy: boolean;
    }>();

    technicians.forEach(tech => {
      const techName = (tech.fullName || '').trim().toLowerCase();
      const activeRecords = (allRecords || []).filter(r => {
        if (r.id === record.id) return false; // Exclude current record being assigned
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        const matchId = r.assignedStaffId === tech.id;
        const matchName = Boolean(r.assignedStaffName && techName && r.assignedStaffName.trim().toLowerCase() === techName);
        return matchId || matchName;
      });

      map.set(tech.id, {
        activeJobsCount: activeRecords.length,
        activeRecords,
        isBusy: activeRecords.length > 0
      });
    });

    return map;
  }, [technicians, allRecords, record.id]);

  const freeTechsCount = useMemo(() => {
    return technicians.filter(t => !techWorkloadMap.get(t.id)?.isBusy).length;
  }, [technicians, techWorkloadMap]);

  const busyTechsCount = useMemo(() => {
    return technicians.filter(t => techWorkloadMap.get(t.id)?.isBusy).length;
  }, [technicians, techWorkloadMap]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      const isBusy = techWorkloadMap.get(tech.id)?.isBusy ?? false;
      if (techAvailabilityFilter === 'free') return !isBusy;
      if (techAvailabilityFilter === 'busy') return isBusy;
      return true;
    });
  }, [technicians, techWorkloadMap, techAvailabilityFilter]);

  // Technician Name resolution
  const currentTechName = currentStaffUser?.fullName || record.assignedStaffName || 'فني الصيانة';
  const bookingNumber = record.bookingId || record.id.slice(-6).toUpperCase();

  // Clean phone numbers for whatsapp
  const cleanCustomerPhone = (record.customerPhone || '').replace(/\D/g, '');
  const customerWaPhone = cleanCustomerPhone.startsWith('966') 
    ? cleanCustomerPhone 
    : cleanCustomerPhone.startsWith('0') 
      ? '966' + cleanCustomerPhone.slice(1) 
      : '966' + cleanCustomerPhone;

  // Generic Image Uploader Handler
  const handleProcessImageFiles = async (
    files: FileList | null, 
    setPhotosState: React.Dispatch<React.SetStateAction<{ url: string; caption: string; isInternalOnly: boolean }[]>>,
    defaultInternal = false
  ) => {
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    try {
      const newPhotos: { url: string; caption: string; isInternalOnly: boolean }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImage(file, 800, 800, 0.65);
        newPhotos.push({
          url: compressedBase64,
          caption: '',
          isInternalOnly: defaultInternal
        });
      }
      setPhotosState(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Error compressing images:', err);
      alert('حدث خطأ أثناء معالجة الصور، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingImages(false);
    }
  };

  // Video Uploader Handler for Inspection / Stages (Supports Direct Fast Camera Blob or FileList)
  const handleProcessVideoFile = async (
    input: FileList | File | Blob | null,
    targetStage: 2 | 3 | 4 | 5 = fastVideoTargetStage
  ) => {
    if (!input) return;
    let file: File | Blob;
    if (input instanceof FileList) {
      if (input.length === 0) return;
      file = input[0];
    } else {
      file = input;
    }

    if (file.type && !file.type.startsWith('video/')) {
      alert('يرجى اختيار ملف فيديو صالح.');
      return;
    }

    setIsProcessingVideo(true);
    setVideoProgressStatus('جاري ضغط وتجهيز الفيديو السريع...');
    try {
      const videoKey = `video_${record.id}_stage${targetStage}_${Date.now()}`;
      const { videoUrl, thumbnailUrl } = await storeInspectionVideo(
        videoKey, 
        file, 
        (pct, text) => setVideoProgressStatus(`${text} (${pct}%)`)
      );

      const stageCaption = 
        targetStage === 2 ? 'فيديو توثيق فحص واستلام السيارة ومحيط البودي والعداد عند الوصول 🎥' :
        targetStage === 3 ? 'فيديو توثيق وتشخيص العطل والخراب ⚠️' :
        targetStage === 4 ? 'فيديو توثيق القطعة الجديدة أو بعد الإصلاح 📦' :
        'فيديو اختبار تشغيل السيارة وإتمام الصيانة 🏁';

      const newMediaItem = {
        url: thumbnailUrl,
        videoUrl: videoUrl,
        mediaType: 'video' as const,
        caption: stageCaption,
        isInternalOnly: false
      };

      if (targetStage === 2) {
        setStage2Photos(prev => [...prev, newMediaItem]);
      } else if (targetStage === 3) {
        setStage3Photos(prev => [...prev, newMediaItem]);
      } else if (targetStage === 4) {
        setStage4Photos(prev => [...prev, newMediaItem]);
      } else if (targetStage === 5) {
        setCompletedPhotos(prev => [...prev, newMediaItem]);
      }

      setInProgressPhotos(prev => [...prev, newMediaItem]);
    } catch (err) {
      console.error('Error processing inspection video:', err);
      alert('حدث خطأ أثناء معالجة وحفظ الفيديو، يرجى المحاولة مجدداً.');
    } finally {
      setIsProcessingVideo(false);
      setVideoProgressStatus('');
    }
  };

  // Re-upload or replace video directly into Firestore cloud storage (fixes legacy expired blob URLs)
  const handleReuploadVideoForRecord = async (file: File) => {
    if (!file || !file.type.startsWith('video/')) {
      alert('يرجى اختيار ملف فيديو صالح.');
      return;
    }

    setIsProcessingVideo(true);
    setVideoProgressStatus('جاري رفع المقطع الجديد إلى السحابة...');
    try {
      const videoKey = `video_${record.id}_${Date.now()}`;
      const { videoUrl, thumbnailUrl } = await storeInspectionVideo(
        videoKey, 
        file, 
        (pct, text) => setVideoProgressStatus(`${text} (${pct}%)`)
      );

      // Update existing record timeline history steps
      const currentSteps: ServiceStepLog[] = record.serviceSteps || [];
      const updatedSteps = currentSteps.map(step => {
        const updatedPhotos = (step.photos || []).map(p => {
          if (p.mediaType === 'video' || p.videoUrl || p.caption?.includes('فيديو')) {
            return {
              ...p,
              url: thumbnailUrl || p.url,
              videoUrl: videoUrl,
              mediaType: 'video' as const,
              caption: p.caption || 'فيديو توثيق فحص واستلام السيارة عند الوصول 🎥'
            };
          }
          return p;
        });
        return { ...step, photos: updatedPhotos };
      });

      // Update record in Firestore
      const recordRef = doc(db, 'maintenance', record.id);
      const cleanedSteps = cleanFirestorePayload(updatedSteps);
      await updateDoc(recordRef, {
        serviceSteps: cleanedSteps,
        updatedAt: new Date().toISOString()
      });

      // Notify parent state
      onUpdateRecord({
        ...record,
        serviceSteps: cleanedSteps
      });

      // Update lightbox player view
      setLightboxImage({
        url: thumbnailUrl,
        videoUrl: videoUrl,
        mediaType: 'video',
        title: 'فيديو الفحص والمعاينة السحابي 🎥',
        caption: 'تم الحفظ في السحابة بنجاح!'
      });

      alert('تم رفع وتثبيت فيديو الفحص السحابي بنجاح! يعمل الآن على جميع الأجهزة.');
    } catch (err) {
      console.error('Failed to reupload video:', err);
      alert('تعذر استكمال رفع الفيديو، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingVideo(false);
      setVideoProgressStatus('');
    }
  };

  // Notify Owner on Service Completion
  const notifyOwnerServiceCompleted = async (finalNote: string, totalPhotosCount: number) => {
    const title = 'اكتمال السند الفني 🏁';
    const body = `تم إكمال السند الفني رقم #${bookingNumber} بواسطة الفني ${currentTechName}`;

    // 1. Record in Firestore 'notifications' collection
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'service_completed',
        title,
        body,
        bookingId: bookingNumber,
        recordId: record.id,
        technicianName: currentTechName,
        carModel: record.carModel || 'غير محدد',
        customerName: record.customerName || record.customerPhone || 'عميل',
        customerPhone: record.customerPhone || '',
        serviceType: record.serviceType || 'صيانة متنقلة',
        finalNote: finalNote || '',
        photosCount: totalPhotosCount,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (err) {
      console.warn('Firestore notification error:', err);
    }

    // 2. Direct Telegram Bot Notification to Admin/Owner
    try {
      const token = telegramConfig?.botToken || '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
      const chatId = telegramConfig?.chatId || '867105778';

      if (token && chatId) {
        const saudiTime = new Date().toLocaleTimeString('ar-SA', { 
          timeZone: 'Asia/Riyadh', 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });

        const tgText = `🏁 <b>اكتمال السند الفني في DR.FIX</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🔢 <b>رقم السند:</b> #${bookingNumber}\n` +
          `👨‍🔧 <b>الفني المنفذ:</b> ${currentTechName}\n` +
          `🚘 <b>السيارة:</b> ${record.carModel || 'سيارة العميل'}\n` +
          `👤 <b>العميل:</b> ${record.customerName || 'عميل كريم'}\n` +
          `📱 <b>الجوال:</b> <code>${record.customerPhone || ''}</code>\n` +
          `🛠️ <b>الخدمة:</b> ${record.serviceType || 'صيانة متنقلة'}\n` +
          `📝 <b>ملاحظات ختامية:</b> ${finalNote || 'تمت الصيانة بنجاح'}\n` +
          `📸 <b>عدد الصور الموثقة:</b> ${totalPhotosCount}\n` +
          `⏰ <b>توقيت الإنجاز:</b> ${saudiTime}\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `✨ <i>يمكن للإدارة مراجعة سجل الصيانة الميدانية والصور بالكامل من لوحة التحكم.</i>`;

        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: tgText,
            parse_mode: 'HTML'
          })
        }).catch(err => console.warn('Telegram completion notification error:', err));
      }
    } catch (tgErr) {
      console.warn('Telegram notification err:', tgErr);
    }

    // 3. Dispatch browser event
    try {
      window.dispatchEvent(new CustomEvent('drfix_task_completed', { 
        detail: { 
          bookingId: bookingNumber, 
          recordId: record.id, 
          technicianName: currentTechName,
          carModel: record.carModel 
        } 
      }));
    } catch {}
  };

  // --- STAGE 1: CONFIRM ARRIVAL (المرحلة 1: وصول الفني للموقع 📍) ---
  const handleConfirmArrival = async () => {
    setIsSavingStage1(true);
    try {
      const noteText = stage1Note.trim() || 'تم تأكيد وصول الفني لموقع العميل بالوقت الفعلي وبدء الاستعداد للمعانية والفحص.';
      const newStep: ServiceStepLog = {
        id: `step_arrival_${Date.now()}`,
        stepKey: 'arrival',
        title: 'وصول الفني للموقع 📍',
        note: noteText,
        isCustomerVisible: true,
        isInternalOnly: false,
        photos: [],
        recordedBy: currentTechName,
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const updatedSteps = cleanFirestorePayload([...steps, newStep]);
      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'in-progress'
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم تأكيد وصول الفني بنجاح! انتقل للمرحلة 2 لتصوير الفيديو 🎥');
      setTimeout(() => setStageSuccessMsg(''), 4000);
      setWorkflowStage(2); // Automatically advance to Stage 2: Video of car and odometer
    } catch (err) {
      console.error('Error confirming arrival:', err);
      alert('تعذر تأكيد الوصول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSavingStage1(false);
    }
  };

  // --- STAGE 2: CAR & ODOMETER VIDEO (المرحلة 2: تصوير فيديو للسيارة كامل والعداد 🎥) ---
  const handleSaveStage2Video = async () => {
    if (stage2Photos.length === 0) {
      const proceed = window.confirm('لم يتم التقاط فيديو للسيارة والعداد بعد. يفضل بشدة توثيق حالة السيارة بالفيديو لحفظ الحقوق. هل تود المتابعة بدون فيديو؟');
      if (!proceed) return;
    }

    setIsSavingStage2(true);
    try {
      const photosPayload: ServiceStepPhoto[] = stage2Photos.map(p => {
        const item: ServiceStepPhoto = {
          id: `photo_st2_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: p.url || '',
          caption: (p.caption || '').trim() || 'فيديو توثيق فحص واستلام السيارة ومحيط البودي وقراءة العداد عند الوصول 🎥',
          isInternalOnly: false,
          isCustomerVisible: true,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentTechName || 'فني الصيانة',
          mediaType: p.mediaType || (p.videoUrl ? 'video' : 'image')
        };
        if (p.videoUrl) {
          item.videoUrl = p.videoUrl;
        }
        return item;
      });

      const newStep: ServiceStepLog = {
        id: `step_video_${Date.now()}`,
        stepKey: 'car_and_odometer_video',
        title: 'تصوير فيديو للسيارة كامل والعداد 🎥',
        note: stage2Note.trim() || 'فيديو توثيق فحص واستلام السيارة ومحيط البودي وقراءة العداد عند الوصول 🎥',
        isInternalOnly: false,
        isCustomerVisible: true,
        photos: photosPayload,
        recordedBy: currentTechName || 'فني الصيانة',
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const rawUpdatedSteps = [...steps, newStep];
      const updatedSteps = cleanFirestorePayload(rawUpdatedSteps);

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'in-progress'
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم حفظ فيديو فحص السيارة والعداد بنجاح! انتقل للمرحلة 3 ⚠️');
      setTimeout(() => setStageSuccessMsg(''), 4000);
      setWorkflowStage(3); // Advance to Stage 3: Fault documentation
    } catch (err: any) {
      console.error('Error saving stage 2 video:', err);
      alert('تعذر حفظ فيديو المرحلة 2، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSavingStage2(false);
    }
  };

  // --- STAGE 3: FAULT DOCUMENTATION (المرحلة 3: تصوير الخراب أو شرح العطل ⚠️) ---
  const handleSaveStage3Fault = async () => {
    if (stage3Photos.length === 0 && !stage3Note.trim()) {
      alert('يرجى التقاط صورة أو تسجيل فيديو أو كتابة شرح للعطل والخراب.');
      return;
    }

    setIsSavingStage3(true);
    try {
      const photosPayload: ServiceStepPhoto[] = stage3Photos.map(p => {
        const item: ServiceStepPhoto = {
          id: `photo_st3_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: p.url || '',
          caption: (p.caption || '').trim() || 'توثيق العطل / الخراب في القطعة المتضررة ⚠️',
          isInternalOnly: !stage3CustomerVisible ? true : Boolean(p.isInternalOnly),
          isCustomerVisible: stage3CustomerVisible && !p.isInternalOnly,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentTechName || 'فني الصيانة',
          mediaType: p.mediaType || (p.videoUrl ? 'video' : 'image')
        };
        if (p.videoUrl) {
          item.videoUrl = p.videoUrl;
        }
        return item;
      });

      const newStep: ServiceStepLog = {
        id: `step_fault_${Date.now()}`,
        stepKey: 'fault_documentation',
        title: 'تصوير الخراب وشرح العطل ⚠️',
        note: stage3Note.trim() || 'توثيق وتشخيص العطل / الخراب في القطعة المتضررة وتوضيح أسباب الصيانة ⚠️',
        isInternalOnly: !stage3CustomerVisible,
        isCustomerVisible: stage3CustomerVisible,
        photos: photosPayload,
        recordedBy: currentTechName || 'فني الصيانة',
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const rawUpdatedSteps = [...steps, newStep];
      const updatedSteps = cleanFirestorePayload(rawUpdatedSteps);

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'in-progress'
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم حفظ توثيق الخراب بنجاح! انتقل للمرحلة 4 (القطعة الجديدة) 📦');
      setTimeout(() => setStageSuccessMsg(''), 4000);
      setWorkflowStage(4); // Advance to Stage 4: New part / after repair
    } catch (err: any) {
      console.error('Error saving stage 3 fault:', err);
      alert('تعذر حفظ توثيق الخراب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSavingStage3(false);
    }
  };

  // --- STAGE 4: NEW PART / AFTER REPAIR (المرحلة 4: تصوير القطعة الجديدة أو بعد الإصلاح 📦) ---
  const handleSaveStage4NewPart = async () => {
    if (stage4Photos.length === 0 && !stage4Note.trim()) {
      alert('يرجى التقاط صورة أو فيديو للقطعة الجديدة أو بعد إتمام الإصلاح.');
      return;
    }

    setIsSavingStage4(true);
    try {
      const photosPayload: ServiceStepPhoto[] = stage4Photos.map(p => {
        const item: ServiceStepPhoto = {
          id: `photo_st4_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: p.url || '',
          caption: (p.caption || '').trim() || 'توثيق القطعة الجديدة ومطابقتها وسلامة التركيب بعد الإصلاح 📦',
          isInternalOnly: !stage4CustomerVisible ? true : Boolean(p.isInternalOnly),
          isCustomerVisible: stage4CustomerVisible && !p.isInternalOnly,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentTechName || 'فني الصيانة',
          mediaType: p.mediaType || (p.videoUrl ? 'video' : 'image')
        };
        if (p.videoUrl) {
          item.videoUrl = p.videoUrl;
        }
        return item;
      });

      const newStep: ServiceStepLog = {
        id: `step_newpart_${Date.now()}`,
        stepKey: 'new_part_after_repair',
        title: 'تصوير القطعة الجديدة أو بعد الإصلاح 📦',
        note: stage4Note.trim() || 'توثيق القطعة الجديدة الأصلية والتأكد من مطابقتها وسلامة التركيب بعد الإصلاح 📦',
        isInternalOnly: !stage4CustomerVisible,
        isCustomerVisible: stage4CustomerVisible,
        photos: photosPayload,
        recordedBy: currentTechName || 'فني الصيانة',
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const rawUpdatedSteps = [...steps, newStep];
      const updatedSteps = cleanFirestorePayload(rawUpdatedSteps);

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'in-progress'
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم حفظ توثيق القطعة الجديدة بنجاح! انتقل للمرحلة الأخيرة (إتمام العمل) 🏁');
      setTimeout(() => setStageSuccessMsg(''), 4000);
      setWorkflowStage(5); // Advance to Stage 5: Completion
    } catch (err: any) {
      console.error('Error saving stage 4 new part:', err);
      alert('تعذر حفظ توثيق القطعة الجديدة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSavingStage4(false);
    }
  };

  // --- STAGE 5: SUBMIT COMPLETION (المرحلة 5: تصوير إتمام العمل والانتهاء 🏁) ---
  const handleCompleteService = async () => {
    if (!completedNote.trim()) {
      alert('يرجى كتابة ملاحظات ختامية حول إنجاز الصيانة.');
      return;
    }

    if (completedPhotos.length === 0) {
      if (!window.confirm('يفضل بشدة رفع صورة أو فيديو نهائي يوثق إنجاز الصيانة واختبار التشغيل. هل تود الاستمرار والإكمال بدون وسائط؟')) {
        return;
      }
    }

    setIsCompleting(true);
    try {
      const photosPayload: ServiceStepPhoto[] = completedPhotos.map(p => {
        const item: ServiceStepPhoto = {
          id: `photo_final_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: p.url || '',
          caption: (p.caption || '').trim() || 'صورة إتمام العمل والجاهزية بعد الصيانة 🏁',
          isInternalOnly: Boolean(p.isInternalOnly),
          isCustomerVisible: !p.isInternalOnly,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentTechName || 'فني الصيانة',
          mediaType: p.mediaType || (p.videoUrl ? 'video' : 'image')
        };
        if (p.videoUrl) {
          item.videoUrl = p.videoUrl;
        }
        return item;
      });

      const finalStep: ServiceStepLog = {
        id: `step_completed_${Date.now()}`,
        stepKey: 'completion_and_delivery',
        title: 'إتمام العمل والانتهاء والتسليم 🏁',
        note: completedNote.trim(),
        isCustomerVisible: true,
        isInternalOnly: false,
        photos: photosPayload,
        recordedBy: currentTechName || 'فني الصيانة',
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'completed'
      };

      const rawUpdatedSteps = [...steps, finalStep];
      const updatedSteps = cleanFirestorePayload(rawUpdatedSteps);
      const nowIso = new Date().toISOString();

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'completed',
        completedAt: nowIso,
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'completed',
        completedAt: nowIso
      };

      onUpdateRecord(updatedRecord);

      // Trigger automatic Owner notification (Firestore + Telegram)
      const totalAllPhotos = updatedSteps.reduce((acc, s) => acc + (s.photos?.length || 0), 0);
      await notifyOwnerServiceCompleted(completedNote.trim(), totalAllPhotos);

      setCompletionSuccess(true);
    } catch (err: any) {
      console.error('Error completing service:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('exceeds maximum allowed size') || errMsg.includes('too large')) {
        alert('حجم التحديث كبير جداً بسبب حجم الصور. يرجى إرفاق صور أقل والمحاولة ثانية.');
      } else {
        alert('تعذر إكمال المهمة، يرجى المحاولة ثانية.');
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // Helper actions: Accept task & On the way
  const handleAcceptTask = async () => {
    setIsAccepting(true);
    try {
      const newStep: ServiceStepLog = {
        id: `step_accept_${Date.now()}`,
        stepKey: 'accepted',
        title: 'تم قبول المهمة ✅',
        note: acceptedNote.trim() || 'تم قبول المهمة الفنية وجاري التجهيز للانطلاق.',
        isCustomerVisible: true,
        isInternalOnly: false,
        photos: [],
        recordedBy: currentTechName,
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'accepted'
      };

      const updatedSteps = [...steps, newStep];
      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'accepted'
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم قبول المهمة الفنية بنجاح!');
      setTimeout(() => setStageSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error accepting task:', err);
      alert('تعذر تحديث الحالة إلى تم القبول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleOnTheWay = async () => {
    if (!etaTime.trim()) {
      alert('يرجى تحديد المدة أو الوقت المتوقع للوصول');
      return;
    }

    setIsOnTheWaySaving(true);
    try {
      const newStep: ServiceStepLog = {
        id: `step_ontheway_${Date.now()}`,
        stepKey: 'on_the_way',
        title: 'الفني بالطريق 🚗',
        estimatedArrival: etaTime.trim(),
        note: onTheWayNote.trim() || `الفني بالطريق إلى موقع العميل. ${etaTime.trim()}`,
        isCustomerVisible: true,
        isInternalOnly: false,
        photos: [],
        recordedBy: currentTechName,
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'on_the_way'
      };

      const updatedSteps = [...steps, newStep];
      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'on_the_way',
        estimatedArrival: etaTime.trim(),
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'on_the_way',
        estimatedArrival: etaTime.trim()
      };

      onUpdateRecord(updatedRecord);
      setStageSuccessMsg('تم تحديث الحالة إلى الفني بالطريق وإشعار العميل.');
      setTimeout(() => setStageSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error setting on the way:', err);
      alert('تعذر تحديث الحالة إلى الفني بالطريق.');
    } finally {
      setIsOnTheWaySaving(false);
    }
  };

  // Legacy/Custom In-progress update step
  const handleAddInProgressUpdate = async () => {
    const noteText = inProgressNote.trim() || inProgressCategory.defaultNote;
    setIsInProgressSaving(true);

    try {
      const photosPayload: ServiceStepPhoto[] = inProgressPhotos.map(p => {
        const item: ServiceStepPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: p.url || '',
          caption: (p.caption || '').trim() || inProgressCategory.title,
          isInternalOnly: !isCustomerVisible ? true : Boolean(p.isInternalOnly),
          isCustomerVisible: isCustomerVisible && !p.isInternalOnly,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentTechName || 'فني الصيانة',
          mediaType: p.mediaType || (p.videoUrl ? 'video' : 'image')
        };
        if (p.videoUrl) {
          item.videoUrl = p.videoUrl;
        }
        return item;
      });

      const newStep: ServiceStepLog = {
        id: `step_progress_${Date.now()}`,
        stepKey: 'in_progress',
        title: inProgressCategory.title,
        note: noteText,
        isInternalOnly: !isCustomerVisible,
        isCustomerVisible: isCustomerVisible,
        photos: photosPayload,
        recordedBy: currentTechName || 'فني الصيانة',
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const rawUpdatedSteps = [...steps, newStep];
      const updatedSteps = cleanFirestorePayload(rawUpdatedSteps);

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: 'in-progress'
      };

      onUpdateRecord(updatedRecord);

      setInProgressNote('');
      setInProgressPhotos([]);
      setStageSuccessMsg(`تم حفظ تحديث "${inProgressCategory.title}" في سجل الصيانة بنجاح! 📸`);
      setTimeout(() => setStageSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error('Error saving in-progress step:', err);
      alert('تعذر حفظ التحديث، يرجى المحاولة ثانية.');
    } finally {
      setIsInProgressSaving(false);
    }
  };

  // Assign Technician (from list or manual input)
  const handleSaveTechnician = async () => {
    let techName = '';
    let techPhone = '';
    let techId = '';

    if (assignmentMode === 'manual') {
      if (!manualTechName.trim()) {
        alert('يرجى كتابة اسم الفني المسؤول أولاً');
        return;
      }
      techName = manualTechName.trim();
      techPhone = manualTechPhone.trim();
      if (!techPhone) {
        if (!window.confirm('تنبيه: لم تقم بإدخال رقم جوال الفني. لن يتمكن النظام من تحويلك إلى واتساب الفني لإرسال تفاصيل المهمة تلقائياً.\n\nهل ترغب بالاستمرار بدون رقم جوال؟ (يُفضل إدخال رقم الجوال)')) {
          return;
        }
      }
      techId = record.assignedStaffId?.startsWith('manual_') ? record.assignedStaffId : `manual_${Date.now()}`;
    } else {
      if (!selectedTechnicianId) {
        alert('يرجى اختيار فني من القائمة أولاً أو التبديل للإدخال المباشر');
        return;
      }
      const tech = staffList.find(s => s.id === selectedTechnicianId);
      if (!tech) {
        alert('لم يتم العثور على الفني المحدد');
        return;
      }
      techId = tech.id;
      techName = tech.fullName;
      techPhone = tech.phone || '';
    }

    setIsAssigning(true);
    try {
      const docRef = doc(db, 'maintenance', record.id);
      const payload: any = {
        assignedStaffId: techId,
        assignedStaffName: techName,
        assignedStaffPhone: techPhone,
        assignedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, payload);
      playTaskAssignedSound();

      const updatedRecord: MaintenanceRecord = {
        ...record,
        ...payload
      };

      onUpdateRecord(updatedRecord);

      // WhatsApp Redirection: Open chat and display dispatch confirmation modal
      const waUrl = techPhone ? generateTechnicianAssignmentWhatsAppUrl(updatedRecord, techPhone, techName) : '';
      if (waUrl) {
        try {
          window.open(waUrl, '_blank');
        } catch (e) {
          console.warn('Popup blocked, WhatsApp modal dialog will be displayed', e);
        }

        setAssignedWhatsAppDialog({
          isOpen: true,
          url: waUrl,
          techName,
          techPhone,
          message: getTechnicianAssignmentMessage(updatedRecord, techName)
        });
      } else {
        setAssignSuccessMsg(`تم إسناد الطلب للفني (${techName}) بنجاح!`);
        setTimeout(() => {
          setAssignSuccessMsg('');
          setActiveTab('workflow');
        }, 3000);
      }
    } catch (err) {
      console.error('Error assigning technician:', err);
      alert('تعذر إسناد الفني.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove / Unassign Technician
  const handleUnassignTechnician = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء إسناد الفني من هذا الطلب؟')) return;
    setIsAssigning(true);

    try {
      const docRef = doc(db, 'maintenance', record.id);
      const payload: any = {
        assignedStaffId: null,
        assignedStaffName: null,
        assignedStaffPhone: null,
        assignedAt: null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, payload);

      const updatedRecord: MaintenanceRecord = {
        ...record,
        assignedStaffId: undefined,
        assignedStaffName: undefined,
        assignedStaffPhone: undefined,
        assignedAt: undefined
      };

      setSelectedTechnicianId('');
      setManualTechName('');
      setManualTechPhone('');
      onUpdateRecord(updatedRecord);
      setAssignSuccessMsg('تم إلغاء إسناد الفني.');
      setTimeout(() => setAssignSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error unassigning technician:', err);
      alert('تعذر إلغاء الإسناد.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Delete a step
  const handleDeleteStep = async (stepId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التحديث من سجل خطوات الصيانة؟')) return;

    try {
      const updatedSteps = steps.filter(s => s.id !== stepId);
      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps
      };
      onUpdateRecord(updatedRecord);
    } catch (err) {
      console.error('Error deleting step:', err);
      alert('تعذر الحذف.');
    }
  };

  // Raw unencoded progress update text for customer
  const getCustomerProgressRawText = () => {
    const customerName = (record.customerName || record.name || 'عميلنا العزيز').trim();
    const photosCount = steps.reduce((sum, s) => sum + s.photos.filter(p => !p.isInternalOnly).length, 0);

    return (
      `🚗⚡ *تقرير صيانة سيارتك - DR.FIX*\n\n` +
      `أهلاً ${customerName} 👋\n` +
      `تم توثيق مراحل صيانة سيارتك (${record.carModel}) رقم السند: #${bookingNumber}.\n\n` +
      `📸 تم رفع (${photosCount}) صور للمعاينة وقطع الغيار والتنفيذ.\n` +
      (record.estimatedArrival ? `⏱️ وقت الوصول المتوقع: ${record.estimatedArrival}\n` : '') +
      `الحالة الحالية: ${
        record.status === 'completed' ? 'تمت الصيانة بنجاح 🏁' :
        record.status === 'in-progress' ? 'قيد العمل واستبدال القطع 🔧' :
        record.status === 'on_the_way' ? 'الفني بالطريق إليك 🚗' :
        'تم قبول المهمة والاعتماد ✅'
      }\n\n` +
      `شكراً لثقتكم بمركز Dr. Fix!`
    );
  };

  // WhatsApp link to send progress update to customer directly
  const getCustomerProgressWhatsAppUrl = () => {
    const text = encodeURIComponent(getCustomerProgressRawText());
    return `https://api.whatsapp.com/send?phone=${customerWaPhone}&text=${text}`;
  };

  // Stage 4: إنشاء نص واتساب لمشاركة القطعة مع الإدارة
  const getStage4ManagementMessage = (type: 'order' | 'pickup' | 'general' = 'order') => {
    const carDetails = `${record.carModel || 'سيارة العميل'}${record.carYear ? ' ' + record.carYear : ''}${record.plateNumber ? ' (' + record.plateNumber + ')' : ''}`;
    const partDetails = stage4Note.trim() || 'تفاصيل القطعة المطلوبة مسجلة في التقرير الفني والمرفقات.';
    const photosCount = stage4Photos.length;

    let typeHeadline = '';
    let actionRequested = '';

    if (type === 'order') {
      typeHeadline = '📦 طلب توفير / شراء قطعة غيار جديدة';
      actionRequested = 'يرجى من الإدارة طلب وتوفير هذه القطعة من الموردين أو اعتمادها عاجلاً.';
    } else if (type === 'pickup') {
      typeHeadline = '🚗 توجيه لاستلام قطعة الغيار (روح جيبها)';
      actionRequested = 'يرجى إفادتي بموقع أو موزع القطعة ومبلغها للتوجه لاستلامها وإكمال التركيب.';
    } else {
      typeHeadline = '📦 استشارة وتوجيه بخصوص قطعة الغيار';
      actionRequested = 'يرجى مراجعة تفاصيل القطعة وتزويدي بالتوجيه المناسب (توفيرها من الإدارة أو التوجه لشرائها).';
    }

    return (
      `السلام عليكم ورحمة الله وبركاته - إدارة DR.FIX 🛠️\n` +
      `معكم الفني: ${currentTechName}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*${typeHeadline}*\n` +
      `🔢 *رقم السند:* #${bookingNumber}\n` +
      `🚘 *السيارة:* ${carDetails}\n` +
      `👤 *العميل:* ${record.customerName || record.name || 'عميل كريم'}\n` +
      `🛠️ *الخدمة:* ${record.serviceType || 'صيانة متنقلة'}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📝 *بيانات القطعة / الملاحظات:*\n${partDetails}\n` +
      (photosCount > 0 ? `📸 *المرفقات الميدانية:* تم توثيق (${photosCount}) صور/مقاطع للقطعة.\n` : '') +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⚡ *المطلوب:* ${actionRequested}\n` +
      `بانتظار ردكم الكريم للبدء مباشرة 🙏`
    );
  };

  const handleOpenStage4ShareModal = (initialType: 'order' | 'pickup' | 'general' = 'order') => {
    // Determine admin phone: from admin / dispatcher in staffList or default
    const adminUser = (staffList || []).find(s => s.role === 'super_admin' || s.role === 'dispatcher' || s.role === 'support');
    const rawAdminPhone = adminUser?.phone || '0554558509';
    const cleanAdmin = rawAdminPhone.replace(/\D/g, '');
    const finalAdminWa = cleanAdmin.startsWith('966') 
      ? cleanAdmin 
      : cleanAdmin.startsWith('0') 
        ? '966' + cleanAdmin.slice(1) 
        : '966' + cleanAdmin;

    const msg = getStage4ManagementMessage(initialType);
    const url = `https://api.whatsapp.com/send?phone=${finalAdminWa}&text=${encodeURIComponent(msg)}`;

    setStage4ShareDialog({
      isOpen: true,
      type: initialType,
      adminPhone: finalAdminWa,
      message: msg,
      url
    });
  };

  const handleUpdateStage4ShareType = (newType: 'order' | 'pickup' | 'general') => {
    const msg = getStage4ManagementMessage(newType);
    const url = `https://api.whatsapp.com/send?phone=${stage4ShareDialog.adminPhone}&text=${encodeURIComponent(msg)}`;
    setStage4ShareDialog(prev => ({
      ...prev,
      type: newType,
      message: msg,
      url
    }));
  };

  // Helper to determine status badge
  const getStatusBadge = () => {
    switch (record.status) {
      case 'accepted':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 whitespace-nowrap">مقبول ✅</span>;
      case 'on_the_way':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">بالطريق 🚗</span>;
      case 'in-progress':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-red/15 text-red-200 border border-brand-red/30 whitespace-nowrap">قيد العمل 🔧</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">مكتمل 🏁</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-gray-300 border border-white/15 whitespace-nowrap">انتظار ⏳</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain pb-12 sm:pb-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl bg-brand-dark/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] my-auto text-right"
        dir="rtl"
      >
        {/* Compact Header Bar */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-white/10 bg-gradient-to-r from-brand-red/15 via-white/5 to-white/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 shadow-sm">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  السند #{bookingNumber}
                </h3>
                {getStatusBadge()}
                {record.assignedStaffName && (
                  <span className="text-[10px] text-gray-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 hidden sm:inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-brand-red" />
                    <span>الفني: <strong className="text-white">{record.assignedStaffName}</strong></span>
                  </span>
                )}
                {record.estimatedArrival && record.status !== 'completed' && (
                  <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/25 hidden xs:inline-flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    <span>{record.estimatedArrival}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white">{record.carModel}</span>
                <span>•</span>
                <span className="text-brand-red/90 font-medium">{record.serviceType}</span>
                {record.customerName && (
                  <>
                    <span>•</span>
                    <span className="text-gray-300">{record.customerName}</span>
                  </>
                )}
                {record.serviceDate && (
                  <span className="text-gray-400 font-mono text-[10px] hidden md:inline">
                    ({new Date(record.serviceDate).toLocaleDateString('ar-SA')})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {record.customerPhone && (
              <a 
                href={`tel:${record.customerPhone}`}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title={`اتصال هاتفي (${record.customerPhone})`}
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </a>
            )}

            {customerWaPhone && (
              <a
                href={getCustomerProgressWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors"
                title="مشاركة مع العميل عبر الواتساب"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            {record.assignedStaffPhone && (
              <a
                href={generateTechnicianAssignmentWhatsAppUrl(record, record.assignedStaffPhone, record.assignedStaffName)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors flex items-center gap-1"
                title={`واتساب الفني المكلف (${record.assignedStaffName || 'الفني'}) - إرسال تفاصيل المهمة`}
              >
                <MessageCircle className="w-4 h-4 fill-current text-emerald-400" />
                <span className="hidden lg:inline text-[10px] font-bold text-emerald-300">واتساب الفني</span>
              </a>
            )}

            {record.coordinates?.latitude && record.coordinates?.longitude && (
              <a 
                href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors"
                title="فتح موقع العميل GPS"
              >
                <Navigation className="w-4 h-4" />
              </a>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Single Unified Compact Navigation & Stepper Bar (5 مراحل عمل الفني الميداني) */}
        <div className="px-2.5 sm:px-4 py-1.5 bg-black/40 border-b border-white/10 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <div className="flex items-center gap-1 whitespace-nowrap">
            {/* Step 1: وصول الفني */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(1); }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                workflowStage === 1 && activeTab === 'workflow'
                  ? "bg-brand-red text-white shadow-sm ring-1 ring-brand-red"
                  : isStepCompleted(1)
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <span>1. الوصول 📍</span>
              {isStepCompleted(1) && (
                <Check className="w-3 h-3 text-emerald-400" />
              )}
            </button>

            {/* Step 2: فيديو السيارة والعداد */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(2); }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                workflowStage === 2 && activeTab === 'workflow'
                  ? "bg-brand-red text-white shadow-sm ring-1 ring-brand-red"
                  : isStepCompleted(2)
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <span>2. فيديو السيارة 🎥</span>
              {isStepCompleted(2) && (
                <Check className="w-3 h-3 text-emerald-400" />
              )}
            </button>

            {/* Step 3: تصوير الخراب او شرح */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(3); }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                workflowStage === 3 && activeTab === 'workflow'
                  ? "bg-brand-red text-white shadow-sm ring-1 ring-brand-red"
                  : isStepCompleted(3)
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <span>3. الخراب ⚠️</span>
              {isStepCompleted(3) && <Check className="w-3 h-3 text-emerald-400" />}
            </button>

            {/* Step 4: القطعة الجديدة أو بعد الإصلاح */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(4); }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                workflowStage === 4 && activeTab === 'workflow'
                  ? "bg-brand-red text-white shadow-sm ring-1 ring-brand-red"
                  : isStepCompleted(4)
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <span>4. القطعة الجديدة 📦</span>
              {isStepCompleted(4) && <Check className="w-3 h-3 text-emerald-400" />}
            </button>

            {/* Step 5: إتمام العمل والانتهاء */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(5); }}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                workflowStage === 5 && activeTab === 'workflow'
                  ? "bg-brand-red text-white shadow-sm ring-1 ring-brand-red"
                  : isStepCompleted(5)
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <span>5. الإتمام 🏁</span>
              {isStepCompleted(5) && <Check className="w-3 h-3 text-emerald-400" />}
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-0.5 shrink-0" />

            {/* Tab: سجل خطوات الصيانة */}
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                activeTab === 'timeline'
                  ? "bg-brand-red text-white shadow-sm"
                  : "bg-white/5 text-gray-300 hover:text-white"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>السجل ({steps.length})</span>
            </button>

            {/* Tab: بيانات الطلب والسيارة */}
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                activeTab === 'details'
                  ? "bg-brand-red text-white shadow-sm"
                  : "bg-white/5 text-gray-300 hover:text-white"
              )}
            >
              <Car className="w-3.5 h-3.5" />
              <span>البيانات</span>
            </button>

            {/* Tab: إسناد الفني */}
            {!isTechnician && (
              <button
                type="button"
                onClick={() => setActiveTab('assign')}
                className={cn(
                  "px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[11px] sm:text-xs",
                  activeTab === 'assign'
                    ? "bg-brand-red text-white shadow-sm"
                    : "bg-white/5 text-gray-300 hover:text-white"
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>إسناد الفني</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <a
              href={getCustomerProgressWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 transition-colors"
              title="مشاركة تقرير الإنجاز مع العميل عبر الواتساب"
            >
              <Share2 className="w-3 h-3" />
              <span>مشاركة</span>
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 sm:space-y-6">
          {/* TAB 1: WORKFLOW STAGES (5 مراحل محددة ومباشرة للفني) */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Global Success Notification Banner */}
              {stageSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{stageSuccessMsg}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STAGE 1: وصول الفني */}
              {/* ========================================================================= */}
              {workflowStage === 1 && (
                <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red font-black text-xs">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>المرحلة الأولى: وصول الفني</span>
                          <span>📍</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">تأكيد وصول الفني لموقع العميل وبدء فحص السيارة ميدانياً.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      الخطوة 1 من 5
                    </span>
                  </div>

                  {isStepCompleted(1) || record.status === 'in-progress' || record.status === 'completed' ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم تأكيد وصول الفني للموقع بنجاح ✅</span>
                      </div>
                      <p className="text-xs text-gray-300">
                        تم تسجيل حالة الوصول وبدء الفحص. يمكنك الانتقال مباشرة للخطوة التالية لتصوير فيديو فحص السيارة والعداد.
                      </p>
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(2)}
                        className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
                      >
                        <span>الانتقال إلى: 2. تصوير فيديو للسيارة كامل والعداد 🎥</span>
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Optional ETA helper if technician is still on the way */}
                      {record.status !== 'on_the_way' && (
                        <div className="p-3 bg-black/30 border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-gray-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>هل ما زلت في الطريق للموقع؟</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={etaTime}
                              onChange={(e) => setEtaTime(e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white text-[11px]"
                            >
                              <option value="15 دقيقة">15 دقيقة</option>
                              <option value="30 دقيقة">30 دقيقة</option>
                              <option value="45 دقيقة">45 دقيقة</option>
                              <option value="ساعة">ساعة</option>
                            </select>
                            <button
                              type="button"
                              onClick={handleOnTheWay}
                              disabled={isOnTheWaySaving}
                              className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                            >
                              {isOnTheWaySaving ? 'جاري التحديث...' : 'تسجيل أني بالطريق 🚗'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1.5">
                          ملاحظات الوصول وبدء الفحص (اختياري):
                        </label>
                        <textarea
                          value={stage1Note}
                          onChange={(e) => setStage1Note(e.target.value)}
                          placeholder="مثال: تم الوصول لموقع العميل بنجاح، السيارة متوقفة في الموقع وجاري بدء الفحص..."
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <span className="text-[11px] text-gray-400">
                          الفني المسؤول: <b className="text-gray-200">{currentTechName}</b>
                        </span>

                        <button
                          type="button"
                          onClick={handleConfirmArrival}
                          disabled={isSavingStage1}
                          className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all active:scale-98 whitespace-nowrap"
                        >
                          {isSavingStage1 ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري التأكيد...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>📍 تأكيد الوصول ⬅️ الخطوة 2</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* STAGE 2: تصوير فديو للسيارة كامل والعداد */}
              {/* ========================================================================= */}
              {workflowStage === 2 && (
                <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red font-black text-xs">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>المرحلة الثانية: تصوير فيديو للسيارة كامل والعداد</span>
                          <span>🎥</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">فيديو سريع (15-20 ثانية) يوثق محيط السيارة، الخدوش السابقة، وقراءة العداد.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      الخطوة 2 من 5
                    </span>
                  </div>

                  {/* Hidden Input for Video File Picker */}
                  <input
                    type="file"
                    ref={arrivalVideoInputRef}
                    onChange={(e) => handleProcessVideoFile(e.target.files, 2)}
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* Video Processing State */}
                  {isProcessingVideo && (
                    <div className="p-4 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full animate-spin shrink-0" />
                      <div className="text-xs">
                        <div className="font-bold text-white">جاري معالجة وضغط الفيديو...</div>
                        <div className="text-gray-300 text-[11px]">{videoProgressStatus}</div>
                      </div>
                    </div>
                  )}

                  {/* Direct Camera & File Upload Action Strip */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFastVideoTargetStage(2);
                        setShowFastCameraModal(true);
                      }}
                      className="p-4 bg-gradient-to-r from-brand-red via-red-600 to-brand-red hover:brightness-110 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-brand-red/25 border border-red-400/40 cursor-pointer active:scale-98 transition-all"
                    >
                      <Video className="w-5 h-5 text-amber-300 animate-pulse" />
                      <span>🎥 الكاميرا المباشرة السريعة (فيديو 15-20 ث)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => arrivalVideoInputRef.current?.click()}
                      className="p-4 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                    >
                      <UploadCloud className="w-5 h-5 text-brand-red" />
                      <span>أو اختيار مقطع فيديو من ألبوم الجوال 📁</span>
                    </button>
                  </div>

                  {/* Existing Inspection Video Display if Available */}
                  {existingInspectionVideo && stage2Photos.length === 0 && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">يوجد فيديو فحص سيارة وعداد محفوظ مسبقاً</div>
                          <div className="text-[11px] text-gray-400">سجل بتاريخ {new Date(existingInspectionVideo.recordedAt).toLocaleTimeString('ar-SA')}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLightboxImage({
                          url: existingInspectionVideo.thumbnailUrl || existingInspectionVideo.videoUrl,
                          videoUrl: existingInspectionVideo.videoUrl,
                          mediaType: 'video',
                          title: 'فيديو فحص السيارة والعداد'
                        })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>تشغيل الفيديو</span>
                      </button>
                    </div>
                  )}

                  {/* Captured Stage 2 Media Cards */}
                  {stage2Photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>المقطع المسجل لهذه الخطوة ({stage2Photos.length}):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stage2Photos.map((item, idx) => (
                          <div key={idx} className="relative bg-black/60 rounded-2xl border border-white/10 overflow-hidden group">
                            <div className="aspect-video relative">
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt="فيديو السيارة والعداد"
                                className="w-full h-full object-cover"
                              />
                              <div 
                                onClick={() => setLightboxImage(item.url)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group-hover:bg-black/20 transition-all"
                              >
                                <div className="w-9 h-9 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg">
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStage2Photos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 left-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow cursor-pointer transition-all"
                              title="حذف المقطع"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="p-2 text-[10px] text-gray-300 truncate">
                              {item.caption || 'فيديو فحص السيارة والعداد'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes for Stage 2 */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">
                      ملاحظات حول حالة السيارة والعداد (اختياري):
                    </label>
                    <textarea
                      value={stage2Note}
                      onChange={(e) => setStage2Note(e.target.value)}
                      placeholder="مثال: قراءة العداد 78,540 كم، وجود خدش بسيط في الرفرف الأيمن موثق بالفيديو..."
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>

                  {/* Stage 2 Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setWorkflowStage(1)}
                      className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      ⬅️ الخطوة 1
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(3)}
                        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        تخطي ➡️
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveStage2Video}
                        disabled={isSavingStage2}
                        className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all active:scale-98 whitespace-nowrap"
                      >
                        {isSavingStage2 ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>حفظ الفيديو ➡️ الخطوة 3</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STAGE 3: تصوير الخراب او شرح */}
              {/* ========================================================================= */}
              {workflowStage === 3 && (
                <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>المرحلة الثالثة: تصوير الخراب أو شرح العطل</span>
                          <span>⚠️</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">توثيق وتصوير القطعة التالفة أو تسجيل فيديو قصير لشرح المشكلة للعميل.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      الخطوة 3 من 5
                    </span>
                  </div>

                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={stage3FileInputRef}
                    onChange={(e) => handleProcessImageFiles(e.target.files, setStage3Photos, !stage3CustomerVisible)}
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={stage3VideoInputRef}
                    onChange={(e) => handleProcessVideoFile(e.target.files, 3)}
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* Loading spinners */}
                  {isProcessingImages && (
                    <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex items-center gap-2 text-xs text-red-200">
                      <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                      <span>جاري معالجة وضغط الصور...</span>
                    </div>
                  )}
                  {isProcessingVideo && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs text-amber-200">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>{videoProgressStatus || 'جاري معالجة الفيديو...'}</span>
                    </div>
                  )}

                  {/* Capture actions */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => stage3FileInputRef.current?.click()}
                      className="p-4 bg-brand-red/15 hover:bg-brand-red/25 border-2 border-brand-red/30 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Camera className="w-5 h-5 text-brand-red" />
                      <span>📸 التقاط صور للخراب بالكاميرا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFastVideoTargetStage(3);
                        setShowFastCameraModal(true);
                      }}
                      className="p-4 bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-500/30 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Video className="w-5 h-5 text-amber-400" />
                      <span>🎥 فيديو سريع لشرح الخراب (20 ث)</span>
                    </button>
                  </div>

                  {/* Previews */}
                  {stage3Photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-300">توثيق الخراب المرفق ({stage3Photos.length}):</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stage3Photos.map((item, idx) => (
                          <div key={idx} className="relative bg-black/60 rounded-2xl border border-white/10 overflow-hidden group">
                            <div className="aspect-square relative cursor-pointer" onClick={() => setLightboxImage(item.url)}>
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt="توثيق الخراب"
                                className="w-full h-full object-cover"
                              />
                              {item.thumbnailUrl && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white fill-current" />
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setStage3Photos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 left-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow cursor-pointer transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <input
                              type="text"
                              value={item.caption}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStage3Photos(prev => prev.map((p, i) => i === idx ? { ...p, caption: val } : p));
                              }}
                              placeholder="وصف الخراب..."
                              className="w-full bg-black/80 text-[11px] text-white p-1.5 border-t border-white/10 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer visibility toggle */}
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-2xl border border-white/5 text-xs">
                    <span className="text-gray-300 font-bold">ظهور صور الخراب للعميل في تقرير الواتساب:</span>
                    <button
                      type="button"
                      onClick={() => setStage3CustomerVisible(!stage3CustomerVisible)}
                      className={cn(
                        "px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all",
                        stage3CustomerVisible ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-gray-400"
                      )}
                    >
                      {stage3CustomerVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{stage3CustomerVisible ? 'مرئي للعميل' : 'خاص بالإدارة فقط'}</span>
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">
                      شرح وتفاصيل الخراب / العطل:
                    </label>
                    <textarea
                      value={stage3Note}
                      onChange={(e) => setStage3Note(e.target.value)}
                      placeholder="مثال: تم فحص العطل وتبين وجود تهريب زيت من الصوفة وتآكل في القماشات..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setWorkflowStage(2)}
                      className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      ⬅️ الخطوة 2
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(4)}
                        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        تخطي ➡️
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveStage3Fault}
                        disabled={isSavingStage3 || isProcessingImages || isProcessingVideo}
                        className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all active:scale-98 whitespace-nowrap"
                      >
                        {isSavingStage3 ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>حفظ الخراب ➡️ الخطوة 4</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STAGE 4: تصوير القطعه الجديدة او بعد الاصلاح */}
              {/* ========================================================================= */}
              {workflowStage === 4 && (
                <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-xs">
                        4
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>المرحلة الرابعة: تصوير القطعة الجديدة أو بعد الإصلاح</span>
                          <span>📦</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">توثيق القطعة الجديدة الأصلية قبل التركيب أو تصوير السيارة بعد الإصلاح والتثبيت.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      الخطوة 4 من 5
                    </span>
                  </div>

                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={stage4FileInputRef}
                    onChange={(e) => handleProcessImageFiles(e.target.files, setStage4Photos, !stage4CustomerVisible)}
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={stage4VideoInputRef}
                    onChange={(e) => handleProcessVideoFile(e.target.files, 4)}
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* Loading spinners */}
                  {isProcessingImages && (
                    <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex items-center gap-2 text-xs text-red-200">
                      <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                      <span>جاري معالجة وضغط الصور...</span>
                    </div>
                  )}
                  {isProcessingVideo && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-2 text-xs text-blue-200">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>{videoProgressStatus || 'جاري معالجة الفيديو...'}</span>
                    </div>
                  )}

                  {/* Capture actions */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => stage4FileInputRef.current?.click()}
                      className="p-4 bg-brand-red/15 hover:bg-brand-red/25 border-2 border-brand-red/30 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Camera className="w-5 h-5 text-brand-red" />
                      <span>📸 التقاط صور للقطعة الجديدة / بعد التركيب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFastVideoTargetStage(4);
                        setShowFastCameraModal(true);
                      }}
                      className="p-4 bg-blue-500/15 hover:bg-blue-500/25 border-2 border-blue-500/30 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Video className="w-5 h-5 text-blue-400" />
                      <span>🎥 فيديو توثيق القطعة أو بعد التركيب</span>
                    </button>
                  </div>

                  {/* Previews */}
                  {stage4Photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-300">الصور والمقاطع المرفقة ({stage4Photos.length}):</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {stage4Photos.map((item, idx) => (
                          <div key={idx} className="relative bg-black/60 rounded-2xl border border-white/10 overflow-hidden group">
                            <div className="aspect-square relative cursor-pointer" onClick={() => setLightboxImage(item.url)}>
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt="القطعة الجديدة أو بعد الإصلاح"
                                className="w-full h-full object-cover"
                              />
                              {item.thumbnailUrl && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white fill-current" />
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setStage4Photos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 left-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow cursor-pointer transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <input
                              type="text"
                              value={item.caption}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStage4Photos(prev => prev.map((p, i) => i === idx ? { ...p, caption: val } : p));
                              }}
                              placeholder="وصف القطعة..."
                              className="w-full bg-black/80 text-[11px] text-white p-1.5 border-t border-white/10 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer visibility toggle */}
                  <div className="flex items-center justify-between p-3 bg-black/30 rounded-2xl border border-white/5 text-xs">
                    <span className="text-gray-300 font-bold">ظهور صور القطعة للعميل في التقرير:</span>
                    <button
                      type="button"
                      onClick={() => setStage4CustomerVisible(!stage4CustomerVisible)}
                      className={cn(
                        "px-3 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all",
                        stage4CustomerVisible ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-gray-400"
                      )}
                    >
                      {stage4CustomerVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{stage4CustomerVisible ? 'مرئي للعميل' : 'خاص بالإدارة فقط'}</span>
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1.5">
                      ملاحظات حول القطعة الجديدة وعملية الإصلاح:
                    </label>
                    <textarea
                      value={stage4Note}
                      onChange={(e) => setStage4Note(e.target.value)}
                      placeholder="مثال: تم تركيب القطعة الجديدة الأصلية برقم تسلسلي مطابق، والشد حسب معايير الوكالة..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(3)}
                        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        ⬅️ الخطوة 3
                      </button>

                      {/* زر مشاركة مع الإدارة (لطلب القطعة أو التوجيه بشرائها) */}
                      <button
                        type="button"
                        onClick={() => handleOpenStage4ShareModal('order')}
                        className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-98"
                        title="مشاركة تفاصيل القطعة مع الإدارة عبر الواتساب لطلبها أو توجيهك لاستلامها"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مشاركة مع الإدارة 💬</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(5)}
                        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        تخطي ➡️
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveStage4NewPart}
                        disabled={isSavingStage4 || isProcessingImages || isProcessingVideo}
                        className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all active:scale-98 whitespace-nowrap"
                      >
                        {isSavingStage4 ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>حفظ القطعة ➡️ الخطوة 5</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STAGE 5: تصوير اتمام العمل والانتهاء */}
              {/* ========================================================================= */}
              {workflowStage === 5 && (
                <div className="space-y-4 bg-white/5 p-4 sm:p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs">
                        5
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>المرحلة الخامسة: تصوير إتمام العمل والانتهاء</span>
                          <span>🏁</span>
                        </h4>
                        <p className="text-[11px] text-gray-400">توثيق الصورة النهائية للسيارة بعد انتهاء الصيانة وإرسال إشعار فوري لمالك النظام.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      المرحلة الختامية 🏁 (الخطوة 5 من 5)
                    </span>
                  </div>

                  {completionSuccess || record.status === 'completed' ? (
                    <div className="p-5 sm:p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                        <CheckCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base sm:text-lg font-black text-white">تم إنجاز وتوثيق سند الصيانة بنجاح! 🏁</h4>
                        <p className="text-xs text-gray-300 max-w-lg mx-auto leading-relaxed">
                          تم توثيق كافة المراحل الـ 5 بنجاح وتحديث حالة الطلب إلى مكتمل وإشعار الإدارة والعميل.
                        </p>
                      </div>

                      {/* Quick Action Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto pt-1">
                        <a
                          href={getCustomerProgressWhatsAppUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>مشاركة التقرير مع العميل عبر الواتساب</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setActiveTab('timeline')}
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-brand-red" />
                          <span>استعراض سجل خطوات ومراحل الصيانة ({steps.length})</span>
                        </button>
                      </div>

                      {/* Collapsible toggle for supplementary note/photo */}
                      <div className="pt-2 border-t border-emerald-500/20">
                        <button
                          type="button"
                          onClick={() => setShowCompletedExtraForm(prev => !prev)}
                          className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{showCompletedExtraForm ? 'إخفاء نموذج الإضافة الإضافية' : 'هل ترغب في إضافة توثيق إضافي أو ملاحظة ختامية للسند؟'}</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedExtraForm && "rotate-180")} />
                        </button>
                      </div>

                      {showCompletedExtraForm && (
                        <div className="text-right pt-3 space-y-4 border-t border-white/10 mt-3">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 block">
                              صورة أو فيديو إضافي:
                            </label>
                            <input 
                              type="file"
                              ref={completedFileInputRef}
                              onChange={(e) => handleProcessImageFiles(e.target.files, setCompletedPhotos, false)}
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                            />
                            <div 
                              onClick={() => completedFileInputRef.current?.click()}
                              className="border border-dashed border-white/20 hover:border-emerald-500/60 bg-black/40 p-3 rounded-xl text-center cursor-pointer transition-colors"
                            >
                              <Camera className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                              <span className="text-xs text-gray-300">
                                {completedPhotos.length > 0 ? `تم تحديد ${completedPhotos.length} صورة` : 'انقر لالتقاط صورة إضافية'}
                              </span>
                            </div>
                            {completedPhotos.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {completedPhotos.map((p, idx) => (
                                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                                    <img src={p.url} alt="Extra" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setCompletedPhotos([])}
                                      className="absolute top-1 left-1 p-1 bg-red-600 text-white rounded-md"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-300 block">
                              ملاحظة إضافية:
                            </label>
                            <textarea
                              value={completedNote}
                              onChange={(e) => setCompletedNote(e.target.value)}
                              placeholder="أضف أي ملاحظات تكميلية..."
                              rows={2}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red resize-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleCompleteService}
                            disabled={isCompleting || isProcessingImages}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>حفظ التوثيق الإضافي في سجل الصيانة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Prominent Owner Notification Banner */}
                      <div className="p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-sky-300">
                        <Bell className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <b>إشعار فوري للإدارة:</b> عند الضغط على "إكمال المهمة"، سيتم إرسال إشعار فوري لـ Owner والإدارة في لوحة التحكم وتيليجرام:
                          <div className="mt-1 font-mono text-[11px] text-sky-200 bg-black/40 p-1.5 rounded-lg border border-sky-500/20">
                            «تم إكمال السند الفني رقم #{bookingNumber} بواسطة الفني {currentTechName}»
                          </div>
                        </div>
                      </div>

                      {/* Hidden inputs */}
                      <input 
                        type="file"
                        ref={completedFileInputRef}
                        onChange={(e) => handleProcessImageFiles(e.target.files, setCompletedPhotos, false)}
                        accept="image/*"
                        multiple
                        capture="environment"
                        className="hidden"
                      />

                      {/* Loading spinners */}
                      {isProcessingImages && (
                        <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded-2xl flex items-center gap-2 text-xs text-red-200">
                          <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                          <span>جاري معالجة وضغط الصور...</span>
                        </div>
                      )}
                      {isProcessingVideo && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-xs text-emerald-200">
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          <span>{videoProgressStatus || 'جاري معالجة الفيديو...'}</span>
                        </div>
                      )}

                      {/* Capture actions */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => completedFileInputRef.current?.click()}
                          className="p-3 sm:p-4 bg-emerald-600/20 hover:bg-emerald-600/30 border-2 border-emerald-500/40 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all whitespace-nowrap"
                        >
                          <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>📸 تصوير السيارة بعد الإصلاح</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFastVideoTargetStage(5);
                            setShowFastCameraModal(true);
                          }}
                          className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 border-2 border-white/10 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all whitespace-nowrap"
                        >
                          <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>🎥 فيديو ختامي وتشغيل</span>
                        </button>
                      </div>

                      {/* Previews of captured media */}
                      {completedPhotos.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-gray-300">الصور والمقاطع الختامية المرفقة ({completedPhotos.length}):</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {completedPhotos.map((item, idx) => (
                              <div key={idx} className="relative bg-black/60 rounded-2xl border border-white/10 overflow-hidden group">
                                <div className="aspect-square relative cursor-pointer" onClick={() => setLightboxImage(item.url)}>
                                  <img
                                    src={item.thumbnailUrl || item.url}
                                    alt="صورة إتمام العمل"
                                    className="w-full h-full object-cover"
                                  />
                                  {item.thumbnailUrl && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <Play className="w-5 h-5 text-white fill-current" />
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCompletedPhotos(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-1.5 left-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow cursor-pointer transition-all"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <input
                                  type="text"
                                  value={item.caption}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCompletedPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption: val } : p));
                                  }}
                                  placeholder="وصف المرفق الختامي..."
                                  className="w-full bg-black/80 text-[11px] text-white p-1.5 border-t border-white/10 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Final Notes Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300 block">
                          ملاحظات ختامية حول إنجاز المهمة وتسليم السيارة:
                        </label>
                        <textarea
                          value={completedNote}
                          onChange={(e) => setCompletedNote(e.target.value)}
                          placeholder="مثال: تم إكمال أعمال الصيانة بنجاح، فحص الفرامل وضبط الإعدادات وتجربة السيارة والتأكد من سلامتها تماماً..."
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                        />
                      </div>

                      {/* Submit Completion Button */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setWorkflowStage(4)}
                          className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          ⬅️ الخطوة 4
                        </button>

                        <button
                          type="button"
                          onClick={handleCompleteService}
                          disabled={isCompleting || isProcessingImages || isProcessingVideo}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xl shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all active:scale-98 whitespace-nowrap"
                        >
                          {isCompleting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري الإكمال...</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="w-4 h-4" />
                              <span>🏁 إكمال المهمة وإغلاق السند ✅</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL TIMELINE & PHOTOS HISTORY */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {steps.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto text-brand-red">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">لا توجد تحديثات مسجلة في سجل الصيانة بعد</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    ابدأ الآن بتنفيذ خطوات السند الفني: قبول المهمة، تسجيل الفني بالطريق، وتوثيق الصور أثناء العمل.
                  </p>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className="mt-2 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-brand-red/20 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>الانتقال لسير العمل والبدء الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-300 font-bold">سجل التحديثات الميدانية ({steps.length}):</span>
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setTimelineFilter('all')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                            timelineFilter === 'all' ? "bg-brand-red text-white shadow-sm" : "text-gray-400 hover:text-white"
                          )}
                        >
                          الكل ({steps.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimelineFilter('media')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                            timelineFilter === 'media' ? "bg-brand-red text-white shadow-sm" : "text-gray-400 hover:text-white"
                          )}
                        >
                          الصور والميديا ({totalPhotosCount})
                        </button>
                      </div>
                    </div>

                    <a
                      href={getCustomerProgressWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-bold transition-colors"
                      title="مشاركة التقرير عبر الواتساب"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة التقرير مع العميل</span>
                    </a>
                  </div>

                  <div className="relative border-r-2 border-white/10 pr-4 sm:pr-6 space-y-6 mr-2 sm:mr-3">
                    {steps
                      .filter(s => timelineFilter === 'all' || (s.photos && s.photos.length > 0))
                      .map((step, sIdx) => {
                      const stepDate = step.recordedAt ? new Date(step.recordedAt) : new Date();

                      return (
                        <div key={step.id || sIdx} className="relative space-y-2.5">
                          {/* Dot on timeline */}
                          <div className="absolute -right-[23px] sm:-right-[31px] top-2 w-4 h-4 rounded-full bg-brand-red border-2 border-brand-dark flex items-center justify-center text-[8px] text-white shadow-md">
                            {sIdx + 1}
                          </div>

                          {/* Step Card */}
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-2">
                                  <span>{step.title}</span>
                                  {step.isInternalOnly ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-red/20 text-white border border-brand-red/30 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      خاص بالإدارة
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                      <Globe className="w-2.5 h-2.5" />
                                      مرئي للعميل
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {stepDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} • {stepDate.toLocaleDateString('ar-SA')}
                                  </span>
                                  {step.recordedBy && (
                                    <span className="text-gray-300 font-medium">
                                      بواسطة: {step.recordedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {!isTechnician && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteStep(step.id)}
                                    className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                    title="حذف هذا التحديث (صلاحية إدارية)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Estimated arrival if recorded */}
                            {step.estimatedArrival && (
                              <div className="text-xs text-indigo-300 font-semibold bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5" />
                                <span>المدة المتوقعة للوصول: {step.estimatedArrival}</span>
                              </div>
                            )}

                            {/* Step Note */}
                            {step.note && (
                              <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-xl border border-white/5 whitespace-pre-line leading-relaxed">
                                {step.note}
                              </p>
                            )}

                            {/* Photos Grid */}
                            {step.photos && step.photos.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] text-gray-400 font-medium">
                                  الصور المرفقة ({step.photos.length}):
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {step.photos.map((photo, pIdx) => {
                                    const isVideo = photo.mediaType === "video" || !!photo.videoUrl || photo.caption?.includes('فيديو') || step.title?.includes('فيديو');
                                    return (
                                      <div 
                                        key={photo.id || pIdx}
                                        onClick={() => setLightboxImage({ 
                                          url: photo.url, 
                                          caption: photo.caption, 
                                          title: step.title, 
                                          mediaType: isVideo ? 'video' : 'image', 
                                          videoUrl: photo.videoUrl 
                                        })}
                                        className="group relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer shadow-sm hover:border-brand-red/50 transition-all"
                                      >
                                        <img 
                                          src={photo.url} 
                                          alt={photo.caption || step.title}
                                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                          loading="lazy"
                                        />
                                        {isVideo && (
                                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                              <Play className="w-4 h-4 mr-0.5 fill-current" />
                                            </div>
                                            <span className="absolute top-1.5 left-1.5 bg-brand-red/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                                              فيديو 🎥
                                            </span>
                                          </div>
                                        )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                                        <span className="text-[10px] text-white truncate max-w-[80%]">
                                          {photo.caption || 'تكبير الصورة'}
                                        </span>
                                        <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                                      </div>
                                      <div className="absolute top-1.5 right-1.5">
                                        {photo.isInternalOnly ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/20 backdrop-blur-sm shadow flex items-center gap-0.5" title="خاص بالإدارة فقط">
                                            <Lock className="w-2.5 h-2.5" />
                                            خاص
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/80 text-white backdrop-blur-sm shadow flex items-center gap-0.5" title="يظهر للعميل">
                                            <Globe className="w-2.5 h-2.5" />
                                            للعميل
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: JOB & CUSTOMER DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Customer & Appointment */}
                <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3.5">
                  <div className="flex items-center gap-2 text-brand-red font-bold text-sm border-b border-white/10 pb-2.5">
                    <User className="w-4 h-4" />
                    <span>بيانات العميل والموعد</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">اسم العميل:</span>
                      <span className="text-white font-bold">{record.customerName || 'غير محدد'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">رقم الهاتف:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{record.customerPhone}</span>
                        {record.customerPhone && (
                          <a
                            href={`tel:${record.customerPhone}`}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-emerald-400"
                            title="اتصال"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        {customerWaPhone && (
                          <a
                            href={getCustomerProgressWhatsAppUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                            title="واتساب"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">تاريخ الموعد:</span>
                      <span className="text-white font-mono">
                        {record.serviceDate ? new Date(record.serviceDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                      </span>
                    </div>

                    {record.timeSlot && (
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-gray-400">الفترة المفضلة:</span>
                        <span className="text-amber-300 font-bold">{record.timeSlot}</span>
                      </div>
                    )}

                    {record.estimatedArrival && record.status !== 'completed' && (
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-gray-400">وقت الوصول المقدر:</span>
                        <span className="text-indigo-300 font-bold">{record.estimatedArrival}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Vehicle & Service Details */}
                <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3.5">
                  <div className="flex items-center gap-2 text-brand-red font-bold text-sm border-b border-white/10 pb-2.5">
                    <Car className="w-4 h-4" />
                    <span>بيانات المركبة والخدمة</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">طراز المركبة:</span>
                      <span className="text-white font-bold">{record.carModel}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">سنة الصنع:</span>
                      <span className="text-white font-mono">{record.carYear || 'غير محدد'}</span>
                    </div>

                    {record.licensePlate && (
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-gray-400">رقم اللوحة:</span>
                        <span className="text-white font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                          {record.licensePlate}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-gray-400">نوع الخدمة:</span>
                      <span className="text-brand-red font-bold">{record.serviceType}</span>
                    </div>

                    {record.description && (
                      <div className="pt-1">
                        <span className="text-gray-400 block mb-1">وصف العطل / ملاحظات العميل:</span>
                        <p className="text-gray-200 bg-black/40 p-2.5 rounded-xl border border-white/5 whitespace-pre-line leading-relaxed">
                          {record.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 text-brand-red font-bold text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>موقع العميل وملاحة الوصول</span>
                  </div>
                  {record.coordinates?.latitude && record.coordinates?.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>فتح في Google Maps</span>
                    </a>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {record.customerAddress ? (
                    <p className="text-gray-300 leading-relaxed">
                      {record.customerAddress}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic">لم يتم إدخال عنوان نصي، يرجى الاستدلال بالإحداثيات المرفقة.</p>
                  )}

                  {record.coordinates?.latitude && record.coordinates?.longitude && (
                    <div className="text-[11px] text-gray-400 font-mono bg-black/40 p-2 rounded-xl border border-white/5 inline-block">
                      GPS: {record.coordinates.latitude.toFixed(6)}, {record.coordinates.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGN TECHNICIAN */}
          {activeTab === 'assign' && (
            <div className="space-y-5">
              {/* Success Feedback Banner */}
              {assignSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{assignSuccessMsg}</span>
                </div>
              )}

              {/* Currently Assigned Status Banner */}
              {record.assignedStaffName ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">الفني المسؤول حالياً عن هذا الطلب:</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{record.assignedStaffName}</span>
                        {record.assignedStaffPhone && (
                          <span className="text-xs text-gray-400 font-mono">({record.assignedStaffPhone})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {record.assignedStaffPhone && (
                      <a
                        href={generateTechnicianAssignmentWhatsAppUrl(record, record.assignedStaffPhone, record.assignedStaffName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
                        title="فتح محادثة واتساب الفني وإرسال تفاصيل المهمة له"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>مراسلة واتساب (إرسال تفاصيل الطلب) 💬</span>
                      </a>
                    )}
                    {record.assignedStaffPhone && (
                      <a
                        href={`tel:${record.assignedStaffPhone}`}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                        title="اتصال هاتفي بالفني"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleUnassignTechnician}
                      disabled={isAssigning}
                      className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      إلغاء الإسناد
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-red" />
                    <span>إسناد السند الفني إلى فني صيانة ميداني</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    عند إسناد الطلب للفني، يمكنه متابعة السند وتوثيق مراحل العمل (قبول، بالطريق، قيد العمل، إكمال) مباشرة من هاتفه.
                  </p>
                </div>
              )}

              {/* Assignment Mode Toggle */}
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('staff_list')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
                    assignmentMode === 'staff_list'
                      ? 'bg-brand-red text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  الفنيون المسجلون ({technicians.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentMode('manual')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
                    assignmentMode === 'manual'
                      ? 'bg-brand-red text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  إدخال اسم ورقم الفني يدوياً
                </button>
              </div>

              {/* Mode 1: Staff List Selection */}
              {assignmentMode === 'staff_list' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-300 block">
                      اختر الفني المسؤول من القائمة (مع حالة التفرغ الميداني):
                    </label>

                    {/* Filter by Free vs Busy */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setTechAvailabilityFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          techAvailabilityFilter === 'all'
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        الكل ({technicians.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechAvailabilityFilter('free')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          techAvailabilityFilter === 'free'
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-gray-400 hover:text-emerald-400'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>فاضي ({freeTechsCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechAvailabilityFilter('busy')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          techAvailabilityFilter === 'busy'
                            ? 'bg-brand-red/20 text-white border border-brand-red/40 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-brand-red"></span>
                        <span>شغال ({busyTechsCount})</span>
                      </button>
                    </div>
                  </div>

                  {technicians.length === 0 ? (
                    <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl text-xs text-red-200 space-y-2">
                      <p>لم يتم تسجيل حسابات بمسمى "فني" بعد في تبويب "إدارة الموظفين".</p>
                      <button
                        type="button"
                        onClick={() => setAssignmentMode('manual')}
                        className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 text-white rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <span>التبديل إلى كتابة اسم الفني مباشرة دون تسجيل حساب ✍️</span>
                      </button>
                    </div>
                  ) : filteredTechnicians.length === 0 ? (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center text-xs text-gray-400">
                      لا يوجد فنيين متطابقين مع الفلتر المحدد حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredTechnicians.map((tech) => {
                        const workload = techWorkloadMap.get(tech.id) || { activeJobsCount: 0, activeRecords: [], isBusy: false };
                        const isSelected = selectedTechnicianId === tech.id;
                        const isFree = !workload.isBusy;

                        return (
                          <button
                            key={tech.id}
                            type="button"
                            onClick={() => setSelectedTechnicianId(tech.id)}
                            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer relative ${
                              isSelected
                                ? 'bg-brand-red/15 border-brand-red text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between w-full gap-2">
                              <div>
                                <div className="font-bold text-xs text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{tech.fullName}</span>
                                  {isFree ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      🟢 فاضي (متفرغ)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-red/20 text-white border border-brand-red/30">
                                      🔴 شغال ({workload.activeJobsCount} مهمة)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {tech.roleTitleAr || 'فني ميداني'} {tech.phone ? `• ${tech.phone}` : ''}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-brand-red shrink-0" />
                              )}
                            </div>

                            {/* Active Workload Summary */}
                            {isFree ? (
                              <div className="text-[10px] text-emerald-300/90 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-full flex items-center gap-1">
                                <span>✨ جاهز ومتاح لتلقي هذه المهمة فوراً</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-red-200/90 bg-brand-red/10 px-2.5 py-1.5 rounded-lg border border-brand-red/20 w-full space-y-1">
                                <div className="font-bold text-white flex items-center justify-between">
                                  <span>الطلبات النشطة تحت تنفيذه:</span>
                                  <span className="font-mono text-[9px]">{workload.activeJobsCount} قيد التنفيذ</span>
                                </div>
                                {workload.activeRecords.slice(0, 2).map((ar) => (
                                  <div key={ar.id} className="text-gray-300 text-[10px] flex items-center justify-between bg-black/30 px-1.5 py-0.5 rounded">
                                    <span className="truncate max-w-[120px]">#{ar.bookingId || ar.id.slice(-4)} {ar.carModel}</span>
                                    <span className="text-red-300 font-mono text-[9px] shrink-0">
                                      {ar.status === 'on_the_way' ? 'بالطريق 🚗' : 'قيد العمل 🔧'}
                                    </span>
                                  </div>
                                ))}
                                {workload.activeRecords.length > 2 && (
                                  <div className="text-[9px] text-gray-400 font-bold text-center">+{workload.activeRecords.length - 2} طلبات نشطة أخرى</div>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Manual Technician Input */}
              {assignmentMode === 'manual' && (
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      اسم الفني المسؤول ميدانياً *
                    </label>
                    <input
                      type="text"
                      value={manualTechName}
                      onChange={(e) => setManualTechName(e.target.value)}
                      placeholder="مثال: فني متنقل - مهندس رائد"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">
                      رقم جوال الفني (اختياري - لإرسال تفاصيل المهمة واللوكيشن عبر واتساب)
                    </label>
                    <input
                      type="tel"
                      value={manualTechPhone}
                      onChange={(e) => setManualTechPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 text-left focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                {(selectedTechnicianId || record.assignedStaffId || manualTechName || record.assignedStaffName) ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>يتم إسناد المهمة للفني ومتابعة سير المراحل مباشرة داخل النظام</span>
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('workflow')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTechnician}
                    disabled={
                      isAssigning ||
                      (assignmentMode === 'staff_list' && !selectedTechnicianId) ||
                      (assignmentMode === 'manual' && !manualTechName.trim())
                    }
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isAssigning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري الحفظ والتحويل...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 fill-current" />
                        <span>تأكيد الإسناد والتحويل للواتساب 💬</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Lightbox Modal for Full Size Photo Viewing */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-md overscroll-contain"
          >
            <div className="relative max-w-4xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 left-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {lightboxImage.mediaType === 'video' || lightboxImage.videoUrl ? (
                <InspectionVideoPlayer
                  videoUrl={lightboxImage.videoUrl || lightboxImage.url}
                  poster={lightboxImage.url.startsWith('data:image') ? lightboxImage.url : undefined}
                  title={lightboxImage.title || 'فيديو معاينة وفحص السيارة 🎥'}
                  caption={lightboxImage.caption}
                  onClose={() => setLightboxImage(null)}
                  allowReupload={true}
                  onReupload={handleReuploadVideoForRecord}
                />
              ) : (
                <>
                  <img 
                    src={lightboxImage.url} 
                    alt={lightboxImage.caption || 'صورة الصيانة'} 
                    className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/15 shadow-2xl"
                  />
                  {(lightboxImage.title || lightboxImage.caption) && (
                    <div className="mt-3 text-center space-y-0.5">
                      {lightboxImage.title && <div className="text-white text-sm font-bold">{lightboxImage.title}</div>}
                      {lightboxImage.caption && <div className="text-gray-400 text-xs">{lightboxImage.caption}</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Technician Assignment Confirmation Dialog */}
      <AnimatePresence>
        {assignedWhatsAppDialog.isOpen && (
          <div 
            onClick={() => {
              setAssignedWhatsAppDialog(prev => ({ ...prev, isOpen: false }));
              setActiveTab('workflow');
            }}
            className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-md overscroll-contain"
          >
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-center relative overflow-hidden my-auto max-h-[94dvh] overflow-y-auto overscroll-contain"
            >
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 fill-current" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>تم إسناد الطلب للفني بنجاح!</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  إرسال تفاصيل المهمة للفني عبر واتساب 📲
                </h3>
                <p className="text-xs text-gray-300">
                  الفني المكلف: <span className="font-bold text-white">{assignedWhatsAppDialog.techName}</span>
                  {assignedWhatsAppDialog.techPhone && (
                    <span className="text-emerald-400 font-mono dir-ltr ml-1 font-bold">({assignedWhatsAppDialog.techPhone})</span>
                  )}
                </p>
              </div>

              {/* Message Preview Box */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3.5 text-right text-xs text-gray-300 space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[11px] text-gray-400 font-bold">
                  <span>معاينة نص التكليف المرسل للفني:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(assignedWhatsAppDialog.message);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2500);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20 transition-colors"
                  >
                    {copiedMessage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMessage ? 'تم النسخ بنجاح!' : 'نسخ الرسالة'}</span>
                  </button>
                </div>
                <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans text-gray-200 select-text">
                  {assignedWhatsAppDialog.message}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <a
                  href={assignedWhatsAppDialog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer transition-all active:scale-98"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>فتح محادثة واتساب الفني الآن 🚀</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(assignedWhatsAppDialog.message);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2500);
                    }}
                    className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedMessage ? 'تم النسخ' : 'نسخ النص'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignedWhatsAppDialog(prev => ({ ...prev, isOpen: false }));
                      setActiveTab('workflow');
                    }}
                    className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>متابعة مراحل السند ➡️</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stage 4: مشاركة طلب أو استلام القطعة مع الإدارة Modal */}
      <AnimatePresence>
        {stage4ShareDialog.isOpen && (
          <div 
            onClick={() => setStage4ShareDialog(prev => ({ ...prev, isOpen: false }))}
            className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-md overscroll-contain"
          >
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-blue-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-right relative overflow-hidden my-auto max-h-[94dvh] overflow-y-auto overscroll-contain"
              dir="rtl"
            >
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                      <span>مشاركة القطعة مع الإدارة</span>
                      <span className="text-xs text-blue-400">#{bookingNumber}</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">إرسال تفاصيل القطعة عبر الواتساب للإدارة لطلبها أو توجيهك لاستلامها</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStage4ShareDialog(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* اختيار نوع التنسيق مع الإدارة */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  حدد الغرض من التواصل مع الإدارة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStage4ShareType('order')}
                    className={cn(
                      "p-2.5 rounded-xl text-xs font-bold text-right flex flex-col gap-1 border transition-all cursor-pointer",
                      stage4ShareDialog.type === 'order'
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40 ring-1 ring-blue-500/50"
                        : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>📦</span>
                        <span>اطلبها لي</span>
                      </span>
                      {stage4ShareDialog.type === 'order' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <span className="text-[10px] font-normal text-gray-400">تقوم الإدارة بشرائها وتوفيرها لك</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStage4ShareType('pickup')}
                    className={cn(
                      "p-2.5 rounded-xl text-xs font-bold text-right flex flex-col gap-1 border transition-all cursor-pointer",
                      stage4ShareDialog.type === 'pickup'
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/50"
                        : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>🚗</span>
                        <span>روح جيبها</span>
                      </span>
                      {stage4ShareDialog.type === 'pickup' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[10px] font-normal text-gray-400">توجيه الفني لموقع القطعة لاستلامها</span>
                  </button>
                </div>
              </div>

              {/* رقم واتساب الإدارة / المستلم */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
                  <span>رقم هاتف / واتساب الإدارة:</span>
                  <span className="text-[10px] text-gray-500">يمكنك تعديله إذا أردت إرساله لرقم إدارة آخر</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={stage4ShareDialog.adminPhone}
                    onChange={(e) => {
                      const newPhone = e.target.value;
                      const clean = newPhone.replace(/\D/g, '');
                      const wa = clean.startsWith('966') ? clean : clean.startsWith('0') ? '966' + clean.slice(1) : '966' + clean;
                      const msg = stage4ShareDialog.message;
                      setStage4ShareDialog(prev => ({
                        ...prev,
                        adminPhone: newPhone,
                        url: `https://api.whatsapp.com/send?phone=${wa}&text=${encodeURIComponent(msg)}`
                      }));
                    }}
                    placeholder="9665xxxxxxxx"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white dir-ltr font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* معاينة الرسالة */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-xs text-gray-300 space-y-2 max-h-44 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[11px] text-gray-400 font-bold">
                  <span>نص الرسالة الموجهة للإدارة:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(stage4ShareDialog.message);
                      setCopiedStage4Share(true);
                      setTimeout(() => setCopiedStage4Share(false), 2500);
                    }}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] cursor-pointer bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/20 transition-colors"
                  >
                    {copiedStage4Share ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedStage4Share ? 'تم النسخ!' : 'نسخ النص'}</span>
                  </button>
                </div>
                <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans text-gray-200 select-text">
                  {stage4ShareDialog.message}
                </p>
              </div>

              {/* أزرار الإجراءات */}
              <div className="space-y-2 pt-1">
                <a
                  href={stage4ShareDialog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer transition-all active:scale-98 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>
                    {stage4ShareDialog.type === 'order' ? 'إرسال طلب القطعة للإدارة عبر الواتساب 📦' : 'إرسال طلب التوجيه بالاستلام للإدارة 🚗'}
                  </span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(stage4ShareDialog.message);
                      setCopiedStage4Share(true);
                      setTimeout(() => setCopiedStage4Share(false), 2500);
                    }}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedStage4Share ? 'تم النسخ' : 'نسخ الرسالة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStage4ShareDialog(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fast Direct Camera Video Recorder Modal for Instant Low-Latency Capture */}
      <FastVideoRecorderModal
        isOpen={showFastCameraModal}
        onClose={() => setShowFastCameraModal(false)}
        onVideoCaptured={async (videoBlob) => {
          await handleProcessVideoFile(videoBlob, fastVideoTargetStage);
        }}
        onFallbackToFilePicker={() => {
          if (fastVideoTargetStage === 2) {
            arrivalVideoInputRef.current?.click();
          } else if (fastVideoTargetStage === 3) {
            stage3VideoInputRef.current?.click() || stage3FileInputRef.current?.click();
          } else if (fastVideoTargetStage === 4) {
            stage4VideoInputRef.current?.click() || stage4FileInputRef.current?.click();
          } else {
            completedFileInputRef.current?.click();
          }
        }}
        title={
          fastVideoTargetStage === 2 ? "فيديو فحص واستلام السيارة كامل والعداد عند الوصول 🎥" :
          fastVideoTargetStage === 3 ? "فيديو توثيق وشرح الخراب / العطل ⚠️" :
          fastVideoTargetStage === 4 ? "فيديو توثيق القطعة الجديدة أو بعد الإصلاح 📦" :
          "فيديو اختبار تشغيل السيارة وإتمام الصيانة 🏁"
        }
        maxSeconds={25}
      />
    </div>
  );
};
