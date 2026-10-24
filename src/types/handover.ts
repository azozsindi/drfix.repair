export type VehicleHandoverStatus = 
  | 'received'            // استلام أولي بواسطة الإدارة
  | 'under_inspection'    // قيد الفحص بواسطة الميكانيكي
  | 'in_repair'           // قيد الإصلاح وتنفيذ الأعمال
  | 'ready_for_handover'  // جاهزة للتسليم (طلب الميكانيكي التسليم)
  | 'delivered'           // مسلّمة نهائياً ومعتمدة بتوقيع الإدارة
  | 'cancelled';          // ملغية

export interface PreExistingDamage {
  id: string;
  location: string;       // مكان الضرر (مثل: الصدام الأمامي، الرفرف الأيمن)
  description: string;    // وصف الخدش أو الصدمة
  photoUrl: string;       // صورة الضرر
}

export interface IntakeDocumentation {
  odometer: number;
  odometerPhotoUrl: string;
  frontPhotoUrl: string;
  rearPhotoUrl: string;
  leftSidePhotoUrl: string;
  rightSidePhotoUrl: string;
  fuelLevel?: string;     // '1/4' | '1/2' | '3/4' | 'full'
  preExistingDamages: PreExistingDamage[];
  notes?: string;
  date: string;           // ISO date-time
  staffId: string;
  staffName: string;
  signatureUrl?: string;  // Base64 or Storage URL
  signatureTimestamp?: string;
}

export type FaultStatus = 
  | 'new'                 // جديد
  | 'inspecting'          // قيد الفحص
  | 'needs_approval'      // يحتاج موافقة
  | 'in_repair'           // قيد الإصلاح
  | 'repaired';           // تم الإصلاح

export interface FaultMedia {
  id: string;
  url: string;
  mediaType: 'image' | 'video';
  uploadedAt: string;
  caption?: string;
}

export interface VehicleFault {
  id: string;
  title: string;
  description: string;
  diagnosisNotes?: string;
  repairOutcomeNotes?: string;
  status: FaultStatus;
  media: FaultMedia[];
  isDraft: boolean;       // حفظ كمسودة قبل إرساله للإدارة
  createdAt: string;
  updatedAt: string;
  reportedByMechanicId: string;
  reportedByMechanicName: string;
}

export interface HandoverMedia {
  id: string;
  url: string;
  storagePath?: string;
  mediaType: 'image' | 'video';
  caption?: string;
  stage: 'intake' | 'inspection' | 'during_repair' | 'final';
  uploadedByStaffId: string;
  uploadedByStaffName: string;
  uploadedByRole: string;
  uploadedAt: string;
  fileSizeBytes?: number;
}

export interface FinalDeliveryDocumentation {
  finalOdometer: number;
  finalOdometerPhotoUrl?: string;
  finalBodyPhotos: string[];
  notes?: string;
  adminSignatureUrl: string;
  adminSignatureTimestamp: string;
  adminStaffId: string;
  adminStaffName: string;
  deliveredAt: string;
}

export type HandoverAuditAction = 
  | 'created'
  | 'mechanic_assigned'
  | 'intake_signed'
  | 'mechanic_accepted'
  | 'fault_added'
  | 'fault_updated'
  | 'media_uploaded'
  | 'handover_requested'
  | 'final_delivered'
  | 'status_changed';

export interface HandoverAuditLog {
  id: string;
  handoverId: string;
  handoverCode: string;
  plateNumber: string;
  action: HandoverAuditAction;
  actionTitle: string;
  details: string;
  performedByStaffId: string;
  performedByStaffName: string;
  performedByRole: string;
  timestamp: string;
}

export interface VehicleHandoverRecord {
  id: string;
  handoverCode: string;   // e.g. VH-8821
  plateNumber: string;    // رقم اللوحة
  carMake: string;        // الصانع (تويوتا، مرسيدس...)
  carModel: string;       // الموديل (كامري...)
  carYear: string;        // سنة الصنع
  vin?: string;           // رقم الهيكل
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  
  status: VehicleHandoverStatus;

  // توثيق الاستلام الأولي
  intake: IntakeDocumentation;

  // إسناد الميكانيكي وتأكيد الاستلام
  assignedMechanicId?: string;
  assignedMechanicName?: string;
  assignedMechanicPhone?: string;
  assignedAt?: string;
  mechanicAccepted?: boolean;
  mechanicAcceptanceSignatureUrl?: string;
  mechanicAcceptanceTimestamp?: string;
  mechanicAcceptanceNotes?: string;

  // الأعطال المسجلة
  faults: VehicleFault[];

  // معرض الوسائط المرن
  repairMedia: HandoverMedia[];

  // طلب التسليم من الميكانيكي
  handoverRequested?: boolean;
  handoverRequestedAt?: string;
  handoverRequestNotes?: string;

  // الفحص النهائي واعتماد التسليم من الإدارة
  finalDelivery?: FinalDeliveryDocumentation;

  createdAt: any;
  updatedAt: any;
}
