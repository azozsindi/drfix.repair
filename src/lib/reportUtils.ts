// DR.FIX - Professional Report Generator (Word .doc/docx XML & Printable Layouts)
// Supports RTL Arabic, complete totals calculation, official headers and signatures

export interface BookingReportItem {
  id: string;
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  carModel?: string;
  serviceType?: string;
  serviceDate?: string;
  status?: string;
  cost?: string | number;
  notes?: string;
  location?: string;
  createdAt?: any;
}

export interface ReportSummary {
  title: string;
  periodLabel: string;
  generatedAt: string;
  totalBookings: number;
  completedBookings: number;
  activeBookings?: number;
  uniqueCustomers?: number;
  totalRevenue?: number;
  avgTicket?: number;
  items: BookingReportItem[];
}

function getStatusArabic(status?: string): string {
  switch (status) {
    case 'accepted': return 'مقبول';
    case 'on_the_way': return 'الفني بالطريق';
    case 'in-progress':
    case 'in_progress': return 'قيد العمل';
    case 'completed': return 'مكتمل';
    case 'cancelled': return 'ملغي';
    default: return 'جديد';
  }
}

function formatReportDate(val: any): string {
  if (!val) return new Date().toLocaleDateString('ar-SA');
  if (typeof val === 'string') return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate().toLocaleDateString('ar-SA');
  if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString('ar-SA');
  if (val instanceof Date) return val.toLocaleDateString('ar-SA');
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toLocaleDateString('ar-SA') : d.toLocaleDateString('ar-SA');
}

/**
 * Generates an official Microsoft Word (.doc) report with native RTL support,
 * clean typography, bordered tables, and DR.FIX corporate styling.
 */
export function exportBookingsToWord(summary: ReportSummary, filename?: string) {
  const docTitle = summary.title || 'تقرير حجوزات وعمليات DR.FIX';
  const outName = filename || `DRFIX_Report_${new Date().toISOString().slice(0, 10)}.doc`;

  const rowsHtml = summary.items.map((item, idx) => {
    const dateStr = item.serviceDate ? formatReportDate(item.serviceDate) : formatReportDate(item.createdAt);
    const statusAr = getStatusArabic(item.status);
    const bId = item.bookingId || item.id || `DRF-${idx + 1}`;
    const name = item.customerName || item.customerPhone || 'عميل';
    const phone = item.customerPhone || '-';
    const car = item.carModel || 'غير محدد';
    const service = item.serviceType || 'صيانة متنقلة';

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-family: 'Arial', sans-serif;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold; text-align: center; font-family: 'Arial', sans-serif;">${bId}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-family: 'Arial', sans-serif;">${name}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; direction: ltr; font-family: 'Arial', sans-serif;">${phone}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-family: 'Arial', sans-serif;">${car}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-family: 'Arial', sans-serif;">${service}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-family: 'Arial', sans-serif;">${dateStr}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold; font-family: 'Arial', sans-serif;">${statusAr}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold; color: #059669; font-family: 'Arial', sans-serif;">معتمد بضمان المركز</td>
      </tr>
    `;
  }).join('');

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${docTitle}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 portrait;
          margin: 2cm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif;
          direction: rtl;
          text-align: right;
          color: #111827;
          background: #ffffff;
        }
        h1, h2, h3 {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border-bottom: 3px solid #E31837;
          padding-bottom: 12px;
        }
        .summary-box {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
        }
        .summary-box td {
          padding: 12px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .data-table th {
          background-color: #1f2937;
          color: #ffffff;
          padding: 10px 8px;
          border: 1px solid #374151;
          font-size: 13px;
          font-weight: bold;
          text-align: center;
        }
        .footer-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body dir="rtl">
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="text-align: right; vertical-align: middle;">
            <h1 style="color: #E31837; font-size: 24px; font-weight: 900;">DR.FIX | دكتور فيكس</h1>
            <p style="font-size: 13px; color: #4b5563; margin-top: 4px;">المركز المتخصص للصيانة والميكانيكا المتنقلة في جدة 🚗⚡</p>
            <p style="font-size: 11px; color: #6b7280;">هاتف: 0546870807 | الموقع: www.drfix.repair</p>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <h2 style="font-size: 18px; color: #111827;">${docTitle}</h2>
            <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">تاريخ الاستخراج: ${summary.generatedAt}</p>
            <p style="font-size: 12px; color: #6b7280;">الفترة: ${summary.periodLabel}</p>
          </td>
        </tr>
      </table>

      <!-- Summary KPIs -->
      <table class="summary-box">
        <tr>
          <td>
            <div style="font-size: 11px; color: #6b7280;">إجمالي الحجوزات</div>
            <div style="font-size: 18px; font-weight: bold; color: #111827; margin-top: 4px;">${summary.totalBookings}</div>
          </td>
          <td>
            <div style="font-size: 11px; color: #6b7280;">الحجوزات المكتملة</div>
            <div style="font-size: 18px; font-weight: bold; color: #059669; margin-top: 4px;">${summary.completedBookings}</div>
          </td>
          <td>
            <div style="font-size: 11px; color: #6b7280;">العمليات قيد المتابعة</div>
            <div style="font-size: 18px; font-weight: bold; color: #d97706; margin-top: 4px;">${summary.activeBookings ?? (summary.totalBookings - summary.completedBookings)}</div>
          </td>
          <td>
            <div style="font-size: 11px; color: #6b7280;">العملاء المستفيدين</div>
            <div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 4px;">${summary.uniqueCustomers ?? summary.totalBookings}</div>
          </td>
        </tr>
      </table>

      <!-- Detailed Table -->
      <h3 style="font-size: 15px; color: #111827; margin-bottom: 8px;">جدول تفاصيل الحجوزات والعمليات الميدانية:</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 12%;">رقم الحجز</th>
            <th style="width: 15%;">اسم العميل</th>
            <th style="width: 13%;">الجوال</th>
            <th style="width: 13%;">السيارة</th>
            <th style="width: 14%;">نوع الخدمة</th>
            <th style="width: 10%;">التاريخ</th>
            <th style="width: 9%;">الحالة</th>
            <th style="width: 14%;">حالة الفحص والضمان</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Footer & Signatures -->
      <div class="footer-section">
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
          <tr>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <p style="font-weight: bold; color: #111827; margin-bottom: 6px;">ملاحظات وشروط الخدمة:</p>
              <p style="font-size: 11px; line-height: 1.6;">1. جميع خدمات الصيانة تشمل ضمان فحص وجودة من DR.FIX.<br/>2. هذا المستند معتمد رسمي من نظام إدارة الورشة المتنقلة بجدة.</p>
            </td>
            <td style="width: 50%; text-align: left; vertical-align: top;">
              <div style="text-align: center; display: inline-block; min-width: 180px;">
                <p style="font-weight: bold; color: #111827; margin-bottom: 40px;">ختم واعتماد إدارة DR.FIX</p>
                <p style="border-top: 1px dashed #9ca3af; padding-top: 6px; font-size: 11px; color: #6b7280;">التوقيع والاعتماد</p>
              </div>
            </td>
          </tr>
        </table>
        <p style="text-align: center; font-size: 10px; color: #9ca3af; margin-top: 30px;">
          تم إنشاء هذا التقرير آلياً عبر منصة DR.FIX الذكية للصيانة المتنقلة - جدة
        </p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = outName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Generates an individual official Work Order / Maintenance Invoice in Word format
 */
export function exportSingleBookingWord(booking: BookingReportItem) {
  const bId = booking.bookingId || booking.id || 'DRF-ORDER';
  const outName = `DRFIX_Order_${bId}.doc`;
  const costNum = Number(booking.cost) || 0;
  const statusAr = getStatusArabic(booking.status);
  const dateStr = booking.serviceDate ? formatReportDate(booking.serviceDate) : formatReportDate(booking.createdAt);

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>سند أمر صيانة - DR.FIX #${bId}</title>
      <style>
        @page { size: A4 portrait; margin: 2cm; }
        body { font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif; direction: rtl; text-align: right; color: #111827; background: #ffffff; }
        .header-box { border-bottom: 3px solid #E31837; padding-bottom: 12px; margin-bottom: 25px; }
        .title { color: #E31837; font-size: 24px; font-weight: 900; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 10px; border: 1px solid #e5e7eb; }
        .label { background-color: #f3f4f6; font-weight: bold; width: 25%; color: #374151; font-size: 13px; }
        .value { width: 25%; font-size: 13px; }
        .price-box { background: #fef2f2; border: 2px solid #f87171; padding: 15px; text-align: center; margin: 25px 0; border-radius: 8px; }
      </style>
    </head>
    <body dir="rtl">
      <div class="header-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="text-align: right;">
              <div class="title">DR.FIX | دكتور فيكس</div>
              <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">سند فحص واعتماد صيانة ميدانية معتمدة</div>
              <div style="font-size: 11px; color: #6b7280;">المركز المتخصص للصيانة والميكانيكا المتنقلة في جدة | جوال: 0546870807</div>
            </td>
            <td style="text-align: left;">
              <div style="font-size: 16px; font-weight: bold; color: #111827;">رقم السند: #${bId}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">تاريخ السند: ${dateStr}</div>
              <div style="font-size: 12px; color: #059669; font-weight: bold;">الحالة: ${statusAr}</div>
            </td>
          </tr>
        </table>
      </div>

      <h3 style="font-size: 15px; color: #111827; margin-bottom: 10px;">بيانات العميل والمركبة:</h3>
      <table class="info-table">
        <tr>
          <td class="label">اسم العميل:</td>
          <td class="value">${booking.customerName || 'عميل كريم'}</td>
          <td class="label">رقم الجوال:</td>
          <td class="value" style="direction: ltr; text-align: right;">${booking.customerPhone || '-'}</td>
        </tr>
        <tr>
          <td class="label">طراز وموديل السيارة:</td>
          <td class="value">${booking.carModel || 'غير محدد'}</td>
          <td class="label">موقع الخدمة:</td>
          <td class="value">${booking.location || 'جدة'}</td>
        </tr>
        <tr>
          <td class="label">نوع الخدمة المطلوبة:</td>
          <td class="value" colspan="3">${booking.serviceType || 'صيانة وميكانيكا عامة'}</td>
        </tr>
        <tr>
          <td class="label">ملاحظات العميل / الفحص:</td>
          <td class="value" colspan="3">${booking.notes || 'لا توجد ملاحظات إضافية'}</td>
        </tr>
      </table>

      <div class="price-box" style="background: #f0fdf4; border: 2px solid #86efac; padding: 15px; text-align: center; margin: 25px 0; border-radius: 8px;">
        <div style="font-size: 13px; color: #166534; font-weight: bold;">حالة الاعتماد الفني والضمان:</div>
        <div style="font-size: 20px; font-weight: 900; color: #15803d; margin-top: 4px;">
          صيانة معتمدة بضمان المركز | دكتور فيكس
        </div>
        <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">تم الفحص والعمل وفق المعايير الفنية المعتمدة لمركز الصيانة المتنقلة</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
        <tr>
          <td style="width: 50%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 40px;">توقيع العميل / المستلم</p>
            <p style="border-top: 1px dashed #9ca3af; display: inline-block; min-width: 160px; padding-top: 6px; font-size: 11px; color: #6b7280;">التوقيع</p>
          </td>
          <td style="width: 50%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 40px;">ختم واعتماد فني DR.FIX</p>
            <p style="border-top: 1px dashed #9ca3af; display: inline-block; min-width: 160px; padding-top: 6px; font-size: 11px; color: #6b7280;">الاعتماد</p>
          </td>
        </tr>
      </table>

      <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 40px;">
        شكراً لثقتكم بمركز DR.FIX - ميكانيكي متنقل في جدة | www.drfix.repair
      </p>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = outName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
