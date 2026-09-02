import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  KeyRound, 
  Copy, 
  Check, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Headphones, 
  SlidersHorizontal,
  UserCheck,
  Send,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  StaffUser, 
  StaffRole, 
  StaffPermissions, 
  ROLE_PRESETS 
} from '../types';

interface StaffManagementProps {
  staffList: StaffUser[];
  currentStaffUser: StaffUser | null;
  appUrl?: string;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  staffList, 
  currentStaffUser,
  appUrl = window.location.origin
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('technician');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [permissions, setPermissions] = useState<StaffPermissions>(ROLE_PRESETS.technician.permissions);

  // Generate random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
    let result = 'Fix@';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFullName('');
    setUsername('');
    setPassword('Fix@' + Math.floor(1000 + Math.random() * 9000));
    setPhone('');
    setRole('technician');
    setIsActive(true);
    setNotes('');
    setPermissions({ ...ROLE_PRESETS.technician.permissions });
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFullName(staff.fullName || '');
    setUsername(staff.username || '');
    setPassword(staff.password || '');
    setPhone(staff.phone || '');
    setRole(staff.role || 'custom');
    setIsActive(staff.isActive !== false);
    setNotes(staff.notes || '');
    setPermissions({ ...staff.permissions });
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (newRole !== 'custom') {
      setPermissions({ ...ROLE_PRESETS[newRole].permissions });
    }
  };

  const handlePermissionToggle = (key: keyof StaffPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // If manually tweaking, switch role indicator to custom unless it matches preset
    setRole('custom');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة: الاسم، اسم المستخدم، وكلمة المرور');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check duplicate username
    const duplicate = staffList.find(s => 
      s.username.toLowerCase() === cleanUsername && 
      (!editingStaff || s.id !== editingStaff.id)
    );

    if (duplicate) {
      alert(`اسم المستخدم "${cleanUsername}" مسجل بالفعل لموظف آخر. يرجى اختيار اسم مستخدم فريد.`);
      return;
    }

    setLoading(true);
    try {
      const roleTitle = ROLE_PRESETS[role]?.titleAr || 'صلاحيات مخصصة';
      const staffPayload = {
        fullName: fullName.trim(),
        username: cleanUsername,
        password: password.trim(),
        phone: phone.trim(),
        role,
        roleTitleAr: roleTitle,
        permissions,
        isActive,
        notes: notes.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), staffPayload);
      } else {
        await addDoc(collection(db, 'staff'), {
          ...staffPayload,
          createdAt: serverTimestamp(),
          lastLogin: null
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving staff:', err);
      alert('حدث خطأ أثناء حفظ بيانات الموظف. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (staff: StaffUser) => {
    try {
      await updateDoc(doc(db, 'staff', staff.id), {
        isActive: !staff.isActive,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error toggling staff status:', err);
    }
  };

  const handleDeleteStaff = async (staff: StaffUser) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب الموظف "${staff.fullName}" (${staff.username}) نهائياً؟`)) {
      try {
        await deleteDoc(doc(db, 'staff', staff.id));
      } catch (err) {
        console.error('Error deleting staff:', err);
      }
    }
  };

  const handleCopyCredentials = (staff: StaffUser) => {
    const text = `🚗 *نظام DR.FIX للصيانة المتنقلة*\n\n` +
      `مرحباً ${staff.fullName} 👋\n` +
      `تم إنشاء/تحديث حسابك في لوحة التحكم بالصلاحيات المحددة.\n\n` +
      `🌐 *رابط تسجيل الدخول:* ${appUrl}/admin\n` +
      `👤 *اسم المستخدم:* \`${staff.username}\`\n` +
      `🔑 *كلمة المرور:* \`${staff.password}\`\n` +
      `💼 *المسمى الوظيفي:* ${staff.roleTitleAr || 'موظف'}\n\n` +
      `_يرجى الحفاظ على سرية بيانات حسابك._`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(staff.id);
      setTimeout(() => setCopiedId(null), 3000);
    });
  };

  const handleSendWhatsApp = (staff: StaffUser) => {
    if (!staff.phone) {
      alert('لا يوجد رقم جوال مسجل لهذا الموظف.');
      return;
    }
    const cleanPhone = staff.phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') 
      ? cleanPhone 
      : cleanPhone.startsWith('05') 
      ? '966' + cleanPhone.slice(1) 
      : (cleanPhone.startsWith('5') ? '966' + cleanPhone : cleanPhone);

    const msg = `🚗 *نظام DR.FIX للصيانة المتنقلة*\n\n` +
      `مرحباً ${staff.fullName} 👋\n` +
      `تم إنشاء/تحديث حسابك في لوحة تحكم DR.FIX.\n\n` +
      `🌐 *رابط الدخول:* ${appUrl}/admin\n` +
      `👤 *اسم المستخدم:* ${staff.username}\n` +
      `🔑 *كلمة المرور:* ${staff.password}\n` +
      `💼 *الدور:* ${staff.roleTitleAr || 'موظف'}\n\n` +
      `خلك جاهز لخدمة عملائنا 🚗⚡`;

    window.open(`https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered list
  const filteredStaff = staffList.filter(s => {
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    const matchesSearch = !searchTerm.trim() || 
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm);
    return matchesRole && matchesSearch;
  });

  const getRoleBadgeStyle = (r: StaffRole) => {
    switch (r) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'dispatcher':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'technician':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'support':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getRoleIcon = (r: StaffRole) => {
    switch (r) {
      case 'super_admin': return <ShieldCheck className="w-4 h-4" />;
      case 'dispatcher': return <SlidersHorizontal className="w-4 h-4" />;
      case 'technician': return <Wrench className="w-4 h-4" />;
      case 'support': return <Headphones className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const permissionLabels: { key: keyof StaffPermissions; title: string; desc: string; icon: string }[] = [
    { key: 'canViewDashboard', title: 'لوحة الإحصائيات العامة', desc: 'عرض المؤشرات المالية، عدد الحجوزات ونسب الإنجاز', icon: '📊' },
    { key: 'canManageBookings', title: 'إدارة الحجوزات والعمليات', desc: 'عرض الطلبات، تفاصيل سيارات العملاء وملاحظات الصيانة', icon: '🚗' },
    { key: 'canChangeStatus', title: 'تغيير حالات الحجز', desc: 'قبول، تحريك الفني بالطريق، إنجاز، وإلغاء الطلبات وفتح واتساب', icon: '🔄' },
    { key: 'canViewCalendar', title: 'التقويم والمواعيد', desc: 'استعراض مواعيد الصيانة على التقويم الشهري واليومي', icon: '📅' },
    { key: 'canManageCustomers', title: 'سجل العملاء والسيارات', desc: 'قاعدة بيانات العملاء وأرقام هواتفهم وسجل صيانة سياراتهم', icon: '👥' },
    { key: 'canViewReports', title: 'التقارير وسندات الصيانة', desc: 'طباعة وتصدير كشوفات الحساب وسندات استلام الصيانة (Word & PDF)', icon: '📄' },
    { key: 'canManageTestimonials', title: 'التقييمات والآراء', desc: 'قراءة تقييمات العملاء والرد عليها أو حذفها', icon: '⭐' },
    { key: 'canManageNotifications', title: 'الإشعارات وتيليجرام', desc: 'إعدادات ربط البوت واختبار إشعارات الحجوزات', icon: '🔔' },
    { key: 'canViewAnalytics', title: 'التحليلات المالية والنمو', desc: 'تحليل الإيرادات ومتوسط سعر الخدمات ونمو المبيعات', icon: '📈' },
    { key: 'canManagePayments', title: 'المدفوعات والرقابة المالية', desc: 'إدارة عمليات الدفع والتدقيق المحاسبي (RBAC)', icon: '💵' },
    { key: 'canManageContent', title: 'إدارة المحتوى والعروض', desc: 'تعديل الخدمات، باقات العروض، ومعرض صور الأعمال', icon: '📝' },
    { key: 'canManageSettings', title: 'الإعدادات العامة والهوية', desc: 'تغيير نصوص الموقع، الألوان، أرقام التواصل وروابط السوشيال', icon: '⚙️' },
    { key: 'canManageStaff', title: 'إدارة الموظفين والصلاحيات', desc: 'إنشاء وتعديل حسابات الموظفين وكلمات المرور وتحديد الأدوار', icon: '🛡️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="glass-card p-6 md:p-8 border-brand-red/20 bg-gradient-to-r from-brand-red/10 via-brand-black to-black rounded-3xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-red/20 border border-brand-red/30 rounded-full text-brand-red text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              نظام إدارة فريق العمل والصلاحيات
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black italic">
              الموظفون وحسابات الوصول <span className="text-brand-red">Staff Portal</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              يمكنك هنا إنشاء حسابات للموظفين والفنيين وتعيين اسم مستخدم وكلمة مرور وتحديد صلاحيات كل دور بدقة، مع إمكانية إرسال بيانات الدخول فوراً للموظف عبر WhatsApp.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-3.5 bg-brand-red hover:bg-red-700 text-white font-display font-black rounded-2xl shadow-xl shadow-brand-red/25 transition-all text-sm md:text-base cursor-pointer shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-6 md:col-span-7 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، اسم المستخدم، أو رقم الجوال..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-all"
          />
        </div>

        <div className="sm:col-span-6 md:col-span-5 flex gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-all"
          >
            <option value="all" className="bg-brand-black">كل الأدوار الوظيفية</option>
            <option value="super_admin" className="bg-brand-black">مدير عام (Super Admin)</option>
            <option value="dispatcher" className="bg-brand-black">مسؤول عمليات واستقبال</option>
            <option value="technician" className="bg-brand-black">فني صيانة ميداني</option>
            <option value="support" className="bg-brand-black">خدمة عملاء</option>
            <option value="custom" className="bg-brand-black">صلاحيات مخصصة</option>
          </select>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* System Super Admin Default Card (Pinned Info) */}
        <div className="glass-card p-6 border-purple-500/30 bg-purple-950/10 rounded-3xl relative flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border bg-purple-500/20 text-purple-400 border-purple-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                حساب المدير العام الافتراضي
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-500/20" title="نشط دائماً" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                DR.FIX Master Admin
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">الحساب الرئيسي للنظام (كافة الصلاحيات مفتوحة)</p>
            </div>

            <div className="space-y-2 p-3 bg-black/40 rounded-xl border border-white/5 text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span className="text-gray-500">اسم المستخدم:</span>
                <span className="font-mono font-bold text-white">DRFIX</span>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span className="text-gray-500">كلمة المرور:</span>
                <span className="font-mono font-bold text-purple-300">ADMIN2468</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] text-gray-300">✓ كافة الإحصائيات</span>
              <span className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] text-gray-300">✓ إدارة الحجوزات</span>
              <span className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] text-gray-300">✓ الموظفين والإعدادات</span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>حساب النظام الأساسي</span>
            <span className="text-purple-400 font-bold">حماية قصوى 🛡️</span>
          </div>
        </div>

        {/* Dynamic Staff Cards */}
        {filteredStaff.map((staff) => {
          const activePermissionsCount = Object.values(staff.permissions || {}).filter(Boolean).length;
          const isCopied = copiedId === staff.id;

          return (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-card p-6 rounded-3xl relative flex flex-col justify-between border ${
                staff.isActive !== false ? 'border-white/10 hover:border-brand-red/40' : 'border-red-500/20 bg-red-950/5 opacity-75'
              } transition-all`}
            >
              <div className="space-y-4">
                {/* Header: Role & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeStyle(staff.role)}`}>
                    {getRoleIcon(staff.role)}
                    {staff.roleTitleAr || ROLE_PRESETS[staff.role]?.titleAr || 'موظف'}
                  </div>

                  <button
                    onClick={() => handleToggleActive(staff)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      staff.isActive !== false
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                    title={staff.isActive !== false ? 'اضغط لتعطيل الحساب' : 'اضغط لتفعيل الحساب'}
                  >
                    {staff.isActive !== false ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        حساب نشط
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        معطل
                      </>
                    )}
                  </button>
                </div>

                {/* Staff Name & Contact */}
                <div>
                  <h3 className="text-lg font-bold text-white truncate">{staff.fullName}</h3>
                  {staff.phone ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-brand-red" />
                      <span dir="ltr" className="font-mono">{staff.phone}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">لا يوجد هاتف مسجل</p>
                  )}
                </div>

                {/* Login Credentials Box */}
                <div className="p-3 bg-black/40 rounded-2xl border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">اسم المستخدم:</span>
                    <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {staff.username}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">كلمة المرور:</span>
                    <span className="font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20">
                      {staff.password}
                    </span>
                  </div>
                </div>

                {/* Permissions summary */}
                <div className="text-xs text-gray-400 flex items-center justify-between px-1">
                  <span>الصلاحيات المفعلة:</span>
                  <span className="text-brand-red font-bold font-mono">{activePermissionsCount} من 13 صلاحية</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCopyCredentials(staff)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      isCopied 
                        ? 'bg-green-500/20 text-green-400 border-green-500/40' 
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'تم النسخ ✓' : 'نسخ البيانات'}
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(staff)}
                    className="py-2 px-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="إرسال بيانات الدخول للموظف عبر واتساب"
                  >
                    <Send className="w-3.5 h-3.5" />
                    واتساب
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => openEditModal(staff)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    تعديل الصلاحيات
                  </button>

                  <button
                    onClick={() => handleDeleteStaff(staff)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف الحساب
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="glass-card p-12 text-center rounded-3xl border-dashed border-white/10 space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-500">
            <Users className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white">لم يتم العثور على موظفين مطابقين للبحث</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            يمكنك إضافة موظف جديد وتحديد اسمه واسم المستخدم وكلمة المرور وصلاحياته بكل سهولة.
          </p>
          <button
            onClick={openAddModal}
            className="px-6 py-2.5 bg-brand-red rounded-xl text-white text-xs font-bold hover:bg-red-700 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            إضافة أول موظف الآن
          </button>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-3xl border-brand-red/30 p-6 md:p-8 rounded-3xl my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                    {editingStaff ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-display italic">
                      {editingStaff ? 'تعديل بيانات وصلاحيات الموظف' : 'إضافة موظف جديد وتعيين الصلاحيات'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      حدد اسم المستخدم وكلمة المرور ليتمكن الموظف من تسجيل الدخول مباشرة
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Basic Info Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    1. البيانات الأساسية وتفاصيل الدخول
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">الاسم الكامل للموظف <span className="text-brand-red">*</span></label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مثال: فهد الحربي"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">رقم الجوال (لإرسال بيانات الدخول)</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="مثال: 0551234567"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-300">اسم المستخدم للوصول (Username) <span className="text-brand-red">*</span></label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                        placeholder="مثال: fahad22 أو fahad@drfix.sa"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-red transition-all"
                        required
                      />
                      <span className="text-[10px] text-gray-500">سيستخدمه الموظف لتسجيل الدخول في صفحة /admin</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-300">كلمة المرور (Password) <span className="text-brand-red">*</span></label>
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="text-[11px] text-brand-red hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          توليد كلمة سر عشوائية
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور للموظف"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-red transition-all pl-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Role Preset Selection */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      2. الدور الوظيفي (قالب الصلاحيات الجاهز)
                    </h4>
                    <span className="text-xs text-gray-400">اختر دوراً لتعبئة الصلاحيات تلقائياً</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(Object.keys(ROLE_PRESETS) as StaffRole[]).map((rKey) => {
                      const isSelected = role === rKey;
                      const preset = ROLE_PRESETS[rKey];
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => handleRoleChange(rKey)}
                          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-brand-red/20 border-brand-red text-white ring-2 ring-brand-red/30'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {getRoleIcon(rKey)}
                            {isSelected && <Check className="w-4 h-4 text-brand-red" />}
                          </div>
                          <span className="text-xs font-bold leading-tight">{preset.titleAr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Detailed Granular Permissions */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      3. تفصيل وتخصيص الصلاحيات (13 صلاحية دقيقة)
                    </h4>
                    <span className="text-[11px] text-gray-500">يمكنك تعديل أي صلاحية يدوياً</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 no-scrollbar">
                    {permissionLabels.map((item) => {
                      const isChecked = permissions[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => handlePermissionToggle(item.key)}
                          className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-brand-red/10 border-brand-red/40 text-white'
                              : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
                          }`}
                        >
                          <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{item.title}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent div
                                className="accent-brand-red w-4 h-4 rounded cursor-pointer"
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Active Status Switch & Notes */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white">حالة تفعيل الحساب</span>
                      <p className="text-[11px] text-gray-400">عند إلغاء التفعيل لن يتمكن الموظف من تسجيل الدخول للنظام</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {isActive ? 'الحساب مفعّل ✓' : 'الحساب معطّل ✕'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400">ملاحظات إضافية (اختياري)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثال: مسؤول منطقة شمال جدة، وردية مسائية..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red transition-all"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-brand-red hover:bg-red-700 text-white font-display font-black rounded-xl shadow-lg shadow-brand-red/25 transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span>جاري الحفظ...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {editingStaff ? 'حفظ التعديلات' : 'إنشاء حساب الموظف الآن'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
