import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  Firestore,
  DocumentReference
} from 'firebase/firestore';
import { unifySaudiPhone, extractDigits } from './phoneUtils';
import { CustomerProfile, CustomerCar } from '../types';

/**
 * Normalizes Arabic text for robust comparison.
 * - Strips tashkeel (diacritics: fatha, damma, kasra, sukun, tanween, etc.)
 * - Unifies alef variations: أ, إ, آ, ٱ -> ا
 * - Unifies taa marbuta: ة -> ه
 * - Unifies alif maqsura & yaa: ى -> ي
 * - Strips tatweel (kashida: ـ)
 * - Normalizes compound names spaces: "عبد العزيز" <-> "عبدالعزيز"
 * - Normalizes whitespace and converts English to lowercase
 */
export const normalizeArabicText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove tatweel / kashida
    .replace(/\u0640/g, '')
    // Unify alef forms
    .replace(/[أإآٱ]/g, 'ا')
    // Unify taa marbuta
    .replace(/ة/g, 'ه')
    // Unify alif maqsura
    .replace(/ى/g, 'ي')
    // Unify "عبد ال..." with "عبدال..." for compound Arab names
    .replace(/عبد\s+ال/g, 'عبدال')
    // Unify multiple spaces into single space
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Checks if a customer name is generic / placeholder.
 * Placeholders should NEVER match each other to avoid false duplicates.
 */
export const isGenericCustomerName = (name: string | null | undefined): string | boolean => {
  if (!name) return true;
  const normalized = normalizeArabicText(name);
  if (!normalized || normalized.length < 3) return true;

  const genericTokens = [
    'عميل',
    'عميل كريم',
    'عميل جديد',
    'عميلنا',
    'العميل',
    'ضيف',
    'زائر',
    'مجهول',
    'customer',
    'client',
    'guest',
    'unknown',
    'user',
    'new customer'
  ];

  return genericTokens.some(token => normalized === token || normalized === normalizeArabicText(token));
};

/**
 * Compares two customer names to see if they represent the same person.
 */
export const areCustomerNamesMatching = (nameA: string | null | undefined, nameB: string | null | undefined): boolean => {
  if (!nameA || !nameB) return false;
  if (isGenericCustomerName(nameA) || isGenericCustomerName(nameB)) return false;

  const normA = normalizeArabicText(nameA);
  const normB = normalizeArabicText(nameB);

  if (normA === normB) return true;

  // If one name contains the other and both have at least 2 distinct words (e.g. full names)
  const wordsA = normA.split(' ').filter(w => w.length > 1);
  const wordsB = normB.split(' ').filter(w => w.length > 1);

  if (wordsA.length >= 2 && wordsB.length >= 2) {
    // Check if all words of shorter name appear in longer name
    const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
    const longer = wordsA.length <= wordsB.length ? wordsB : wordsA;
    const allMatch = shorter.every(w => longer.includes(w));
    if (allMatch) return true;
  }

  return false;
};

/**
 * Compares two phone numbers to see if they represent the same line.
 */
export const areCustomerPhonesMatching = (phoneA: string | null | undefined, phoneB: string | null | undefined): boolean => {
  if (!phoneA || !phoneB) return false;
  const uA = unifySaudiPhone(phoneA);
  const uB = unifySaudiPhone(phoneB);

  if (uA && uB && uA === uB) return true;

  const digA = extractDigits(phoneA);
  const digB = extractDigits(phoneB);
  if (digA && digB) {
    if (digA === digB) return true;
    // Compare last 9 digits (standard Saudi local mobile without leading 0 or country code)
    if (digA.length >= 9 && digB.length >= 9 && digA.slice(-9) === digB.slice(-9)) {
      return true;
    }
  }

  return false;
};

export interface CustomerCandidateMatch {
  id: string;
  ref: DocumentReference;
  data: any;
  matchReason: 'phone' | 'name' | 'googleUid' | 'email';
}

/**
 * Searches Firestore for any existing customer matching:
 * 1. Phone number (unified)
 * 2. Name (normalized non-generic)
 * 3. Google UID or Email (if provided)
 */
export const findExistingCustomerInFirestore = async (
  db: Firestore,
  candidate: {
    phone?: string;
    name?: string;
    email?: string;
    googleUid?: string;
  }
): Promise<CustomerCandidateMatch | null> => {
  const unifiedPhone = candidate.phone ? unifySaudiPhone(candidate.phone) : '';
  const cleanEmail = candidate.email ? candidate.email.toLowerCase().trim() : '';
  const customersRef = collection(db, 'customers');

  // 1. Direct search by unified phone (fastest & most accurate primary key)
  if (unifiedPhone) {
    try {
      // Direct doc ID check (many customers use phone as doc ID)
      const directDocRef = doc(db, 'customers', unifiedPhone);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists()) {
        return {
          id: directSnap.id,
          ref: directDocRef,
          data: directSnap.data(),
          matchReason: 'phone'
        };
      }

      // Query by phone field
      const qPhone = query(customersRef, where('phone', '==', unifiedPhone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        const found = snapPhone.docs[0];
        return {
          id: found.id,
          ref: doc(db, 'customers', found.id),
          data: found.data(),
          matchReason: 'phone'
        };
      }
    } catch (err) {
      console.warn('Error querying customer by phone:', err);
    }
  }

  // 2. Query by Google UID if provided
  if (candidate.googleUid) {
    try {
      const qG = query(customersRef, where('googleUid', '==', candidate.googleUid));
      const snapG = await getDocs(qG);
      if (!snapG.empty) {
        const found = snapG.docs[0];
        return {
          id: found.id,
          ref: doc(db, 'customers', found.id),
          data: found.data(),
          matchReason: 'googleUid'
        };
      }
    } catch (err) {
      console.warn('Error querying customer by googleUid:', err);
    }
  }

  // 3. Query by Email if provided
  if (cleanEmail) {
    try {
      const qE = query(customersRef, where('email', '==', cleanEmail));
      const snapE = await getDocs(qE);
      if (!snapE.empty) {
        const found = snapE.docs[0];
        return {
          id: found.id,
          ref: doc(db, 'customers', found.id),
          data: found.data(),
          matchReason: 'email'
        };
      }
    } catch (err) {
      console.warn('Error querying customer by email:', err);
    }
  }

  // 4. Scan existing customers to match by Phone OR Name
  // (Handles differences in phone format or matching by full Arabic customer name)
  try {
    const allCustomersSnap = await getDocs(customersRef);
    for (const d of allCustomersSnap.docs) {
      const data = d.data();

      // Check phone match
      if (candidate.phone && data.phone && areCustomerPhonesMatching(candidate.phone, data.phone)) {
        return {
          id: d.id,
          ref: doc(db, 'customers', d.id),
          data,
          matchReason: 'phone'
        };
      }

      // Check non-generic name match
      if (candidate.name && data.name && areCustomerNamesMatching(candidate.name, data.name)) {
        return {
          id: d.id,
          ref: doc(db, 'customers', d.id),
          data,
          matchReason: 'name'
        };
      }
    }
  } catch (err) {
    console.warn('Error scanning customers for name/phone match:', err);
  }

  return null;
};

/**
 * Creates or updates a customer profile safely without creating duplicates.
 * Compares by BOTH phone number and customer name.
 */
export const syncOrUpdateCustomerProfile = async (
  db: Firestore,
  input: {
    name?: string;
    phone: string;
    carModel?: string;
    notes?: string;
    serviceType?: string;
    email?: string;
    city?: string;
    status?: string;
  }
): Promise<{ customerId: string; isNew: boolean; matchReason?: string }> => {
  const unifiedPhone = unifySaudiPhone(input.phone) || input.phone.trim();
  const rawName = (input.name || '').trim();

  const existingMatch = await findExistingCustomerInFirestore(db, {
    phone: unifiedPhone,
    name: rawName,
    email: input.email
  });

  const carInfo = input.carModel?.trim() ? {
    model: input.carModel.trim(),
    notes: input.serviceType || ''
  } : null;

  if (existingMatch) {
    // Customer profile ALREADY EXISTS: Merge & Update cleanly (NO DUPLICATE)
    const existingDoc = existingMatch.data;
    const existingVehicles: any[] = Array.isArray(existingDoc.vehicles) ? [...existingDoc.vehicles] : [];

    // Add car if not already listed
    if (carInfo) {
      const hasCar = existingVehicles.some(
        v => (v.model || '').toLowerCase().trim() === carInfo.model.toLowerCase().trim()
      );
      if (!hasCar) {
        existingVehicles.push(carInfo);
      }
    }

    // Determine the best name: if existing name is generic and new name is real, upgrade it
    let resolvedName = existingDoc.name || rawName || 'عميل كريم';
    if (isGenericCustomerName(existingDoc.name) && !isGenericCustomerName(rawName)) {
      resolvedName = rawName;
    }

    const updatedData: Record<string, any> = {
      name: resolvedName,
      phone: existingDoc.phone || unifiedPhone,
      vehicles: existingVehicles,
      totalVisits: (Number(existingDoc.totalVisits) || 1) + 1,
      lastVisitDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };

    if (input.email && !existingDoc.email) {
      updatedData.email = input.email.trim();
    }
    if (input.city && (!existingDoc.city || existingDoc.city === 'جدة')) {
      updatedData.city = input.city.trim();
    }
    if (input.notes) {
      const currentNotes = existingDoc.notes || '';
      if (!currentNotes.includes(input.notes)) {
        updatedData.notes = currentNotes ? `${currentNotes} | ${input.notes}` : input.notes;
      }
    }

    await updateDoc(existingMatch.ref, updatedData);

    return {
      customerId: existingMatch.id,
      isNew: false,
      matchReason: existingMatch.matchReason
    };
  } else {
    // Brand new customer: Create single file
    const customersRef = collection(db, 'customers');
    const newDocRef = await addDoc(customersRef, {
      name: rawName || 'عميل كريم',
      phone: unifiedPhone,
      city: input.city?.trim() || 'جدة',
      email: input.email?.trim() || '',
      vehicles: carInfo ? [carInfo] : [],
      totalVisits: 1,
      totalSpent: 0,
      firstVisitDate: new Date().toISOString(),
      lastVisitDate: new Date().toISOString(),
      status: input.status || 'new',
      notes: input.serviceType ? `حجز خدمة: ${input.serviceType}${input.notes ? ` - ${input.notes}` : ''}` : (input.notes || ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      customerId: newDocRef.id,
      isNew: true
    };
  }
};

/**
 * Scans all customer documents in Firestore and permanently purges/merges
 * any duplicate files matching by:
 * 1. Unified Phone Number
 * 2. Normalized Arabic Name (non-generic)
 * 3. Google UID or Email
 */
export const purgeDuplicateCustomersInFirestore = async (
  db: Firestore
): Promise<{ mergedGroupsCount: number; deletedDocsCount: number }> => {
  const custSnap = await getDocs(collection(db, 'customers'));
  const allDocs: { id: string; ref: DocumentReference; data: any }[] = [];
  custSnap.forEach(d => allDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() }));

  if (allDocs.length <= 1) {
    return { mergedGroupsCount: 0, deletedDocsCount: 0 };
  }

  // Disjoint-set / Union-Find grouping to merge documents that match by phone OR name OR googleUid/email
  const parent = new Map<string, string>();
  allDocs.forEach(d => parent.set(d.id, d.id));

  const findRoot = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let curr = id;
    while (curr !== root) {
      const next = parent.get(curr)!;
      parent.set(curr, root);
      curr = next;
    }
    return root;
  };

  const union = (id1: string, id2: string) => {
    const root1 = findRoot(id1);
    const root2 = findRoot(id2);
    if (root1 !== root2) {
      parent.set(root2, root1);
    }
  };

  // Compare every pair of customer docs
  for (let i = 0; i < allDocs.length; i++) {
    for (let j = i + 1; j < allDocs.length; j++) {
      const docA = allDocs[i];
      const docB = allDocs[j];
      const dataA = docA.data;
      const dataB = docB.data;

      let isMatch = false;

      // 1. Phone match
      if (dataA.phone && dataB.phone && areCustomerPhonesMatching(dataA.phone, dataB.phone)) {
        isMatch = true;
      }
      // 2. Name match (non-generic)
      else if (dataA.name && dataB.name && areCustomerNamesMatching(dataA.name, dataB.name)) {
        isMatch = true;
      }
      // 3. Google UID match
      else if (dataA.googleUid && dataB.googleUid && dataA.googleUid === dataB.googleUid) {
        isMatch = true;
      }
      // 4. Email match
      else if (
        dataA.email &&
        dataB.email &&
        dataA.email.toLowerCase().trim() === dataB.email.toLowerCase().trim()
      ) {
        isMatch = true;
      }

      if (isMatch) {
        union(docA.id, docB.id);
      }
    }
  }

  // Group docs by root
  const groups = new Map<string, typeof allDocs>();
  allDocs.forEach(d => {
    const root = findRoot(d.id);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(d);
  });

  let mergedGroupsCount = 0;
  let deletedDocsCount = 0;

  for (const [_, group] of groups.entries()) {
    if (group.length > 1) {
      mergedGroupsCount++;

      // Pick the best master doc
      const master = group.slice().sort((a, b) => {
        const aIsGoogle = (a.data.googleUid || a.id.length > 20) ? 1 : 0;
        const bIsGoogle = (b.data.googleUid || b.id.length > 20) ? 1 : 0;
        if (aIsGoogle !== bIsGoogle) return bIsGoogle - aIsGoogle;

        // Prefer doc with actual real name over generic name
        const aHasRealName = !isGenericCustomerName(a.data.name) ? 1 : 0;
        const bHasRealName = !isGenericCustomerName(b.data.name) ? 1 : 0;
        if (aHasRealName !== bHasRealName) return bHasRealName - aHasRealName;

        return (Number(b.data.totalVisits) || 0) - (Number(a.data.totalVisits) || 0);
      })[0];

      let mergedCars: any[] = [];
      let mergedVehicles: any[] = [];
      let totalVisits = 0;
      let totalSpent = 0;
      let notes = master.data.notes || '';
      let bestName = master.data.name || '';
      let bestPhone = master.data.phone || '';
      let bestEmail = master.data.email || '';
      let bestCity = master.data.city || 'جدة';

      group.forEach(d => {
        const data = d.data;
        if (Array.isArray(data.cars)) mergedCars.push(...data.cars);
        if (Array.isArray(data.vehicles)) mergedVehicles.push(...data.vehicles);
        totalVisits = Math.max(totalVisits, Number(data.totalVisits || 0));
        totalSpent = Math.max(totalSpent, Number(data.totalSpent || 0));

        if (isGenericCustomerName(bestName) && !isGenericCustomerName(data.name)) {
          bestName = data.name;
        }
        if (!bestPhone && data.phone) {
          bestPhone = data.phone;
        }
        if (!bestEmail && data.email) {
          bestEmail = data.email;
        }
        if ((!bestCity || bestCity === 'جدة') && data.city && data.city !== 'جدة') {
          bestCity = data.city;
        }
        if (d.id !== master.id && data.notes && !notes.includes(data.notes)) {
          notes = notes ? `${notes}\n${data.notes}` : data.notes;
        }
      });

      // Deduplicate vehicles
      const seenModels = new Set<string>();
      const dedupedVehicles = mergedVehicles.filter(v => {
        const m = (v.model || '').toLowerCase().trim();
        if (!m || seenModels.has(m)) return false;
        seenModels.add(m);
        return true;
      });

      // Update master document
      await setDoc(master.ref, {
        ...master.data,
        name: bestName || 'عميل كريم',
        phone: bestPhone ? (unifySaudiPhone(bestPhone) || bestPhone) : '',
        email: bestEmail,
        city: bestCity,
        cars: mergedCars,
        vehicles: dedupedVehicles,
        totalVisits,
        totalSpent,
        notes,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Delete non-master duplicates
      for (const d of group) {
        if (d.id !== master.id) {
          try {
            await deleteDoc(d.ref);
            deletedDocsCount++;
          } catch (delErr) {
            console.warn('Error deleting duplicate customer doc:', delErr);
          }
        }
      }
    }
  }

  return { mergedGroupsCount, deletedDocsCount };
};

/**
 * In-memory deduplication for customer profiles.
 * Merges any profiles that share:
 * - Phone number (unified)
 * - Customer Name (normalized Arabic non-generic)
 * - Email / Google UID
 * Guarantees zero duplicate cards are shown in the UI.
 */
export const deduplicateCustomerProfiles = <T extends Record<string, any>>(profiles: T[]): T[] => {
  if (!profiles || profiles.length === 0) return [];

  const clusters: T[] = [];

  profiles.forEach(item => {
    const cleanP = item.phone ? (unifySaudiPhone(item.phone) || item.phone.trim()) : '';
    const cleanE = item.email ? item.email.toLowerCase().trim() : '';
    const cleanName = (item.name || '').trim();

    // Find if item matches any existing cluster
    const clusterIndex = clusters.findIndex(existing => {
      // 1. Phone match
      if (cleanP && existing.phone && areCustomerPhonesMatching(cleanP, existing.phone)) {
        return true;
      }
      // 2. Name match (non-generic)
      if (cleanName && existing.name && areCustomerNamesMatching(cleanName, existing.name)) {
        return true;
      }
      // 3. Email match
      if (cleanE && existing.email && cleanE === existing.email.toLowerCase().trim()) {
        return true;
      }
      // 4. Google UID match
      if (item.googleUid && existing.googleUid && item.googleUid === existing.googleUid) {
        return true;
      }
      return false;
    });

    if (clusterIndex === -1) {
      // New distinct customer
      clusters.push({
        ...item,
        phone: cleanP || item.phone
      });
    } else {
      // Match found: Merge into existing cluster!
      const prev = clusters[clusterIndex];

      // Merge vehicles without duplicate model
      const existingVehicles = Array.isArray(prev.vehicles) ? [...prev.vehicles] : [];
      if (Array.isArray(item.vehicles)) {
        item.vehicles.forEach(v => {
          if (!existingVehicles.some(ev => (ev.model || '').toLowerCase().trim() === (v.model || '').toLowerCase().trim() && ev.plateNumber === v.plateNumber)) {
            existingVehicles.push(v);
          }
        });
      }

      // Best real name
      let bestName = prev.name || cleanName || 'عميل كريم';
      if (isGenericCustomerName(prev.name) && !isGenericCustomerName(cleanName)) {
        bestName = cleanName;
      }

      // Notes
      let mergedNotes = prev.notes || '';
      if (item.notes && !mergedNotes.includes(item.notes)) {
        mergedNotes = mergedNotes ? `${mergedNotes} | ${item.notes}` : item.notes;
      }

      clusters[clusterIndex] = {
        ...prev,
        name: bestName,
        phone: prev.phone || cleanP,
        email: prev.email || cleanE,
        city: (prev.city && prev.city !== 'جدة') ? prev.city : (item.city || prev.city || 'جدة'),
        vehicles: existingVehicles,
        totalVisits: Math.max(Number(prev.totalVisits) || 0, Number(item.totalVisits) || 0, 1),
        totalSpent: Math.max(Number(prev.totalSpent) || 0, Number(item.totalSpent) || 0),
        status: (prev.totalVisits >= 3 || item.totalVisits >= 3 || prev.status === 'vip' || item.status === 'vip') ? 'vip' : prev.status,
        notes: mergedNotes,
        lastVisitDate: prev.lastVisitDate || item.lastVisitDate,
        firstVisitDate: prev.firstVisitDate || item.firstVisitDate
      };
    }
  });

  return clusters;
};
