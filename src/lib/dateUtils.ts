export const safeFormatDate = (dateVal: any, locale = 'ar-SA', options?: Intl.DateTimeFormatOptions): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    try {
      return dateVal.toDate().toLocaleDateString(locale, options);
    } catch {
      return '';
    }
  }
  if (dateVal.seconds) {
    try {
      return new Date(dateVal.seconds * 1000).toLocaleDateString(locale, options);
    } catch {
      return '';
    }
  }
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? '' : dateVal.toLocaleDateString(locale, options);
  }
  return '';
};
