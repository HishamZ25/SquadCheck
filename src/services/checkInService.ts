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
import { CheckIn, AIVerdict, Dispute } from '../types';

export class CheckInService {
  // Create a new check-in
  static async createCheckIn(
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
      const checkInData: Omit<CheckIn, 'id'> = {
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
  }

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
        collection(db, 'check-ins'),
        where('groupId', '==', groupId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(checkInsQuery);
      return querySnapshot.docs.map(doc => doc.data() as CheckIn);
    } catch (error) {
      console.error('Error getting group check-ins:', error);
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

  // Add AI verdict
  static async addAIVerdict(checkInId: string, aiVerdict: AIVerdict): Promise<void> {
    try {
      const checkInRef = doc(db, 'check-ins', checkInId);
      await updateDoc(checkInRef, {
        aiVerdict,
        status: 'ai-verified',
      });
    } catch (error) {
      console.error('Error adding AI verdict:', error);
      throw error;
    }
  }

  // Add dispute to check-in
  static async addDispute(checkInId: string, dispute: Omit<Dispute, 'id'>): Promise<void> {
    try {
      const checkInRef = doc(db, 'check-ins', checkInId);
      const checkInDoc = await getDoc(checkInRef);
      
      if (!checkInDoc.exists()) {
        throw new Error('Check-in not found');
      }

      const checkIn = checkInDoc.data() as CheckIn;
      const newDispute: Dispute = {
        ...dispute,
        id: Date.now().toString(), // Simple ID generation
      };

      const updatedDisputes = [...checkIn.disputes, newDispute];
      await updateDoc(checkInRef, { disputes: updatedDisputes });
    } catch (error) {
      console.error('Error adding dispute:', error);
      throw error;
    }
  }

  // Resolve dispute
  static async resolveDispute(checkInId: string, disputeId: string): Promise<void> {
    try {
      const checkInRef = doc(db, 'check-ins', checkInId);
      const checkInDoc = await getDoc(checkInRef);
      
      if (!checkInDoc.exists()) {
        throw new Error('Check-in not found');
      }

      const checkIn = checkInDoc.data() as CheckIn;
      const updatedDisputes = checkIn.disputes.map(dispute => 
        dispute.id === disputeId 
          ? { ...dispute, isResolved: true }
          : dispute
      );

      await updateDoc(checkInRef, { disputes: updatedDisputes });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw error;
    }
  }

  // Listen to group check-ins in real-time
  static subscribeToGroupCheckIns(groupId: string, callback: (checkIns: CheckIn[]) => void) {
    const checkInsQuery = query(
      collection(db, 'check-ins'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(checkInsQuery, (querySnapshot) => {
      const checkIns = querySnapshot.docs.map(doc => doc.data() as CheckIn);
      callback(checkIns);
    });
  }

  // Listen to user check-ins in real-time
  static subscribeToUserCheckIns(userId: string, callback: (checkIns: CheckIn[]) => void) {
    const checkInsQuery = query(
      collection(db, 'check-ins'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(checkInsQuery, (querySnapshot) => {
      const checkIns = querySnapshot.docs.map(doc => doc.data() as CheckIn);
      callback(checkIns);
    });
  }
} 