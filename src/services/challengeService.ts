import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { Challenge } from '../types';

export class ChallengeService {
  // Create a new challenge (legacy - keeping for backward compatibility)
  static async createChallenge(
    name: string,
    description: string,
    type: 'elimination' | 'deadline' | 'progression',
    challengeType: 'solo' | 'group',
    creatorId: string,
    groupId?: string,
    requirements: string[] = [],
    rewards: {
      points: number;
      title?: string;
      picture?: string;
      badge?: string;
    } = { points: 0 },
    penalty: number = 0,
    eliminationRule?: string,
    startDate?: Date,
    endDate?: Date,
    progressionDuration?: number,
    progressionIntervalType?: string,
    assessmentTime?: Date
  ): Promise<string> {
    try {
      // Note: This is using old schema structure
      // Should be migrated to new schema with proper Challenge type
      const challengeData: any = {
        name,
        description,
        type,
        challengeType,
        creatorId,
        participantIds: [creatorId], // Creator is automatically a participant
        groupId: challengeType === 'group' ? groupId : undefined,
        requirements,
        rewards,
        penalty,
        eliminationRule,
        startDate,
        endDate,
        progressionDuration,
        progressionIntervalType,
        assessmentTime,
        userProgress: {},
        createdAt: new Date(),
        status: 'active',
      };

      const docRef = await addDoc(collection(db, 'challenges'), challengeData);
      
      // If it's a group challenge, add the challenge ID to the group
      if (challengeType === 'group' && groupId) {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
          challengeIds: arrayUnion(docRef.id)
        });
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  }

  // Get challenge by ID
  static async getChallenge(challengeId: string): Promise<Challenge | null> {
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (challengeDoc.exists()) {
        const data: any = challengeDoc.data();
        return { 
          id: challengeDoc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          startDate: data.startDate?.toDate?.(),
          endDate: data.endDate?.toDate?.(),
          assessmentTime: data.assessmentTime?.toDate?.(),
          // Ensure cadence has default values
          cadence: data.cadence || { unit: 'daily', weekStartsOn: 0 },
          // Ensure submission has default values
          submission: data.submission || { 
            inputType: 'boolean', 
            requireAttachment: false,
            attachmentTypes: [] 
          },
        } as any;
      }
      return null;
    } catch (error) {
      console.error('Error getting challenge:', error);
      return null;
    }
  }

  // Get challenges for a user (both solo and group challenges they're in)
  // NEW SCHEMA: Uses challengeMembers collection
  static async getUserChallenges(userId: string): Promise<Challenge[]> {
    try {
      // Step 1: Get all challenge memberships for this user
      const membersQuery = query(
        collection(db, 'challengeMembers'),
        where('userId', '==', userId),
        where('state', '==', 'active')
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      
      if (membersSnapshot.empty) {
        return [];
      }
      
      // Step 2: Get challenge IDs
      const challengeIds = membersSnapshot.docs.map(doc => doc.data().challengeId);
      
      // Step 3: Fetch all challenges
      const challenges: Challenge[] = [];
      
      // Firestore doesn't support 'in' with more than 10 items, so batch them
      for (let i = 0; i < challengeIds.length; i += 10) {
        const batch = challengeIds.slice(i, i + 10);
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('__name__', 'in', batch)
        );
        
        const challengesSnapshot = await getDocs(challengesQuery);
        
        challengesSnapshot.docs.forEach(doc => {
          const data: any = doc.data();
          challenges.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            // Ensure cadence has default values
            cadence: data.cadence || { unit: 'daily', weekStartsOn: 0 },
            // Ensure submission has default values
            submission: data.submission || { 
              inputType: 'boolean', 
              requireAttachment: false,
              attachmentTypes: [] 
            },
          } as any);
        });
      }
      
      // Sort by createdAt desc
      challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return challenges;
    } catch (error) {
      console.error('Error getting user challenges:', error);
      return [];
    }
  }

  // Get challenges for a group
  static async getGroupChallenges(groupId: string): Promise<Challenge[]> {
    try {
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('groupId', '==', groupId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(challengesQuery);
      return querySnapshot.docs.map(doc => {
        const data: any = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          startDate: data.startDate?.toDate?.(),
          endDate: data.endDate?.toDate?.(),
          assessmentTime: data.assessmentTime?.toDate?.(),
          // Ensure cadence has default values
          cadence: data.cadence || { unit: 'daily', weekStartsOn: 0 },
          // Ensure submission has default values
          submission: data.submission || { 
            inputType: 'boolean', 
            requireAttachment: false,
            attachmentTypes: [] 
          },
        } as any;
      });
    } catch (error) {
      console.error('Error getting group challenges:', error);
      return [];
    }
  }

  // Add participant to challenge
  static async addParticipant(challengeId: string, userId: string): Promise<void> {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, {
        participantIds: arrayUnion(userId),
        [`userProgress.${userId}`]: {
          userId,
          checkIns: [],
          eliminated: false,
          completed: false,
          streak: 0,
        }
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Remove participant from challenge
  static async removeParticipant(challengeId: string, userId: string): Promise<void> {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, {
        participantIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  // Update challenge progress for a user (legacy - for old schema)
  static async updateUserProgress(
    challengeId: string,
    userId: string,
    progress: any
  ): Promise<void> {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      const challengeDoc = await getDoc(challengeRef);
      
      if (!challengeDoc.exists()) {
        throw new Error('Challenge not found');
      }

      // Note: This is for old schema compatibility
      // New schema uses challengeMembers and checkIns collections
      await updateDoc(challengeRef, {
        [`userProgress.${userId}`]: progress
      });
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  // Update challenge
  static async updateChallenge(challengeId: string, updates: Partial<Challenge>): Promise<void> {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, updates);
    } catch (error) {
      console.error('Error updating challenge:', error);
      throw error;
    }
  }

  // Delete challenge
  static async deleteChallenge(challengeId: string): Promise<void> {
    try {
      // Get challenge to check if it's a group challenge
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (challengeDoc.exists()) {
        const challenge = challengeDoc.data() as Challenge;
        
        // Remove challenge ID from group if it's a group challenge
        if (challenge.groupId) {
          const groupRef = doc(db, 'groups', challenge.groupId);
          await updateDoc(groupRef, {
            challengeIds: arrayRemove(challengeId)
          });
        }
      }
      
      await deleteDoc(doc(db, 'challenges', challengeId));
    } catch (error) {
      console.error('Error deleting challenge:', error);
      throw error;
    }
  }

  // Listen to challenge changes in real-time
  static subscribeToChallenge(challengeId: string, callback: (challenge: Challenge | null) => void) {
    return onSnapshot(doc(db, 'challenges', challengeId), (doc) => {
      if (doc.exists()) {
        const data: any = doc.data();
        callback({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          startDate: data.startDate?.toDate?.(),
          endDate: data.endDate?.toDate?.(),
          assessmentTime: data.assessmentTime?.toDate?.(),
        } as any);
      } else {
        callback(null);
      }
    });
  }

  // Listen to user's challenges in real-time
  // NEW SCHEMA: Uses challengeMembers collection
  static subscribeToUserChallenges(userId: string, callback: (challenges: Challenge[]) => void) {
    // Listen to challengeMembers for this user
    const membersQuery = query(
      collection(db, 'challengeMembers'),
      where('userId', '==', userId),
      where('state', '==', 'active')
    );

    return onSnapshot(membersQuery, async (membersSnapshot) => {
      if (membersSnapshot.empty) {
        callback([]);
        return;
      }
      
      // Get challenge IDs
      const challengeIds = membersSnapshot.docs.map(doc => doc.data().challengeId);
      
      // Fetch challenges
      const challenges: Challenge[] = [];
      
      for (let i = 0; i < challengeIds.length; i += 10) {
        const batch = challengeIds.slice(i, i + 10);
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('__name__', 'in', batch)
        );
        
        const challengesSnapshot = await getDocs(challengesQuery);
        
        challengesSnapshot.docs.forEach(doc => {
          const data: any = doc.data();
          challenges.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as any);
        });
      }
      
      // Sort by createdAt desc
      challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      callback(challenges);
    });
  }

  // Get full challenge details for Challenge Detail Screen
  static async getChallengeDetails(challengeId: string, currentUserId: string) {
    try {
      // Fetch challenge
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (!challengeDoc.exists()) {
        throw new Error('Challenge not found');
      }

      const challengeData: any = challengeDoc.data();
      const challenge: any = {
        id: challengeDoc.id,
        ...challengeData,
        createdAt: challengeData.createdAt?.toDate?.()?.getTime() || Date.now(),
        // Ensure cadence has default values
        cadence: challengeData.cadence || { unit: 'daily', weekStartsOn: 0 },
        // Ensure submission has default values
        submission: challengeData.submission || { 
          inputType: 'boolean', 
          requireAttachment: false,
          attachmentTypes: [] 
        },
      };

      // Fetch group if it's a group challenge
      let group: any = null;
      if (challenge.groupId) {
        const groupDoc = await getDoc(doc(db, 'groups', challenge.groupId));
        if (groupDoc.exists()) {
          group = {
            id: groupDoc.id,
            ...groupDoc.data(),
          };
        }
      }

      // Fetch challenge members
      const membersQuery = query(
        collection(db, 'challengeMembers'),
        where('challengeId', '==', challengeId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const challengeMembers: any[] = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get member IDs
      const memberIds: string[] = challengeMembers.map((m: any) => m.userId);

      // Fetch member profiles
      const memberProfiles: Record<string, any> = {};
      for (const userId of memberIds) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          memberProfiles[userId] = {
            name: userData.displayName || 'Unknown',
            avatarUri: userData.photoURL || null,
          };
        }
      }

      // Fetch recent check-ins (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const checkInsQuery = query(
        collection(db, 'checkIns'),
        where('challengeId', '==', challengeId),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt', 'desc')
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      const allCheckIns: any[] = checkInsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter check-ins for current period and user
      const myRecentCheckIns = allCheckIns.filter((ci: any) => ci.userId === currentUserId);

      // Determine current period check-ins based on cadence
      const now = new Date();
      let checkInsForCurrentPeriod: any[] = [];
      
      if (challenge.cadence?.unit === 'daily') {
        const today = now.toISOString().split('T')[0];
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          const checkInDate = new Date(ci.createdAt).toISOString().split('T')[0];
          return checkInDate === today;
        });
      } else if (challenge.cadence?.unit === 'weekly') {
        // Get current week's check-ins
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          const checkInDate = new Date(ci.createdAt);
          return checkInDate >= weekStart;
        });
      }

      return {
        challenge,
        group: group || { id: 'solo', name: 'Solo Challenge', memberIds: [currentUserId] },
        challengeMembers,
        memberProfiles,
        checkInsForCurrentPeriod,
        myRecentCheckIns,
        allRecentCheckIns: allCheckIns, // Include all check-ins for filtering by day
        currentUserId,
      };
    } catch (error) {
      console.error('Error getting challenge details:', error);
      throw error;
    }
  }
}
