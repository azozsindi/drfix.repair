import { useEffect } from 'react';

/**
 * Universal Modal Body Scroll Lock Manager
 * Prevents background screen / body scrolling when any modal, drawer, or dialog is open.
 * Supports iOS Safari, Android Chrome, and Desktop browsers with nested modal reference counting.
 */

let activeLockCount = 0;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let previousBodyOverscroll = '';
let previousHtmlOverscroll = '';
let previousTouchAction = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount++;
  if (activeLockCount === 1) {
    const html = document.documentElement;
    const body = document.body;

    // Save previous inline styles
    previousHtmlOverflow = html.style.overflow;
    previousBodyOverflow = body.style.overflow;
    previousHtmlOverscroll = html.style.overscrollBehavior;
    previousBodyOverscroll = body.style.overscrollBehavior;
    previousTouchAction = body.style.touchAction;

    // Apply strict scroll isolation
    html.classList.add('modal-scroll-lock');
    body.classList.add('modal-scroll-lock');

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
  }
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove('modal-scroll-lock');
    body.classList.remove('modal-scroll-lock');

    html.style.overflow = previousHtmlOverflow;
    body.style.overflow = previousBodyOverflow;
    html.style.overscrollBehavior = previousHtmlOverscroll;
    body.style.overscrollBehavior = previousBodyOverscroll;
    body.style.touchAction = previousTouchAction;
  }
}

/**
 * React Hook to lock body scroll while component is mounted or active
 */
export function useScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [enabled]);
}

/**
 * Global automatic observer that detects any fixed modal overlays in DOM
 * and prevents background scrolling automatically.
 */
let isObserverInitialized = false;
let observerLocked = false;

export function initGlobalScrollLockObserver(): void {
  if (typeof window === 'undefined' || isObserverInitialized) return;
  isObserverInitialized = true;

  const checkDomForModals = () => {
    // Look for active modal overlays (excluding pointer-events-none or non-modal overlays)
    const activeModals = document.querySelectorAll(
      '.fixed.inset-0:not(.pointer-events-none):not([aria-hidden="true"]), [role="dialog"], .modal-backdrop'
    );

    const hasVisibleModal = Array.from(activeModals).some((el) => {
      // Must not be display none or hidden
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });

    if (hasVisibleModal && !observerLocked) {
      observerLocked = true;
      lockBodyScroll();
    } else if (!hasVisibleModal && observerLocked) {
      observerLocked = false;
      unlockBodyScroll();
    }
  };

  const observer = new MutationObserver(() => {
    checkDomForModals();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  // Touchmove protection on backdrops to prevent rubber-band background dragging on mobile
  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If user is touching directly on the dark backdrop overlay (not inside the scrollable content)
      if (
        target.classList?.contains('fixed') &&
        target.classList?.contains('inset-0') &&
        !target.classList?.contains('overflow-y-auto')
      ) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  // Initial check
  checkDomForModals();
}
