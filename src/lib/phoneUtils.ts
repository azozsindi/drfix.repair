/**
 * Phone Number Utilities for Saudi Mobile Numbers
 * Ensures unified formatting and seamless search across +966, 966, 05, and 5 prefixes.
 */

// Convert Eastern Arabic numerals (٠-٩) and Persian (۰-۹) to standard Western digits
export const convertArabicDigits = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
};

// Extract only digits from a string (handling Arabic digits)
export const extractDigits = (val: string | null | undefined): string => {
  if (!val) return '';
  return convertArabicDigits(String(val)).replace(/\D/g, '');
};

/**
 * Normalizes any Saudi mobile number to canonical local format: "05XXXXXXXX" (10 digits).
 * Handles:
 * - "+9665XXXXXXXX" -> "05XXXXXXXX"
 * - "009665XXXXXXXX" -> "05XXXXXXXX"
 * - "9665XXXXXXXX" -> "05XXXXXXXX"
 * - "5XXXXXXXX" -> "05XXXXXXXX"
 * - "05XXXXXXXX" -> "05XXXXXXXX"
 */
export const unifySaudiPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const digits = extractDigits(phone);
  if (!digits) return '';

  // Starts with 009665...
  if (digits.startsWith('009665')) {
    return '05' + digits.slice(6);
  }
  // Starts with 9665...
  if (digits.startsWith('9665')) {
    return '05' + digits.slice(4);
  }
  // Starts with 05... (10 digits)
  if (digits.startsWith('05')) {
    return digits;
  }
  // Starts with 5... (9 digits)
  if (digits.startsWith('5') && digits.length === 9) {
    return '0' + digits;
  }
  return digits;
};

/**
 * Returns formatted WhatsApp/calling number: "9665XXXXXXXX"
 */
export const formatSaudiPhoneForWhatsApp = (phone: string | null | undefined): string => {
  const unified = unifySaudiPhone(phone);
  if (unified.startsWith('05')) {
    return '966' + unified.slice(1);
  }
  const digits = extractDigits(phone);
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('05')) return '966' + digits.slice(1);
  if (digits.startsWith('5')) return '966' + digits;
  return digits ? '966' + digits : '';
};

/**
 * Returns the core mobile number (e.g. "5XXXXXXXX" or last 7-8 digits)
 */
export const getPhoneCore = (phone: string | null | undefined): string => {
  const unified = unifySaudiPhone(phone);
  if (unified.startsWith('05')) {
    return unified.slice(2); // The 8 digits after 05
  }
  const digits = extractDigits(phone);
  if (digits.startsWith('9665')) {
    return digits.slice(4);
  }
  if (digits.startsWith('5')) {
    return digits.slice(1);
  }
  return digits;
};

/**
 * Checks if a target phone matches a search query regardless of whether 
 * "+966", "966", "05", or "5" was used in the query or in the stored phone number.
 */
export const phoneMatchesSearch = (
  targetPhone: string | null | undefined, 
  searchQuery: string | null | undefined
): boolean => {
  if (!targetPhone || !searchQuery) return false;
  const trimmedQuery = searchQuery.trim();
  if (!trimmedQuery) return false;

  // 1. Direct text include
  if (targetPhone.toLowerCase().includes(trimmedQuery.toLowerCase())) {
    return true;
  }

  // 2. Digits comparison
  const targetDigits = extractDigits(targetPhone);
  const queryDigits = extractDigits(trimmedQuery);
  if (!queryDigits) return false;

  const unifiedTarget = unifySaudiPhone(targetPhone); // e.g. "0512345678"
  const waTarget = formatSaudiPhoneForWhatsApp(targetPhone); // e.g. "966512345678"
  const targetCore = getPhoneCore(targetPhone); // e.g. "12345678"

  const unifiedQuery = unifySaudiPhone(queryDigits);
  const waQuery = formatSaudiPhoneForWhatsApp(queryDigits);
  const queryCore = getPhoneCore(queryDigits);

  // Check against target digits
  if (targetDigits.includes(queryDigits)) return true;

  // Check unified forms
  if (unifiedTarget && (unifiedTarget.includes(queryDigits) || unifiedTarget.includes(unifiedQuery))) {
    return true;
  }

  // Check WhatsApp/international format (966...)
  if (waTarget && (waTarget.includes(queryDigits) || waTarget.includes(waQuery))) {
    return true;
  }

  // Check core digits (e.g. user searches 512345678 or 12345678)
  if (queryCore.length >= 3 && targetCore.includes(queryCore)) {
    return true;
  }

  // Check if query without 966 or 05 matches target
  let strippedQuery = queryDigits;
  if (strippedQuery.startsWith('966')) strippedQuery = strippedQuery.slice(3);
  if (strippedQuery.startsWith('0')) strippedQuery = strippedQuery.slice(1);

  let strippedTarget = targetDigits;
  if (strippedTarget.startsWith('966')) strippedTarget = strippedTarget.slice(3);
  if (strippedTarget.startsWith('0')) strippedTarget = strippedTarget.slice(1);

  if (strippedQuery && strippedTarget.includes(strippedQuery)) {
    return true;
  }

  return false;
};
