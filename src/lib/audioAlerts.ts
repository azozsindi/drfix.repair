/**
 * Audio Notification Alerts & Chimes for DR.FIX
 * Uses Web Audio API for zero-latency, reliable, synthesized ringtone chimes
 * compatible with mobile browsers (iOS Safari, Android Chrome) and desktops.
 */

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

/**
 * Get or initialize the shared AudioContext
 */
export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    console.warn('AudioContext initialization error:', e);
    return null;
  }
}

/**
 * Automatically unlock audio context on the first user interaction
 */
export function initAudioUnlocker() {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
      }
    }
    // Remove listeners once unlocked
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

// Auto-run unlocker setup when imported on client
if (typeof window !== 'undefined') {
  initAudioUnlocker();
}

/**
 * 1. نغمة وصول طلب جديد (New Customer Booking Chime)
 * Rich 4-step pleasant ascending bell chime (C5 -> E5 -> G5 -> C6)
 */
export function playNewBookingSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Trigger haptic vibration on mobile phones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([120, 60, 120, 60, 250]);
      } catch {}
    }

    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.16 }, // C5
      { freq: 659.25, time: 0.14, duration: 0.16 }, // E5
      { freq: 783.99, time: 0.28, duration: 0.18 }, // G5
      { freq: 1046.50, time: 0.42, duration: 0.45 } // C6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, now + time);

      // Bell envelope
      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
      overtone.start(now + time);
      overtone.stop(now + time + duration);
    });
  } catch (e) {
    console.warn('Error playing new booking sound:', e);
  }
}

/**
 * 2. نغمة إسناد طلب للفني (Task Assigned to Technician Chime)
 * Energetic 3-step dispatcher alert with double chime (F5 -> A5 -> D6)
 */
export function playTaskAssignedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Distinct double vibration for technician assignment
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 80, 200]);
      } catch {}
    }

    // Step 1: Attention pulse (F5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(698.46, now); // F5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Step 2: Confirmation high chime (D6 + F6 harmonic)
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.22); // D6
    osc2.frequency.setValueAtTime(1174.66, now + 0.55);

    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1396.91, now + 0.22); // F6

    gain2.gain.setValueAtTime(0.001, now + 0.22);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    osc3.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.22);
    osc2.stop(now + 0.65);
    osc3.start(now + 0.22);
    osc3.stop(now + 0.65);
  } catch (e) {
    console.warn('Error playing task assigned sound:', e);
  }
}

/**
 * Backward compatibility alias
 */
export const playNotificationSound = playNewBookingSound;
