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
    gtag?: (...args: any[]) => void;
    __DRFIX_GTM_INITIALIZED__?: boolean;
    __DRFIX_WINDOW_OPEN_WRAPPED__?: boolean;
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
 * Safe helper to push events into window.dataLayer and sync with gtag if available
 */
export const pushToDataLayer = (eventName: string, payload: Record<string, any> = {}) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  const safePayload = sanitizePayload(payload);
  const eventObject = {
    event: eventName,
    ...safePayload,
    timestamp: new Date().toISOString()
  };

  window.dataLayer.push(eventObject);

  // Informative debug logger in console (non-intrusive)
  try {
    console.log(`%c[DR.FIX GTM Event]%c ${eventName}`, 'color: #E31837; font-weight: bold;', 'color: #10B981; font-weight: bold;', eventObject);
  } catch {}
};

// Channel-specific debounce timestamps to prevent duplicate events on accidental double clicks
let lastWhatsAppClickTime = 0;
let lastPhoneClickTime = 0;

/**
 * Track WhatsApp click event (Without any phone number or customer data)
 * Debounced to 400ms to guarantee exactly one event per user interaction
 */
export const trackWhatsAppClick = (location?: string) => {
  const now = Date.now();
  if (now - lastWhatsAppClickTime < 400) {
    return;
  }
  lastWhatsAppClickTime = now;

  pushToDataLayer('whatsapp_click', {
    channel: 'whatsapp',
    click_location: location || 'general'
  });
};

/**
 * Track direct phone call click (Without any customer phone numbers)
 * Debounced to 400ms to guarantee exactly one event per user interaction
 */
export const trackPhoneClick = (location?: string) => {
  const now = Date.now();
  if (now - lastPhoneClickTime < 400) {
    return;
  }
  lastPhoneClickTime = now;

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
 * Helper to safely extract the parent anchor element from any click event.
 * Uses a 3-tier discovery mechanism:
 * 1. event.composedPath() for SVG, Framer Motion, and Web Components
 * 2. target.closest('a') with text node resolution
 * 3. Manual parentElement climb up to 10 levels to handle SVG boundary quirks in iOS Safari/WebKit
 */
const findAnchorElement = (event: MouseEvent): HTMLAnchorElement | null => {
  // Method 1: Check composedPath (most robust for Shadow DOM & SVG trees)
  if (typeof event.composedPath === 'function') {
    try {
      const path = event.composedPath();
      for (const el of path) {
        if (!el) continue;
        const tagName = (el as Element).tagName;
        if (tagName && tagName.toUpperCase() === 'A') {
          return el as HTMLAnchorElement;
        }
      }
    } catch {}
  }

  // Method 2: Standard closest('a') with text-node protection
  let target = event.target as (Element | null);
  if (target && (target as any).nodeType === 3) {
    target = target.parentElement;
  }

  if (target?.closest) {
    try {
      const closestA = target.closest('a');
      if (closestA) return closestA as HTMLAnchorElement;
    } catch {}
  }

  // Method 3: Iterative parent climb (immune to SVG .closest() quirks in WebKit)
  let curr: Element | null = target;
  let depth = 0;
  while (curr && depth < 10) {
    if (curr.tagName && curr.tagName.toUpperCase() === 'A') {
      return curr as HTMLAnchorElement;
    }
    curr = curr.parentElement;
    depth++;
  }

  return null;
};

/**
 * Initialize global tracking in React
 * Idempotent: Attaches exactly once to window
 * Features:
 * - Monkey-patches window.open to track programmatic WhatsApp dispatches (contact forms, modals, quotes)
 * - Listens in capture phase on window to intercept all anchor clicks before stopPropagation
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

  // 1. Intercept window.open calls with WhatsApp URLs (modals, contact forms, booking redirects)
  if (typeof window.open === 'function' && !(window as any).__DRFIX_WINDOW_OPEN_WRAPPED__) {
    (window as any).__DRFIX_WINDOW_OPEN_WRAPPED__ = true;
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      if (url) {
        try {
          const urlStr = String(url).toLowerCase();
          if (
            urlStr.includes('wa.me') ||
            urlStr.includes('whatsapp') ||
            urlStr.includes('api.whatsapp.com')
          ) {
            trackWhatsAppClick('window_open');
          }
        } catch {}
      }
      return originalOpen.apply(window, arguments as any);
    };
  }

  // 2. Global click handler for all anchor tags across the entire DOM tree
  const handleGlobalClick = (event: MouseEvent) => {
    const anchor = findAnchorElement(event);
    if (!anchor) return;

    // Get raw href and resolve it safely
    const rawHref = anchor.getAttribute('href') || (anchor as any).href || '';
    const hrefStr = typeof rawHref === 'string' ? rawHref : (rawHref?.baseVal || '');
    if (!hrefStr) return;

    const hrefLower = hrefStr.toLowerCase().trim();

    const isWhatsApp = 
      hrefLower.includes('wa.me') || 
      hrefLower.includes('whatsapp') || 
      hrefLower.includes('api.whatsapp.com') ||
      hrefLower.startsWith('whatsapp:');

    const isPhone = 
      hrefLower.startsWith('tel:') || 
      hrefLower.includes('tel:');

    if (!isWhatsApp && !isPhone) {
      // Regular link - do not trigger custom events
      return;
    }

    const location = 
      anchor.getAttribute('data-gtm-location') || 
      anchor.getAttribute('title') || 
      anchor.innerText?.trim().slice(0, 30) || 
      (isWhatsApp ? 'whatsapp_button' : 'phone_button');

    // 1. Dispatch custom event for WhatsApp
    if (isWhatsApp) {
      trackWhatsAppClick(location);
    }
    // 2. Dispatch custom event for Telephone (tel:)
    else if (isPhone) {
      trackPhoneClick(location);
    }
  };

  // Attach listener during capture phase on window so it triggers before any propagation stops
  window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
};
