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
import {
  computeNextDueAtUtc,
  resolveAdminTimeZone,
  getAdminZoneDayKey,
  getCurrentPeriodDayKey,
  getCurrentPeriodWeekKey,
} from '../utils/dueTime';
import { userCache } from './userCache';

export class ChallengeService {
  static async createChallenge(
    name: string,
    description: string,
    type: 'elimination' | 'deadline' | 'progress',
    challengeType: 'solo' | 'group',
    creatorId: string,
    groupId?: string,
    options?: {
      requirements?: string[];
      eliminationRule?: string;
      strikesAllowed?: number;
      startDate?: Date;
      endDate?: Date;
      progressionDuration?: number;
      progressionIntervalType?: string;
      assessmentTime?: Date;
      cadence?: { unit: 'daily' | 'weekly'; requiredCount?: number; weekStartsOn?: number };
      submission?: {
        inputType: 'boolean' | 'number' | 'text' | 'timer';
        unitLabel?: string;
        minValue?: number;
        requireAttachment?: boolean;
        requireText?: boolean;
        minTextLength?: number;
      };
    }
  ): Promise<string> {
    try {
      const opts = options || {};
      const requirements = opts.requirements || [];
      const cadence = opts.cadence ?? { unit: 'daily' as const, weekStartsOn: 0 };
      const submission = opts.submission ?? { inputType: 'boolean' as const, requireAttachment: false };
      const assessmentTime = opts.assessmentTime;

      // Resolve admin timezone from device IANA timezone
      const adminTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const dueTimeLocal = assessmentTime
        ? `${String(assessmentTime.getHours()).padStart(2, '0')}:${String(assessmentTime.getMinutes()).padStart(2, '0')}`
        : '23:59';

      const challengeData: any = {
        name,
        title: name,
        description,
        type,
        challengeType,
        creatorId,
        participantIds: [creatorId],
        requirements,
        rewards: { points: 0 },
        penalty: 0,
        userProgress: {},
        createdAt: new Date(),
        status: 'active',
        state: 'active',
        cadence: { unit: cadence.unit, weekStartsOn: cadence.weekStartsOn ?? 0, ...(cadence.requiredCount != null && { requiredCount: cadence.requiredCount }) },
        due: {
          dueTimeLocal,
          timezoneMode: 'groupLocal',
          timezone: adminTimeZone,
          timezoneOffset: new Date().getTimezoneOffset(),
        },
        submission,
        createdBy: creatorId,
        adminUserId: creatorId,
        adminTimeZone,
        nextDueAtUtc: computeNextDueAtUtc(adminTimeZone, dueTimeLocal, cadence.unit, cadence.weekStartsOn ?? 0),
      };

      // Only add optional fields if they are defined
      if (challengeType === 'group' && groupId) {
        challengeData.groupId = groupId;
      }
      if (opts.eliminationRule) challengeData.eliminationRule = opts.eliminationRule;
      if (type === 'elimination') {
        challengeData.rules = { elimination: { strikesAllowed: opts.strikesAllowed ?? 0 } };
      }
      if (opts.startDate) challengeData.startDate = opts.startDate;
      if (opts.endDate) {
        challengeData.endDate = opts.endDate;
        // Store deadlineDate in due object so deadline-specific logic works everywhere
        const y = opts.endDate.getFullYear();
        const m = String(opts.endDate.getMonth() + 1).padStart(2, '0');
        const d = String(opts.endDate.getDate()).padStart(2, '0');
        challengeData.due.deadlineDate = `${y}-${m}-${d}`;
      }
      if (opts.progressionDuration) challengeData.progressionDuration = opts.progressionDuration;
      if (opts.progressionIntervalType) challengeData.progressionIntervalType = opts.progressionIntervalType;
      if (assessmentTime) challengeData.assessmentTime = assessmentTime;

      const docRef = await addDoc(collection(db, 'challenges'), challengeData);

      // Add creator member + update group in parallel (both depend on docRef.id only)
      const postCreateOps: Promise<any>[] = [];

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
      postCreateOps.push(
        setDoc(doc(db, 'challengeMembers', creatorMemberId), creatorMemberData, { merge: true })
      );

      if (challengeType === 'group' && groupId) {
        postCreateOps.push(
          updateDoc(doc(db, 'groups', groupId), { challengeIds: arrayUnion(docRef.id) })
        );
      }

      await Promise.all(postCreateOps);

      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error creating challenge:', error);
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
      if (__DEV__) console.error('Error getting challenge:', error);
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

      // Batch fetch by id (max 10 per 'in' query) — all batches in parallel
      const allIds = [...seenIds];
      const batchPromises: Promise<void>[] = [];
      for (let i = 0; i < allIds.length; i += 10) {
        const batch = allIds.slice(i, i + 10);
        batchPromises.push(
          getDocs(query(
            collection(db, 'challenges'),
            where('__name__', 'in', batch)
          )).then(challengesSnapshot => {
            challengesSnapshot.docs.forEach(d => {
              challenges.push(ChallengeService.normalizeChallengeDoc(d));
            });
          })
        );
      }
      await Promise.all(batchPromises);

      // 2-3) Fallback queries only if challengeMembers returned 0 results (legacy data)
      if (challenges.length === 0) {
        const [createdBySnapshot, participantSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'challenges'),
            where('createdBy', '==', userId)
          )),
          getDocs(query(
            collection(db, 'challenges'),
            where('participantIds', 'array-contains', userId)
          )),
        ]);

        createdBySnapshot.docs.forEach(d => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            challenges.push(ChallengeService.normalizeChallengeDoc(d));
          }
        });

        participantSnapshot.docs.forEach(d => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            challenges.push(ChallengeService.normalizeChallengeDoc(d));
          }
        });
      }

      // Sort by createdAt desc
      challenges.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
      return challenges;
    } catch (error) {
      if (__DEV__) console.error('Error getting user challenges:', error);
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
      if (__DEV__) console.error('Error getting group challenges:', error);
      return [];
    }
  }

  // Add participant to challenge (also adds to challengeMembers for getUserChallenges)
  static async addParticipant(challengeId: string, userId: string, groupId?: string): Promise<void> {
    try {
      const memberId = `${challengeId}_${userId}`;
      const memberData: Record<string, unknown> = {
        challengeId,
        userId,
        state: 'active',
        strikes: 0,
      };
      if (groupId) memberData.groupId = groupId;

      // Update challenge doc + create member doc in parallel
      await Promise.all([
        updateDoc(doc(db, 'challenges', challengeId), {
          participantIds: arrayUnion(userId),
          [`userProgress.${userId}`]: {
            userId,
            checkIns: [],
            eliminated: false,
            completed: false,
            streak: 0,
          }
        }),
        setDoc(doc(db, 'challengeMembers', memberId), memberData, { merge: true }),
      ]);
    } catch (error) {
      if (__DEV__) console.error('Error adding participant:', error);
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
      if (__DEV__) console.error('Error removing participant:', error);
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
      if (__DEV__) console.error('Error updating user progress:', error);
      throw error;
    }
  }

  // Update challenge
  static async updateChallenge(challengeId: string, updates: Partial<Challenge>): Promise<void> {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, updates);
    } catch (error) {
      if (__DEV__) console.error('Error updating challenge:', error);
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
      if (__DEV__) console.error('Error deleting challenge:', error);
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
      // Normalize deadlineDate: may arrive as Firestore Timestamp
      let deadlineDate = challengeData.due?.deadlineDate;
      if (deadlineDate && typeof deadlineDate !== 'string') {
        if (deadlineDate.toDate) {
          const d = deadlineDate.toDate() as Date;
          deadlineDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (deadlineDate instanceof Date) {
          deadlineDate = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;
        }
      }
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
        // Normalize due.deadlineDate to string
        ...(deadlineDate !== undefined && challengeData.due ? {
          due: { ...challengeData.due, deadlineDate },
        } : {}),
      };

      // Fetch group, challenge members, and check-ins in parallel
      const membersQuery = query(
        collection(db, 'challengeMembers'),
        where('challengeId', '==', challengeId)
      );
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const checkInsQuery = query(
        collection(db, 'checkIns'),
        where('challengeId', '==', challengeId),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt', 'desc')
      );
      const groupPromise = challenge.groupId
        ? getDoc(doc(db, 'groups', challenge.groupId))
        : Promise.resolve(null);

      const [membersSnapshot, checkInsSnapshot, groupSnap] = await Promise.all([
        getDocs(membersQuery),
        getDocs(checkInsQuery),
        groupPromise,
      ]);

      const challengeMembers: any[] = membersSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      const allCheckIns: any[] = checkInsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Merge challenge member IDs with actual group member IDs so all group members show in status
      const challengeMemberIds: string[] = challengeMembers.map((m: any) => m.userId);
      const groupMemberIds: string[] = groupSnap?.data?.()?.memberIds || [];
      const allMemberIds = Array.from(new Set([...challengeMemberIds, ...groupMemberIds]));
      const memberIdsForProfiles = allMemberIds;

      const profilesMap = await userCache.getUsers(memberIdsForProfiles);
      const memberProfiles: Record<string, any> = {};
      for (const [uid, u] of profilesMap) {
        memberProfiles[uid] = {
          name: (u as any).displayName || (u as any).email || 'Unknown',
          avatarUri: (u as any).photoURL || null,
        };
      }

      // Filter check-ins for current period and user
      const myRecentCheckIns = allCheckIns.filter((ci: any) => ci.userId === currentUserId);

      // Determine current period check-ins using challenge creator's timezone (same as submission and challengeEval)
      const now = new Date();
      const adminTz = resolveAdminTimeZone(challenge as any);
      const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
      const weekStartsOn = challenge.cadence?.weekStartsOn ?? 0;
      let checkInsForCurrentPeriod: any[] = [];

      if (challenge.cadence?.unit === 'daily') {
        const currentPeriodKey = challenge.type === 'deadline'
          ? getAdminZoneDayKey(adminTz, now)
          : getCurrentPeriodDayKey(adminTz, dueTimeLocal, now);
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          return ci.period?.dayKey === currentPeriodKey;
        });
      } else if (challenge.cadence?.unit === 'weekly') {
        const currentWeekKey = getCurrentPeriodWeekKey(adminTz, weekStartsOn, now);
        checkInsForCurrentPeriod = allCheckIns.filter((ci: any) => {
          return ci.period?.weekKey === currentWeekKey;
        });
      }

      const groupData = groupSnap?.data?.() || {};
      return {
        challenge,
        group: challenge.groupId
          ? { id: challenge.groupId, name: groupData.name || 'Group', memberIds: groupMemberIds.length > 0 ? groupMemberIds : memberIdsForProfiles }
          : { id: 'solo', name: 'Solo Challenge', memberIds: [currentUserId] },
        challengeMembers,
        memberProfiles,
        checkInsForCurrentPeriod,
        myRecentCheckIns,
        allRecentCheckIns: allCheckIns, // Include all check-ins for filtering by day
        currentUserId,
      };
    } catch (error) {
      if (__DEV__) console.error('Error getting challenge details:', error);
      throw error;
    }
  }
}
