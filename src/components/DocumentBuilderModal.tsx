import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  FileText,
  DollarSign,
  Handshake,
  Building2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit3,
  Eye,
  Save,
  CheckCircle2,
  Car,
  Wrench,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Copy,
  FolderOpen
} from 'lucide-react';
import {
  OfficialDocCategory,
  DocumentStatus,
  DocumentLanguage,
  DocumentTableItem,
  DocumentSection,
  DocumentSignatory,
  OfficialDocumentRecord,
  OFFICIAL_DOC_CATEGORY_LABELS,
  AppSettings
} from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface DocumentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: OfficialDocumentRecord | null;
  settings?: AppSettings;
  lang?: 'ar' | 'en';
  isMasterAdmin?: boolean;
  onSaveDocument?: (doc: OfficialDocumentRecord) => Promise<void> | void;
}

export const DocumentBuilderModal: React.FC<DocumentBuilderModalProps> = ({
  isOpen,
  onClose,
  initialDocument = null,
  settings,
  lang = 'ar',
  isMasterAdmin = true,
  onSaveDocument
}) => {
  // Mode: 'editor' (Form inputs) | 'preview' (Live A4 paper view)
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved_cloud' | 'saved_local' | 'error'>('idle');
  const [saveStatusMessage, setSaveStatusMessage] = useState<string>('');

  // 1. Basic Metadata
  const [docCategory, setDocCategory] = useState<OfficialDocCategory>(
    initialDocument?.category || 'quotation'
  );
  const [docNumber, setDocNumber] = useState<string>(
    initialDocument?.docNumber || `DRF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [docTitle, setDocTitle] = useState<string>(
    initialDocument?.title || OFFICIAL_DOC_CATEGORY_LABELS.quotation.defaultTitleAr
  );
  const [docLanguage, setDocLanguage] = useState<DocumentLanguage>(
    initialDocument?.language || 'ar'
  );
  const [docStatus, setDocStatus] = useState<DocumentStatus>(
    initialDocument?.status || 'draft'
  );
  const [issueDate, setIssueDate] = useState<string>(
    initialDocument?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [hijriDate, setHijriDate] = useState<string>(() => {
    if (initialDocument?.hijriDate) return initialDocument.hijriDate;
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return '';
    }
  });
  const [expiryDate, setExpiryDate] = useState<string>(
    initialDocument?.expiryDate || ''
  );

  // 2. Issuer Details (DR.FIX defaults, editable per document)
  const [issuerName, setIssuerName] = useState<string>(
    initialDocument?.issuer.name || 'مركز DR.FIX لصيانة السيارات والخدمات المتنقلة'
  );
  const [issuerSubName, setIssuerSubName] = useState<string>(
    initialDocument?.issuer.subName || 'DR.FIX | CAR MAINTENANCE & MOBILE SERVICES'
  );
  const [issuerCr, setIssuerCr] = useState<string>(
    initialDocument?.issuer.crNumber || settings?.commercialRegister || '7055517838'
  );
  const [issuerTax, setIssuerTax] = useState<string>(
    initialDocument?.issuer.taxNumber || '' // NO default VAT
  );
  const [issuerPhone, setIssuerPhone] = useState<string>(
    initialDocument?.issuer.phone || settings?.phone || '0546870807'
  );
  const [issuerEmail, setIssuerEmail] = useState<string>(
    initialDocument?.issuer.email || settings?.email || 'info@drfix.repair'
  );
  const [issuerWebsite, setIssuerWebsite] = useState<string>(
    initialDocument?.issuer.website || 'www.drfix.repair'
  );
  const [issuerCity, setIssuerCity] = useState<string>(
    initialDocument?.issuer.city || 'جدة - المملكة العربية السعودية'
  );
  const [issuerAddress, setIssuerAddress] = useState<string>(
    initialDocument?.issuer.address || ''
  );

  // 3. Recipient Details (START COMPLETELY BLANK)
  const [recipientCompany, setRecipientCompany] = useState<string>(
    initialDocument?.recipient.companyName || ''
  );
  const [recipientPerson, setRecipientPerson] = useState<string>(
    initialDocument?.recipient.contactPerson || ''
  );
  const [recipientTitle, setRecipientTitle] = useState<string>(
    initialDocument?.recipient.contactTitle || ''
  );
  const [recipientCity, setRecipientCity] = useState<string>(
    initialDocument?.recipient.city || ''
  );
  const [recipientAddress, setRecipientAddress] = useState<string>(
    initialDocument?.recipient.address || ''
  );
  const [recipientCr, setRecipientCr] = useState<string>(
    initialDocument?.recipient.crNumber || ''
  );
  const [recipientTax, setRecipientTax] = useState<string>(
    initialDocument?.recipient.taxNumber || ''
  );
  const [recipientPhone, setRecipientPhone] = useState<string>(
    initialDocument?.recipient.phone || ''
  );
  const [recipientEmail, setRecipientEmail] = useState<string>(
    initialDocument?.recipient.email || ''
  );

  // 4. Content (Subject, Salutation, Intro, Sections)
  const [subject, setSubject] = useState<string>(
    initialDocument?.subject || ''
  );
  const [salutation, setSalutation] = useState<string>(
    initialDocument?.salutation || 'السلام عليكم ورحمة الله وبركاته، تحية طيبة وبعد،،'
  );
  const [intro, setIntro] = useState<string>(
    initialDocument?.intro || ''
  );
  const [sections, setSections] = useState<DocumentSection[]>(
    initialDocument?.sections || []
  );

  // 5. Pricing Table
  const [showPricingTable, setShowPricingTable] = useState<boolean>(
    initialDocument ? initialDocument.showPricingTable : docCategory === 'quotation'
  );
  const [tableItems, setTableItems] = useState<DocumentTableItem[]>(
    initialDocument?.tableItems || []
  );
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialDocument?.discountType || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initialDocument?.discountValue || 0
  );
  const [taxRate, setTaxRate] = useState<number>(
    initialDocument?.taxRate || 0 // 0% by default, optional
  );
  const [termsConditions, setTermsConditions] = useState<string[]>(
    initialDocument?.termsConditions || []
  );
  const [docNotes, setDocNotes] = useState<string>(
    initialDocument?.notes || ''
  );

  // 6. Signatures (NO SEALS/STAMPS - Starts 100% Blank)
  const [firstSignatoryName, setFirstSignatoryName] = useState<string>(
    initialDocument?.firstPartySignatory.name || ''
  );
  const [firstSignatoryRole, setFirstSignatoryRole] = useState<string>(
    initialDocument?.firstPartySignatory.title || ''
  );
  const [secondSignatoryName, setSecondSignatoryName] = useState<string>(
    initialDocument?.secondPartySignatory.name || ''
  );
  const [secondSignatoryRole, setSecondSignatoryRole] = useState<string>(
    initialDocument?.secondPartySignatory.title || ''
  );

  // When changing category, adjust default title if not manually customized
  const handleCategoryChange = (newCat: OfficialDocCategory) => {
    setDocCategory(newCat);
    setDocTitle(OFFICIAL_DOC_CATEGORY_LABELS[newCat].defaultTitleAr);
    if (newCat === 'quotation') {
      setShowPricingTable(true);
    }
  };

  // Sections management
  const handleAddSection = (type: DocumentSection['type'] = 'paragraph') => {
    const newSec: DocumentSection = {
      id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      title: type === 'subheading' ? 'بند جديد' : '',
      content: '',
      isBold: type === 'subheading',
      fontSize: type === 'subheading' ? 'base' : 'sm'
    };
    setSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, updates: Partial<DocumentSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSections(copy);
  };

  // Table items management
  const handleAddTableItem = () => {
    const newItem: DocumentTableItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      description: '',
      sku: '',
      qty: 1,
      unitPrice: 0,
      warranty: ''
    };
    setTableItems([...tableItems, newItem]);
  };

  const handleUpdateTableItem = (id: string, updates: Partial<DocumentTableItem>) => {
    setTableItems(tableItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleDeleteTableItem = (id: string) => {
    setTableItems(tableItems.filter(item => item.id !== id));
  };

  // Terms management
  const handleAddTerm = () => {
    setTermsConditions([...termsConditions, '']);
  };

  const handleUpdateTerm = (index: number, text: string) => {
    const copy = [...termsConditions];
    copy[index] = text;
    setTermsConditions(copy);
  };

  const handleDeleteTerm = (index: number) => {
    setTermsConditions(termsConditions.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return tableItems.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [tableItems]);

  const discountAmount = useMemo(() => {
    if (!discountValue || discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return Math.round(subtotal * (discountValue / 100) * 100) / 100;
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const netAfterDiscount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    if (!taxRate || taxRate <= 0) return 0;
    return Math.round(netAfterDiscount * (taxRate / 100) * 100) / 100;
  }, [netAfterDiscount, taxRate]);

  const grandTotal = Math.round((netAfterDiscount + taxAmount) * 100) / 100;

  // Save Document to Firebase Firestore & LocalStorage with clear status feedback
  const handleSave = async () => {
    setSaveStatus('saving');
    setSaveStatusMessage('جاري الحفظ في قاعدة بيانات Firebase...');

    const docRecord: OfficialDocumentRecord = {
      id: initialDocument?.id || 'doc_' + Date.now(),
      category: docCategory,
      docNumber,
      title: docTitle,
      language: docLanguage,
      status: docStatus,
      issueDate,
      hijriDate,
      expiryDate,
      issuer: {
        name: issuerName,
        subName: issuerSubName,
        logoUrl: settings?.logoUrl || '/logo-custom.png',
        crNumber: issuerCr,
        taxNumber: issuerTax,
        phone: issuerPhone,
        email: issuerEmail,
        website: issuerWebsite,
        city: issuerCity,
        address: issuerAddress
      },
      recipient: {
        companyName: recipientCompany,
        contactPerson: recipientPerson,
        contactTitle: recipientTitle,
        city: recipientCity,
        address: recipientAddress,
        crNumber: recipientCr,
        taxNumber: recipientTax,
        phone: recipientPhone,
        email: recipientEmail
      },
      subject,
      salutation,
      intro,
      sections,
      showPricingTable,
      tableItems,
      discountType,
      discountValue,
      taxRate,
      notes: docNotes,
      termsConditions: termsConditions.filter(t => t.trim().length > 0),
      firstPartySignatory: {
        name: firstSignatoryName,
        title: firstSignatoryRole,
        company: issuerName
      },
      secondPartySignatory: {
        name: secondSignatoryName,
        title: secondSignatoryRole,
        company: recipientCompany
      },
      updatedAt: new Date().toISOString(),
      createdAt: initialDocument?.createdAt || new Date().toISOString()
    };

    // 1. Immediate local persistence fallback (guarantees zero data loss)
    try {
      const existingStr = localStorage.getItem('drfix_official_documents');
      const existingList: OfficialDocumentRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updatedList = [docRecord, ...existingList.filter(d => d.id !== docRecord.id)];
      localStorage.setItem('drfix_official_documents', JSON.stringify(updatedList));
      localStorage.setItem('drfix_last_document_draft', JSON.stringify(docRecord));
    } catch (localErr) {
      console.warn('Local storage write notice:', localErr);
    }

    if (onSaveDocument) {
      try {
        await onSaveDocument(docRecord);
      } catch (e) {
        console.warn('onSaveDocument callback notice:', e);
      }
    }

    // 2. Direct Cloud persistence to Firebase Firestore
    try {
      const docRef = doc(db, 'official_documents', docRecord.id);
      await setDoc(docRef, {
        ...docRecord,
        savedAt: new Date().toISOString()
      }, { merge: true });

      setSaveStatus('saved_cloud');
      setSaveStatusMessage('تم الحفظ في قاعدة بيانات Firebase بنجاح ☁️');
    } catch (cloudErr) {
      console.warn('Firebase save fallback:', cloudErr);
      setSaveStatus('saved_local');
      setSaveStatusMessage('محفوظ محلياً على جهازك - تعذر الاتصال بالسحابة (وضع أوفلاين)');
    }

    setTimeout(() => {
      setSaveStatus('idle');
    }, 4500);
  };

  // Print Action
  const handlePrint = () => {
    setActiveView('preview');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  if (!isMasterAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-right" dir="rtl">
        <div className="max-w-md w-full bg-neutral-900 border border-red-500/50 rounded-2xl p-6 text-center shadow-2xl text-white">
          <div className="w-14 h-14 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-black font-display mb-2 text-white">صلاحية مخصصة للمالك فقط</h3>
          <p className="text-xs text-neutral-300 leading-relaxed mb-6">
            محرر المستندات والخطابات الرسمية متاح حصرياً للمالك (Owner / Master Admin) فقط، ولا يُسمح بالدخول حتى مع وجود صلاحيات إدارة العقود.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white overflow-hidden text-right" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR (Hidden during @media print) */}
      {/* ========================================================================= */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20 print:hidden">
        
        {/* Left Side: Category selector & Title */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-red-600/15 border border-red-500/30 px-3 py-1.5 rounded-xl">
            <Edit3 className="w-4 h-4 text-red-500" />
            <span className="font-bold text-xs text-white">محرر المستندات والخطابات الرسمي (DR.FIX Builder)</span>
          </div>

          {/* View Toggle: Editor vs Preview */}
          <div className="flex items-center bg-neutral-800 p-1 rounded-xl border border-neutral-700/60 text-xs font-bold">
            <button
              onClick={() => setActiveView('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'editor'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>محرر البيانات</span>
            </button>

            <button
              onClick={() => setActiveView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'preview'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>المعاينة المطبوعة A4</span>
            </button>
          </div>
        </div>

        {/* Right Side: Actions (Save, Zoom, Print, Close) */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Cloud & Local Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <span className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold ${
              saveStatus === 'saved_cloud'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : saveStatus === 'saved_local'
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                : saveStatus === 'saving'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-red-500/15 text-red-300 border-red-500/40'
            }`}>
              {saveStatus === 'saving' && <Save className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
              {saveStatus === 'saved_cloud' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {saveStatus === 'saved_local' && <Save className="w-3.5 h-3.5 text-sky-400" />}
              <span>{saveStatusMessage}</span>
            </span>
          )}

          {/* Zoom Controls (When in preview mode) */}
          {activeView === 'preview' && (
            <div className="hidden sm:flex items-center bg-neutral-800 rounded-xl border border-neutral-700/60 p-0.5 text-xs text-neutral-300">
              <button
                onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
                className="p-1.5 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-neutral-400">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(125, zoomLevel + 10))}
                className="p-1.5 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>حفظ المستند</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-900/40 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة A4 / تصدير PDF</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ======================================================================= */}
        {/* VIEW A: EDITOR MODE (Form Controls) */}
        {/* ======================================================================= */}
        {activeView === 'editor' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
            
            {/* 1. Document Category & General Properties */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                  <Layers className="w-4 h-4 text-red-500" />
                  <span>نوع المستند وخصائصه الأساسية</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">Document Configuration</span>
              </div>

              {/* 8 Document Types Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(OFFICIAL_DOC_CATEGORY_LABELS) as OfficialDocCategory[]).map((cat) => {
                  const isSelected = docCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-600/15 border-red-500 text-white shadow-md'
                          : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{OFFICIAL_DOC_CATEGORY_LABELS[cat].ar}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">{OFFICIAL_DOC_CATEGORY_LABELS[cat].en}</div>
                    </button>
                  );
                })}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">رقم الإشارة (Ref No):</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                    placeholder="DRF-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">عنوان المستند الرئيسي:</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="عرض أسعار معتمد"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">تاريخ الإصدار (ميلادي):</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">التاريخ الهجري:</label>
                  <input
                    type="text"
                    value={hijriDate}
                    onChange={(e) => setHijriDate(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="17 شوال 1447 هـ"
                  />
                </div>
              </div>

              {/* Language, Status, Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">لغة المستند:</label>
                  <select
                    value={docLanguage}
                    onChange={(e) => setDocLanguage(e.target.value as DocumentLanguage)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                  >
                    <option value="ar">اللغة العربية (Arabic)</option>
                    <option value="en">اللغة الإنجليزية (English)</option>
                    <option value="bilingual">ثنائي اللغة (Bilingual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">حالة المستند:</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value as DocumentStatus)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                  >
                    <option value="draft">مسودة (Draft)</option>
                    <option value="under_review">قيد المراجعة (Under Review)</option>
                    <option value="approved">معتمد رسمي (Approved)</option>
                    <option value="cancelled">ملغي (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">سريان العرض / الصلاحية (اختياري):</label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="مثال: 30 يوماً من تاريخ الإصدار"
                  />
                </div>
              </div>
            </div>

            {/* 2. Recipient Details (START BLANK) */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                  <Building2 className="w-4 h-4 text-red-500" />
                  <span>بيانات الجهة المستلمة (العميل / الشركة / المؤسسة)</span>
                </div>
                <span className="text-[11px] text-neutral-500">حقول فارغة مخصصة بالكامل</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">اسم الشركة أو المؤسسة أو الجهة:</label>
                  <input
                    type="text"
                    value={recipientCompany}
                    onChange={(e) => setRecipientCompany(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="أدخل اسم الجهة المستلمة..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">المدينة / الفرع:</label>
                  <input
                    type="text"
                    value={recipientCity}
                    onChange={(e) => setRecipientCity(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="جدة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">عناية الأستاذ / المسؤول:</label>
                  <input
                    type="text"
                    value={recipientPerson}
                    onChange={(e) => setRecipientPerson(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="اسم المسؤول الموجه إليه..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">المسمى الوظيفي للمسؤول:</label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                    placeholder="مثال: مدير العمليات / مدير المشتريات"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">رقم الهاتف / الجوال:</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                    placeholder="client@company.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">رقم السجل التجاري (إن وجد):</label>
                  <input
                    type="text"
                    value={recipientCr}
                    onChange={(e) => setRecipientCr(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                    placeholder="4030XXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">الرقم الضريبي (إن وجد):</label>
                  <input
                    type="text"
                    value={recipientTax}
                    onChange={(e) => setRecipientTax(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-red-500 outline-none"
                    placeholder="3XXXXXXXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* 3. Document Content (Subject, Intro, Sections/Paragraphs) */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>محتوى المستند والفقرات التحريرية</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddSection('paragraph')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg border border-neutral-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>+ فقرة نصية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection('bullet')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg border border-neutral-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>+ نقطة (Bullet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection('subheading')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg border border-neutral-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>+ عنوان فرعي</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">الموضوع (Subject):</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500 outline-none"
                  placeholder="موضوع الخطاب أو الاتفاقية..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">التحية الافتتاحية:</label>
                <input
                  type="text"
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">مقدمة الخطاب / التمهيد:</label>
                <textarea
                  rows={3}
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:border-red-500 outline-none resize-y"
                  placeholder="اكتب التمهيد أو نص المقدمة هنا..."
                />
              </div>

              {/* Dynamic Sections List */}
              {sections.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-neutral-400">البنود والفقرات الإضافية ({sections.length}):</div>
                  {sections.map((sec, idx) => (
                    <div key={sec.id} className="bg-neutral-800/60 border border-neutral-700/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-700 text-neutral-300">
                            #{idx + 1} - {sec.type === 'subheading' ? 'عنوان فرعي' : sec.type === 'bullet' ? 'نقطة' : 'فقرة'}
                          </span>
                          {sec.type === 'subheading' && (
                            <input
                              type="text"
                              value={sec.title || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { title: e.target.value })}
                              placeholder="عنوان البند..."
                              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                            />
                          )}
                        </div>

                        {/* Order & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, 'down')}
                            disabled={idx === sections.length - 1}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400 cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={sec.content}
                        onChange={(e) => handleUpdateSection(sec.id, { content: e.target.value })}
                        placeholder="نص البند أو الفقرة..."
                        className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl p-2.5 text-xs text-white leading-relaxed focus:border-red-500 outline-none resize-y"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Dynamic Services & Pricing Table */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>جدول الخدمات والأسعار (Pricing & Services Table)</span>
                  </div>
                  
                  {/* Toggle Table Visibility */}
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPricingTable}
                      onChange={(e) => setShowPricingTable(e.target.checked)}
                      className="rounded accent-red-600"
                    />
                    <span>تضمين جدول الأسعار في المستند</span>
                  </label>
                </div>

                {showPricingTable && (
                  <button
                    type="button"
                    onClick={handleAddTableItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة بند جديد</span>
                  </button>
                )}
              </div>

              {showPricingTable && (
                <div className="space-y-4">
                  {tableItems.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-neutral-800 rounded-xl text-xs text-neutral-500">
                      لا توجد بنود حالياً في جدول الأسعار. اضغط على <b>"+ إضافة بند جديد"</b> للبدء.
                    </div>
                  ) : (
                    <div className="border border-neutral-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-neutral-800/80 text-neutral-300 font-bold border-b border-neutral-700 text-[11px]">
                          <tr>
                            <th className="p-2.5 w-10 text-center">#</th>
                            <th className="p-2.5 min-w-[200px]">بيان الخدمة / الصيانة وقطع الغيار</th>
                            <th className="p-2.5 w-24">كود البند</th>
                            <th className="p-2.5 w-16 text-center">الكمية</th>
                            <th className="p-2.5 w-24 text-center">سعر الوحدة</th>
                            <th className="p-2.5 w-24 text-center">الإجمالي</th>
                            <th className="p-2.5 w-28">الضمان</th>
                            <th className="p-2.5 w-12 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800 text-xs">
                          {tableItems.map((item, idx) => {
                            const itemTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                            return (
                              <tr key={item.id} className="hover:bg-neutral-800/30">
                                <td className="p-2 text-center font-mono text-neutral-500">{idx + 1}</td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => handleUpdateTableItem(item.id, { description: e.target.value })}
                                    placeholder="وصف الخدمة أو الصيانة..."
                                    className="w-full bg-neutral-800/70 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-red-500"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.sku || ''}
                                    onChange={(e) => handleUpdateTableItem(item.id, { sku: e.target.value })}
                                    placeholder="كود"
                                    className="w-full bg-neutral-800/70 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => handleUpdateTableItem(item.id, { qty: Number(e.target.value) || 1 })}
                                    className="w-full bg-neutral-800/70 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.unitPrice}
                                    onChange={(e) => handleUpdateTableItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                                    className="w-full bg-neutral-800/70 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-neutral-200">
                                  {itemTotal.toLocaleString()}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.warranty || ''}
                                    onChange={(e) => handleUpdateTableItem(item.id, { warranty: e.target.value })}
                                    placeholder="فترة الضمان..."
                                    className="w-full bg-neutral-800/70 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTableItem(item.id)}
                                    className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pricing Summary & Adjustments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-800/40 p-4 rounded-xl border border-neutral-800">
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-neutral-300">خيارات الخصم والضريبة الإضافية:</div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">نوع الخصم:</label>
                          <select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as any)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="percentage">نسبة مئوية (%)</option>
                            <option value="fixed">مبلغ ثابت (ر.س)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">قيمة الخصم:</label>
                          <input
                            type="number"
                            min="0"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none"
                          />
                        </div>
                      </div>

                      {/* Tax Rate (Optional, 0% default) */}
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">
                          نسبة ضريبة القيمة المضافة (VAT %):
                          <span className="text-neutral-500 mr-1 text-[10px]">(اتركها 0 إذا لم تكن مسجلاً في الضريبة)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                          className="w-32 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    {/* Math Totals Display */}
                    <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-neutral-400">
                        <span>المجموع الفرعي:</span>
                        <span className="font-bold text-white">{subtotal.toLocaleString()} ر.س</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>الخصم التجاري ({discountType === 'percentage' ? `${discountValue}%` : 'مبلغ'}):</span>
                          <span>- {discountAmount.toLocaleString()} ر.س</span>
                        </div>
                      )}
                      {taxRate > 0 && (
                        <div className="flex justify-between text-neutral-400">
                          <span>الضريبة ({taxRate}%):</span>
                          <span>+ {taxAmount.toLocaleString()} ر.س</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-800 text-red-500">
                        <span>الإجمالي الكلي النهائي:</span>
                        <span>{grandTotal.toLocaleString()} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Terms, Conditions & Notes */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span>الشروط والأحكام والملاحظات العامة</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddTerm}
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg border border-neutral-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>+ إضافة بند شرط</span>
                </button>
              </div>

              {termsConditions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-400">بنود الشروط المعتمدة:</div>
                  {termsConditions.map((term, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-neutral-500">{tIdx + 1}.</span>
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => handleUpdateTerm(tIdx, e.target.value)}
                        placeholder="نص الشرط أو الالتزام..."
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(tIdx)}
                        className="p-1.5 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">ملاحظات ختامية (اختياري):</label>
                <textarea
                  rows={2}
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:border-red-500 outline-none resize-y"
                  placeholder="أي ملاحظات إضافية أو تعليمات سداد أو تسليم..."
                />
              </div>
            </div>

            {/* 6. Signatories (NO SEALS / STAMPS) */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-neutral-200">
                  <Handshake className="w-4 h-4 text-red-500" />
                  <span>الموقعون والاعتماد الرسمي (بدون ختم)</span>
                </div>
                <span className="text-[11px] text-neutral-500">اعتماد وتواقيع الأطراف</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Party (Issuer) */}
                <div className="bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                  <div className="font-bold text-xs text-red-400">الطرف الأول (الجهة المصدرة):</div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">اسم المفوض بالتوقيع:</label>
                    <input
                      type="text"
                      value={firstSignatoryName}
                      onChange={(e) => setFirstSignatoryName(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">المسمى الوظيفي / الصفة:</label>
                    <input
                      type="text"
                      value={firstSignatoryRole}
                      onChange={(e) => setFirstSignatoryRole(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Second Party (Recipient) */}
                <div className="bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                  <div className="font-bold text-xs text-red-400">الطرف الثاني (الجهة المستلمة):</div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">اسم المفوض بالتوقيع والاعتماد:</label>
                    <input
                      type="text"
                      value={secondSignatoryName}
                      onChange={(e) => setSecondSignatoryName(e.target.value)}
                      placeholder="اسم ممثل الجهة..."
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">المسمى الوظيفي / الصفة:</label>
                    <input
                      type="text"
                      value={secondSignatoryRole}
                      onChange={(e) => setSecondSignatoryRole(e.target.value)}
                      placeholder="الصفة الوظيفية..."
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar in Editor */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>حفظ التعديلات في النظام</span>
                </button>
                {saveStatus !== 'idle' && (
                  <span className={`text-xs font-bold ${
                    saveStatus === 'saved_cloud' ? 'text-emerald-400' : saveStatus === 'saved_local' ? 'text-sky-300' : 'text-amber-300'
                  }`}>
                    {saveStatusMessage}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>معاينة الورقة الرسمية A4 الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VIEW B: LIVE A4 PRINTABLE PREVIEW (Realistic Paper Canvas) */}
        {/* ======================================================================= */}
        {activeView === 'preview' && (
          <div className="flex-1 overflow-auto bg-neutral-950 p-3 sm:p-8 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
            
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out'
              }}
              className="print:transform-none"
            >
              {/* THE PURE WHITE A4 LETTERHEAD */}
              <div
                id="official-doc-builder-print-sheet"
                className="bg-white text-neutral-900 shadow-2xl relative overflow-hidden transition-all print:shadow-none"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  boxSizing: 'border-box',
                  padding: '14mm 16mm 14mm 16mm',
                  position: 'relative',
                  backgroundColor: '#ffffff'
                }}
              >
                {/* Subtle Geometric Background Motif (3% Opacity, Non-Intrusive) */}
                <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
                  <svg className="w-[580px] h-[580px]" viewBox="0 0 500 500" fill="none">
                    <circle cx="250" cy="250" r="230" stroke="#E31837" strokeWidth="1.5" strokeDasharray="8 6" />
                    <circle cx="250" cy="250" r="170" stroke="#000000" strokeWidth="1" />
                    <circle cx="250" cy="250" r="110" stroke="#E31837" strokeWidth="1.5" />
                    <line x1="20" y1="250" x2="480" y2="250" stroke="#000000" strokeWidth="0.75" />
                    <line x1="250" y1="20" x2="250" y2="480" stroke="#000000" strokeWidth="0.75" />
                  </svg>
                </div>

                {/* Luxury Dual Hairline Border with Corner Accents */}
                <div className="absolute inset-[6mm] border border-neutral-300 pointer-events-none z-0 rounded-xs">
                  <div className="absolute inset-[2mm] border border-neutral-200/80" />

                  {/* Corner Precision Marks */}
                  <div className="absolute -top-[1px] -right-[1px] w-8 h-8">
                    <div className="absolute top-0 right-0 w-8 h-[2px] bg-red-600" />
                    <div className="absolute top-0 right-0 w-[2px] h-8 bg-red-600" />
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-neutral-400" />
                  </div>
                  <div className="absolute -top-[1px] -left-[1px] w-8 h-8">
                    <div className="absolute top-0 left-0 w-8 h-[2px] bg-red-600" />
                    <div className="absolute top-0 left-0 w-[2px] h-8 bg-red-600" />
                    <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-neutral-400" />
                  </div>
                  <div className="absolute -bottom-[1px] -right-[1px] w-8 h-8">
                    <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-red-600" />
                    <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-red-600" />
                    <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-neutral-400" />
                  </div>
                  <div className="absolute -bottom-[1px] -left-[1px] w-8 h-8">
                    <div className="absolute bottom-0 left-0 w-8 h-[2px] bg-red-600" />
                    <div className="absolute bottom-0 left-0 w-[2px] h-8 bg-red-600" />
                    <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-neutral-400" />
                  </div>
                </div>

                {/* Document Content Layer */}
                <div className="relative z-10 flex flex-col justify-between min-h-full">
                  
                  {/* Top: Header, Meta Bar, Recipient, Body */}
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 gap-4">
                      {/* Logo and Brand */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-2xl bg-black p-2 flex items-center justify-center border border-neutral-300 shadow-xs shrink-0">
                          <img
                            src={settings?.logoUrl || '/logo-custom.png'}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src.indexOf('logo.png') === -1) {
                                target.src = '/logo.png';
                              }
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-black tracking-tight text-neutral-950 font-display">
                              DR.<span className="text-red-600">FIX</span>
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-300 font-mono">
                              KSA
                            </span>
                          </div>
                          <div className="text-xs font-bold text-neutral-800 tracking-wider font-display">
                            {issuerName}
                          </div>
                          <div className="text-[9.5px] font-semibold text-neutral-500 tracking-wider font-mono uppercase" dir="ltr">
                            {issuerSubName}
                          </div>
                        </div>
                      </div>

                      {/* Header Meta Contacts (NO VAT unless specified) */}
                      <div className="text-left font-mono text-[10px] text-neutral-700 leading-tight space-y-0.5" dir="ltr">
                        {issuerCr && (
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5 justify-end">
                            <span>C.R:</span>
                            <span className="text-red-600 font-black text-[11px]">{issuerCr}</span>
                          </div>
                        )}
                        {issuerTax && (
                          <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                            <span>VAT:</span>
                            <span className="font-semibold text-neutral-900">{issuerTax}</span>
                          </div>
                        )}
                        {issuerPhone && (
                          <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                            <span>Tel:</span>
                            <span className="font-bold text-neutral-900">{issuerPhone}</span>
                          </div>
                        )}
                        {issuerEmail && (
                          <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                            <span>Email:</span>
                            <span className="text-neutral-800">{issuerEmail}</span>
                          </div>
                        )}
                        {issuerWebsite && (
                          <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                            <span>Web:</span>
                            <span className="text-red-700 font-semibold">{issuerWebsite}</span>
                          </div>
                        )}
                        <div className="text-[9px] text-neutral-500 text-right">{issuerCity}</div>
                      </div>
                    </div>

                    {/* Dividing Dual Hairline */}
                    <div className="relative my-2">
                      <div className="w-full h-[2px] bg-red-600" />
                      <div className="w-full h-[0.75px] bg-neutral-300 mt-[1.5px]" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 flex items-center gap-1 text-[9px] font-mono text-red-600 font-bold uppercase tracking-widest">
                        <span>◆</span>
                        <span>OFFICIAL DOCUMENT</span>
                        <span>◆</span>
                      </div>
                    </div>

                    {/* Document Meta Ribbon */}
                    <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl px-4 py-2 mt-2.5 mb-4 flex items-center justify-between text-xs text-neutral-800">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 font-medium">رقم الإشارة (Ref):</span>
                          <span className="font-mono font-black text-red-600">{docNumber}</span>
                        </div>

                        <span className="text-neutral-300">|</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 font-medium">التاريخ:</span>
                          <span className="font-mono font-semibold">{issueDate} م</span>
                          {hijriDate && <span className="text-neutral-400 text-[10px]">({hijriDate})</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="font-bold text-xs text-neutral-900 font-display">
                          {docTitle}
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-50 text-red-700 border border-red-200">
                          {docStatus === 'approved' ? 'معتمد رسمياً' : docStatus === 'draft' ? 'مسودة عمل' : 'وثيقة رسمية'}
                        </span>
                      </div>
                    </div>

                    {/* Recipient Information Box (Rendered only if filled) */}
                    {(recipientCompany || recipientPerson || recipientCity) && (
                      <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50 mb-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recipientCompany && (
                            <div>
                              <span className="text-neutral-500 text-[11px] block">الجهة الموجه إليها:</span>
                              <span className="font-black text-sm text-neutral-950 font-display">{recipientCompany}</span>
                            </div>
                          )}

                          {recipientPerson && (
                            <div>
                              <span className="text-neutral-500 text-[11px] block">عناية المسئول / المفوض:</span>
                              <span className="font-bold text-neutral-800">{recipientPerson} {recipientTitle ? `(${recipientTitle})` : ''}</span>
                            </div>
                          )}
                        </div>

                        {(recipientCity || recipientCr || recipientTax || recipientPhone) && (
                          <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono mt-2 pt-2 border-t border-neutral-200/80 flex-wrap">
                            {recipientCity && <span>المدينة: {recipientCity}</span>}
                            {recipientCr && <span>السجل التجاري: {recipientCr}</span>}
                            {recipientTax && <span>الرقم الضريبي: {recipientTax}</span>}
                            {recipientPhone && <span>الهاتف: {recipientPhone}</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subject Line */}
                    {subject && (
                      <div className="bg-neutral-100 border-r-4 border-red-600 px-3.5 py-2 rounded-l-lg mb-3">
                        <span className="font-bold text-neutral-600 text-xs">الموضوع: </span>
                        <span className="font-black text-sm text-neutral-950 font-display">{subject}</span>
                      </div>
                    )}

                    {/* Salutation & Intro */}
                    {salutation && (
                      <div className="text-xs font-semibold text-neutral-800 mb-2">
                        {salutation}
                      </div>
                    )}

                    {intro && (
                      <div className="whitespace-pre-line text-neutral-800 text-xs leading-relaxed mb-4 font-sans">
                        {intro}
                      </div>
                    )}

                    {/* Sections & Paragraphs */}
                    {sections.length > 0 && (
                      <div className="space-y-2.5 mb-4">
                        {sections.map((sec, idx) => (
                          <div key={sec.id} className="text-xs leading-relaxed text-neutral-800">
                            {sec.title && (
                              <div className="font-black text-xs text-neutral-950 font-display mb-0.5">
                                {sec.title}
                              </div>
                            )}
                            <div className="flex items-start gap-1.5">
                              {sec.type === 'bullet' && (
                                <span className="text-red-600 font-bold shrink-0 mt-0.5">▪</span>
                              )}
                              {sec.type === 'numbered' && (
                                <span className="font-bold font-mono text-red-600 shrink-0">({idx + 1})</span>
                              )}
                              <p className={`whitespace-pre-line ${sec.isBold ? 'font-bold' : ''}`}>
                                {sec.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dynamic Pricing Table (if enabled and has items) */}
                    {showPricingTable && tableItems.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-neutral-100 text-neutral-900 font-bold border-b border-neutral-300 text-[11px]">
                              <tr>
                                <th className="p-2 w-8 text-center">#</th>
                                <th className="p-2">بيان الخدمة / الصيانة وقطع الغيار</th>
                                <th className="p-2 text-center w-24">كود البند</th>
                                <th className="p-2 text-center w-12">الكمية</th>
                                <th className="p-2 text-center w-20">السعر (ر.س)</th>
                                <th className="p-2 text-center w-24">الإجمالي (ر.س)</th>
                                <th className="p-2 text-center w-28">الضمان</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 text-[11px]">
                              {tableItems.map((item, idx) => {
                                const itemTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                                return (
                                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}>
                                    <td className="p-2 text-center font-mono font-semibold text-neutral-500">{idx + 1}</td>
                                    <td className="p-2 font-medium text-neutral-900">{item.description}</td>
                                    <td className="p-2 text-center font-mono text-[10px] text-neutral-500">{item.sku || '-'}</td>
                                    <td className="p-2 text-center font-bold text-neutral-900">{item.qty}</td>
                                    <td className="p-2 text-center font-mono font-semibold">{item.unitPrice.toLocaleString()}</td>
                                    <td className="p-2 text-center font-mono font-bold text-neutral-950">{itemTotal.toLocaleString()}</td>
                                    <td className="p-2 text-center text-[10px] text-neutral-600 font-medium">{item.warranty || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Financial Math Summary Box */}
                        <div className="flex justify-end pt-1">
                          <div className="w-72 bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between text-neutral-600">
                              <span>المجموع الفرعي:</span>
                              <span className="font-bold text-neutral-900">{subtotal.toLocaleString()} ر.س</span>
                            </div>
                            {discountAmount > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>الخصم ({discountType === 'percentage' ? `${discountValue}%` : 'مبلغ'}):</span>
                                <span className="font-bold">- {discountAmount.toLocaleString()} ر.س</span>
                              </div>
                            )}
                            {taxRate > 0 && (
                              <div className="flex justify-between text-neutral-700">
                                <span>الضريبة ({taxRate}%):</span>
                                <span className="font-bold">+ {taxAmount.toLocaleString()} ر.س</span>
                              </div>
                            )}
                            <div className="flex justify-between text-neutral-950 text-sm font-black pt-1.5 border-t-2 border-red-600 bg-red-50/50 p-1 rounded">
                              <span className="font-display">الإجمالي المستحق:</span>
                              <span className="text-red-600">{grandTotal.toLocaleString()} ر.س</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Terms & Conditions */}
                    {termsConditions.length > 0 && (
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-3 text-xs">
                        <div className="font-bold text-neutral-900 mb-1 flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                          <span>الشروط والأحكام:</span>
                        </div>
                        <ul className="space-y-1 text-[10.5px] text-neutral-700">
                          {termsConditions.map((term, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="font-mono text-neutral-500 font-semibold">{idx + 1}.</span>
                              <span>{term}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notes */}
                    {docNotes && (
                      <div className="text-neutral-600 text-[10.5px] leading-relaxed mb-4 italic">
                        {docNotes}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Signatures and Footer */}
                  <div className="mt-8 pt-4">
                    {/* Signatures Block (NO STAMPS / SEALS) */}
                    <div className="grid grid-cols-2 gap-8 border-t-2 border-neutral-300 pt-4 text-center text-xs">
                      {/* First Party (DR.FIX) */}
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="font-black text-neutral-950 font-display">
                          اعتماد الطرف الأول ({issuerName})
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">First Party Authorized Signature</div>
                        <div className="h-16 flex items-end justify-center pb-2">
                          <div className="border-b-2 border-neutral-400 w-48" />
                        </div>
                        <div className="text-[11px] font-bold text-neutral-900">{firstSignatoryName}</div>
                        <div className="text-[10px] text-neutral-500">{firstSignatoryRole}</div>
                      </div>

                      {/* Second Party (Recipient) */}
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="font-black text-neutral-950 font-display">
                          اعتماد الطرف الثاني {recipientCompany ? `(${recipientCompany})` : ''}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">Second Party Authorized Signature</div>
                        <div className="h-16 flex items-end justify-center pb-2">
                          <div className="border-b-2 border-neutral-400 w-48" />
                        </div>
                        <div className="text-[11px] font-bold text-neutral-900">
                          {secondSignatoryName || 'المفوض بالاعتماد والتوقيع'}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {secondSignatoryRole || 'الصفة الرسمية'}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Footer */}
                    <div className="mt-5 pt-3 border-t border-neutral-300">
                      <div className="w-full h-[2px] bg-red-600 mb-2" />
                      <div className="flex items-center justify-between text-[9px] text-neutral-600 font-mono leading-tight flex-wrap gap-2">
                        <div className="text-right">
                          <span className="font-bold text-neutral-900">المركز الرئيسي:</span>
                          <span> {issuerCity}</span>
                        </div>
                        {issuerCr && (
                          <div className="text-center">
                            <span className="font-bold text-red-600">س.ت: </span>
                            <span className="font-bold text-neutral-900">{issuerCr}</span>
                          </div>
                        )}
                        <div className="text-left" dir="ltr">
                          {issuerPhone && <span>Tel: {issuerPhone} | </span>}
                          <span>{issuerWebsite}</span>
                        </div>
                      </div>
                      <div className="text-center text-[8.5px] text-neutral-400 mt-1 uppercase tracking-wider font-mono">
                        DR.FIX | Professional Automotive & Mobile Fleet Services
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. EMBEDDED PRINT CSS (Ensures pure A4 print output without UI chrome) */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          header, nav, footer, button, .print\\:hidden {
            display: none !important;
          }

          #official-doc-builder-print-sheet {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 14mm 12mm 14mm !important;
            background: #ffffff !important;
            color: #111827 !important;
            page-break-after: auto;
          }

          table, tr, td, th {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentBuilderModal;
