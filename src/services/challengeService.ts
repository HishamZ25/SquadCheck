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
  arrayRemove,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Challenge } from '../types';
import { dateKeys } from '../utils/dateKeys';
import { computeNextDueAtUtc } from '../utils/dueTime';

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
      // Resolve admin timezone from device IANA timezone
      const adminTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const dueTimeLocal = assessmentTime
        ? `${String(assessmentTime.getHours()).padStart(2, '0')}:${String(assessmentTime.getMinutes()).padStart(2, '0')}`
        : '23:59';

      const challengeData: any = {
        name,
        title: name, // Also set title for new schema compatibility
        description,
        type,
        challengeType,
        creatorId,
        participantIds: [creatorId], // Creator is automatically a participant
        requirements,
        rewards,
        penalty,
        userProgress: {},
        createdAt: new Date(),
        status: 'active',
        state: 'active',
        cadence: { unit: 'daily', weekStartsOn: 0 },
        due: {
          dueTimeLocal,
          timezoneMode: 'groupLocal',
          timezone: adminTimeZone,
          timezoneOffset: new Date().getTimezoneOffset(),
        },
        submission: { inputType: 'boolean', requireAttachment: false },
        createdBy: creatorId,
        adminUserId: creatorId,
        adminTimeZone,
        nextDueAtUtc: computeNextDueAtUtc(adminTimeZone, dueTimeLocal, 'daily', 0),
      };

      // Only add optional fields if they are defined
      if (challengeType === 'group' && groupId) {
        challengeData.groupId = groupId;
      }
      if (eliminationRule) challengeData.eliminationRule = eliminationRule;
      if (startDate) challengeData.startDate = startDate;
      if (endDate) challengeData.endDate = endDate;
      if (progressionDuration) challengeData.progressionDuration = progressionDuration;
      if (progressionIntervalType) challengeData.progressionIntervalType = progressionIntervalType;
      if (assessmentTime) challengeData.assessmentTime = assessmentTime;

      const docRef = await addDoc(collection(db, 'challenges'), challengeData);
      
      // Add creator to challengeMembers (required for getUserChallenges to find the challenge)
      const creatorMemberId = `${docRef.id}_${creatorId}`;
      const creatorMemberData: Record<string, unknown> = {
        challengeId: docRef.id,
        userId: creatorId,
        state: 'active',
        strikes: 0,
      };
      if (challengeType === 'group' && groupId) {
        creatorMemberData.groupId = groupId;
      }
      await setDoc(doc(db, 'challengeMembers', creatorMemberId), creatorMemberData, { merge: true });
      
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

  // Helper to normalize a challenge doc into Challenge type
  private static normalizeChallengeDoc(d: { id: string; data(): any }): Challenge {
    const data: any = d.data();
    return {
      id: d.id,
      ...data,
      title: data.title || data.name,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      cadence: data.cadence || { unit: 'daily', weekStartsOn: 0 },
      due: data.due || { dueTimeLocal: '23:59', timezoneMode: 'userLocal' },
      submission: data.submission || {
        inputType: 'boolean',
        requireAttachment: false,
        attachmentTypes: [],
      },
    } as any;
  }

  // Get challenges for a user (both solo and group challenges they're in)
  // Uses challengeMembers first; fallback: challenges where createdBy or participantIds includes user (e.g. legacy or missing membership)
  static async getUserChallenges(userId: string): Promise<Challenge[]> {
    try {
      const seenIds = new Set<string>();
      const challenges: Challenge[] = [];

      // 1) From challengeMembers
      const membersQuery = query(
        collection(db, 'challengeMembers'),
        where('userId', '==', userId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      const challengeIdsFromMembers = membersSnapshot.docs
        .map(doc => doc.data().challengeId)
        .filter(Boolean);

      for (const id of challengeIdsFromMembers) {
        seenIds.add(id);
      }

      // Batch fetch by id (max 10 per 'in' query)
      const allIds = [...seenIds];
      for (let i = 0; i < allIds.length; i += 10) {
        const batch = allIds.slice(i, i + 10);
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('__name__', 'in', batch)
        );
        const challengesSnapshot = await getDocs(challengesQuery);
        challengesSnapshot.docs.forEach(d => {
          challenges.push(ChallengeService.normalizeChallengeDoc(d));
        });
      }

      // 2) Fallback: challenges created by this user (in case challengeMembers is missing)
      const createdByQuery = query(
        collection(db, 'challenges'),
        where('createdBy', '==', userId)
      );
      const createdBySnapshot = await getDocs(createdByQuery);
      createdBySnapshot.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          challenges.push(ChallengeService.normalizeChallengeDoc(d));
        }
      });

      // 3) Fallback: challenges where user is in participantIds (legacy)
      const participantQuery = query(
        collection(db, 'challenges'),
        where('participantIds', 'array-contains', userId)
      );
      const participantSnapshot = await getDocs(participantQuery);
      participantSnapshot.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          challenges.push(ChallengeService.normalizeChallengeDoc(d));
        }
      });

      // Sort by createdAt desc
      challenges.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
      return challenges;
    } catch (error) {
      console.error('Error getting user challenges:', error);
      return [];
    }
  }

  // Get challenges for a group (by groupId on challenge doc; no status filter so we don't miss challenges)
  static async getGroupChallenges(groupId: string): Promise<Challenge[]> {
    try {
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('groupId', '==', groupId)
      );

      const querySnapshot = await getDocs(challengesQuery);
      const list = querySnapshot.docs.map(doc => {
        const data: any = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          startDate: data.startDate?.toDate?.(),
          endDate: data.endDate?.toDate?.(),
          assessmentTime: data.assessmentTime?.toDate?.(),
          cadence: data.cadence || { unit: 'daily', weekStartsOn: 0 },
          submission: data.submission || {
            inputType: 'boolean',
            requireAttachment: false,
            attachmentTypes: [],
          },
        } as any;
      });
      list.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
      return list;
    } catch (error) {
      console.error('Error getting group challenges:', error);
      return [];
    }
  }

  // Add participant to challenge (also adds to challengeMembers for getUserChallenges)
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
      const memberId = `${challengeId}_${userId}`;
      await setDoc(doc(db, 'challengeMembers', memberId), {
        challengeId,
        userId,
        state: 'active',
        strikes: 0,
      }, { merge: true });
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
    return onSnapshot(
      doc(db, 'challenges', challengeId),
      (doc) => {
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
      },
      (err) => {
        __DEV__ && console.warn('Firestore Listen (challenge) transport error, will retry:', err?.code || err?.message);
      }
    );
  }

  // Listen to user's challenges in real-time (includes eliminated so they can still view)
  static subscribeToUserChallenges(userId: string, callback: (challenges: Challenge[]) => void) {
    const membersQuery = query(
      collection(db, 'challengeMembers'),
      where('userId', '==', userId)
    );

    return onSnapshot(
      membersQuery,
      async (membersSnapshot) => {
        if (membersSnapshot.empty) {
          callback([]);
          return;
        }
        const challengeIds = membersSnapshot.docs.map(doc => doc.data().challengeId);
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
        challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(challenges);
      },
      (err) => {
        __DEV__ && console.warn('Firestore Listen (user challenges) transport error, will retry:', err?.code || err?.message);
        callback([]);
      }
    );
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
      const challengeMembers: any[] = membersSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      // Use group.memberIds for group challenges (source of truth for who's in the challenge)
      // Fallback to challengeMembers for solo or legacy challenges
      const memberIdsForProfiles: string[] = group?.memberIds?.length
        ? group.memberIds
        : challengeMembers.map((m: any) => m.userId);

      // Fetch member profiles for actual group/challenge members
      const memberProfiles: Record<string, any> = {};
      for (const userId of memberIdsForProfiles) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          memberProfiles[userId] = {
            name: userData.displayName || userData.email || 'Unknown',
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

      // Determine current period check-ins based on cadence and due time
      const now = new Date();
      let checkInsForCurrentPeriod: any[] = [];
      
      if (challenge.cadence?.unit === 'daily') {
        const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
        const currentPeriodKey = dateKeys.getCurrentCheckInPeriod(dueTimeLocal);
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          return ci.period?.dayKey === currentPeriodKey;
        });
      } else if (challenge.cadence?.unit === 'weekly') {
        // Get current week's check-ins
        const currentWeekKey = dateKeys.getWeekKey(now, challenge.cadence.weekStartsOn || 0);
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          return ci.period?.weekKey === currentWeekKey;
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
