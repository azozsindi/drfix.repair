import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const str = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  return (
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('quota metric') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('exceeded free quota') ||
    str.includes('Free daily read units per project')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);

  if (isFirestoreQuotaError(error)) {
    try {
      sessionStorage.setItem('drfix_firestore_quota_exceeded', 'true');
    } catch {}
    console.warn(`[Firestore Quota Fallback] Free daily quota reached for path: ${path || 'unknown'}. Smoothly operating in local cached mode.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { 
        detail: { path, error: errStr } 
      }));
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}
