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
import { Group, GroupInvitation, User } from '../types';

export class GroupService {
  // Create a new group
  static async createGroup(
    name: string,
    goal: string,
    requirements: string[],
    rewards: {
      points: number;
      title?: string;
      picture?: string;
      badge?: string;
    },
    penalty: number,
    creatorId: string,
    groupType: 'team' | 'solo' = 'team'
  ): Promise<string> {
    try {
      const groupData: Omit<Group, 'id'> = {
        name,
        goal,
        requirements,
        rewards,
        penalty,
        creatorId,
        memberIds: [creatorId], // Creator is automatically a member
        createdAt: new Date(),
        status: 'active',
        groupType,
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  // Get group by ID
  static async getGroup(groupId: string): Promise<Group | null> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        return { id: groupDoc.id, ...groupDoc.data() } as Group;
      }
      return null;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }

  // Get groups for a user
  static async getUserGroups(userId: string): Promise<Group[]> {
    try {
      // Query groups where user is a member
      const groupsQuery = query(
        collection(db, 'groups'),
        where('memberIds', 'array-contains', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(groupsQuery);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as Group);
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Add member to group
  static async addMember(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberIds: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  // Remove member from group
  static async removeMember(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberIds: arrayRemove(userId)
      });
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // Update group
  static async updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, updates);
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  // Delete group
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // Create group invitation
  static async createInvitation(
    groupId: string,
    inviterId: string,
    inviteeId: string
  ): Promise<string> {
    try {
      const invitationData: Omit<GroupInvitation, 'id'> = {
        groupId,
        inviterId,
        inviteeId,
        status: 'pending',
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      const docRef = await addDoc(collection(db, 'groupInvitations'), invitationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  // Get pending invitations for a user
  static async getPendingInvitations(userId: string): Promise<GroupInvitation[]> {
    try {
      const invitationsQuery = query(
        collection(db, 'groupInvitations'),
        where('inviteeId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('sentAt', 'desc')
      );

      const querySnapshot = await getDocs(invitationsQuery);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as GroupInvitation);
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  // Accept invitation
  static async acceptInvitation(invitationId: string): Promise<void> {
    try {
      const invitationRef = doc(db, 'groupInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationDoc.data() as GroupInvitation;
      
      // Update invitation status
      await updateDoc(invitationRef, { status: 'accepted' });
      
      // Add user to group
      await this.addMember(invitation.groupId, invitation.inviteeId);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // Decline invitation
  static async declineInvitation(invitationId: string): Promise<void> {
    try {
      const invitationRef = doc(db, 'groupInvitations', invitationId);
      await updateDoc(invitationRef, { status: 'declined' });
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  }

  // Listen to group changes in real-time
  static subscribeToGroup(groupId: string, callback: (group: Group | null) => void) {
    return onSnapshot(doc(db, 'groups', groupId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Group);
      } else {
        callback(null);
      }
    });
  }

  // Listen to user's groups in real-time
  static subscribeToUserGroups(userId: string, callback: (groups: Group[]) => void) {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(groupsQuery, (querySnapshot) => {
      const groups = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as Group);
      callback(groups);
    });
  }

  // Listen to user's pending invitations in real-time
  static subscribeToUserInvitations(userId: string, callback: (invitations: GroupInvitation[]) => void) {
    const invitationsQuery = query(
      collection(db, 'groupInvitations'),
      where('inviteeId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('sentAt', 'desc')
    );

    return onSnapshot(invitationsQuery, (querySnapshot) => {
      const invitations = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }) as GroupInvitation);
      callback(invitations);
    });
  }
} 