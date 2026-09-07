import React, { useState, useRef } from 'react';
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
  Copy,
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
  ChevronDown
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceRecord, ServiceStepLog, ServiceStepPhoto, ServiceStepKey, StaffUser } from '../types';

interface ServiceTimelineModalProps {
  record: MaintenanceRecord;
  staffList: StaffUser[];
  currentStaffUser?: StaffUser | null;
  telegramConfig?: {
    botToken?: string;
    chatId?: string;
  };
  initialTab?: 'workflow' | 'timeline' | 'add_step' | 'assign';
  onClose: () => void;
  onUpdateRecord: (updatedRecord: MaintenanceRecord) => void;
}

// Browser Canvas Image Compressor (compresses to max 1000px, JPEG ~60KB)
export const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
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

// Preset categories for continuous in-progress updates
const IN_PROGRESS_CATEGORIES = [
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
  currentStaffUser,
  telegramConfig,
  initialTab,
  onClose,
  onUpdateRecord
}) => {
  const isTechnician = currentStaffUser?.role === 'technician';

  // Determine starting tab
  const getInitialTab = () => {
    if (initialTab === 'assign' && !isTechnician) return 'assign';
    if (initialTab === 'timeline') return 'timeline';
    return 'workflow';
  };

  const [activeTab, setActiveTab] = useState<'workflow' | 'timeline' | 'assign'>(getInitialTab());

  // Determine active workflow stage based on record status
  const getInitialWorkflowStage = (): 1 | 2 | 3 | 4 => {
    if (record.status === 'completed') return 4;
    if (record.status === 'in-progress') return 3;
    if (record.status === 'on_the_way') return 2;
    if (record.status === 'accepted') return 2; // accepted, ready to go on the way
    return 1; // new or pending, ready to accept
  };

  const [workflowStage, setWorkflowStage] = useState<1 | 2 | 3 | 4>(getInitialWorkflowStage());

  // Stage 1 State (تم القبول)
  const [acceptedNote, setAcceptedNote] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  // Stage 2 State (الفني بالطريق)
  const [etaTime, setEtaTime] = useState(record.estimatedArrival || 'متوقع الوصول خلال 30 دقيقة');
  const [onTheWayNote, setOnTheWayNote] = useState('');
  const [isOnTheWaySaving, setIsOnTheWaySaving] = useState(false);

  // Stage 3 State (قيد العمل - التحديثات المستمرة)
  const [inProgressCategory, setInProgressCategory] = useState(IN_PROGRESS_CATEGORIES[0]);
  const [inProgressNote, setInProgressNote] = useState('');
  const [inProgressPhotos, setInProgressPhotos] = useState<{ url: string; caption: string; isInternalOnly: boolean }[]>([]);
  const [isCustomerVisible, setIsCustomerVisible] = useState<boolean>(true); // true: Customer Visible, false: Private
  const [isInProgressSaving, setIsInProgressSaving] = useState(false);
  const [inProgressSuccessMsg, setInProgressSuccessMsg] = useState('');

  // Stage 4 State (مكتمل)
  const [completedNote, setCompletedNote] = useState('');
  const [completedPhotos, setCompletedPhotos] = useState<{ url: string; caption: string; isInternalOnly: boolean }[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  // Shared Photo & Image State
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string; title?: string } | null>(null);

  // Technician Assignment State
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(record.assignedStaffId || '');
  const [assignmentMode, setAssignmentMode] = useState<'staff_list' | 'manual'>(
    staffList && staffList.length > 0 ? 'staff_list' : 'manual'
  );
  const [manualTechName, setManualTechName] = useState(record.assignedStaffName || '');
  const [manualTechPhone, setManualTechPhone] = useState(record.assignedStaffPhone || '');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');
  const [copiedTaskDetails, setCopiedTaskDetails] = useState(false);
  const [copiedCustomerUpdate, setCopiedCustomerUpdate] = useState(false);

  const inProgressFileInputRef = useRef<HTMLInputElement>(null);
  const completedFileInputRef = useRef<HTMLInputElement>(null);

  const steps: ServiceStepLog[] = record.serviceSteps || [];
  const technicians = staffList.filter(s => s.isActive !== false);

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
        const compressedBase64 = await compressImage(file, 900, 900, 0.75);
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
          `✨ <i>يمكن للإدارة مراجعة الـ Timeline والصور بالكامل من لوحة التحكم.</i>`;

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

  // --- STAGE 1: SUBMIT ACCEPTANCE (تم القبول - ملاحظات فقط، بدون صور) ---
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
      setWorkflowStage(2); // Automatically advance to Stage 2: On the Way
    } catch (err) {
      console.error('Error accepting task:', err);
      alert('تعذر تحديث الحالة إلى تم القبول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAccepting(false);
    }
  };

  // --- STAGE 2: SUBMIT ON THE WAY (الفني بالطريق - ملاحظات + الوقت المتوقع، بدون صور) ---
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
      setWorkflowStage(3); // Advance to Stage 3: In Progress (Continuous updates)
    } catch (err) {
      console.error('Error setting on the way:', err);
      alert('تعذر تحديث الحالة إلى الفني بالطريق.');
    } finally {
      setIsOnTheWaySaving(false);
    }
  };

  // --- STAGE 3: SUBMIT RECURRING IN-PROGRESS UPDATE (قيد العمل - صور + ملاحظات متكررة) ---
  const handleAddInProgressUpdate = async () => {
    const noteText = inProgressNote.trim() || inProgressCategory.defaultNote;
    setIsInProgressSaving(true);

    try {
      const photosPayload: ServiceStepPhoto[] = inProgressPhotos.map(p => ({
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        url: p.url,
        caption: p.caption.trim() || inProgressCategory.title,
        isInternalOnly: !isCustomerVisible ? true : p.isInternalOnly,
        isCustomerVisible: isCustomerVisible && !p.isInternalOnly,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentTechName
      }));

      const newStep: ServiceStepLog = {
        id: `step_progress_${Date.now()}`,
        stepKey: 'in_progress',
        title: inProgressCategory.title,
        note: noteText,
        isInternalOnly: !isCustomerVisible,
        isCustomerVisible: isCustomerVisible,
        photos: photosPayload,
        recordedBy: currentTechName,
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'in-progress'
      };

      const updatedSteps = [...steps, newStep];
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

      // Reset in-progress form so technician can record subsequent steps immediately!
      setInProgressNote('');
      setInProgressPhotos([]);
      setInProgressSuccessMsg(`تم حفظ تحديث "${inProgressCategory.title}" في الـ Timeline بنجاح! 📸`);
      setTimeout(() => setInProgressSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error saving in-progress step:', err);
      alert('تعذر حفظ التحديث، يرجى المحاولة ثانية.');
    } finally {
      setIsInProgressSaving(false);
    }
  };

  // --- STAGE 4: SUBMIT COMPLETION (مكتمل - صورة نهائية + ملاحظات ختامية + إشعار الإدارة) ---
  const handleCompleteService = async () => {
    if (!completedNote.trim()) {
      alert('يرجى كتابة ملاحظات ختامية حول إنجاز الصيانة.');
      return;
    }

    if (completedPhotos.length === 0) {
      if (!window.confirm('يفضل بشدة رفع صورة نهائية توثق إنجاز الصيانة. هل تود الاستمرار والإكمال بدون صورة؟')) {
        return;
      }
    }

    setIsCompleting(true);
    try {
      const photosPayload: ServiceStepPhoto[] = completedPhotos.map(p => ({
        id: `photo_final_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        url: p.url,
        caption: p.caption.trim() || 'صورة النتيجة النهائية بعد الصيانة',
        isInternalOnly: p.isInternalOnly,
        isCustomerVisible: !p.isInternalOnly,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentTechName
      }));

      const finalStep: ServiceStepLog = {
        id: `step_completed_${Date.now()}`,
        stepKey: 'completed',
        title: 'اكتمال الصيانة والفحص النهائي 🏁',
        note: completedNote.trim(),
        isCustomerVisible: true,
        isInternalOnly: false,
        photos: photosPayload,
        recordedBy: currentTechName,
        recordedByStaffId: currentStaffUser?.id || '',
        recordedAt: new Date().toISOString(),
        statusChangeTo: 'completed'
      };

      const updatedSteps = [...steps, finalStep];
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
    } catch (err) {
      console.error('Error completing service:', err);
      alert('تعذر إكمال المهمة، يرجى المحاولة ثانية.');
    } finally {
      setIsCompleting(false);
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

      const updatedRecord: MaintenanceRecord = {
        ...record,
        ...payload
      };

      onUpdateRecord(updatedRecord);
      setAssignSuccessMsg(`تم إسناد الطلب للفني (${techName}) بنجاح!`);
      setTimeout(() => setAssignSuccessMsg(''), 3500);
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
    if (!window.confirm('هل أنت متأكد من حذف هذا التحديث من الـ Timeline؟')) return;

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

  // Raw unencoded task text with full Unicode emojis for clipboard copy and direct dispatch
  const getTechnicianTaskRawText = () => {
    const customerName = (record.customerName || record.name || 'عميل').trim();
    const gpsLink = record.coordinates?.latitude && record.coordinates?.longitude
      ? `https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`
      : record.location || 'غير محدد';

    return (
      `🚗🔧 *مهمة صيانة ميدانية - DR.FIX*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *العميل:* ${customerName}\n` +
      `📱 *جوال العميل:* ${record.customerPhone}\n` +
      `🚘 *السيارة:* ${record.carModel}\n` +
      `🛠️ *الخدمة:* ${record.serviceType}\n` +
      `🔢 *رقم السند:* #${bookingNumber}\n` +
      `📍 *الموقع:* ${gpsLink}\n` +
      `${record.notes ? `📝 *ملاحظات:* ${record.notes}\n` : ''}` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `سير المراحل المطلوب في النظام:\n` +
      `1️⃣ تم القبول ✅\n` +
      `2️⃣ الفني بالطريق 🚗 (تسجيل وقت الوصول المتوقع)\n` +
      `3️⃣ قيد العمل 🔧 (توثيق مستمر للصور والملاحظات)\n` +
      `4️⃣ مكتمل 🏁 (صورة نهائية + إشعار الإدارة)`
    );
  };

  // WhatsApp link to send task details to technician directly via official API (prevents wa.me emoji corruption)
  const getTechnicianWhatsAppUrl = () => {
    const tech = staffList.find(s => s.id === (record.assignedStaffId || selectedTechnicianId));
    const rawPhone = (tech?.phone || record.assignedStaffPhone || manualTechPhone || '');
    const techPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '966');
    if (!techPhone) return '#';

    const text = encodeURIComponent(getTechnicianTaskRawText());
    // Using api.whatsapp.com/send directly avoids the wa.me 302 redirect header which replaces 4-byte emojis with  or ?
    return `https://api.whatsapp.com/send?phone=${techPhone}&text=${text}`;
  };

  // Copy raw task text to clipboard with all emojis fully preserved
  const handleCopyTechnicianTask = () => {
    const text = getTechnicianTaskRawText();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedTaskDetails(true);
        setTimeout(() => setCopiedTaskDetails(false), 3000);
      }).catch(() => fallbackCopyText(text, setCopiedTaskDetails));
    } else {
      fallbackCopyText(text, setCopiedTaskDetails);
    }
  };

  // Share raw task text via native device sharing sheet if available
  const handleShareTechnicianTask = async () => {
    const text = getTechnicianTaskRawText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `مهمة صيانة ميدانية #${bookingNumber}`,
          text: text
        });
      } catch (err) {
        // User cancelled or dismissed share sheet
      }
    } else {
      handleCopyTechnicianTask();
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

  // Copy customer progress update text to clipboard
  const handleCopyCustomerProgress = () => {
    const text = getCustomerProgressRawText();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedCustomerUpdate(true);
        setTimeout(() => setCopiedCustomerUpdate(false), 3000);
      }).catch(() => fallbackCopyText(text, setCopiedCustomerUpdate));
    } else {
      fallbackCopyText(text, setCopiedCustomerUpdate);
    }
  };

  // Fallback copy using hidden textarea
  const fallbackCopyText = (text: string, setter: (val: boolean) => void) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setter(true);
      setTimeout(() => setter(false), 3000);
    } catch (e) {
      console.warn('Fallback copy error:', e);
    }
  };

  // Helper to determine status badge
  const getStatusBadge = () => {
    switch (record.status) {
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">1. تم القبول ✅</span>;
      case 'on_the_way':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">2. الفني بالطريق 🚗</span>;
      case 'in-progress':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">3. قيد العمل 🔧</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">4. مكتمل 🏁</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-gray-300 border border-white/15">جاهز للقبول ⏳</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl bg-brand-dark/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right"
        dir="rtl"
      >
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-brand-red/15 via-white/5 to-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 shadow-lg shadow-brand-red/10">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  السند الفني #{bookingNumber}
                </h3>
                {getStatusBadge()}
                {record.estimatedArrival && (
                  <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/25 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    <span>{record.estimatedArrival}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">{record.carModel}</span>
                <span>•</span>
                <span>الخدمة: {record.serviceType}</span>
                {record.customerName && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400">العميل: {record.customerName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Info & Action Strip */}
        <div className="px-5 sm:px-6 py-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {record.assignedStaffName ? (
              <div className="flex items-center gap-1.5 text-gray-300">
                <User className="w-3.5 h-3.5 text-brand-red" />
                <span>الفني المكلف: <b className="text-white">{record.assignedStaffName}</b></span>
                {record.assignedStaffPhone && (
                  <a href={`tel:${record.assignedStaffPhone}`} className="text-gray-400 hover:text-white text-[11px] font-mono">
                    ({record.assignedStaffPhone})
                  </a>
                )}
              </div>
            ) : isTechnician ? (
              <div className="flex items-center gap-1.5 text-amber-400/80 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>لم يتم تحديد اسم الفني بالسند</span>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('assign')}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>لم يتم إسناد فني بعد - انقر للتعيين</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyTechnicianTask}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-colors text-xs font-bold cursor-pointer"
              title="نسخ تفاصيل المهمة للفني مع الإيموجي كاملاً بدون أي تشويه"
            >
              {copiedTaskDetails ? (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>تم النسخ ✅</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>نسخ المهمة 📋</span>
                </>
              )}
            </button>

            <a 
              href={`tel:${record.customerPhone}`}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 flex items-center gap-1 transition-colors"
              title="اتصال بالعميل"
            >
              <Phone className="w-3 h-3 text-brand-red" />
              <span>{record.customerPhone}</span>
            </a>

            {record.coordinates?.latitude && record.coordinates?.longitude && (
              <a 
                href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 flex items-center gap-1 transition-colors"
                title="موقع العميل على الخريطة"
              >
                <Navigation className="w-3 h-3" />
                <span>GPS موقع العميل</span>
              </a>
            )}
          </div>
        </div>

        {/* 4-Step Interactive Stepper Bar (سير حالات السند الفني المطلوب لـ DR.FIX) */}
        <div className="px-5 sm:px-6 pt-4 pb-3 bg-white/5 border-b border-white/5">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-2">
            <span>سير مراحل السند الفني لـ DR.FIX:</span>
            <span className="text-brand-red font-mono">الترتيب المعتمد (1 ← 2 ← 3 ← 4)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Step 1: تم القبول */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(1); }}
              className={`p-2.5 rounded-2xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                record.status === 'accepted' || record.status === 'on_the_way' || record.status === 'in-progress' || record.status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : workflowStage === 1 && activeTab === 'workflow'
                    ? 'bg-brand-red/20 border-brand-red text-white ring-1 ring-brand-red'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                {record.status === 'accepted' || record.status === 'on_the_way' || record.status === 'in-progress' || record.status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : '1'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-white">1. تم القبول</div>
                <div className="text-[10px] text-gray-400 truncate">ملاحظات فقط</div>
              </div>
            </button>

            {/* Step 2: الفني بالطريق */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(2); }}
              className={`p-2.5 rounded-2xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                record.status === 'on_the_way' || record.status === 'in-progress' || record.status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : workflowStage === 2 && activeTab === 'workflow'
                    ? 'bg-brand-red/20 border-brand-red text-white ring-1 ring-brand-red'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                {record.status === 'on_the_way' || record.status === 'in-progress' || record.status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : '2'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-white">2. الفني بالطريق</div>
                <div className="text-[10px] text-gray-400 truncate">وقت الوصول + ملاحظة</div>
              </div>
            </button>

            {/* Step 3: قيد العمل */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(3); }}
              className={`p-2.5 rounded-2xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                record.status === 'in-progress'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/50 animate-pulse'
                  : record.status === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : workflowStage === 3 && activeTab === 'workflow'
                      ? 'bg-brand-red/20 border-brand-red text-white ring-1 ring-brand-red'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                {record.status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : '3'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-white">3. قيد العمل 🔄</div>
                <div className="text-[10px] text-gray-400 truncate">تحديثات وصور مستمرة</div>
              </div>
            </button>

            {/* Step 4: مكتمل */}
            <button
              type="button"
              onClick={() => { setActiveTab('workflow'); setWorkflowStage(4); }}
              className={`p-2.5 rounded-2xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                record.status === 'completed'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500'
                  : workflowStage === 4 && activeTab === 'workflow'
                    ? 'bg-brand-red/20 border-brand-red text-white ring-1 ring-brand-red'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                {record.status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : '4'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-white">4. مكتمل 🏁</div>
                <div className="text-[10px] text-gray-400 truncate">صورة نهائية + إشعار</div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'workflow' 
                ? 'text-brand-red border-brand-red' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>تنفيذ الإجراءات وسير العمل (الخطوة {workflowStage})</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timeline' 
                ? 'text-brand-red border-brand-red' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>سجل الـ Timeline والصور ({steps.length})</span>
          </button>

          {!isTechnician && (
            <button
              onClick={() => setActiveTab('assign')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assign' 
                  ? 'text-brand-red border-brand-red' 
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>إسناد الفني</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: WORKFLOW STAGES (1 -> 2 -> 3 -> 4) */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* STAGE 1: تم القبول */}
              {workflowStage === 1 && (
                <div className="space-y-4 bg-white/5 p-5 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">المرحلة الأولى: تم القبول</h4>
                        <p className="text-[11px] text-gray-400">يقبل الفني المهمة ويسجل ملاحظات القبول والاستعداد.</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      لا يحتاج رفع صور في هذه المرحلة
                    </div>
                  </div>

                  {record.status === 'accepted' || record.status === 'on_the_way' || record.status === 'in-progress' || record.status === 'completed' ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم قبول هذه المهمة بنجاح مسبقاً ✅</span>
                      </div>
                      <p className="text-xs text-gray-300">
                        يمكنك الآن الانتقال مباشرة للخطوة التالية لتسجيل انطلاق الفني وتحديد موعد الوصول المتوقع.
                      </p>
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(2)}
                        className="mt-2 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                      >
                        <span>الانتقال إلى: 2. الفني بالطريق 🚗</span>
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-300 block mb-1.5">
                          خانة ملاحظات القبول والاستعداد:
                        </label>
                        <textarea
                          value={acceptedNote}
                          onChange={(e) => setAcceptedNote(e.target.value)}
                          placeholder="مثال: تم تأكيد وقبول المهمة وجاري تجهيز المعدات والانطلاق لموقع العميل..."
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-gray-400">
                          بواسطة الفني: <b className="text-gray-200">{currentTechName}</b>
                        </span>

                        <button
                          type="button"
                          onClick={handleAcceptTask}
                          disabled={isAccepting}
                          className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isAccepting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري التأكيد...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>تأكيد قبول المهمة (تم القبول) ✅</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 2: الفني بالطريق */}
              {workflowStage === 2 && (
                <div className="space-y-4 bg-white/5 p-5 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">المرحلة الثانية: الفني بالطريق</h4>
                        <p className="text-[11px] text-gray-400">يسجل الفني المدة المتوقعة للوصول وملاحظات المسار.</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      لا يوجد رفع صور في هذه المرحلة
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Expected Arrival Field */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300 block">
                        المدة أو الوقت المتوقع للوصول *
                      </label>
                      <input
                        type="text"
                        value={etaTime}
                        onChange={(e) => setEtaTime(e.target.value)}
                        placeholder="مثال: متوقع الوصول خلال 30 دقيقة. أو: متوقع الوصول الساعة 5:30 PM."
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red font-medium"
                      />

                      {/* Quick preset chips for instant one-click selection on mobile */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-gray-400">خيارات سريعة:</span>
                        {[
                          'متوقع الوصول خلال 15 دقيقة',
                          'متوقع الوصول خلال 30 دقيقة',
                          'متوقع الوصول خلال 45 دقيقة',
                          'متوقع الوصول خلال ساعة',
                        ].map((presetText) => (
                          <button
                            key={presetText}
                            type="button"
                            onClick={() => setEtaTime(presetText)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              etaTime === presetText 
                                ? 'bg-indigo-500/30 border-indigo-500 text-white' 
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {presetText}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* On the way notes field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300 block">
                        حقل ملاحظات الفني (اختياري):
                      </label>
                      <textarea
                        value={onTheWayNote}
                        onChange={(e) => setOnTheWayNote(e.target.value)}
                        placeholder="مثال: تم الانطلاق وفي المسار حالياً، جاري التوجه لموقع السيارة المحدد في GPS..."
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setWorkflowStage(1)}
                        className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        العودة للسابق
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWorkflowStage(3)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          تخطي إلى قيد العمل 🔧
                        </button>

                        <button
                          type="button"
                          onClick={handleOnTheWay}
                          disabled={isOnTheWaySaving || !etaTime.trim()}
                          className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isOnTheWaySaving ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري التحديث...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4" />
                              <span>تأكيد: الفني بالطريق 🚗</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: قيد العمل (سجل تحديثات متكرر ومستمر أثناء العمل) */}
              {workflowStage === 3 && (
                <div className="space-y-5 bg-white/5 p-5 rounded-3xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>المرحلة الثالثة: قيد العمل والصيانة الميدانية</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            تحديثات متكررة ومستمرة 🔄
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          يمكن للفني إضافة عدة تحديثات وصور متكررة (بداية العمل، فحص، قطع غيار، أثناء التركيب) في أي وقت.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setWorkflowStage(4)}
                      className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>انتهت الصيانة؟ الانتقال للمرحلة 4 (مكتمل) 🏁</span>
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {inProgressSuccessMsg && (
                    <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{inProgressSuccessMsg}</span>
                    </div>
                  )}

                  {/* Category Preset Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">
                      اختر نوع هذا التحديث أثناء العمل:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {IN_PROGRESS_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setInProgressCategory(cat);
                            if (!inProgressNote) setInProgressNote(cat.defaultNote);
                          }}
                          className={`p-2.5 rounded-2xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                            inProgressCategory.id === cat.id
                              ? 'bg-brand-red/20 border-brand-red text-white shadow-md'
                              : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-xs font-bold truncate">{cat.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">
                      ملاحظات الفني حول هذا التحديث:
                    </label>
                    <textarea
                      value={inProgressNote}
                      onChange={(e) => setInProgressNote(e.target.value)}
                      placeholder="مثال: بدأت عملية الفحص / تم فك القطعة القديمة وتبين تلفها / جاري تركيب القطعة الجديدة..."
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                    />
                  </div>

                  {/* Visibility Requirement: Customer Visible vs Private */}
                  <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                        {isCustomerVisible ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                        <span>ظهور هذا التحديث والصور للعميل:</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {isCustomerVisible ? 'يظهر للعميل في تقريره المصور' : 'سري وخاص بالإدارة فقط'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCustomerVisible(true)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCustomerVisible
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مرئية للعميل (Customer Visible)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCustomerVisible(false)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          !isCustomerVisible
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>خاصة بالإدارة (Private)</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Upload Zone */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300">
                        إرفاق صور التحديث (كاميرا الجوال أو الألبوم):
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {inProgressPhotos.length} صور محددة
                      </span>
                    </div>

                    <input 
                      type="file"
                      ref={inProgressFileInputRef}
                      onChange={(e) => handleProcessImageFiles(e.target.files, setInProgressPhotos, !isCustomerVisible)}
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                    />

                    <div 
                      onClick={() => inProgressFileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-brand-red/60 bg-black/30 hover:bg-white/5 rounded-2xl p-4 text-center cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-red/10 group-hover:bg-brand-red/20 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red transition-all">
                        {isProcessingImages ? (
                          <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">
                          {isProcessingImages ? 'جاري معالجة وضغط الصور...' : 'انقر لالتقاط صورة بكاميرا الجوال أو اختيار صور من الألبوم'}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          يدعم رفع صور متعددة للقطعة التالفة أو قطع الغيار الجديدة أو أثناء التركيب
                        </p>
                      </div>
                    </div>

                    {/* Previews of selected photos */}
                    {inProgressPhotos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {inProgressPhotos.map((photo, idx) => (
                          <div key={idx} className="bg-black/40 p-2 rounded-xl border border-white/10 space-y-1.5">
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                              <img src={photo.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setInProgressPhotos(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 left-1 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-md transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <input 
                              type="text"
                              value={photo.caption}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInProgressPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption: val } : p));
                              }}
                              placeholder="وصف مختصر للصورة..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-brand-red"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save Update Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <span className="text-[11px] text-gray-400">
                      التحديث يحفظ في Timeline مع الوقت والتاريخ واسم الفني
                    </span>

                    <button
                      type="button"
                      onClick={handleAddInProgressUpdate}
                      disabled={isInProgressSaving || isProcessingImages}
                      className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {isInProgressSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري الحفظ...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>+ حفظ هذا التحديث في الـ Timeline 📸</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 4: مكتمل (صورة نهائية + ملاحظات ختامية + إشعار الإدارة) */}
              {workflowStage === 4 && (
                <div className="space-y-5 bg-white/5 p-5 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        4
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">المرحلة الرابعة: إكمال السند الفني (مكتمل)</h4>
                        <p className="text-[11px] text-gray-400">توثيق صورة نهائية وملاحظات ختامية وإرسال إشعار فوري لمالك النظام / Owner.</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      المرحلة الختامية 🏁
                    </span>
                  </div>

                  {completionSuccess || record.status === 'completed' ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCheck className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white">تم إكمال السند الفني بنجاح! 🏁</h4>
                      <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                        تم تحديث حالة السند إلى «مكتمل»، وتوثيق المرحلة الختامية، وإرسال إشعار رسمي للإدارة / Owner مع كافة الملاحظات والصور في الـ Timeline.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                        <a
                          href={getCustomerProgressWhatsAppUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>إرسال تقرير الإنجاز للعميل على الواتساب ↗</span>
                        </a>

                        <button
                          type="button"
                          onClick={handleCopyCustomerProgress}
                          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                          title="نسخ نص التقرير مع الإيموجي"
                        >
                          {copiedCustomerUpdate ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">تم النسخ ✅</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-300" />
                              <span>نسخ التقرير 📋</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Prominent Owner Notification Banner */}
                      <div className="p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-sky-300">
                        <Bell className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <b>إشعار تلقائي للإدارة:</b> عند الضغط على "إكمال المهمة"، سيتم إرسال إشعار فوري لـ Owner والإدارة في لوحة التحكم وتيليجرام:
                          <div className="mt-1 font-mono text-[11px] text-sky-200 bg-black/40 p-1.5 rounded-lg border border-sky-500/20">
                            «تم إكمال السند الفني رقم #{bookingNumber} بواسطة الفني {currentTechName}»
                          </div>
                        </div>
                      </div>

                      {/* Final Photo Upload */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300 block">
                          صورة نهائية للسيارة بعد انتهاء العمل *:
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
                          className="border-2 border-dashed border-white/20 hover:border-emerald-500/60 bg-black/30 hover:bg-white/5 rounded-2xl p-4 text-center cursor-pointer transition-all space-y-2 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 transition-all">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white">
                              {completedPhotos.length > 0 ? `تم تحديد ${completedPhotos.length} صورة نهائية` : 'التقاط أو اختيار الصورة النهائية بعد اكتمال الصيانة'}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              توثيق المظهر النهائي ونظافة المكان وسلامة القطع المركبة
                            </p>
                          </div>
                        </div>

                        {completedPhotos.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {completedPhotos.map((p, idx) => (
                              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                                <img src={p.url} alt="Final" className="w-full h-full object-cover" />
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

                      {/* Final Notes Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-300 block">
                          ملاحظات ختامية حول إنجاز المهمة *:
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
                      <div className="pt-2 flex items-center justify-between border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setWorkflowStage(3)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                        >
                          العودة لقيد العمل
                        </button>

                        <button
                          type="button"
                          onClick={handleCompleteService}
                          disabled={isCompleting || isProcessingImages}
                          className="px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {isCompleting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>جاري إكمال المهمة وإشعار الإدارة...</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="w-4 h-4" />
                              <span>إكمال المهمة وإرسال إشعار للإدارة 🏁</span>
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
                  <h4 className="text-sm font-bold text-white">لا توجد تحديثات مسجلة في الـ Timeline بعد</h4>
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
                  <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
                    <span>سجل التحديثات الميدانية الكامل ({steps.length} مراحل مسجلة):</span>
                    <a
                      href={getCustomerProgressWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                      title="مشاركة التقرير عبر الواتساب"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة التقرير مع العميل</span>
                    </a>
                  </div>

                  <div className="relative border-r-2 border-white/10 pr-4 sm:pr-6 space-y-6 mr-2 sm:mr-3">
                    {steps.map((step, sIdx) => {
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
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
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

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteStep(step.id)}
                                  className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-white/5 rounded-lg transition-colors"
                                  title="حذف هذا التحديث"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                                  {step.photos.map((photo, pIdx) => (
                                    <div 
                                      key={photo.id || pIdx}
                                      onClick={() => setLightboxImage({ url: photo.url, caption: photo.caption, title: step.title })}
                                      className="group relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer shadow-sm hover:border-brand-red/50 transition-all"
                                    >
                                      <img 
                                        src={photo.url} 
                                        alt={photo.caption || step.title} 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                                        <span className="text-[10px] text-white truncate max-w-[80%]">
                                          {photo.caption || 'تكبير الصورة'}
                                        </span>
                                        <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                                      </div>
                                      <div className="absolute top-1.5 right-1.5">
                                        {photo.isInternalOnly ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/80 text-black backdrop-blur-sm shadow flex items-center gap-0.5" title="خاص بالإدارة فقط">
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
                                  ))}
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

                  <div className="flex items-center gap-2">
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
                  فريق العمل المسجل ({technicians.length})
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 block">
                    اختر الفني المسؤول من القائمة:
                  </label>
                  {technicians.length === 0 ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-xs text-yellow-300 space-y-2">
                      <p>لم يتم تسجيل حسابات فنيين بعد في تبويب "إدارة الموظفين".</p>
                      <button
                        type="button"
                        onClick={() => setAssignmentMode('manual')}
                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <span>التبديل إلى كتابة اسم الفني مباشرة دون تسجيل حساب ✍️</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {technicians.map((tech) => (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => setSelectedTechnicianId(tech.id)}
                          className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                            selectedTechnicianId === tech.id
                              ? 'bg-brand-red/15 border-brand-red text-white shadow-md'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-white">{tech.fullName}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {tech.roleTitleAr || 'فني ميداني'} {tech.phone ? `• ${tech.phone}` : ''}
                            </div>
                          </div>
                          {selectedTechnicianId === tech.id && (
                            <Check className="w-4 h-4 text-brand-red shrink-0" />
                          )}
                        </button>
                      ))}
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
                {(selectedTechnicianId || manualTechPhone || record.assignedStaffPhone) ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={getTechnicianWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all"
                      title="إرسال بيانات السند واللوكيشن للفني على الواتساب مباشرة مع الإيموجي"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>إرسال تفاصيل المهمة للفني عبر واتساب ↗</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyTechnicianTask}
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
                      title="نسخ نص المهمة المنسق مع الإيموجي كاملاً بدون أي تشويه"
                    >
                      {copiedTaskDetails ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">تم النسخ بالإيموجي ✅</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-300" />
                          <span>نسخ نص المهمة 📋</span>
                        </>
                      )}
                    </button>

                    {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                      <button
                        type="button"
                        onClick={handleShareTechnicianTask}
                        className="px-3 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        title="مشاركة تفاصيل المهمة عبر التطبيقات الأخرى"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة 📤</span>
                      </button>
                    )}
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
                    className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isAssigning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تأكيد إسناد الفني</span>
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
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 left-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

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
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
