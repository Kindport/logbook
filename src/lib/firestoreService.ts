import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { User, Placement, Entry, EntryDay } from '../types/index.ts';

export async function saveUserProfileFirestore(
  userId: string,
  data: {
    name: string;
    email: string;
    matric_no: string;
    institution: string;
    department: string;
  }
): Promise<User> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const profile = {
      id: userId,
      name: data.name,
      email: data.email,
      matric_no: data.matric_no,
      institution: data.institution,
      department: data.department,
      created_at: new Date().toISOString(),
    };
    await setDoc(docRef, profile, { merge: true });
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfileFirestore(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function savePlacementFirestore(
  userId: string,
  placement: {
    host_organization: string;
    start_date: string;
    duration_weeks: number;
  }
): Promise<Placement> {
  const path = `users/${userId}/placement/active`;
  try {
    const docRef = doc(db, 'users', userId, 'placement', 'active');
    const record = {
      id: 'active',
      user_id: userId,
      host_organization: placement.host_organization,
      start_date: placement.start_date,
      duration_weeks: placement.duration_weeks,
      created_at: new Date().toISOString(),
    };
    await setDoc(docRef, record, { merge: true });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getPlacementFirestore(userId: string): Promise<Placement | null> {
  const path = `users/${userId}/placement/active`;
  try {
    const docRef = doc(db, 'users', userId, 'placement', 'active');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Placement;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveEntryFirestore(
  userId: string,
  entryData: {
    week_number: number;
    date_range: string;
    raw_notes: string;
    summary: string;
    days: EntryDay[];
  }
): Promise<Entry> {
  const entryId = `week_${entryData.week_number}`;
  const entryPath = `users/${userId}/entries/${entryId}`;
  try {
    const entryDocRef = doc(db, 'users', userId, 'entries', entryId);
    const entryPayload = {
      id: entryId,
      user_id: userId,
      week_number: entryData.week_number,
      date_range: entryData.date_range,
      raw_notes: entryData.raw_notes || '',
      summary: entryData.summary || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setDoc(entryDocRef, entryPayload, { merge: true });

    // Save days subcollection
    const savedDays: EntryDay[] = [];
    for (const day of entryData.days) {
      const dayId = day.day_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dayDocRef = doc(db, 'users', userId, 'entries', entryId, 'days', dayId);
      const dayPayload = {
        id: dayId,
        entry_id: entryId,
        day_name: day.day_name,
        text: day.text || '',
      };
      await setDoc(dayDocRef, dayPayload, { merge: true });
      savedDays.push(dayPayload);
    }

    return {
      ...entryPayload,
      days: savedDays,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, entryPath);
  }
}

export async function getEntriesFirestore(userId: string): Promise<Entry[]> {
  const path = `users/${userId}/entries`;
  try {
    const entriesCol = collection(db, 'users', userId, 'entries');
    const snap = await getDocs(entriesCol);
    const entries: Entry[] = [];

    for (const docSnap of snap.docs) {
      const entryData = docSnap.data() as any;
      const daysCol = collection(db, 'users', userId, 'entries', docSnap.id, 'days');
      const daysSnap = await getDocs(daysCol);
      const days = daysSnap.docs.map((d) => d.data() as EntryDay);

      entries.push({
        ...entryData,
        days,
      });
    }

    // Sort by week_number ascending
    return entries.sort((a, b) => a.week_number - b.week_number);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteEntryFirestore(userId: string, weekNumber: number): Promise<void> {
  const entryId = `week_${weekNumber}`;
  const path = `users/${userId}/entries/${entryId}`;
  try {
    const daysCol = collection(db, 'users', userId, 'entries', entryId, 'days');
    const daysSnap = await getDocs(daysCol);
    for (const d of daysSnap.docs) {
      await deleteDoc(d.ref);
    }
    const entryDocRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
