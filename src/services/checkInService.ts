import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CheckIn } from '../types';
import {
  resolveAdminTimeZone,
  getCurrentPeriodDayKey,
  getCurrentPeriodWeekKey,
  canUserCheckIn,
} from '../utils/dueTime';

export class CheckInService {
  // LEGACY: Create a new check-in (old schema - deprecated)
  /* static async createCheckIn(
    userId: string,
    groupId: string,
    goalId: string,
    imageFile: File | Blob,
    caption?: string
  ): Promise<string> {
    try {
      // Upload image to Firebase Storage
      const imageRef = ref(storage, `check-ins/${groupId}/${Date.now()}_${userId}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      const imageURL = await getDownloadURL(snapshot.ref);

      // Create check-in document
      const checkInData: any = {
        userId,
        groupId,
        goalId,
        imageURL,
        caption,
        timestamp: new Date(),
        status: 'pending',
        disputes: [],
      };

      const docRef = await addDoc(collection(db, 'check-ins'), checkInData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating check-in:', error);
      throw error;
    }
  } */

  // Get check-in by ID
  static async getCheckIn(checkInId: string): Promise<CheckIn | null> {
    try {
      const checkInDoc = await getDoc(doc(db, 'check-ins', checkInId));
      if (checkInDoc.exists()) {
        return checkInDoc.data() as CheckIn;
      }
      return null;
    } catch (error) {
      console.error('Error getting check-in:', error);
      return null;
    }
  }

  // Get check-ins for a group
  static async getGroupCheckIns(groupId: string): Promise<CheckIn[]> {
    try {
      const checkInsQuery = query(
        collection(db, 'checkIns'),
        where('groupId', '==', groupId)
      );

      const querySnapshot = await getDocs(checkInsQuery);
      
      const checkIns = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as CheckIn;
      });
      
      // Sort in memory
      checkIns.sort((a, b) => {
        const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      
      return checkIns;
    } catch (error) {
      console.error('Error getting group check-ins:', error);
      return [];
    }
  }

  // Get check-ins for specific challenges
  static async getChallengeCheckIns(challengeIds: string[]): Promise<CheckIn[]> {
    try {
      if (!challengeIds || challengeIds.length === 0) {
        return [];
      }
      
      // Firestore 'in' queries are limited to 10 items, so we need to batch
      const batchSize = 10;
      const batches: Promise<CheckIn[]>[] = [];
      
      for (let i = 0; i < challengeIds.length; i += batchSize) {
        const batch = challengeIds.slice(i, i + batchSize);
        const checkInsQuery = query(
          collection(db, 'checkIns'),
          where('challengeId', 'in', batch)
        );
        
        const batchPromise = getDocs(checkInsQuery).then(querySnapshot => {
          return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as CheckIn;
          });
        });
        
        batches.push(batchPromise);
      }
      
      const results = await Promise.all(batches);
      const checkIns = results.flat();
      
      // Sort by createdAt descending
      checkIns.sort((a, b) => {
        const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      
      return checkIns;
    } catch (error) {
      console.error('Error getting challenge check-ins:', error);
      return [];
    }
  }

  // Get check-ins for a user
  static async getUserCheckIns(userId: string): Promise<CheckIn[]> {
    try {
      const checkInsQuery = query(
        collection(db, 'check-ins'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(checkInsQuery);
      return querySnapshot.docs.map(doc => doc.data() as CheckIn);
    } catch (error) {
      console.error('Error getting user check-ins:', error);
      return [];
    }
  }

  // Approve check-in
  static async approveCheckIn(checkInId: string, verifiedBy: string): Promise<void> {
    try {
      const checkInRef = doc(db, 'check-ins', checkInId);
      await updateDoc(checkInRef, {
        status: 'approved',
        verifiedBy,
        verificationTimestamp: new Date(),
      });
    } catch (error) {
      console.error('Error approving check-in:', error);
      throw error;
    }
  }

  // Reject check-in
  static async rejectCheckIn(checkInId: string, verifiedBy: string): Promise<void> {
    try {
      const checkInRef = doc(db, 'check-ins', checkInId);
      await updateDoc(checkInRef, {
        status: 'rejected',
        verifiedBy,
        verificationTimestamp: new Date(),
      });
    } catch (error) {
      console.error('Error rejecting check-in:', error);
      throw error;
    }
  }

  // LEGACY METHODS - Commented out (old schema)
  /* 
  static async addAIVerdict(checkInId: string, aiVerdict: any): Promise<void> { ... }
  static async addDispute(checkInId: string, dispute: any): Promise<void> { ... }
  static async resolveDispute(checkInId: string, disputeId: string): Promise<void> { ... }
  static subscribeToGroupCheckIns(groupId: string, callback: any) { ... }
  static subscribeToUserCheckIns(userId: string, callback: any) { ... }
  */

  // NEW SCHEMA: Submit challenge check-in
  static async submitChallengeCheckIn(
    challengeId: string,
    userId: string,
    groupId: string | null,
    cadenceUnit: 'daily' | 'weekly',
    payload: {
      booleanValue?: boolean;
      numberValue?: number;
      textValue?: string;
      timerSeconds?: number;
    },
    attachments?: Array<{ type: 'photo' | 'screenshot'; uri: string }>,
    challengeDueTime?: string,
    challengeTimezoneOffset?: number
  ): Promise<string> {
    try {
      // Fetch challenge data for validation
      const challengeRef = doc(db, 'challenges', challengeId);
      const challengeSnap = await getDoc(challengeRef);
      if (!challengeSnap.exists()) {
        throw new Error('Challenge not found.');
      }
      const challengeData = challengeSnap.data() as Record<string, any>;

      // Check if challenge has ended
      if (challengeData.state === 'ended') {
        throw new Error('This challenge has ended. Check-ins are no longer accepted.');
      }

      // Check elimination status
      const memberId = `${challengeId}_${userId}`;
      const memberSnap = await getDoc(doc(db, 'challengeMembers', memberId));
      const memberData = memberSnap.data() as { state?: string } | undefined;
      if (challengeData.type === 'elimination' && memberData?.state === 'eliminated') {
        throw new Error('You have been eliminated from this challenge and can no longer submit.');
      }

      // Check deadline
      if (challengeData.type === 'deadline' && challengeData.due?.deadlineDate) {
        const checkResult = canUserCheckIn(
          challengeData as any,
          (memberData?.state as any) || 'active'
        );
        if (!checkResult.allowed) {
          throw new Error(checkResult.reason || 'Cannot check in.');
        }
      }

      // Compute period keys using IANA timezone
      const adminTz = resolveAdminTimeZone(challengeData as any);
      const dueTimeLocal = challengeData.due?.dueTimeLocal || challengeDueTime || '23:59';
      const weekStartsOn = challengeData.cadence?.weekStartsOn ?? 1;
      const now = new Date();

      const period: any = { unit: cadenceUnit };

      if (cadenceUnit === 'daily') {
        period.dayKey = getCurrentPeriodDayKey(adminTz, dueTimeLocal, now);
      } else {
        period.weekKey = getCurrentPeriodWeekKey(adminTz, weekStartsOn, now);
      }

      const checkInData: any = {
        challengeId,
        userId,
        groupId,
        period,
        payload,
        attachments: attachments || [],
        status: 'completed',
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'checkIns'), checkInData);
      return docRef.id;
    } catch (error) {
      if (__DEV__) {
        console.error('Error submitting challenge check-in:', error);
      }
      if (error instanceof Error) throw error;
      throw new Error('Failed to submit check-in');
    }
  }
} 