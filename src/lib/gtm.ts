/**
 * DR.FIX Google Tag Manager (GTM) Integration
 * Container ID: GTM-5T2M556J
 * 
 * Strict Privacy & Zero PII Policy:
 * - NO customer phone numbers, names, emails, or personal details are ever sent to GTM.
 * - NO booking ID numbers or order identifiers are sent to GTM.
 * - Only standard event names (whatsapp_click, phone_click, booking_submit) with general non-PII attributes.
 */

declare global {
  interface Window {
    dataLayer: any[];
    __DRFIX_GTM_INITIALIZED__?: boolean;
  }
}

// Keys forbidden from being pushed to dataLayer to prevent any PII or sensitive data leaks
const SENSITIVE_KEY_PATTERNS = [
  /phone/i,
  /mobile/i,
  /tel/i,
  /booking.*id/i,
  /order.*id/i,
  /customer/i,
  /name/i,
  /email/i,
  /plate/i,
  /vin/i,
  /address/i,
  /token/i,
  /password/i,
  /coord/i
];

/**
 * Strips all sensitive fields and potential PII before pushing to dataLayer
 */
const sanitizePayload = (payload: Record<string, any>): Record<string, any> => {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    // Check if key matches any sensitive pattern
    const isForbidden = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
    if (isForbidden) continue;

    // Check if string value contains a phone number pattern
    if (typeof val === 'string' && /(?:05\d{8}|966\d{9}|\+966\d{9})/.test(val)) {
      continue;
    }

    clean[key] = val;
  }
  return clean;
};

/**
 * Safe helper to push events into window.dataLayer
 */
export const pushToDataLayer = (eventName: string, payload: Record<string, any> = {}) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  const safePayload = sanitizePayload(payload);
  window.dataLayer.push({
    event: eventName,
    ...safePayload,
    timestamp: new Date().toISOString()
  });
};

// Click debounce state to prevent duplicate events on double clicks
let lastClickTimestamp = 0;
let lastClickTarget = '';

/**
 * Track WhatsApp click event (Without any phone number or customer data)
 */
export const trackWhatsAppClick = (location?: string) => {
  pushToDataLayer('whatsapp_click', {
    channel: 'whatsapp',
    click_location: location || 'general'
  });
};

/**
 * Track direct phone call click (Without any customer phone numbers)
 */
export const trackPhoneClick = (location?: string) => {
  pushToDataLayer('phone_click', {
    channel: 'phone_call',
    click_location: location || 'general'
  });
};

// Cooldown state for booking_submit to strictly prevent duplicate firing
let lastBookingSubmitTime = 0;

/**
 * Track successful booking submission
 * Strictly called only AFTER the booking is successfully written and confirmed in the database
 * Strictly sends NO customer data, NO customer phone number, and NO booking ID
 */
export const trackBookingSubmit = (bookingData?: { service_type?: string }) => {
  const now = Date.now();
  // Prevent duplicate event within 5 seconds
  if (now - lastBookingSubmitTime < 5000) {
    return;
  }
  lastBookingSubmitTime = now;

  pushToDataLayer('booking_submit', {
    conversion_type: 'booking_success',
    service_type: bookingData?.service_type || 'صيانة متنقلة'
  });
};

/**
 * Initialize global click listeners in React
 * Idempotent: Attaches exactly once to window
 * Supports all statically and dynamically rendered links across the entire DOM tree
 */
export const initGtmAutoTracking = () => {
  if (typeof window === 'undefined') return;

  // Idempotency check: Ensure the global listener is attached only once
  if (window.__DRFIX_GTM_INITIALIZED__) {
    return;
  }
  window.__DRFIX_GTM_INITIALIZED__ = true;

  // Ensure window.dataLayer is initialized
  window.dataLayer = window.dataLayer || [];

  const handleGlobalClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement)?.closest('a');
    if (!target) return;

    const href = target.getAttribute('href') || '';
    if (!href) return;

    const now = Date.now();
    const clickKey = `${href}_${target.innerText?.trim() || ''}`;

    // 400ms Debounce check: Prevent duplicate event on accidental double click
    if (now - lastClickTimestamp < 400 && lastClickTarget === clickKey) {
      return;
    }
    lastClickTimestamp = now;
    lastClickTarget = clickKey;

    // 1. Detect WhatsApp links
    if (
      href.includes('wa.me') ||
      href.includes('api.whatsapp.com') ||
      href.startsWith('whatsapp:')
    ) {
      const location = 
        target.getAttribute('data-gtm-location') || 
        target.getAttribute('title') || 
        target.innerText?.trim().slice(0, 30) || 
        'whatsapp_button';
      trackWhatsAppClick(location);
    }
    // 2. Detect Telephone links (tel:)
    else if (href.startsWith('tel:')) {
      const location = 
        target.getAttribute('data-gtm-location') || 
        target.getAttribute('title') || 
        target.innerText?.trim().slice(0, 30) || 
        'phone_button';
      trackPhoneClick(location);
    }
  };

  window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
};
